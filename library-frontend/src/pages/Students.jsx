import { useState, useEffect } from 'react';
import {
  studentService,
  classService,
  streamService,
} from '../services/libraryApi';

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

      showSuccess(
        `${form.fullName} added to stream ${selectedStream?.streamName}`
      );
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
    try {
      await studentService.deactivate(selectedStudent.studentId);
      showSuccess(
        `${selectedStudent.fullName} has been deactivated`
      );
      closeModal();
      loadStudents(selectedStreamId);
    } catch (err) {
      setError(err.response?.data || 'Failed to deactivate');
      closeModal();
    }
  };
  // ── ACTIVATE STUDENT ────────────────────────────────
  const handleActivate = async () => {
    try {
      await studentService.activate(selectedStudent.studentId);
      showSuccess(
        `${selectedStudent.fullName} has been activated`
      );
      closeModal();
      loadStudents(selectedStreamId);
    } catch (err) {
      setError(err.response?.data || 'Failed to activate');
      closeModal();
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

  const selectedStream = streams.find(
    s => s.streamId === parseInt(selectedStreamId)
  );

  const selectedClass = classes.find(
    c => c.classId === parseInt(selectedClassId)
  );

  // ── LOCAL FILTER ──────────────────────────────────────
  // Filters already loaded students without API calls
  const filteredStudents = students.filter(student => {
    // Active filter
    const activeMatch = showInactive ? true : student.isActive;

    // Search filter
    const searchMatch =
      searchText === '' ||
      student.fullName.toLowerCase().includes(
        searchText.toLowerCase()
      ) ||
      student.admissionNumber.toLowerCase().includes(
        searchText.toLowerCase()
      );

    return activeMatch && searchMatch;
  });

  const activeCount = students.filter(s => s.isActive).length;
  const inactiveCount = students.filter(s => !s.isActive).length;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Students</h1>
          <p style={styles.pageSub}>
            View and manage students by class and stream
          </p>
        </div>

        {/* Add student — only when a stream is selected */}
        {selectedStreamId && (
          <button
            style={styles.primaryBtn}
            onClick={() => setModal('addStudent')}
          >
            + Add Student
          </button>
        )}
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>✅ {success}</div>
      )}
      {error && !modal && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}

      {/* ── FILTER BAR ───────────────────────────────── */}
      <div style={styles.filterBar}>

        {/* Class selector */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Class</label>
          {loadingClasses ? (
            <div style={styles.selectPlaceholder}>
              Loading classes...
            </div>
          ) : (
            <select
              style={styles.select}
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className} ({cls.academicYear})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stream selector — appears after class is selected */}
        {selectedClassId && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Stream</label>
            {loadingStreams ? (
              <div style={styles.selectPlaceholder}>
                Loading streams...
              </div>
            ) : streams.length === 0 ? (
              <div style={styles.selectPlaceholder}>
                No streams in this class yet
              </div>
            ) : (
              <select
                style={styles.select}
                value={selectedStreamId}
                onChange={e => setSelectedStreamId(e.target.value)}
              >
                <option value="">Select a stream</option>
                {streams.map(s => (
                  <option key={s.streamId} value={s.streamId}>
                    {s.streamName}
                    {s.teacher
                      ? ` — ${s.teacher.fullName}`
                      : ' — No teacher'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Search and toggle — only when stream is selected */}
        {selectedStreamId && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Search</label>
              <input
                style={styles.searchInput}
                placeholder="Name or admission number..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Show</label>
              <div style={styles.toggleRow}>
                <button
                  style={{
                    ...styles.toggleBtn,
                    ...(showInactive
                      ? {}
                      : styles.toggleBtnActive),
                  }}
                  onClick={() => setShowInactive(false)}
                >
                  Active ({activeCount})
                </button>
                <button
                  style={{
                    ...styles.toggleBtn,
                    ...(showInactive
                      ? styles.toggleBtnActive
                      : {}),
                  }}
                  onClick={() => setShowInactive(true)}
                >
                  All ({students.length})
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── STREAM SUMMARY BAR ───────────────────────── */}
      {selectedStreamId && selectedStream && (
        <div style={styles.streamSummary}>
          <div style={styles.summaryLeft}>
            <span style={styles.summaryStreamName}>
              {selectedClass?.className} —{' '}
              Stream {selectedStream.streamName}
            </span>
            <span style={styles.summaryTeacher}>
              {selectedStream.teacher
                ? `Teacher: ${selectedStream.teacher.fullName}`
                : 'No teacher assigned'}
            </span>
          </div>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>
                {activeCount}
              </span>
              <span style={styles.summaryStatLabel}>Active</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>
                {inactiveCount}
              </span>
              <span style={styles.summaryStatLabel}>Inactive</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.summaryStatValue}>
                {selectedStream.capacity}
              </span>
              <span style={styles.summaryStatLabel}>Capacity</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────── */}
      {!selectedClassId ? (
        // No class selected yet
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎓</div>
          <div style={styles.emptyTitle}>Select a class to begin</div>
          <div style={styles.emptySub}>
            Choose a class from the dropdown above to view its streams
          </div>
        </div>

      ) : !selectedStreamId ? (
        // Class selected but no stream
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏫</div>
          <div style={styles.emptyTitle}>Select a stream</div>
          <div style={styles.emptySub}>
            Choose a stream to view its students
          </div>
        </div>

      ) : loadingStudents ? (
        <div style={styles.loadingText}>Loading students...</div>

      ) : filteredStudents.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <div style={styles.emptyTitle}>
            {searchText
              ? 'No students match your search'
              : 'No students in this stream'}
          </div>
          <div style={styles.emptySub}>
            {!searchText &&
              'Click "+ Add Student" to add the first student'}
          </div>
        </div>

      ) : (
        // Student table
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
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
                  onMouseEnter={e =>
                    e.currentTarget.style.background = '#f9fafb'
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.background = 'transparent'
                  }
                >
                  <td style={styles.td}>{index + 1}</td>

                  <td style={styles.td}>
                    <span style={styles.admissionNo}>
                      {student.admissionNumber}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.studentName}>
                      {student.fullName}
                    </div>
                  </td>

                  <td style={styles.td}>
                    {student.yearEnrolled}
                  </td>

                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: student.isActive
                        ? '#f0fff4' : '#fff5f5',
                      color: student.isActive
                        ? '#276749' : '#c53030',
                    }}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      {/* View details */}
                      <button
                        style={styles.viewBtn}
                        onClick={() => {
                          setSelectedStudent(student);
                          setModal('viewStudent');
                        }}
                      >
                        View
                      </button>

                      {/* Deactivate — only for active students */}
                      {student.isActive && (
                        <button
                          style={styles.deactivateBtn}
                          onClick={() => {
                            setSelectedStudent(student);
                            setModal('confirmDeactivate');
                          }}
                        >
                          Deactivate
                        </button>
                      )}

                      {/* Activate — only for inactive students */}
                      {!student.isActive && (
                        <button
                          style={styles.activateBtn}
                          onClick={() => {
                            setSelectedStudent(student);
                            setModal('confirmActivate');
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ADD STUDENT MODAL ────────────────────────── */}
      {modal === 'addStudent' && (
        <Modal
          title={`Add Student to Stream ${selectedStream?.streamName}`}
          onClose={closeModal}
        >
          <form onSubmit={handleAddStudent}>
            {error && (
              <div style={styles.modalError}>{error}</div>
            )}

            <FormField label="Admission Number">
              <input
                style={styles.input}
                placeholder="e.g. ADM2025001"
                value={form.admissionNumber}
                onChange={e => setForm({
                  ...form,
                  admissionNumber: e.target.value,
                })}
                required
              />
              <span style={styles.inputHint}>
                Must be unique across the school
              </span>
            </FormField>

            <FormField label="Full Name">
              <input
                style={styles.input}
                placeholder="e.g. John Mwangi"
                value={form.fullName}
                onChange={e => setForm({
                  ...form,
                  fullName: e.target.value,
                })}
                required
              />
            </FormField>

            <FormField label="Year Enrolled">
              <input
                style={styles.input}
                type="number"
                min="2000"
                max="2100"
                value={form.yearEnrolled}
                onChange={e => setForm({
                  ...form,
                  yearEnrolled: e.target.value,
                })}
                required
              />
            </FormField>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.primaryBtn,
                  opacity: submitting ? 0.7 : 1,
                }}
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── VIEW STUDENT MODAL ───────────────────────── */}
      {modal === 'viewStudent' && selectedStudent && (
        <Modal
          title="Student Details"
          onClose={closeModal}
        >
          <div style={styles.studentProfile}>

            <div style={styles.profileAvatar}>
              {selectedStudent.fullName.charAt(0).toUpperCase()}
            </div>

            <div style={styles.profileName}>
              {selectedStudent.fullName}
            </div>

            <div style={styles.profileDetails}>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>
                  Admission No.
                </span>
                <span style={styles.profileValue}>
                  {selectedStudent.admissionNumber}
                </span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Stream</span>
                <span style={styles.profileValue}>
                  {selectedStudent.stream?.streamName || '—'}
                </span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>
                  Year Enrolled
                </span>
                <span style={styles.profileValue}>
                  {selectedStudent.yearEnrolled}
                </span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>Status</span>
                <span style={{
                  ...styles.statusBadge,
                  background: selectedStudent.isActive
                    ? '#f0fff4' : '#fff5f5',
                  color: selectedStudent.isActive
                    ? '#276749' : '#c53030',
                }}>
                  {selectedStudent.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div style={styles.profileNote}>
              📌 Full book history and loss reports will be
              visible here in a future update.
            </div>

          </div>

          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM DEACTIVATE MODAL ─────────────────── */}
      {modal === 'confirmDeactivate' && (
        <Modal title="Deactivate Student" onClose={closeModal}>
          <div style={styles.confirmContent}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={styles.confirmText}>
              Deactivate{' '}
              <strong>{selectedStudent?.fullName}</strong>?
            </p>
            <p style={styles.confirmSub}>
              This student will be marked as inactive.
              Their book and borrow history will be kept.
              You can reactivate them later if needed.
            </p>
          </div>
          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button
              style={styles.dangerBtn}
              onClick={handleDeactivate}
            >
              Yes, Deactivate
            </button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM ACTIVATE MODAL ───────────────────── */}
      {modal === 'confirmActivate' && (
        <Modal title="Activate Student" onClose={closeModal}>
          <div style={styles.confirmContent}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={styles.confirmText}>
              Activate{' '}
              <strong>{selectedStudent?.fullName}</strong>?
            </p>
            <p style={styles.confirmSub}>
              This student will be marked as active.
              They will be able to borrow books again.
            </p>
          </div>
          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button
              style={styles.primaryBtn}
              onClick={handleActivate}
            >
              Yes, Activate
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div
        style={modalStyles.box}
        onClick={e => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 13,
        fontWeight: 600, color: '#333', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  pageTitle: {
    margin: 0, fontSize: 24,
    fontWeight: 700, color: '#1a1a2e',
  },
  pageSub: { margin: '4px 0 0', color: '#666', fontSize: 14 },
  successMsg: {
    background: '#f0fff4', border: '1px solid #c6f6d5',
    borderRadius: 8, padding: '10px 16px',
    color: '#276749', fontSize: 13, marginBottom: 16,
  },
  errorMsg: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 16px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  filterBar: {
    background: '#fff', borderRadius: 12,
    padding: '16px 20px', marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', gap: 20,
    flexWrap: 'wrap', alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  filterLabel: {
    fontSize: 12, fontWeight: 600,
    color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  select: {
    padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
    background: '#fff', minWidth: 200,
    fontFamily: 'Segoe UI, sans-serif', cursor: 'pointer',
  },
  selectPlaceholder: {
    padding: '8px 12px', color: '#aaa',
    fontSize: 13, fontStyle: 'italic',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
    minWidth: 220, fontFamily: 'Segoe UI, sans-serif',
  },
  toggleRow: { display: 'flex', gap: 0 },
  toggleBtn: {
    padding: '8px 14px', border: '1.5px solid #e0e0e0',
    background: '#f0f2f5', color: '#666',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  toggleBtnActive: {
    background: '#1a1a2e', color: '#fff',
    border: '1.5px solid #1a1a2e', fontWeight: 600,
  },
  streamSummary: {
    background: '#1a1a2e', borderRadius: 12,
    padding: '14px 20px', marginBottom: 16,
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 12,
  },
  summaryLeft: {
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  summaryStreamName: {
    color: '#fff', fontWeight: 700, fontSize: 16,
  },
  summaryTeacher: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12,
  },
  summaryStats: {
    display: 'flex', gap: 24,
  },
  summaryStat: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2,
  },
  summaryStatValue: {
    color: '#fff', fontWeight: 700, fontSize: 20,
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11,
  },
  loadingText: {
    color: '#888', padding: 40,
    textAlign: 'center', fontSize: 14,
  },
  emptyState: {
    background: '#fff', borderRadius: 12, padding: 60,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18, fontWeight: 700,
    color: '#1a1a2e', marginBottom: 6,
  },
  emptySub: { color: '#888', fontSize: 14 },
  tableCard: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
  },
  tableHead: { borderBottom: '2px solid #f0f2f5' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    color: '#888', fontWeight: 600, fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
    background: '#fafbfc',
  },
  tableRow: {
    borderBottom: '1px solid #f0f2f5',
    transition: 'background 0.15s',
  },
  td: { padding: '12px 16px', color: '#333' },
  admissionNo: {
    fontFamily: 'monospace', fontSize: 13,
    background: '#f0f2f5', padding: '2px 8px',
    borderRadius: 4, color: '#555',
  },
  studentName: { fontWeight: 600, color: '#1a1a2e' },
  statusBadge: {
    fontSize: 11, fontWeight: 600,
    padding: '3px 10px', borderRadius: 20,
    display: 'inline-block',
  },
  actionRow: { display: 'flex', gap: 8 },
  viewBtn: {
    padding: '5px 12px',
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  deactivateBtn: {
    padding: '5px 12px',
    background: '#fff5f5', color: '#c53030',
    border: '1.5px solid #fed7d7', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  activateBtn: {
    padding: '5px 12px',
    background: '#f0fff4', color: '#276749',
    border: '1.5px solid #c6f6d5', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  primaryBtn: {
    background: '#1a1a2e', color: '#fff',
    border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  cancelBtn: {
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  dangerBtn: {
    background: '#fff5f5', color: '#c53030',
    border: '1.5px solid #fed7d7', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  input: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  inputHint: {
    fontSize: 11, color: '#999',
    marginTop: 4, display: 'block',
  },
  modalError: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 14px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  modalActions: {
    display: 'flex', justifyContent: 'flex-end',
    gap: 10, marginTop: 20,
  },
  confirmContent: {
    textAlign: 'center', padding: '8px 0 16px',
  },
  confirmText: {
    fontSize: 15, color: '#333',
    margin: '0 0 8px', lineHeight: 1.5,
  },
  confirmSub: {
    fontSize: 13, color: '#888',
    margin: 0, lineHeight: 1.5,
  },
  studentProfile: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8,
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 28,
    fontWeight: 700, marginBottom: 4,
  },
  profileName: {
    fontSize: 20, fontWeight: 700, color: '#1a1a2e',
  },
  profileDetails: {
    width: '100%', marginTop: 12,
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  profileRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '10px 0',
    borderBottom: '1px solid #f0f2f5',
  },
  profileLabel: {
    fontSize: 13, color: '#888', fontWeight: 500,
  },
  profileValue: {
    fontSize: 13, color: '#333', fontWeight: 600,
  },
  profileNote: {
    fontSize: 12, color: '#aaa',
    textAlign: 'center', marginTop: 8,
    fontStyle: 'italic', lineHeight: 1.5,
  },
};

const modalStyles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  box: {
    background: '#fff', borderRadius: 14,
    width: '100%', maxWidth: 460,
    maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '18px 22px',
    borderBottom: '1px solid #f0f2f5',
  },
  title: {
    margin: 0, fontSize: 17,
    fontWeight: 700, color: '#1a1a2e',
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 16, cursor: 'pointer',
    color: '#888', padding: 4,
  },
  body: { padding: '20px 22px', overflowY: 'auto' },
};