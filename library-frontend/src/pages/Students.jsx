import { useState, useEffect } from 'react';
import {
  studentService,
  classService,
  streamService,
} from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import {
  Modal, FormField, Input, Select, Button, Banner, EmptyState,
  Card, StatusBadge, Avatar,
} from '../components/SharedComponents';

export default function Students() {

  // Data
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [students, setStudents] = useState([]);

  // Filter selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Modal
  const [modal, setModal] = useState(null);
  // null | 'addStudent' | 'viewStudent' | 'confirmDeactivate' | 'confirmActivate'

  const [selectedStudent, setSelectedStudent] = useState(null);

  // Add student form
  const [form, setForm] = useState({
    admissionNumber: '',
    fullName: '',
    yearEnrolled: new Date().getFullYear(),
  });

  // Feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── LOAD CLASSES ON MOUNT ─────────────────────────────
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await classService.getAll();
      setClasses(res.data);
    } catch {
      setError('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // ── LOAD STREAMS WHEN CLASS SELECTED ─────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setStreams([]);
      setSelectedStreamId('');
      setStudents([]);
      return;
    }
    loadStreams(selectedClassId);
  }, [selectedClassId]);

  const loadStreams = async (classId) => {
    setLoadingStreams(true);
    setSelectedStreamId('');
    setStudents([]);
    try {
      const res = await streamService.getByClass(classId);
      setStreams(res.data);
    } catch {
      setError('Failed to load streams');
    } finally {
      setLoadingStreams(false);
    }
  };

  // ── LOAD STUDENTS WHEN STREAM SELECTED ───────────────
  useEffect(() => {
    if (!selectedStreamId) {
      setStudents([]);
      return;
    }
    loadStudents(selectedStreamId);
  }, [selectedStreamId]);

  const loadStudents = async (streamId) => {
    setLoadingStudents(true);
    try {
      const res = await studentService.getByStream(streamId);
      // Map 'active' from backend to 'isActive' for frontend
      const mappedData = res.data.map(student => ({
        ...student,
        isActive: student.active,
      }));
      setStudents(mappedData);
    } catch {
      setError('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  // ── ADD STUDENT ───────────────────────────────────────
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await studentService.create(
        {
          admissionNumber: form.admissionNumber,
          fullName: form.fullName,
          yearEnrolled: parseInt(form.yearEnrolled),
        },
        selectedStreamId
      );

      showSuccess(`${form.fullName} added to stream ${selectedStream?.streamName}`);
      closeModal();
      loadStudents(selectedStreamId);

      setForm({
        admissionNumber: '',
        fullName: '',
        yearEnrolled: new Date().getFullYear(),
      });

    } catch (err) {
      setError(err.response?.data || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DEACTIVATE STUDENT ────────────────────────────────
  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      await studentService.deactivate(selectedStudent.studentId);
      showSuccess(`${selectedStudent.fullName} has been deactivated`);
      closeModal();
      loadStudents(selectedStreamId);
    } catch (err) {
      setError(err.response?.data || 'Failed to deactivate');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };
  // ── ACTIVATE STUDENT ────────────────────────────────
  const handleActivate = async () => {
    setSubmitting(true);
    try {
      await studentService.activate(selectedStudent.studentId);
      showSuccess(`${selectedStudent.fullName} has been activated`);
      closeModal();
      loadStudents(selectedStreamId);
    } catch (err) {
      setError(err.response?.data || 'Failed to activate');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedStudent(null);
    setError('');
  };

  const selectedStream = streams.find(s => s.streamId === parseInt(selectedStreamId));
  const selectedClass = classes.find(c => c.classId === parseInt(selectedClassId));

  // ── LOCAL FILTER ──────────────────────────────────────
  const filteredStudents = students.filter(student => {
    const activeMatch = showInactive ? true : student.isActive;
    const searchMatch =
      searchText === '' ||
      student.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchText.toLowerCase());
    return activeMatch && searchMatch;
  });

  const activeCount = students.filter(s => s.isActive).length;
  const inactiveCount = students.filter(s => !s.isActive).length;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Students</h1>
          <p style={styles.pageSub}>View and manage students by class and stream</p>
        </div>

        {selectedStreamId && (
          <Button variant="primary" onClick={() => setModal('addStudent')}>
            + Add Student
          </Button>
        )}
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && !modal && <Banner type="error">{error}</Banner>}

      {/* ── FILTER BAR ───────────────────────────────── */}
      <Card style={styles.filterBar}>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Class</label>
          {loadingClasses ? (
            <div style={styles.selectPlaceholder}>Loading classes…</div>
          ) : (
            <Select
              style={{ minWidth: 200 }}
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className} ({cls.academicYear})
                </option>
              ))}
            </Select>
          )}
        </div>

        {selectedClassId && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Stream</label>
            {loadingStreams ? (
              <div style={styles.selectPlaceholder}>Loading streams…</div>
            ) : streams.length === 0 ? (
              <div style={styles.selectPlaceholder}>No streams in this class yet</div>
            ) : (
              <Select
                style={{ minWidth: 200 }}
                value={selectedStreamId}
                onChange={e => setSelectedStreamId(e.target.value)}
              >
                <option value="">Select a stream</option>
                {streams.map(s => (
                  <option key={s.streamId} value={s.streamId}>
                    {s.streamName}
                    {s.teacher ? ` — ${s.teacher.fullName}` : ' — No teacher'}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {selectedStreamId && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Search</label>
              <Input
                style={{ minWidth: 220 }}
                placeholder="Name or admission number..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Show</label>
              <div style={styles.toggleRow}>
                <button
                  style={{ ...styles.toggleBtn, ...(showInactive ? {} : styles.toggleBtnActive) }}
                  onClick={() => setShowInactive(false)}
                >
                  Active ({activeCount})
                </button>
                <button
                  style={{ ...styles.toggleBtn, ...(showInactive ? styles.toggleBtnActive : {}) }}
                  onClick={() => setShowInactive(true)}
                >
                  All ({students.length})
                </button>
              </div>
            </div>
          </>
        )}

      </Card>

      {/* ── STREAM SUMMARY BAR ───────────────────────── */}
      {selectedStreamId && selectedStream && (
        <div style={styles.streamSummary}>
          <div style={styles.summaryLeft}>
            <span style={styles.summaryStreamName}>
              {selectedClass?.className} — Stream {selectedStream.streamName}
            </span>
            <span style={styles.summaryTeacher}>
              {selectedStream.teacher
                ? `Teacher: ${selectedStream.teacher.fullName}`
                : 'No teacher assigned'}
            </span>
          </div>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>{activeCount}</span>
              <span style={styles.summaryStatLabel}>Active</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>{inactiveCount}</span>
              <span style={styles.summaryStatLabel}>Inactive</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>{selectedStream.capacity}</span>
              <span style={styles.summaryStatLabel}>Capacity</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────── */}
      {!selectedClassId ? (
        <EmptyState icon="🎓" title="Select a class to begin" subtitle="Choose a class from the dropdown above to view its streams" />
      ) : !selectedStreamId ? (
        <EmptyState icon="🏫" title="Select a stream" subtitle="Choose a stream to view its students" />
      ) : loadingStudents ? (
        <div style={styles.loadingText}>Loading students…</div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon="👤"
          title={searchText ? 'No students match your search' : 'No students in this stream'}
          subtitle={!searchText && 'Click "+ Add Student" to add the first student'}
        />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Admission No.</th>
                <th style={styles.th}>Full Name</th>
                <th style={styles.th}>Year Enrolled</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.studentId}
                  style={styles.tableRow}
                  onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surface}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    <span style={styles.admissionNo}>{student.admissionNumber}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.studentRow}>
                      <Avatar name={student.fullName} size={30} background={tokens.colors.primary} />
                      <span style={styles.studentName}>{student.fullName}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{student.yearEnrolled}</td>
                  <td style={styles.td}>
                    <StatusBadge status={student.isActive ? 'ACTIVE' : 'INACTIVE'} label={student.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      <Button
                        variant="secondary" size="sm"
                        onClick={() => { setSelectedStudent(student); setModal('viewStudent'); }}
                      >
                        View
                      </Button>
                      {student.isActive ? (
                        <Button
                          variant="danger" size="sm"
                          onClick={() => { setSelectedStudent(student); setModal('confirmDeactivate'); }}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="success" size="sm"
                          onClick={() => { setSelectedStudent(student); setModal('confirmActivate'); }}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── ADD STUDENT MODAL ────────────────────────── */}
      {modal === 'addStudent' && (
        <Modal title={`Add Student to Stream ${selectedStream?.streamName}`} onClose={closeModal}>
          <form onSubmit={handleAddStudent}>
            {error && <Banner type="error">{error}</Banner>}

            <FormField label="Admission Number" hint="Must be unique across the school">
              <Input
                placeholder="e.g. ADM2025001"
                value={form.admissionNumber}
                onChange={e => setForm({ ...form, admissionNumber: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Full Name">
              <Input
                placeholder="e.g. John Mwangi"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Year Enrolled">
              <Input
                type="number" min="2000" max="2100"
                value={form.yearEnrolled}
                onChange={e => setForm({ ...form, yearEnrolled: e.target.value })}
                required
              />
            </FormField>

            <div style={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add Student'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── VIEW STUDENT MODAL ───────────────────────── */}
      {modal === 'viewStudent' && selectedStudent && (
        <Modal title="Student Details" onClose={closeModal}>
          <div style={styles.studentProfile}>
            <Avatar name={selectedStudent.fullName} size={64} background={tokens.colors.primary} />
            <div style={styles.profileName}>{selectedStudent.fullName}</div>

            <div style={styles.profileDetails}>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Admission No.</span>
                <span style={styles.profileValue}>{selectedStudent.admissionNumber}</span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Stream</span>
                <span style={styles.profileValue}>{selectedStudent.stream?.streamName || '—'}</span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Year Enrolled</span>
                <span style={styles.profileValue}>{selectedStudent.yearEnrolled}</span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Status</span>
                <StatusBadge status={selectedStudent.isActive ? 'ACTIVE' : 'INACTIVE'} label={selectedStudent.isActive ? 'Active' : 'Inactive'} />
              </div>
            </div>

            <div style={styles.profileNote}>
              📌 Full book history and loss reports will be visible here in a future update.
            </div>
          </div>

          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Close</Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM DEACTIVATE MODAL ─────────────────── */}
      {modal === 'confirmDeactivate' && (
        <Modal title="Deactivate Student" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.confirmContent}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={styles.confirmText}>
              Deactivate <strong>{selectedStudent?.fullName}</strong>?
            </p>
            <p style={styles.confirmSub}>
              This student will be marked as inactive.
              Their book and borrow history will be kept.
              You can reactivate them later if needed.
            </p>
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate} disabled={submitting}>
              {submitting ? 'Deactivating…' : 'Yes, Deactivate'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM ACTIVATE MODAL ───────────────────── */}
      {modal === 'confirmActivate' && (
        <Modal title="Activate Student" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.confirmContent}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={styles.confirmText}>
              Activate <strong>{selectedStudent?.fullName}</strong>?
            </p>
            <p style={styles.confirmSub}>
              This student will be marked as active.
              They will be able to borrow books again.
            </p>
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={handleActivate} disabled={submitting}>
              {submitting ? 'Activating…' : 'Yes, Activate'}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: tokens.spacing.lg, flexWrap: 'wrap', gap: 12,
  },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },
  filterBar: {
    display: 'flex', gap: 20, marginBottom: tokens.spacing.md,
    flexWrap: 'wrap', alignItems: 'flex-end',
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: {
    fontSize: 11, fontWeight: 700, color: tokens.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  selectPlaceholder: { padding: '8px 12px', color: tokens.colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  toggleRow: { display: 'flex', gap: 0, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  toggleBtn: {
    padding: '9px 14px', border: `1.5px solid ${tokens.colors.border}`,
    background: tokens.colors.surface, color: tokens.colors.textSecondary,
    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: tokens.font.family,
  },
  toggleBtnActive: {
    background: tokens.colors.primary, color: '#fff',
    border: `1.5px solid ${tokens.colors.primary}`, fontWeight: 600,
  },
  streamSummary: {
    background: `linear-gradient(120deg, ${tokens.colors.primary}, ${tokens.colors.primaryDark})`,
    borderRadius: tokens.radius.md, padding: '16px 22px', marginBottom: tokens.spacing.md,
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 12,
    boxShadow: tokens.shadows.md,
  },
  summaryLeft: { display: 'flex', flexDirection: 'column', gap: 3 },
  summaryStreamName: { color: '#fff', fontWeight: 700, fontSize: 16 },
  summaryTeacher: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  summaryStats: { display: 'flex', gap: 24 },
  summaryStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  summaryStatValue: { color: '#fff', fontWeight: 700, fontSize: 20 },
  summaryStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  loadingText: { color: tokens.colors.textMuted, padding: 40, textAlign: 'center', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '12px 16px', textAlign: 'left',
    color: tokens.colors.textMuted, fontWeight: 600, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5,
    background: tokens.colors.surface, borderBottom: `2px solid ${tokens.colors.border}`,
  },
  tableRow: { borderBottom: `1px solid ${tokens.colors.border}`, transition: 'background 0.12s' },
  td: { padding: '12px 16px', color: tokens.colors.textPrimary },
  admissionNo: {
    fontFamily: tokens.font.mono, fontSize: 12,
    background: tokens.colors.surface, padding: '3px 8px',
    borderRadius: 4, color: tokens.colors.textSecondary,
  },
  studentRow: { display: 'flex', alignItems: 'center', gap: 10 },
  studentName: { fontWeight: 600, color: tokens.colors.textPrimary },
  actionRow: { display: 'flex', gap: 8 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  confirmContent: { textAlign: 'center', padding: '8px 0 16px' },
  confirmText: { fontSize: 15, color: tokens.colors.textPrimary, margin: '0 0 8px', lineHeight: 1.5 },
  confirmSub: { fontSize: 13, color: tokens.colors.textMuted, margin: 0, lineHeight: 1.5 },
  studentProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 20, fontWeight: 700, color: tokens.colors.textPrimary, marginTop: 8 },
  profileDetails: { width: '100%', marginTop: 12, display: 'flex', flexDirection: 'column' },
  profileRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: `1px solid ${tokens.colors.border}`,
  },
  profileLabel: { fontSize: 13, color: tokens.colors.textMuted, fontWeight: 500 },
  profileValue: { fontSize: 13, color: tokens.colors.textPrimary, fontWeight: 600 },
  profileNote: {
    fontSize: 12, color: tokens.colors.textMuted,
    textAlign: 'center', marginTop: 10, fontStyle: 'italic', lineHeight: 1.5,
  },
};
