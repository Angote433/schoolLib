import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  studentService,
  borrowService,
} from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import {
  Button, Input, Banner, StatusBadge, Tabs, Card, Avatar,
} from '../components/SharedComponents';

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

  // Student selection — quick global search, no stream drill-down
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
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

    // Loaded once up front so the picker can search across the whole
    // school instantly, instead of making the librarian pick a stream
    // before they can even start typing a name.
    setLoadingStudents(true);
    studentService.getAll()
      .then(res => {
        const active = res.data
          .filter(s => s.active)
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setAllStudents(active);
      })
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoadingStudents(false));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
        setScanError(`Book is ${book.status.toLowerCase()}. Only AVAILABLE books can be borrowed.`);
        return;
      }

      if (mode === MODES.RETURN) {
        if (book.status !== 'BORROWED') {
          setScanError(`Book is ${book.status.toLowerCase()}, not currently borrowed.`);
          return;
        }
        const borrowRes = await borrowService.getActive();
        const found = borrowRes.data.find(b => b.bookCopy?.qrCode === code);
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
      showSuccess(`✅ "${scannedBook.bookDetails?.titleName}" issued to ${selectedStudent.fullName}. Due: ${dueDate}`);
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
      showSuccess(`✅ "${scannedBook.bookDetails?.titleName}" returned successfully`);
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
    if (!window.confirm(`Mark "${record.bookCopy?.bookDetails?.titleName}" as lost for ${record.student?.fullName}?`)) return;

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

  // Only search once the librarian has typed something — with the
  // whole school loaded, showing every student by default would just
  // be noise (and defeats the point of a quick search).
  const searchTerm = studentSearch.trim().toLowerCase();
  const filteredStudents = searchTerm === ''
    ? []
    : allStudents.filter(s =>
        s.fullName.toLowerCase().includes(searchTerm) ||
        s.admissionNumber.toLowerCase().includes(searchTerm)
      );

  const daysOverdue = (dateDue) => {
    const due = new Date(dateDue);
    const today = new Date();
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
  };

  const canIssue = scannedBook?.status === 'AVAILABLE' && selectedStudent && dueDate && !scanError;
  const canReturn = scannedBook?.status === 'BORROWED' && !scanError;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Library Borrows</h1>
          <p style={styles.pageSub}>Issue, return and track borrowed books</p>
        </div>
      </div>

      {success && <Banner type="success">{success}</Banner>}
      {error && <Banner type="error">{error}</Banner>}

      {/* ── MODE TABS ─────────────────────────────────── */}
      <Tabs
        variant="full"
        active={mode}
        onChange={setMode}
        items={[
          { key: MODES.ISSUE, icon: '📖', label: 'Issue Book' },
          { key: MODES.RETURN, icon: '↩️', label: 'Return Book' },
          { key: MODES.ACTIVE, icon: '📋', label: 'Active Borrows' },
          { key: MODES.OVERDUE, icon: '🔴', label: 'Overdue' },
        ]}
      />

      {/* ── ACTIVE BORROWS LIST ───────────────────────── */}
      {mode === MODES.ACTIVE && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: tokens.spacing.lg }}>
          <div style={styles.listCardHeader}>
            <span>📋 Currently Borrowed Books</span>
            <span style={styles.countBadge}>{activeBorrows.length} out</span>
          </div>
          {loadingList ? (
            <div style={styles.loadingText}>Loading…</div>
          ) : activeBorrows.length === 0 ? (
            <div style={styles.emptyList}>No books currently borrowed</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    const overdue = new Date(record.dateDue) < new Date();
                    return (
                      <tr
                        key={i}
                        style={{ ...styles.tableRow, background: overdue ? tokens.colors.dangerLight : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = overdue ? '#fee2e2' : tokens.colors.surface}
                        onMouseLeave={e => e.currentTarget.style.background = overdue ? tokens.colors.dangerLight : 'transparent'}
                      >
                        <td style={styles.td}>
                          <div style={styles.bookTitleCell}>{record.bookCopy?.bookDetails?.titleName}</div>
                          <div style={styles.bookSubject}>{record.bookCopy?.qrCode}</div>
                        </td>
                        <td style={styles.td}>{record.student?.fullName}</td>
                        <td style={styles.td}>{record.student?.admissionNumber}</td>
                        <td style={styles.td}>{record.dateBorrowed}</td>
                        <td style={styles.td}>
                          <span style={{ color: overdue ? tokens.colors.danger : tokens.colors.textPrimary, fontWeight: overdue ? 700 : 400 }}>
                            {record.dateDue}
                            {overdue && ` (${daysOverdue(record.dateDue)}d overdue)`}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <StatusBadge status={overdue ? 'OVERDUE' : 'ACTIVE'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── OVERDUE LIST ──────────────────────────────── */}
      {mode === MODES.OVERDUE && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: tokens.spacing.lg }}>
          <div style={styles.listCardHeader}>
            <span>🔴 Overdue Borrows</span>
            <span style={{ ...styles.countBadge, background: tokens.colors.danger }}>{overdueBorrows.length} overdue</span>
          </div>

          {overdueBorrows.length > 0 && (
            <div style={{ padding: '0 20px' }}>
              <Banner type="error">
                These books are past their due date. Contact students to return them.
                If not returned, flag as Lost to generate a loss report for the secretary.
              </Banner>
            </div>
          )}

          {loadingList ? (
            <div style={styles.loadingText}>Loading…</div>
          ) : overdueBorrows.length === 0 ? (
            <div style={styles.emptyList}>🎉 No overdue borrows — all books returned on time</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    <tr key={i} style={styles.tableRow}
                      onMouseEnter={e => e.currentTarget.style.background = tokens.colors.dangerLight}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={styles.bookTitleCell}>{record.bookCopy?.bookDetails?.titleName}</div>
                        <div style={styles.bookSubject}>{record.bookCopy?.qrCode}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.bookTitleCell}>{record.student?.fullName}</div>
                        <div style={styles.bookSubject}>{record.student?.admissionNumber}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: tokens.colors.danger, fontWeight: 700 }}>{record.dateDue}</span>
                      </td>
                      <td style={styles.td}><StatusBadge status="OVERDUE" label={`${daysOverdue(record.dateDue)} days`} /></td>
                      <td style={styles.td}>
                        <Button variant="danger" size="sm" onClick={() => handleFlagLost(record)}>
                          ⚠️ Flag as Lost
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── ISSUE / RETURN SCAN AREA ──────────────────── */}
      {(mode === MODES.ISSUE || mode === MODES.RETURN) && (
        <div style={styles.workArea}>

          {/* Left — scan panel */}
          <div style={styles.leftPanel}>
            <Card>
              <div style={styles.scanLabel}>
                {mode === MODES.ISSUE ? '📖 Scan book to issue' : '↩️ Scan book to return'}
              </div>
              <div style={styles.scanHint}>
                Connect USB scanner and click below, then scan the barcode. Or type manually.
              </div>
              <div style={styles.scanInputWrap}>
                <Input
                  ref={scanInputRef}
                  style={styles.scanInput}
                  placeholder="Click here, then scan barcode..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleScan}
                  autoComplete="off"
                />
                <Button variant="primary" style={{ height: 48 }} onClick={() => handleScan({ key: 'Enter' })}>
                  Look Up
                </Button>
              </div>
              <div style={styles.scanTip}>💡 USB scanner auto-presses Enter after scanning</div>
              {scanLoading && <div style={styles.scanLoadingMsg}>🔍 Looking up book…</div>}
              {scanError && <div style={styles.scanErrorMsg}>❌ {scanError}</div>}
            </Card>

            {/* Book info card */}
            {scannedBook && !scanError && (
              <Card style={{ borderLeft: `5px solid ${scannedBook.status === 'AVAILABLE' ? tokens.colors.success : tokens.colors.info}` }}>
                <div style={styles.bookInfoHeader}>📚 Book Found</div>
                {[
                  ['Title', scannedBook.bookDetails?.titleName],
                  ['Subject', scannedBook.bookDetails?.subject],
                  ['Grade', `Grade ${scannedBook.bookDetails?.gradeLevel}`],
                  ['Barcode', scannedBook.qrCode],
                ].map(([label, value]) => (
                  <div key={label} style={styles.bookInfoRow}>
                    <span style={styles.bookInfoLabel}>{label}</span>
                    <span style={{
                      ...styles.bookInfoValue,
                      fontFamily: label === 'Barcode' ? tokens.font.mono : 'inherit',
                      fontSize: label === 'Barcode' ? 11 : 13,
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
                <div style={styles.bookInfoRow}>
                  <span style={styles.bookInfoLabel}>Status</span>
                  <StatusBadge status={scannedBook.status} />
                </div>

                {/* Active borrow info for return */}
                {mode === MODES.RETURN && activeBorrow && (
                  <div style={styles.holderInfo}>
                    <div style={styles.holderLabel}>Borrowed by</div>
                    <div style={styles.holderName}>{activeBorrow.student?.fullName}</div>
                    <div style={styles.holderMeta}>
                      {activeBorrow.student?.admissionNumber}
                      {' • '}Due: {activeBorrow.dateDue}
                      {new Date(activeBorrow.dateDue) < new Date() && (
                        <span style={{ color: tokens.colors.danger }}>
                          {' '}⚠️ {daysOverdue(activeBorrow.dateDue)} days overdue
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Due date for issue */}
                {mode === MODES.ISSUE && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ ...styles.bookInfoLabel, display: 'block', marginBottom: 6 }}>Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>
                )}

                <div style={styles.actionButtons}>
                  {mode === MODES.ISSUE && (
                    <Button
                      variant="success"
                      style={{ width: '100%', height: 46 }}
                      onClick={handleIssue}
                      disabled={!canIssue || submitting}
                    >
                      {submitting ? 'Issuing…' : selectedStudent ? `Issue to ${selectedStudent.fullName}` : 'Select a student →'}
                    </Button>
                  )}
                  {mode === MODES.RETURN && (
                    <Button
                      variant="accent"
                      style={{ width: '100%', height: 46 }}
                      onClick={handleReturn}
                      disabled={!canReturn || submitting}
                    >
                      {submitting ? 'Processing…' : '↩️ Confirm Return'}
                    </Button>
                  )}
                  <Button variant="secondary" style={{ width: '100%' }} onClick={resetState}>
                    Clear &amp; Scan Again
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right — student select (issue only) */}
          {mode === MODES.ISSUE && (
            <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <div style={styles.studentPanelHeader}>🎓 Select Student</div>
              <div style={styles.studentSearch}>
                <label style={styles.fieldLabel}>Search Student</label>
                <Input
                  placeholder="Type a name or admission number…"
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                  autoFocus
                />
              </div>
              <div style={styles.studentList}>
                {loadingStudents ? (
                  <div style={styles.studentListEmpty}>Loading students…</div>
                ) : searchTerm === '' ? (
                  <div style={styles.studentListEmpty}>Start typing to find a student</div>
                ) : filteredStudents.length === 0 ? (
                  <div style={styles.studentListEmpty}>No students match "{studentSearch}"</div>
                ) : (
                  filteredStudents.map(student => (
                    <div
                      key={student.studentId}
                      style={{
                        ...styles.studentItem,
                        ...(selectedStudent?.studentId === student.studentId ? styles.studentItemSelected : {}),
                      }}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <Avatar name={student.fullName} size={36} background={tokens.colors.primary} />
                      <div style={styles.studentInfo}>
                        <div style={styles.studentName}>{student.fullName}</div>
                        <div style={styles.studentAdm}>
                          {student.admissionNumber}
                          {student.stream?.streamName ? ` • ${student.stream.streamName}` : ''}
                        </div>
                      </div>
                      {selectedStudent?.studentId === student.studentId && <span style={styles.studentCheck}>✓</span>}
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Right — recent activity (return mode) */}
          {mode === MODES.RETURN && (
            <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <div style={styles.studentPanelHeader}>ℹ️ How to Return</div>
              <div style={{ padding: 20 }}>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>1</span>
                  <span>Click the barcode input field on the left</span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>2</span>
                  <span>Scan the barcode on the book being returned</span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>3</span>
                  <span>Review the book and borrower details shown</span>
                </div>
                <div style={styles.instructionStep}>
                  <span style={styles.stepNumber}>4</span>
                  <span>Click Confirm Return to complete the process</span>
                </div>
                <div style={styles.instructionNote}>
                  If the book is overdue, it will still be returned normally.
                  The overdue status is just for tracking purposes.
                </div>
              </div>
            </Card>
          )}

        </div>
      )}

    </div>
  );
}

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.lg },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },

  workArea: { display: 'flex', gap: tokens.spacing.lg, alignItems: 'flex-start' },
  leftPanel: { flex: '0 0 420px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.md },

  listCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px',
    background: tokens.colors.surface, borderBottom: `1px solid ${tokens.colors.border}`,
    fontWeight: 700, fontSize: 14, color: tokens.colors.textPrimary,
  },
  countBadge: { fontSize: 12, background: tokens.colors.primary, color: '#fff', padding: '3px 10px', borderRadius: tokens.radius.full, fontWeight: 500 },
  loadingText: { padding: 40, textAlign: 'center', color: tokens.colors.textMuted, fontSize: 14 },
  emptyList: { padding: 40, textAlign: 'center', color: tokens.colors.textMuted, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 16px', textAlign: 'left', color: tokens.colors.textMuted, fontWeight: 600,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
    background: tokens.colors.surface, borderBottom: `2px solid ${tokens.colors.border}`,
  },
  tableRow: { borderBottom: `1px solid ${tokens.colors.border}`, transition: 'background 0.15s' },
  td: { padding: '11px 16px', color: tokens.colors.textPrimary },
  bookTitleCell: { fontWeight: 600, color: tokens.colors.textPrimary, fontSize: 13 },
  bookSubject: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },

  scanLabel: { fontSize: 15, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 6 },
  scanHint: { fontSize: 12, color: tokens.colors.textMuted, marginBottom: 14, lineHeight: 1.5 },
  scanInputWrap: { display: 'flex', gap: 8, marginBottom: 8 },
  scanInput: { flex: 1, height: 48, border: `2px solid ${tokens.colors.primary}`, fontFamily: tokens.font.mono, background: tokens.colors.surface },
  scanTip: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 4 },
  scanLoadingMsg: { fontSize: 13, color: tokens.colors.info, marginTop: 10, padding: '8px 12px', background: tokens.colors.infoLight, borderRadius: tokens.radius.sm },
  scanErrorMsg: { fontSize: 13, color: tokens.colors.danger, marginTop: 10, padding: '8px 12px', background: tokens.colors.dangerLight, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.dangerBorder}` },

  bookInfoHeader: { fontSize: 14, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${tokens.colors.border}` },
  bookInfoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${tokens.colors.surface}` },
  bookInfoLabel: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: 500 },
  bookInfoValue: { fontSize: 13, color: tokens.colors.textPrimary, fontWeight: 600, textAlign: 'right', maxWidth: '60%' },
  holderInfo: { marginTop: 14, padding: 12, background: tokens.colors.warningLight, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.warningBorder}` },
  holderLabel: { fontSize: 11, color: tokens.colors.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 },
  holderName: { fontSize: 15, fontWeight: 700, color: tokens.colors.textPrimary },
  holderMeta: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },
  actionButtons: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },

  studentPanelHeader: { padding: '16px 20px', borderBottom: `1px solid ${tokens.colors.border}`, fontWeight: 700, fontSize: 14, color: tokens.colors.textPrimary, background: tokens.colors.surface },
  fieldLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: tokens.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  studentSearch: { padding: '14px 20px', borderBottom: `1px solid ${tokens.colors.border}` },
  studentList: { maxHeight: 380, overflowY: 'auto' },
  studentListEmpty: { padding: '30px 20px', textAlign: 'center', color: tokens.colors.textMuted, fontSize: 13 },
  studentItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${tokens.colors.surface}`, cursor: 'pointer', transition: 'background 0.15s' },
  studentItemSelected: { background: tokens.colors.infoLight, borderLeft: `3px solid ${tokens.colors.primary}` },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: 600, color: tokens.colors.textPrimary },
  studentAdm: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 1 },
  studentCheck: { color: tokens.colors.success, fontWeight: 700, fontSize: 16 },

  instructionStep: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, fontSize: 14, color: tokens.colors.textSecondary, lineHeight: 1.5 },
  stepNumber: {
    width: 24, height: 24, borderRadius: '50%', background: tokens.colors.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  instructionNote: { marginTop: 16, padding: 12, background: tokens.colors.surface, borderRadius: tokens.radius.sm, fontSize: 12, color: tokens.colors.textSecondary, lineHeight: 1.5 },
};
