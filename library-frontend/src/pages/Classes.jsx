import { useState, useEffect } from 'react';
import { classService, streamService, userService } from '../services/libraryApi';

export default function Classes() {

  // All classes from the database
  const [classes, setClasses] = useState([]);

  // Which class is currently expanded to show streams
  // Stores the classId of the expanded class, null if none
  const [expandedClassId, setExpandedClassId] = useState(null);

  // Streams for the currently expanded class
  const [streams, setStreams] = useState([]);

  // All teachers — loaded when librarian wants to assign
  const [teachers, setTeachers] = useState([]);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Controls which modal is open
  // null = no modal open
  const [modal, setModal] = useState(null);
  // modal values: 'addClass' | 'addStream' | 'assignTeacher'

  // The stream currently being assigned a teacher
  const [selectedStream, setSelectedStream] = useState(null);

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
    // If clicking the already expanded class — collapse it
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
    setError('');

    try {
      await classService.create({
        className: classForm.className,
        gradeLevel: parseInt(classForm.gradeLevel),
        academicYear: parseInt(classForm.academicYear),
      });

      showSuccess('Class created successfully');
      closeModal();
      loadClasses();

      // Reset form
      setClassForm({
        className: '',
        gradeLevel: '',
        academicYear: new Date().getFullYear(),
      });

    } catch (err) {
      setError(err.response?.data || 'Failed to create class');
    }
  };

  // ── ADD STREAM ────────────────────────────────────────
  const handleAddStream = async (e) => {
    e.preventDefault();
    setError('');

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

      // Reload streams for this class
      const res = await streamService.getByClass(expandedClassId);
      setStreams(res.data);

      // Reset form
      setStreamForm({ streamName: '', capacity: 40 });

    } catch (err) {
      setError(err.response?.data || 'Failed to create stream');
    }
  };

  // ── OPEN ASSIGN TEACHER MODAL ─────────────────────────
  const handleOpenAssign = async (stream) => {
    setSelectedStream(stream);
    setSelectedTeacherId('');
    setError('');

    try {
      // Load all teachers from the database
      const res = await userService.getByRole('TEACHER');

      // Only show active teachers
      const activeTeachers = res.data.filter(t => t.active);
      setTeachers(activeTeachers);

    } catch (err) {
      setTeachers([]);
    }

    setModal('assignTeacher');
  };

  //  ASSIGN TEACHER
  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) {
      setError('Please select a teacher first');
      return;
    }

    setError('');

    try {
      await streamService.assignTeacher(
        parseInt(selectedStream.streamId),
        parseInt(selectedTeacherId)
      );

      // Find the teacher name for the success message
      const teacher = teachers.find(
        t => t.userId === parseInt(selectedTeacherId)
      );

      showSuccess(
        `${teacher?.fullName || 'Teacher'} assigned to stream ${selectedStream.streamName}`
      );

      closeModal();

      // Reload streams to show updated teacher
      const res = await streamService.getByClass(expandedClassId);
      setStreams(res.data);

    } catch (err) {
      setError(err.response?.data || 'Failed to assign teacher');
    }
  };

  // ── HELPERS ───────────────────────────────────────────

  const showSuccess = (message) => {
    setSuccess(message);
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  const closeModal = () => {
    setModal(null);
    setError('');
  };

  // Find the class object for the expanded class
  const expandedClass = classes.find(
    c => c.classId === expandedClassId
  );

  // ── RENDER ────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Classes & Streams</h1>
          <p style={styles.pageSub}>
            Manage school classes and their streams
          </p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setModal('addClass')}
        >
          + Add Class
        </button>
      </div>

      {/* ── FEEDBACK MESSAGES ────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>
          ✅ {success}
        </div>
      )}
      {error && !modal && (
        <div style={styles.errorMsg}>
          ⚠️ {error}
        </div>
      )}

      {/* ── CLASSES LIST ─────────────────────────────── */}
      {loadingClasses ? (
        <div style={styles.loadingText}>Loading classes...</div>
      ) : classes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏫</div>
          <div style={styles.emptyTitle}>No classes yet</div>
          <div style={styles.emptySub}>
            Click "Add Class" to create the first class
          </div>
        </div>
      ) : (
        <div style={styles.classesList}>
          {classes.map((cls) => {
            const isExpanded = expandedClassId === cls.classId;

            return (
              <div key={cls.classId} style={styles.classCard}>

                {/* ── CLASS ROW ──────────────────────── */}
                <div
                  style={styles.classRow}
                  onClick={() => handleExpandClass(cls.classId)}
                >
                  <div style={styles.classLeft}>
                    {/* Expand/collapse arrow */}
                    <span style={styles.arrow}>
                      {isExpanded ? '▼' : '▶'}
                    </span>

                    <div style={styles.classIcon}>
                      {cls.gradeLevel}
                    </div>

                    <div>
                      <div style={styles.className}>
                        {cls.className}
                      </div>
                      <div style={styles.classMeta}>
                        Grade {cls.gradeLevel} •{' '}
                        Academic Year {cls.academicYear}
                      </div>
                    </div>
                  </div>

                  {/* Add Stream button — only when expanded */}
                  {isExpanded && (
                    <button
                      style={styles.secondaryBtn}
                      onClick={(e) => {
                        // Stop click from collapsing the class
                        e.stopPropagation();
                        setModal('addStream');
                      }}
                    >
                      + Add Stream
                    </button>
                  )}
                </div>

                {/* ── STREAMS SECTION ────────────────── */}
                {isExpanded && (
                  <div style={styles.streamsSection}>

                    {loadingStreams ? (
                      <div style={styles.loadingText}>
                        Loading streams...
                      </div>
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
                          />
                        ))}
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD CLASS MODAL ──────────────────────────── */}
      {modal === 'addClass' && (
        <Modal
          title="Add New Class"
          onClose={closeModal}
        >
          <form onSubmit={handleAddClass}>
            {error && <div style={styles.modalError}>{error}</div>}

            <FormField label="Class Name">
              <input
                style={styles.input}
                placeholder="e.g. Grade 7"
                value={classForm.className}
                onChange={e => setClassForm({
                  ...classForm,
                  className: e.target.value,
                })}
                required
              />
            </FormField>

            <FormField label="Grade Level">
              <input
                style={styles.input}
                type="number"
                min="1"
                max="12"
                placeholder="e.g. 7"
                value={classForm.gradeLevel}
                onChange={e => setClassForm({
                  ...classForm,
                  gradeLevel: e.target.value,
                })}
                required
              />
            </FormField>

            <FormField label="Academic Year">
              <input
                style={styles.input}
                type="number"
                value={classForm.academicYear}
                onChange={e => setClassForm({
                  ...classForm,
                  academicYear: e.target.value,
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
              <button type="submit" style={styles.primaryBtn}>
                Create Class
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ADD STREAM MODAL ─────────────────────────── */}
      {modal === 'addStream' && (
        <Modal
          title={`Add Stream to ${expandedClass?.className}`}
          onClose={closeModal}
        >
          <form onSubmit={handleAddStream}>
            {error && <div style={styles.modalError}>{error}</div>}

            <FormField label="Stream Name">
              <input
                style={styles.input}
                placeholder="e.g. 7A"
                value={streamForm.streamName}
                onChange={e => setStreamForm({
                  ...streamForm,
                  streamName: e.target.value,
                })}
                required
              />
            </FormField>

            <FormField label="Capacity (number of students)">
              <input
                style={styles.input}
                type="number"
                min="1"
                max="100"
                value={streamForm.capacity}
                onChange={e => setStreamForm({
                  ...streamForm,
                  capacity: e.target.value,
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
              <button type="submit" style={styles.primaryBtn}>
                Create Stream
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ASSIGN TEACHER MODAL ─────────────────────── */}
      {modal === 'assignTeacher' && (
        <Modal
          title={`Assign Teacher to ${selectedStream?.streamName}`}
          onClose={closeModal}
        >
          {error && <div style={styles.modalError}>{error}</div>}

          {teachers.length === 0 ? (
            // No teachers in the system yet
            <div style={styles.noTeachersMsg}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                No teachers available
              </div>
              <div style={{ color: '#888', fontSize: 13 }}>
                Go to the Users page to add teachers first,
                then come back to assign one.
              </div>
            </div>
          ) : (
            <>
              <p style={styles.assignNote}>
                Select a teacher to assign to stream{' '}
                <strong>{selectedStream?.streamName}</strong>:
              </p>

              {/* Teacher list — radio button style */}
              <div style={styles.teacherList}>
                {teachers.map((teacher) => (
                  <div
                    key={teacher.userId}
                    style={{
                      ...styles.teacherItem,
                      ...(selectedTeacherId === String(teacher.userId)
                        ? styles.teacherItemSelected
                        : {}),
                    }}
                    onClick={() =>
                      setSelectedTeacherId(String(teacher.userId))
                    }
                  >
                    <div style={styles.teacherAvatar}>
                      {teacher.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={styles.teacherName}>
                        {teacher.fullName}
                      </div>
                      <div style={styles.teacherUsername}>
                        @{teacher.userName}
                      </div>
                    </div>
                    {/* Checkmark when selected */}
                    {selectedTeacherId === String(teacher.userId) && (
                      <span style={styles.checkmark}>✓</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.primaryBtn,
                    opacity: selectedTeacherId ? 1 : 0.5,
                  }}
                  onClick={handleAssignTeacher}
                  disabled={!selectedTeacherId}
                >
                  Assign Teacher
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

    </div>
  );
}

// ── STREAM CARD ───────────────────────────────────────────────────────
// Shows one stream with its teacher status
function StreamCard({ stream, onAssignTeacher }) {
  const hasTeacher = !!stream.teacher;

  return (
    <div style={streamStyles.card}>

      {/* Stream name */}
      <div style={streamStyles.streamName}>
        {stream.streamName}
      </div>

      {/* Teacher status indicator */}
      <div style={streamStyles.teacherRow}>
        <span style={{
          ...streamStyles.dot,
          background: hasTeacher ? '#48bb78' : '#cbd5e0',
        }} />
        <span style={streamStyles.teacherText}>
          {hasTeacher
            ? stream.teacher.fullName
            : 'No teacher assigned'}
        </span>
      </div>

      {/* Capacity */}
      <div style={streamStyles.capacity}>
        Capacity: {stream.capacity} students
      </div>

      {/* Assign Teacher button */}
      <button
        style={streamStyles.assignBtn}
        onClick={() => onAssignTeacher(stream)}
      >
        {hasTeacher ? '↩ Reassign Teacher' : '+ Assign Teacher'}
      </button>

    </div>
  );
}

// ── MODAL COMPONENT ───────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    // Backdrop — clicking outside closes modal
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div
        style={modalStyles.box}
        // Stop click from reaching backdrop
        onClick={e => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={modalStyles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── FORM FIELD WRAPPER ────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#333',
        marginBottom: 6,
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  pageSub: {
    margin: '4px 0 0',
    color: '#666',
    fontSize: 14,
  },
  successMsg: {
    background: '#f0fff4',
    border: '1px solid #c6f6d5',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#276749',
    fontSize: 13,
    marginBottom: 16,
  },
  errorMsg: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#c53030',
    fontSize: 13,
    marginBottom: 16,
  },
  loadingText: {
    color: '#888',
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  emptyState: {
    background: '#fff',
    borderRadius: 12,
    padding: 60,
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  emptySub: { color: '#888', fontSize: 14 },

  classesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  classCard: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  classRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  classLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  arrow: {
    color: '#888',
    fontSize: 12,
    width: 16,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  className: {
    fontWeight: 700,
    fontSize: 16,
    color: '#1a1a2e',
  },
  classMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  streamsSection: {
    borderTop: '1px solid #f0f2f5',
    padding: '16px 20px',
    background: '#fafbfc',
  },
  noStreams: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    padding: '20px 0',
  },
  streamsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },

  primaryBtn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  secondaryBtn: {
    background: '#f0f2f5',
    color: '#333',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  cancelBtn: {
    background: '#f0f2f5',
    color: '#333',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  modalError: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#c53030',
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },

  assignNote: {
    fontSize: 14,
    color: '#555',
    marginBottom: 14,
    lineHeight: 1.5,
  },
  teacherList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 280,
    overflowY: 'auto',
    marginBottom: 8,
  },
  teacherItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  teacherItemSelected: {
    border: '1.5px solid #1a1a2e',
    background: '#f7f8fc',
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  teacherName: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1a1a2e',
  },
  teacherUsername: {
    fontSize: 12,
    color: '#888',
  },
  checkmark: {
    marginLeft: 'auto',
    color: '#276749',
    fontWeight: 700,
    fontSize: 16,
  },
  noTeachersMsg: {
    textAlign: 'center',
    padding: '24px 0',
    color: '#555',
    fontSize: 14,
  },
};

const streamStyles = {
  card: {
    background: '#ffffff',
    border: '1.5px solid #e8ecf0',
    borderRadius: 10,
    padding: '14px 16px',
  },
  streamName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  teacherRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  teacherText: {
    fontSize: 13,
    color: '#555',
  },
  capacity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  assignBtn: {
    width: '100%',
    padding: '7px',
    background: '#f0f2f5',
    border: '1.5px solid #e0e0e0',
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
};

const modalStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  box: {
    background: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid #f0f2f5',
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: '#888',
    padding: 4,
  },
  body: {
    padding: '20px 22px',
    overflowY: 'auto',
  },
};