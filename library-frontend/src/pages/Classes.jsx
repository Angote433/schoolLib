import { useState, useEffect } from 'react';
import { classService, streamService, userService } from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import {
  Modal, FormField, Input, Button, Banner, EmptyState, Card, Avatar, ModalActions,
} from '../components/SharedComponents';
import useScreenSize from '../hooks/useScreenSize';

export default function Classes() {
  const { isMobile } = useScreenSize();

  // All classes from the database
  const [classes, setClasses] = useState([]);

  // Which class is currently expanded to show streams
  const [expandedClassId, setExpandedClassId] = useState(null);

  // Streams for the currently expanded class
  const [streams, setStreams] = useState([]);

  // All teachers — loaded when librarian wants to assign
  const [teachers, setTeachers] = useState([]);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Controls which modal is open
  const [modal, setModal] = useState(null);
  // modal values: 'addClass' | 'addStream' | 'assignTeacher' | 'removeTeacher'

  // The stream currently being assigned/unassigned a teacher
  const [selectedStream, setSelectedStream] = useState(null);

  // All streams (every class) — used only to show, next to each
  // candidate teacher in the assign modal, which stream (if any) they
  // currently hold, so the librarian can see the consequence before
  // choosing (Feature 3.5).
  const [allStreams, setAllStreams] = useState([]);

  // Set once the API has warned that this assignment would displace an
  // existing link — holds the warning text; requires a second click.
  const [assignWarning, setAssignWarning] = useState('');

  // Form states
  const [classForm, setClassForm] = useState({
    className: '',
    gradeLevel: '',
    academicYear: new Date().getFullYear(),
  });

  const [streamForm, setStreamForm] = useState({
    streamName: '',
    capacity: 40,
  });

  // Teacher selection for assignment
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Feedback messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── LOAD CLASSES ON PAGE LOAD ─────────────────────────
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await classService.getAll();
      setClasses(res.data);
    } catch (err) {
      setError('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // ── EXPAND CLASS TO SEE STREAMS ───────────────────────
  const handleExpandClass = async (classId) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      setStreams([]);
      return;
    }

    setExpandedClassId(classId);
    setLoadingStreams(true);

    try {
      const res = await streamService.getByClass(classId);
      setStreams(res.data);
    } catch (err) {
      setError('Failed to load streams');
    } finally {
      setLoadingStreams(false);
    }
  };

  // ── ADD CLASS ─────────────────────────────────────────
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    try {
      await classService.create({
        className: classForm.className,
        gradeLevel: parseInt(classForm.gradeLevel),
        academicYear: parseInt(classForm.academicYear),
      });

      showSuccess('Class created successfully');
      closeModal();
      loadClasses();

      setClassForm({
        className: '',
        gradeLevel: '',
        academicYear: new Date().getFullYear(),
      });

    } catch (err) {
      setError(err.response?.data || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  // ── ADD STREAM ────────────────────────────────────────
  const handleAddStream = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    try {
      await streamService.create(
        {
          streamName: streamForm.streamName,
          capacity: parseInt(streamForm.capacity),
          isActive: true,
        },
        expandedClassId
      );

      showSuccess(`Stream ${streamForm.streamName} created`);
      closeModal();

      const res = await streamService.getByClass(expandedClassId);
      setStreams(res.data);

      setStreamForm({ streamName: '', capacity: 40 });

    } catch (err) {
      setError(err.response?.data || 'Failed to create stream');
    } finally {
      setSubmitting(false);
    }
  };

  // ── OPEN ASSIGN TEACHER MODAL ─────────────────────────
  const handleOpenAssign = async (stream) => {
    setSelectedStream(stream);
    setSelectedTeacherId('');
    setAssignWarning('');
    setError('');

    try {
      const [teachersRes, streamsRes] = await Promise.all([
        userService.getByRole('TEACHER'),
        streamService.getAll(),
      ]);
      setTeachers(teachersRes.data.filter(t => t.active));
      setAllStreams(streamsRes.data);
    } catch (err) {
      setTeachers([]);
      setAllStreams([]);
    }

    setModal('assignTeacher');
  };

  // Which stream (if any) a given teacher currently holds — shown next
  // to each candidate so the librarian sees the consequence up front.
  const currentStreamOf = (teacherId) => {
    const stream = allStreams.find(s => s.teacher?.userId === teacherId);
    return stream ? stream.streamName : null;
  };

  //  ASSIGN TEACHER — first call has confirm=false; a 409 means it would
  //  displace an existing link, so the warning is shown and a second
  //  click (confirm=true) is required to proceed.
  const handleAssignTeacher = async (confirm = false) => {
    if (!selectedTeacherId || submitting) {
      if (!selectedTeacherId) setError('Please select a teacher first');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await streamService.assignTeacher(
        parseInt(selectedStream.streamId),
        parseInt(selectedTeacherId),
        confirm
      );

      const teacher = teachers.find(t => t.userId === parseInt(selectedTeacherId));

      showSuccess(`${teacher?.fullName || 'Teacher'} assigned to stream ${selectedStream.streamName}`);

      closeModal();

      const res = await streamService.getByClass(expandedClassId);
      setStreams(res.data);

    } catch (err) {
      if (err.response?.status === 409 && !confirm) {
        setAssignWarning(err.response.data?.message || 'This will displace an existing assignment.');
      } else {
        setError(err.response?.data?.message || 'Failed to assign teacher');
        setAssignWarning('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── REMOVE TEACHER ─────────────────────────────────────
  const handleRemoveTeacher = async () => {
    setSubmitting(true);
    setError('');
    try {
      await streamService.removeTeacher(selectedStream.streamId);
      showSuccess(`Teacher removed from stream ${selectedStream.streamName}`);
      closeModal();

      const res = await streamService.getByClass(expandedClassId);
      setStreams(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove teacher');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const closeModal = () => {
    setModal(null);
    setError('');
    setAssignWarning('');
    setSelectedStream(null);
  };

  const expandedClass = classes.find(c => c.classId === expandedClassId);

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Classes &amp; Streams</h1>
          <p style={styles.pageSub}>Manage school classes and their streams</p>
        </div>
        <Button variant="primary" onClick={() => setModal('addClass')}>
          + Add Class
        </Button>
      </div>

      {/* ── FEEDBACK MESSAGES ────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && !modal && <Banner type="error">{error}</Banner>}

      {/* ── CLASSES LIST ─────────────────────────────── */}
      {loadingClasses ? (
        <div style={styles.loadingText}>Loading classes…</div>
      ) : classes.length === 0 ? (
        <EmptyState icon="🏫" title="No classes yet" subtitle='Click "Add Class" to create the first class' />
      ) : (
        <div style={styles.classesList}>
          {classes.map((cls) => {
            const isExpanded = expandedClassId === cls.classId;

            return (
              <Card key={cls.classId} style={{ padding: 0, overflow: 'hidden' }}>

                {/* ── CLASS ROW ──────────────────────── */}
                <div
                  style={{ ...styles.classRow, ...(isMobile ? { flexWrap: 'wrap', gap: 10 } : {}) }}
                  onClick={() => handleExpandClass(cls.classId)}
                >
                  <div style={styles.classLeft}>
                    <span style={styles.arrow}>{isExpanded ? '▼' : '▶'}</span>
                    <div style={styles.classIcon}>{cls.gradeLevel}</div>
                    <div>
                      <div style={styles.className}>{cls.className}</div>
                      <div style={styles.classMeta}>
                        Grade {cls.gradeLevel} • Academic Year {cls.academicYear}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <Button
                      variant="secondary" size="sm"
                      onClick={(e) => { e.stopPropagation(); setModal('addStream'); }}
                    >
                      + Add Stream
                    </Button>
                  )}
                </div>

                {/* ── STREAMS SECTION ────────────────── */}
                {isExpanded && (
                  <div style={styles.streamsSection}>
                    {loadingStreams ? (
                      <div style={styles.loadingText}>Loading streams…</div>
                    ) : streams.length === 0 ? (
                      <div style={styles.noStreams}>
                        No streams yet. Click "+ Add Stream" to create one.
                      </div>
                    ) : (
                      <div style={styles.streamsGrid}>
                        {streams.map((stream) => (
                          <StreamCard
                            key={stream.streamId}
                            stream={stream}
                            onAssignTeacher={handleOpenAssign}
                            onRemoveTeacher={() => { setSelectedStream(stream); setModal('removeTeacher'); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </Card>
            );
          })}
        </div>
      )}

      {/* ── ADD CLASS MODAL ──────────────────────────── */}
      {modal === 'addClass' && (
        <Modal title="Add New Class" onClose={closeModal}>
          <form onSubmit={handleAddClass}>
            {error && <Banner type="error">{error}</Banner>}

            <FormField label="Class Name">
              <Input
                placeholder="e.g. Grade 7"
                value={classForm.className}
                onChange={e => setClassForm({ ...classForm, className: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Grade Level">
              <Input
                type="number" min="1" max="12"
                placeholder="e.g. 7"
                value={classForm.gradeLevel}
                onChange={e => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Academic Year">
              <Input
                type="number"
                value={classForm.academicYear}
                onChange={e => setClassForm({ ...classForm, academicYear: e.target.value })}
                required
              />
            </FormField>

            <ModalActions>
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Class'}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── ADD STREAM MODAL ─────────────────────────── */}
      {modal === 'addStream' && (
        <Modal title={`Add Stream to ${expandedClass?.className}`} onClose={closeModal}>
          <form onSubmit={handleAddStream}>
            {error && <Banner type="error">{error}</Banner>}

            <FormField label="Stream Name">
              <Input
                placeholder="e.g. 7A"
                value={streamForm.streamName}
                onChange={e => setStreamForm({ ...streamForm, streamName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Capacity (number of students)">
              <Input
                type="number" min="1" max="100"
                value={streamForm.capacity}
                onChange={e => setStreamForm({ ...streamForm, capacity: e.target.value })}
                required
              />
            </FormField>

            <ModalActions>
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Stream'}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── ASSIGN TEACHER MODAL ─────────────────────── */}
      {modal === 'assignTeacher' && (
        <Modal title={`Assign Teacher to ${selectedStream?.streamName}`} onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          {assignWarning && <Banner type="warning">{assignWarning}</Banner>}

          {teachers.length === 0 ? (
            <div style={styles.noTeachersMsg}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No teachers available</div>
              <div style={{ color: tokens.colors.textMuted, fontSize: 13 }}>
                Go to the Users page to add teachers first, then come back to assign one.
              </div>
            </div>
          ) : (
            <>
              <p style={styles.assignNote}>
                Select a teacher to assign to stream <strong>{selectedStream?.streamName}</strong>:
              </p>

              <div style={styles.teacherList}>
                {teachers.map((teacher) => {
                  const currentStream = currentStreamOf(teacher.userId);
                  return (
                    <div
                      key={teacher.userId}
                      style={{
                        ...styles.teacherItem,
                        ...(selectedTeacherId === String(teacher.userId) ? styles.teacherItemSelected : {}),
                      }}
                      onClick={() => { setSelectedTeacherId(String(teacher.userId)); setAssignWarning(''); }}
                    >
                      <Avatar name={teacher.fullName} size={36} background={tokens.colors.primary} />
                      <div>
                        <div style={styles.teacherName}>{teacher.fullName}</div>
                        <div style={styles.teacherUsername}>
                          @{teacher.userName}
                          {currentStream && currentStream !== selectedStream?.streamName && (
                            <span style={styles.teacherCurrentStream}> · currently teaches {currentStream}</span>
                          )}
                        </div>
                      </div>
                      {selectedTeacherId === String(teacher.userId) && (
                        <span style={styles.checkmark}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <ModalActions>
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                {assignWarning ? (
                  <Button
                    variant="danger"
                    onClick={() => handleAssignTeacher(true)}
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming…' : 'Confirm & Continue'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleAssignTeacher(false)}
                    disabled={!selectedTeacherId || submitting}
                  >
                    {submitting ? 'Assigning…' : 'Assign Teacher'}
                  </Button>
                )}
              </ModalActions>
            </>
          )}
        </Modal>
      )}

      {/* ── REMOVE TEACHER MODAL ─────────────────────── */}
      {modal === 'removeTeacher' && (
        <Modal title="Remove Teacher" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.confirmContent}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={styles.confirmText}>
              Remove <strong>{selectedStream?.teacher?.fullName}</strong> from stream{' '}
              <strong>{selectedStream?.streamName}</strong>?
            </p>
            <p style={styles.confirmSub}>
              The stream keeps its students and history — only the teacher link is removed.
              You can assign a new teacher at any time.
            </p>
          </div>
          <ModalActions>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={handleRemoveTeacher} disabled={submitting}>
              {submitting ? 'Removing…' : 'Yes, Remove Teacher'}
            </Button>
          </ModalActions>
        </Modal>
      )}

    </div>
  );
}

// ── STREAM CARD ───────────────────────────────────────────────────────
function StreamCard({ stream, onAssignTeacher, onRemoveTeacher }) {
  const hasTeacher = !!stream.teacher;

  return (
    <div style={streamStyles.card}>
      <div style={streamStyles.streamName}>{stream.streamName}</div>

      <div style={streamStyles.teacherRow}>
        <span style={{
          ...streamStyles.dot,
          background: hasTeacher ? tokens.colors.success : tokens.colors.borderStrong,
        }} />
        <span style={streamStyles.teacherText}>
          {hasTeacher ? stream.teacher.fullName : 'Unassigned'}
        </span>
      </div>

      <div style={streamStyles.capacity}>Capacity: {stream.capacity} students</div>

      <div style={streamStyles.actionRow}>
        <Button
          variant="secondary" size="sm"
          style={{ flex: 1 }}
          onClick={() => onAssignTeacher(stream)}
        >
          {hasTeacher ? '↩ Reassign' : '+ Assign Teacher'}
        </Button>
        {hasTeacher && (
          <Button
            variant="danger" size="sm"
            onClick={onRemoveTeacher}
          >
            Remove
          </Button>
        )}
      </div>
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
  loadingText: { color: tokens.colors.textMuted, padding: 20, textAlign: 'center', fontSize: 14 },

  classesList: { display: 'flex', flexDirection: 'column', gap: 12 },
  classRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', cursor: 'pointer',
  },
  classLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  arrow: { color: tokens.colors.textMuted, fontSize: 12, width: 16 },
  classIcon: {
    width: 40, height: 40, borderRadius: tokens.radius.sm,
    background: tokens.colors.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  className: { fontWeight: 700, fontSize: 16, color: tokens.colors.textPrimary },
  classMeta: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 2 },

  streamsSection: {
    borderTop: `1px solid ${tokens.colors.border}`,
    padding: '18px 20px', background: tokens.colors.surface,
  },
  noStreams: { color: tokens.colors.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' },
  streamsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12,
  },

  assignNote: { fontSize: 14, color: tokens.colors.textSecondary, marginBottom: 14, lineHeight: 1.5 },
  teacherList: {
    display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 280, overflowY: 'auto', marginBottom: 8,
  },
  teacherItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: tokens.radius.sm,
    border: `1.5px solid ${tokens.colors.border}`,
    cursor: 'pointer', transition: tokens.transition,
  },
  teacherItemSelected: {
    border: `1.5px solid ${tokens.colors.primary}`,
    background: tokens.colors.surface,
  },
  teacherName: { fontWeight: 600, fontSize: 14, color: tokens.colors.textPrimary },
  teacherUsername: { fontSize: 12, color: tokens.colors.textMuted },
  teacherCurrentStream: { color: tokens.colors.warning, fontWeight: 600 },
  checkmark: { marginLeft: 'auto', color: tokens.colors.success, fontWeight: 700, fontSize: 16 },
  noTeachersMsg: { textAlign: 'center', padding: '24px 0', color: tokens.colors.textSecondary, fontSize: 14 },
};

const streamStyles = {
  card: {
    background: tokens.colors.card,
    border: `1.5px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: '16px 18px',
  },
  streamName: { fontSize: 22, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 8 },
  teacherRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  teacherText: { fontSize: 13, color: tokens.colors.textSecondary },
  capacity: { fontSize: 12, color: tokens.colors.textMuted, marginBottom: 12 },
  actionRow: { display: 'flex', gap: 8 },
};
