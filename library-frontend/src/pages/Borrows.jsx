import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  studentService,
  borrowService,
  streamService,
} from '../services/libraryApi';

const MODES = {
  ISSUE:    'issue',
  RETURN:   'return',
  ACTIVE:   'active',
  OVERDUE:  'overdue',
};

export default function Borrows() {
  const { user } = useAuth();
  const [mode, setMode] = useState(MODES.ISSUE);

  // Scan state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedBook, setScannedBook] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [activeBorrow, setActiveBorrow] = useState(null);

  // Student selection
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [dueDate, setDueDate] = useState('');

  // Lists
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [overdueBorrows, setOverdueBorrows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scanInputRef = useRef();

  // ── DEFAULT DUE DATE — 2 weeks from today ────────────
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    setDueDate(defaultDueDate());
    streamService.getAll()
      .then(res => {
        console.log('Streams loaded:', res.data);
        const activeStreams = res.data.filter(s => s.isActive !== false);
        console.log('Active streams:', activeStreams);
        setStreams(activeStreams);
      })
      .catch(err => {
        console.error('Failed to load streams:', err);
        setError('Failed to load streams');
      });
  }, []);

  useEffect(() => {
    resetState();
    if (mode === MODES.ACTIVE) loadActiveBorrows();
    if (mode === MODES.OVERDUE) loadOverdueBorrows();
    if (mode === MODES.ISSUE || mode === MODES.RETURN) {
      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);
    }
  }, [mode]);

  useEffect(() => {
    if (!selectedStreamId) { setStudents([]); return; }
    setLoadingStudents(true);
    studentService.getByStream(selectedStreamId)
      .then(res => setStudents(res.data.filter(s => s.isActive)))
      .finally(() => setLoadingStudents(false));
  }, [selectedStreamId]);

  // ── LOAD LISTS ────────────────────────────────────────
  const loadActiveBorrows = async () => {
    setLoadingList(true);
    try {
      const res = await borrowService.getActive();
      setActiveBorrows(res.data);
    } catch {
      setError('Failed to load active borrows');
    } finally {
      setLoadingList(false);
    }
  };

  const loadOverdueBorrows = async () => {
    setLoadingList(true);
    try {
      const res = await borrowService.getOverdue();
      setOverdueBorrows(res.data);
    } catch {
      setError('Failed to load overdue borrows');
    } finally {
      setLoadingList(false);
    }
  };

  // ── SCAN ──────────────────────────────────────────────
  const handleScan = async (e) => {
    if (e.key !== 'Enter') return;
    const code = barcodeInput.trim();
    if (!code) return;

    setScanLoading(true);
    setScanError('');
    setScannedBook(null);
    setActiveBorrow(null);

    try {
      const res = await bookService.scanByQr(code);
      const book = res.data;
      setScannedBook(book);

      if (mode === MODES.ISSUE && book.status !== 'AVAILABLE') {
        setScanError(
          `Book is ${book.status.toLowerCase()}. Only AVAILABLE books can be borrowed.`
        );
        return;
      }

      if (mode === MODES.RETURN) {
        if (book.status !== 'BORROWED') {
          setScanError(
            `Book is ${book.status.toLowerCase()}, not currently borrowed.`
          );
          return;
        }
        // Find active borrow record
        const borrowRes = await borrowService.getActive();
        const found = borrowRes.data.find(
          b => b.bookCopy?.qrCode === code
        );
        setActiveBorrow(found || null);
      }

    } catch (err) {
      if (err.response?.status === 404) {
        setScanError('No book found with this barcode.');
      } else {
        setScanError('Failed to look up book.');
      }
    } finally {
      setScanLoading(false);
    }
  };

  // ── ISSUE BOOK ────────────────────────────────────────
  const handleIssue = async () => {
    if (!scannedBook || !selectedStudent || !dueDate) return;
    setSubmitting(true);
    setError('');

    try {
      await borrowService.borrow({
        qrCode: scannedBook.qrCode,
        studentId: selectedStudent.studentId,
        dateDue: dueDate,
        librarianId: user.userId,
      });
      showSuccess(
        `✅ "${scannedBook.bookDetails?.titleName}" issued to ${selectedStudent.fullName}. Due: ${dueDate}`
      );
      resetState();
      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);
    } catch (err) {
      setError(err.response?.data || 'Failed to issue book');
    } finally {
      setSubmitting(false);
    }
  };

  // ── RETURN BORROWED BOOK ──────────────────────────────
  const handleReturn = async () => {
    if (!scannedBook) return;
    setSubmitting(true);
    setError('');

    try {
      await borrowService.returnBook(scannedBook.qrCode);
      showSuccess(
        `✅ "${scannedBook.bookDetails?.titleName}" returned successfully`
      );
      resetState();
      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);
    } catch (err) {
      setError(err.response?.data || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  // ── FLAG BORROW AS LOST ───────────────────────────────
  const handleFlagLost = async (record) => {
    if (!window.confirm(
      `Mark "${record.bookCopy?.bookDetails?.titleName}" as lost for ${record.student?.fullName}?`
    )) return;

    try {
      await borrowService.flagLost({
        qrCode: record.bookCopy?.qrCode,
        reason: 'Book not returned — flagged overdue by librarian',
      });
      showSuccess('Book flagged as lost. Loss report created.');
      loadOverdueBorrows();
      loadActiveBorrows();
    } catch (err) {
      setError(err.response?.data || 'Failed to flag as lost');
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
  };

  const resetState = () => {
    setBarcodeInput('');
    setScannedBook(null);
    setScanError('');
    setActiveBorrow(null);
    setSelectedStudent(null);
    setStudentSearch('');
    setError('');
    setSuccess('');
    setDueDate(defaultDueDate());
  };

  const filteredStudents = students.filter(s =>
    studentSearch === '' ||
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(
      studentSearch.toLowerCase()
    )
  );

  // Days overdue helper
  const daysOverdue = (dateDue) => {
    const due = new Date(dateDue);
    const today = new Date();
    const diff = Math.floor(
      (today - due) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  const canIssue =
    scannedBook?.status === 'AVAILABLE' &&
    selectedStudent && dueDate && !scanError;

  const canReturn =
    scannedBook?.status === 'BORROWED' && !scanError;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Library Borrows</h1>
          <p style={styles.pageSub}>
            Issue, return and track borrowed books
          </p>
        </div>
      </div>

      {success && <div style={styles.successMsg}>{success}</div>}
      {error && <div style={styles.errorMsg}>⚠️ {error}</div>}

      {/* ── MODE TABS ─────────────────────────────────── */}
      <div style={styles.modeTabs}>
        {[
          { key: MODES.ISSUE,   icon: '📖', label: 'Issue Book',   desc: 'Lend a book to student' },
          { key: MODES.RETURN,  icon: '↩️', label: 'Return Book',  desc: 'Process a return' },
          { key: MODES.ACTIVE,  icon: '📋', label: 'Active Borrows', desc: 'Currently borrowed' },
          { key: MODES.OVERDUE, icon: '🔴', label: 'Overdue',      desc: 'Track late returns' },
        ].map(tab => (
          <div
            key={tab.key}
            style={{
              ...tabStyles.tab,
              ...(mode === tab.key ? tabStyles.tabActive : {}),
            }}
            onClick={() => setMode(tab.key)}
          >
            <span style={tabStyles.icon}>{tab.icon}</span>
            <div>
              <div style={{
                ...tabStyles.label,
                color: mode === tab.key ? '#fff' : '#1a1a2e',
              }}>
                {tab.label}
              </div>
              <div style={{
                ...tabStyles.desc,
                color: mode === tab.key
                  ? 'rgba(255,255,255,0.6)' : '#888',
              }}>
                {tab.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ACTIVE BORROWS LIST ───────────────────────── */}
      {mode === MODES.ACTIVE && (
        <div style={styles.listCard}>
          <div style={styles.listCardHeader}>
            <span>📋 Currently Borrowed Books</span>
            <span style={styles.countBadge}>
              {activeBorrows.length} out
            </span>
          </div>
          {loadingList ? (
            <div style={styles.loadingText}>Loading...</div>
          ) : activeBorrows.length === 0 ? (
            <div style={styles.emptyList}>
              No books currently borrowed
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Book Title</th>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Admission No.</th>
                  <th style={styles.th}>Date Borrowed</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBorrows.map((record, i) => {
                  const overdue =
                    new Date(record.dateDue) < new Date();
                  return (
                    <tr
                      key={i}
                      style={{
                        ...styles.tableRow,
                        background: overdue
                          ? '#fff5f5' : 'transparent',
                      }}
                      onMouseEnter={e =>
                        e.currentTarget.style.background =
                          overdue ? '#fee' : '#f9fafb'
                      }
                      onMouseLeave={e =>
                        e.currentTarget.style.background =
                          overdue ? '#fff5f5' : 'transparent'
                      }
                    >
                      <td style={styles.td}>
                        <div style={styles.bookTitleCell}>
                          {record.bookCopy?.bookDetails?.titleName}
                        </div>
                        <div style={styles.bookSubject}>
                          {record.bookCopy?.qrCode}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {record.student?.fullName}
                      </td>
                      <td style={styles.td}>
                        {record.student?.admissionNumber}
                      </td>
                      <td style={styles.td}>
                        {record.dateBorrowed}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          color: overdue ? '#c53030' : '#333',
                          fontWeight: overdue ? 700 : 400,
                        }}>
                          {record.dateDue}
                          {overdue && ` (${daysOverdue(record.dateDue)}d overdue)`}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: overdue
                            ? '#fff5f5' : '#ebf8ff',
                          color: overdue
                            ? '#c53030' : '#2b6cb0',
                        }}>
                          {overdue ? 'OVERDUE' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── OVERDUE LIST ──────────────────────────────── */}
      {mode === MODES.OVERDUE && (
        <div style={styles.listCard}>
          <div style={styles.listCardHeader}>
            <span>🔴 Overdue Borrows</span>
            <span style={{
              ...styles.countBadge,
              background: '#c53030',
            }}>
              {overdueBorrows.length} overdue
            </span>
          </div>

          {overdueBorrows.length > 0 && (
            <div style={styles.overdueNotice}>
              ⚠️ These books are past their due date.
              Contact students to return them.
              If not returned, flag as Lost to generate
              a loss report for the secretary.
            </div>
          )}

          {loadingList ? (
            <div style={styles.loadingText}>Loading...</div>
          ) : overdueBorrows.length === 0 ? (
            <div style={styles.emptyList}>
              🎉 No overdue borrows — all books returned on time
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Book Title</th>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Days Overdue</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueBorrows.map((record, i) => (
                  <tr
                    key={i}
                    style={styles.tableRow}
                    onMouseEnter={e =>
                      e.currentTarget.style.background = '#fff5f5'
                    }
                    onMouseLeave={e =>
                      e.currentTarget.style.background = 'transparent'
                    }
                  >
                    <td style={styles.td}>
                      <div style={styles.bookTitleCell}>
                        {record.bookCopy?.bookDetails?.titleName}
                      </div>
                      <div style={styles.bookSubject}>
                        {record.bookCopy?.qrCode}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.bookTitleCell}>
                        {record.student?.fullName}
                      </div>
                      <div style={styles.bookSubject}>
                        {record.student?.admissionNumber}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        color: '#c53030', fontWeight: 700,
                      }}>
                        {record.dateDue}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: '#fff5f5',
                        color: '#c53030',
                      }}>
                        {daysOverdue(record.dateDue)} days
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.flagLostBtn}
                        onClick={() => handleFlagLost(record)}
                      >
                        ⚠️ Flag as Lost
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ISSUE / RETURN SCAN AREA ──────────────────── */}
      {(mode === MODES.ISSUE || mode === MODES.RETURN) && (
        <div style={styles.workArea}>

          {/* Left — scan panel */}
          <div style={styles.leftPanel}>
            <div style={styles.scanSection}>
              <div style={styles.scanLabel}>
                {mode === MODES.ISSUE
                  ? '📖 Scan book to issue'
                  : '↩️ Scan book to return'}
              </div>
              <div style={styles.scanHint}>
                Connect USB scanner and click below,
                then scan the barcode. Or type manually.
              </div>
              <div style={styles.scanInputWrap}>
                <input
                  ref={scanInputRef}
                  style={styles.scanInput}
                  placeholder="Click here, then scan barcode..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleScan}
                  autoComplete="off"
                />
                <button
                  style={styles.scanLookupBtn}
                  onClick={() => handleScan({ key: 'Enter' })}
                >
                  Look Up
                </button>
              </div>
              <div style={styles.scanTip}>
                💡 USB scanner auto-presses Enter after scanning
              </div>
              {scanLoading && (
                <div style={styles.scanLoadingMsg}>
                  🔍 Looking up book...
                </div>
              )}
              {scanError && (
                <div style={styles.scanErrorMsg}>
                  ❌ {scanError}
                </div>
              )}
            </div>

            {/* Book info card */}
            {scannedBook && !scanError && (
              <div style={styles.bookInfoCard}>
                <div style={styles.bookInfoHeader}>
                  📚 Book Found
                </div>
                {[
                  ['Title', scannedBook.bookDetails?.titleName],
                  ['Subject', scannedBook.bookDetails?.subject],
                  ['Grade', `Grade ${scannedBook.bookDetails?.gradeLevel}`],
                  ['Barcode', scannedBook.qrCode],
                  ['Status', scannedBook.status],
                ].map(([label, value]) => (
                  <div key={label} style={styles.bookInfoRow}>
                    <span style={styles.bookInfoLabel}>{label}</span>
                    <span style={{
                      ...styles.bookInfoValue,
                      fontFamily: label === 'Barcode'
                        ? 'monospace' : 'inherit',
                      fontSize: label === 'Barcode' ? 11 : 13,
                    }}>
                      {value}
                    </span>
                  </div>
                ))}

                {/* Active borrow info for return */}
                {mode === MODES.RETURN && activeBorrow && (
                  <div style={styles.holderInfo}>
                    <div style={styles.holderLabel}>
                      Borrowed by:
                    </div>
                    <div style={styles.holderName}>
                      {activeBorrow.student?.fullName}
                    </div>
                    <div style={styles.holderMeta}>
                      {activeBorrow.student?.admissionNumber}
                      {' • '}Due: {activeBorrow.dateDue}
                      {new Date(activeBorrow.dateDue) < new Date()
                        && (
                        <span style={{ color: '#c53030' }}>
                          {' '}⚠️ {daysOverdue(activeBorrow.dateDue)} days overdue
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Due date for issue */}
                {mode === MODES.ISSUE && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{
                      ...styles.bookInfoLabel,
                      display: 'block',
                      marginBottom: 6,
                    }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      style={styles.dueDateInput}
                      value={dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>
                )}

                <div style={styles.actionButtons}>
                  {mode === MODES.ISSUE && (
                    <button
                      style={{
                        ...styles.issueBtn,
                        opacity: canIssue ? 1 : 0.4,
                      }}
                      onClick={handleIssue}
                      disabled={!canIssue || submitting}
                    >
                      {submitting
                        ? 'Issuing...'
                        : selectedStudent
                        ? `Issue to ${selectedStudent.fullName}`
                        : 'Select a student →'}
                    </button>
                  )}
                  {mode === MODES.RETURN && (
                    <button
                      style={{
                        ...styles.returnBtn,
                        opacity: canReturn ? 1 : 0.4,
                      }}
                      onClick={handleReturn}
                      disabled={!canReturn || submitting}
                    >
                      {submitting
                        ? 'Processing...'
                        : '↩️ Confirm Return'}
                    </button>
                  )}
                  <button
                    style={styles.clearScanBtn}
                    onClick={resetState}
                  >
                    Clear & Scan Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right — student select (issue only) */}
          {mode === MODES.ISSUE && (
            <div style={styles.rightPanel}>
              <div style={styles.studentPanelHeader}>
                🎓 Select Student
              </div>
              <div style={styles.streamSelect}>
                <label style={styles.fieldLabel}>Stream</label>
                {streams.length === 0 ? (
                  <div style={{
                    padding: '8px 12px',
                    background: '#fff5f5',
                    border: '1.5px solid #fed7d7',
                    borderRadius: 8,
                    color: '#c53030',
                    fontSize: 13,
                  }}>
                    ⚠️ No streams available. Please check your connection or contact admin.
                  </div>
                ) : (
                  <select
                    style={styles.select}
                    value={selectedStreamId}
                    onChange={e => {
                      setSelectedStreamId(e.target.value);
                      setSelectedStudent(null);
                    }}
                  >
                    <option value="">Select a stream...</option>
                    {streams.map(s => (
                      <option key={s.streamId} value={s.streamId}>
                        {s.streamName}
                        {s.teacher ? ` — ${s.teacher.fullName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {selectedStreamId && (
                <div style={styles.studentSearch}>
                  <label style={styles.fieldLabel}>Search</label>
                  <input
                    style={styles.searchInput}
                    placeholder="Name or admission number..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                </div>
              )}
              <div style={styles.studentList}>
                {!selectedStreamId ? (
                  <div style={styles.studentListEmpty}>
                    Select a stream to see students
                  </div>
                ) : loadingStudents ? (
                  <div style={styles.studentListEmpty}>
                    Loading...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div style={styles.studentListEmpty}>
                    No students found
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <div
                      key={student.studentId}
                      style={{
                        ...styles.studentItem,
                        ...(selectedStudent?.studentId ===
                          student.studentId
                          ? styles.studentItemSelected : {}),
                      }}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div style={styles.studentAvatar}>
                        {student.fullName.charAt(0)}
                      </div>
                      <div style={styles.studentInfo}>
                        <div style={styles.studentName}>
                          {student.fullName}
                        </div>
                        <div style={styles.studentAdm}>
                          {student.admissionNumber}
                        </div>
                      </div>
                      {selectedStudent?.studentId ===
                        student.studentId && (
                        <span style={styles.studentCheck}>✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Right — recent activity (return mode) */}
          {mode === MODES.RETURN && (
            <div style={styles.rightPanel}>
              <div style={styles.studentPanelHeader}>
                ℹ️ How to Return
              </div>
              <div style={{ padding: 20 }}>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>1</span>
                  <span>
                    Click the barcode input field on the left
                  </span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>2</span>
                  <span>
                    Scan the barcode on the book being returned
                  </span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>3</span>
                  <span>
                    Review the book and borrower details shown
                  </span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>4</span>
                  <span>
                    Click Confirm Return to complete the process
                  </span>
                </div>
                <div style={styles.instructionNote}>
                  If the book is overdue, it will still be
                  returned normally. The overdue status is
                  just for tracking purposes.
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

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
    borderRadius: 8, padding: '12px 16px',
    color: '#276749', fontSize: 13, marginBottom: 16,
    fontWeight: 500,
  },
  errorMsg: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '12px 16px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  modeTabs: {
    display: 'flex', gap: 12,
    marginBottom: 20, flexWrap: 'wrap',
  },
  workArea: {
    display: 'flex', gap: 20, alignItems: 'flex-start',
  },
  leftPanel: {
    flex: '0 0 420px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  rightPanel: {
    flex: 1, background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  listCard: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  listCardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
    background: '#fafbfc', borderBottom: '1px solid #f0f2f5',
    fontWeight: 700, fontSize: 14, color: '#1a1a2e',
  },
  countBadge: {
    fontSize: 12, background: '#1a1a2e', color: '#fff',
    padding: '3px 10px', borderRadius: 20, fontWeight: 500,
  },
  overdueNotice: {
    padding: '12px 20px', background: '#fff5f5',
    color: '#c53030', fontSize: 13,
    borderBottom: '1px solid #fed7d7',
  },
  loadingText: {
    padding: 40, textAlign: 'center', color: '#888', fontSize: 14,
  },
  emptyList: {
    padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14,
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
  },
  th: {
    padding: '10px 16px', textAlign: 'left',
    color: '#888', fontWeight: 600, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5,
    background: '#fafbfc', borderBottom: '2px solid #f0f2f5',
  },
  tableRow: {
    borderBottom: '1px solid #f0f2f5',
    transition: 'background 0.15s',
  },
  td: { padding: '11px 16px', color: '#333' },
  bookTitleCell: {
    fontWeight: 600, color: '#1a1a2e', fontSize: 13,
  },
  bookSubject: { fontSize: 11, color: '#999', marginTop: 2 },
  statusBadge: {
    fontSize: 11, fontWeight: 600,
    padding: '3px 10px', borderRadius: 20,
    display: 'inline-block',
  },
  flagLostBtn: {
    padding: '5px 12px', background: '#fff5f5',
    color: '#c53030', border: '1.5px solid #fed7d7',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
  scanSection: {
    background: '#fff', borderRadius: 12,
    padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  scanLabel: {
    fontSize: 15, fontWeight: 700,
    color: '#1a1a2e', marginBottom: 6,
  },
  scanHint: {
    fontSize: 12, color: '#888',
    marginBottom: 14, lineHeight: 1.5,
  },
  scanInputWrap: { display: 'flex', gap: 8, marginBottom: 8 },
  scanInput: {
    flex: 1, padding: '12px 14px',
    border: '2px solid #1a1a2e', borderRadius: 8,
    fontSize: 14, outline: 'none',
    fontFamily: 'monospace', background: '#fafbfc',
  },
  scanLookupBtn: {
    padding: '12px 16px', background: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  scanTip: { fontSize: 11, color: '#aaa', marginTop: 4 },
  scanLoadingMsg: {
    fontSize: 13, color: '#2b6cb0', marginTop: 10,
    padding: '8px 12px', background: '#ebf8ff', borderRadius: 6,
  },
  scanErrorMsg: {
    fontSize: 13, color: '#c53030', marginTop: 10,
    padding: '8px 12px', background: '#fff5f5',
    borderRadius: 6, border: '1px solid #fed7d7',
  },
  bookInfoCard: {
    background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '2px solid #1a1a2e',
  },
  bookInfoHeader: {
    fontSize: 14, fontWeight: 700, color: '#1a1a2e',
    marginBottom: 14, paddingBottom: 10,
    borderBottom: '1px solid #f0f2f5',
  },
  bookInfoRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '7px 0',
    borderBottom: '1px solid #f7fafc',
  },
  bookInfoLabel: { fontSize: 12, color: '#888', fontWeight: 500 },
  bookInfoValue: {
    fontSize: 13, color: '#333', fontWeight: 600,
    textAlign: 'right', maxWidth: '60%',
  },
  holderInfo: {
    marginTop: 14, padding: '12px',
    background: '#fffff0', borderRadius: 8,
    border: '1px solid #fefcbf',
  },
  holderLabel: {
    fontSize: 11, color: '#744210',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  holderName: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e',
  },
  holderMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  dueDateInput: {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  actionButtons: {
    display: 'flex', flexDirection: 'column',
    gap: 8, marginTop: 16,
  },
  issueBtn: {
    padding: '12px', background: '#276749',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  returnBtn: {
    padding: '12px', background: '#2b6cb0',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  clearScanBtn: {
    padding: '9px', background: '#f0f2f5', color: '#666',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 13, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  studentPanelHeader: {
    padding: '16px 20px', borderBottom: '1px solid #f0f2f5',
    fontWeight: 700, fontSize: 14, color: '#1a1a2e',
    background: '#fafbfc',
  },
  streamSelect: {
    padding: '12px 20px', borderBottom: '1px solid #f0f2f5',
  },
  fieldLabel: {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
  },
  select: {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#fff',
    fontFamily: 'Segoe UI, sans-serif', cursor: 'pointer',
  },
  studentSearch: {
    padding: '12px 20px', borderBottom: '1px solid #f0f2f5',
  },
  searchInput: {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  studentList: { maxHeight: 380, overflowY: 'auto' },
  studentListEmpty: {
    padding: '30px 20px', textAlign: 'center',
    color: '#aaa', fontSize: 13,
  },
  studentItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 20px', borderBottom: '1px solid #f7fafc',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  studentItemSelected: {
    background: '#f0f7ff', borderLeft: '3px solid #1a1a2e',
  },
  studentAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700,
    fontSize: 15, flexShrink: 0,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  studentAdm: { fontSize: 11, color: '#888', marginTop: 1 },
  studentCheck: { color: '#276749', fontWeight: 700, fontSize: 16 },
  instructionStep: {
    display: 'flex', alignItems: 'flex-start',
    gap: 12, marginBottom: 14, fontSize: 14, color: '#333',
    lineHeight: 1.5,
  },
  stepNumber: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12,
    fontWeight: 700, flexShrink: 0,
  },
  instructionNote: {
    marginTop: 16, padding: '12px',
    background: '#f7fafc', borderRadius: 8,
    fontSize: 12, color: '#666', lineHeight: 1.5,
  },
};

const tabStyles = {
  tab: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 20px', background: '#fff',
    borderRadius: 12, border: '2px solid transparent',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.15s', flex: 1, minWidth: 150,
  },
  tabActive: { border: '2px solid #1a1a2e', background: '#1a1a2e' },
  icon: { fontSize: 22 },
  label: { fontSize: 14, fontWeight: 700 },
  desc: { fontSize: 11, marginTop: 2 },
};