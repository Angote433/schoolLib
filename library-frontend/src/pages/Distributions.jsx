import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  studentService,
  distributionService,
} from '../services/libraryApi';
import { tokens, getStatusColor } from '../styles/tokens';
import {
  Modal, Button, Input, Banner, StatusBadge, Tabs,
  Card, Avatar,
} from '../components/SharedComponents';

// The four modes of this page
const MODES = {
  ASSIGN:      'assign',
  RETURN:      'return',
  ACTIVE:      'active',
  UNRETURNED:  'unreturned',
};

export default function Distributions() {
  const { user } = useAuth();

  // Current mode
  const [mode, setMode] = useState(MODES.ASSIGN);

  // ── SCAN STATE ────────────────────────────────────────
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedBook, setScannedBook] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  // ── STUDENT SEARCH STATE (for assign mode) ────────────
  // Quick global search — no need to drill into a stream first.
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // ── RESULT STATE ──────────────────────────────────────
  const [activeDistribution, setActiveDistribution] = useState(null);

  // ── FEEDBACK ──────────────────────────────────────────
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── CONFIRMATION MODAL ────────────────────────────────
  const [confirmModal, setConfirmModal] = useState(null);

  // ACTIVE DISTRIBUTIONS LIST
  const [activeDistributions, setActiveDistributions] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // ── RETURN CANDIDATES (ISBN scan during return) ───────
  const [returnCandidates, setReturnCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // ── RECENT ACTIVITY ───────────────────────────────────
  const [recentActivity, setRecentActivity] = useState([]);

  // Ref for the scan input — auto focus it
  const scanInputRef = useRef();

  const loadActiveDistributions = async () => {
    setLoadingActive(true);
    try {
      const year = new Date().getFullYear();
      const res = await distributionService.getByYear(year);
      const distributed = res.data.filter(d => d.status === 'DISTRIBUTED');
      setActiveDistributions(distributed);
    } catch (err) {
      setError('Failed to load active distributions');
    } finally {
      setLoadingActive(false);
    }
  };

  const handleFlagLost = (record) => setConfirmModal(record);

  const confirmFlagLost = async () => {
    if (!confirmModal) return;
    try {
      setSubmitting(true);
      await distributionService.flagLost({
        qrCode: confirmModal.bookCopy?.qrCode,
        reason: 'Book not returned — flagged by librarian end of term',
        teacherId: user.userId,
      });
      showSuccess(`Book flagged as lost. Loss report created.`);
      setConfirmModal(null);
      loadActiveDistributions();
    } catch (err) {
      setError(err.response?.data || 'Failed to flag book as lost');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelFlagLost = () => setConfirmModal(null);

  // ── LOAD ALL STUDENTS ONCE ─────────────────────────────
  // Loaded once up front so the picker can search across the whole
  // school instantly, instead of making the librarian pick a stream
  // before they can even start typing a name.
  useEffect(() => {
    setLoadingStudents(true);
    studentService.getAll()
      .then(res => {
        const active = res.data
          .filter(s => s.active)
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setAllStudents(active);
      })
      .catch(() => setAllStudents([]))
      .finally(() => setLoadingStudents(false));

    loadRecentActivity();
  }, []);

  // Auto focus the scan input when mode changes
  useEffect(() => {
    resetScanState();
    if (mode === MODES.ACTIVE || mode === MODES.UNRETURNED) {
      loadActiveDistributions();
    }
    if (mode === MODES.ASSIGN || mode === MODES.RETURN) {
      if (scanInputRef.current) scanInputRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── LOAD RECENT ACTIVITY ──────────────────────────────
  const loadRecentActivity = async () => {
    try {
      const year = new Date().getFullYear();
      const res = await distributionService.getByYear(year);
      setRecentActivity(res.data.slice(-10).reverse());
    } catch {
      // Silently fail — not critical
    }
  };

  // ── RESET SCAN STATE ──────────────────────────────────
  const resetScanState = () => {
    setBarcodeInput('');
    setScannedBook(null);
    setScanError('');
    setActiveDistribution(null);
    setReturnCandidates([]);
    setSelectedStudent(null);
    setStudentSearch('');
    setError('');
    setSuccess('');
  };

  // ── LOAD RETURN CANDIDATES BY ISBN ────────────────────
  const loadReturnCandidatesByIsbn = async (isbn) => {
    setLoadingCandidates(true);
    try {
      const year = new Date().getFullYear();
      const distRes = await distributionService.getByYear(year);
      const candidates = distRes.data.filter(d =>
        d.bookCopy?.bookDetails?.isbn === isbn && d.status === 'DISTRIBUTED'
      );
      setReturnCandidates(candidates);
    } catch {
      setReturnCandidates([]);
      setScanError('Failed to load students for this book. Is the server running?');
    } finally {
      setLoadingCandidates(false);
    }
  };

  // ── HANDLE SCAN / LOOKUP ──────────────────────────────
  const handleScan = async (e) => {
    if (e.key !== 'Enter') return;

    const code = barcodeInput.trim();
    if (!code) return;

    setScanLoading(true);
    setScanError('');
    setScannedBook(null);
    setActiveDistribution(null);
    setReturnCandidates([]);

    const cleanCode = code.replace(/-/g, '');
    const isIsbn = /^[0-9]{10}$|^[0-9]{13}$/.test(cleanCode);

    try {
      if (isIsbn && mode === MODES.RETURN) {
        const res = await bookService.getByIsbn(cleanCode);
        setScannedBook({ bookDetails: res.data, isbn: cleanCode, isIsbnLookup: true });
        await loadReturnCandidatesByIsbn(cleanCode);

      } else {
        const res = await bookService.getByAccession(code);
        setScannedBook(res.data);

        if (mode === MODES.RETURN) {
          if (res.data.status !== 'DISTRIBUTED') {
            setScanError(`This copy is ${res.data.status.toLowerCase()}, not currently distributed.`);
          } else {
            const distRes = await distributionService.getByYear(new Date().getFullYear());
            const activeDist = distRes.data.find(
              d => d.bookCopy?.qrCode === res.data.qrCode && d.status === 'DISTRIBUTED'
            );
            setActiveDistribution(activeDist || null);
          }
        }

        if (mode === MODES.ASSIGN && res.data.status !== 'AVAILABLE') {
          setScanError(`This copy is ${res.data.status.toLowerCase()}. Only AVAILABLE copies can be assigned.`);
        }
      }

    } catch (err) {
      if (err.response?.status === 404) {
        setScanError(
          isIsbn
            ? 'No book registered with this ISBN. Ask the librarian to register it.'
            : 'No book found with this accession number. Check the number written inside the book.'
        );
      } else {
        setScanError('Failed to look up book. Is the server running?');
      }
    } finally {
      setScanLoading(false);
    }
  };

  // ── ASSIGN BOOK ───────────────────────────────────────
  const handleAssign = async () => {
    if (!scannedBook || !selectedStudent) return;

    setSubmitting(true);
    setError('');

    try {
      const studentId = selectedStudent.studentId || selectedStudent.id;
      await distributionService.distributeByAccession({
        accessionNumber: scannedBook.accessionNumber || scannedBook.qrCode,
        studentId,
        academicYear: new Date().getFullYear(),
        teacherId: user.userId,
      });

      showSuccess(`✅ "${scannedBook.bookDetails?.titleName}" assigned to ${selectedStudent.fullName}`);
      resetScanState();
      loadRecentActivity();

      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);

    } catch (err) {
      setError(err.response?.data || 'Failed to assign book');
    } finally {
      setSubmitting(false);
    }
  };

  // ── RETURN BOOK ───────────────────────────────────────
  const handleReturn = async () => {
    if (!scannedBook) return;

    setSubmitting(true);
    setError('');

    try {
      await distributionService.returnBook(scannedBook.qrCode);

      showSuccess(`✅ "${scannedBook.bookDetails?.titleName}" returned successfully`);
      resetScanState();
      loadRecentActivity();

      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);

    } catch (err) {
      setError(err.response?.data || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  // ── RETURN BOOK BY RECORD (ISBN return candidates table) ──
  const handleReturnByRecord = async (record) => {
    setSubmitting(true);
    setError('');

    try {
      await distributionService.returnBook(record.bookCopy?.qrCode);

      showSuccess(`✅ Book returned by ${record.student?.fullName}`);
      setReturnCandidates(prev => prev.filter(r => r.bookCopy?.bookId !== record.bookCopy?.bookId));
      loadRecentActivity();
    } catch (err) {
      setError(err.response?.data || 'Failed to return');
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
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

  const canAssign = scannedBook && scannedBook.status === 'AVAILABLE' && selectedStudent && !scanError;
  const canReturn = scannedBook && scannedBook.status === 'DISTRIBUTED' && !scanError;

  // Left-border color for the scanned-book info card
  const bookBorderColor = scannedBook && !scannedBook.isIsbnLookup
    ? getStatusColor(scannedBook.status).color
    : tokens.colors.border;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Book Distribution</h1>
          <p style={styles.pageSub}>Assign, return and manage book allocations</p>
        </div>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && <Banner type="error">{error}</Banner>}

      {/* ── MODE TABS ────────────────────────────────── */}
      <Tabs
        variant="full"
        active={mode}
        onChange={setMode}
        items={[
          { key: MODES.ASSIGN, icon: '📦', label: 'Assign Book' },
          { key: MODES.RETURN, icon: '↩️', label: 'Return Book' },
          { key: MODES.ACTIVE, icon: '📋', label: 'View Active' },
          { key: MODES.UNRETURNED, icon: '🔍', label: 'Find Unreturned' },
        ]}
      />

      {/* ── ACTIVE DISTRIBUTIONS VIEW ──────────────── */}
      {mode === MODES.ACTIVE && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: tokens.spacing.lg }}>
          <div style={styles.listCardHeader}>
            <span>📋 Currently Distributed Books</span>
            <span style={styles.countBadge}>{activeDistributions.length} books out</span>
          </div>

          {loadingActive ? (
            <div style={styles.loadingText}>Loading…</div>
          ) : activeDistributions.length === 0 ? (
            <div style={styles.emptyList}>No books currently distributed</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Book Title</th>
                    <th style={styles.th}>Barcode</th>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Admission No.</th>
                    <th style={styles.th}>Stream</th>
                    <th style={styles.th}>Date Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDistributions.map((record, i) => (
                    <tr key={i} style={styles.tableRow}
                      onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surface}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={styles.bookTitleCell}>{record.bookCopy?.bookDetails?.titleName}</div>
                        <div style={styles.bookSubject}>{record.bookCopy?.bookDetails?.subject}</div>
                      </td>
                      <td style={styles.td}><code style={styles.codeText}>{record.bookCopy?.qrCode}</code></td>
                      <td style={styles.td}><div style={styles.studentNameCell}>{record.student?.fullName}</div></td>
                      <td style={styles.td}>{record.student?.admissionNumber}</td>
                      <td style={styles.td}>{record.student?.stream?.streamName || '—'}</td>
                      <td style={styles.td}>{record.dateDistributed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── UNRETURNED / FLAG LOST VIEW ────────────── */}
      {mode === MODES.UNRETURNED && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: tokens.spacing.lg }}>
          <div style={styles.listCardHeader}>
            <span>🔍 Unreturned Books — End of Term Audit</span>
            <span style={styles.countBadge}>{activeDistributions.length} unreturned</span>
          </div>

          <div style={{ padding: '0 20px' }}>
            <Banner type="warning">
              These books are still marked as DISTRIBUTED. Review this list at end of term and flag any books that were not returned as Lost.
            </Banner>
          </div>

          {loadingActive ? (
            <div style={styles.loadingText}>Loading unreturned books…</div>
          ) : activeDistributions.length === 0 ? (
            <div style={styles.emptyList}>🎉 All books have been returned</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Book Title</th>
                    <th style={styles.th}>Barcode</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Admission #</th>
                    <th style={styles.th}>Stream</th>
                    <th style={styles.th}>Date Issued</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDistributions.map((record, i) => (
                    <tr key={i} style={styles.tableRow}
                      onMouseEnter={e => e.currentTarget.style.background = tokens.colors.warningLight}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={styles.bookTitleCell}>{record.bookCopy?.bookDetails?.titleName}</div>
                        <div style={styles.bookSubject}>{record.bookCopy?.bookDetails?.subject}</div>
                      </td>
                      <td style={styles.td}><code style={styles.codeText}>{record.bookCopy?.qrCode}</code></td>
                      <td style={styles.td}><div style={styles.studentNameCell}>{record.student?.fullName}</div></td>
                      <td style={styles.td}>{record.student?.admissionNumber}</td>
                      <td style={styles.td}>{record.student?.stream?.streamName || '—'}</td>
                      <td style={styles.td}>{record.dateDistributed}</td>
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

      {/* ── MAIN WORK AREA ───────────────────────────── */}
      <div style={styles.workArea}>

        {/* ── LEFT PANEL — SCAN (assign/return only) ── */}
        {(mode === MODES.ASSIGN || mode === MODES.RETURN) && (
        <div style={styles.leftPanel}>

          <Card>
            <div style={styles.scanLabel}>
              {mode === MODES.ASSIGN ? '📦 Enter accession number to assign' : '↩️ Scan ISBN barcode to return'}
            </div>

            <div style={styles.scanHint}>
              {mode === MODES.ASSIGN
                ? 'Type the number written inside the book cover, then press Enter or click Look Up.'
                : 'Scan the ISBN barcode on the back cover of the book being returned — or type the accession number manually.'}
            </div>

            <div style={styles.scanInputWrap}>
              <span style={styles.scanInputIcon}>🔎</span>
              <Input
                ref={scanInputRef}
                style={styles.scanInput}
                placeholder={
                  mode === MODES.ASSIGN
                    ? 'Type accession number from inside book cover...'
                    : 'Scan ISBN barcode, or type accession number...'
                }
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={handleScan}
                autoComplete="off"
              />
              <Button variant="primary" style={styles.scanLookupBtn} onClick={() => handleScan({ key: 'Enter' })}>
                Look Up
              </Button>
            </div>

            <div style={styles.scanTip}>
              💡 Tip: USB scanner auto-presses Enter after scanning — no need to click anything
            </div>

            {scanLoading && <div style={styles.scanLoadingMsg}>🔍 Looking up book…</div>}
            {scanError && <div style={styles.scanErrorMsg}>❌ {scanError}</div>}
          </Card>

          {/* ── SCANNED BOOK INFO ──────────────────── */}
          {scannedBook && !scanError && (
            <Card style={{ borderLeft: `5px solid ${bookBorderColor}` }}>
              <div style={styles.bookInfoHeader}>📚 Book Found</div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Title</span>
                <span style={styles.bookInfoValue}>{scannedBook.bookDetails?.titleName || '—'}</span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Subject</span>
                <span style={styles.bookInfoValue}>{scannedBook.bookDetails?.subject || '—'}</span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Grade</span>
                <span style={styles.bookInfoValue}>Grade {scannedBook.bookDetails?.gradeLevel}</span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>{scannedBook.isIsbnLookup ? 'ISBN' : 'Accession No.'}</span>
                <span style={{ ...styles.bookInfoValue, fontFamily: tokens.font.mono, fontSize: 12 }}>
                  {scannedBook.isIsbnLookup ? scannedBook.isbn : (scannedBook.accessionNumber || scannedBook.qrCode)}
                </span>
              </div>

              {!scannedBook.isIsbnLookup && (
                <div style={styles.bookInfoRow}>
                  <span style={styles.bookInfoLabel}>Status</span>
                  <StatusBadge status={scannedBook.status} />
                </div>
              )}

              {/* Current holder info for return */}
              {mode === MODES.RETURN && !scannedBook.isIsbnLookup && activeDistribution && (
                <div style={styles.holderInfo}>
                  <div style={styles.holderLabel}>Currently held by</div>
                  <div style={styles.holderName}>{activeDistribution.student?.fullName}</div>
                  <div style={styles.holderMeta}>
                    {activeDistribution.student?.admissionNumber}
                    {' • '}Distributed: {activeDistribution.dateDistributed}
                  </div>
                </div>
              )}

              {/* Return candidates table — ISBN scan in return mode */}
              {mode === MODES.RETURN && scannedBook.isIsbnLookup && (
                <div style={styles.returnTable}>
                  <div style={styles.returnTableHeader}>Students with this book — click Return to confirm</div>
                  {loadingCandidates ? (
                    <div style={styles.loadingText}>Loading…</div>
                  ) : returnCandidates.length === 0 ? (
                    <div style={styles.loadingText}>No active distributions found for this title</div>
                  ) : (
                    returnCandidates.map((record, i) => (
                      <div key={i} style={styles.returnRow}>
                        <Avatar name={record.student?.fullName} size={30} background={tokens.colors.primary} />
                        <div style={styles.returnStudentInfo}>
                          <div style={styles.returnStudentName}>{record.student?.fullName}</div>
                          <div style={styles.returnStudentMeta}>
                            {record.student?.admissionNumber}{' • '}Issued: {record.dateDistributed}
                          </div>
                        </div>
                        <Button
                          variant="accent" size="sm"
                          onClick={() => handleReturnByRecord(record)}
                          disabled={submitting}
                        >
                          ✓ Return
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div style={styles.actionButtons}>
                {mode === MODES.ASSIGN && (
                  <Button
                    variant="success"
                    style={{ width: '100%', height: 46 }}
                    onClick={handleAssign}
                    disabled={!canAssign || submitting}
                  >
                    {submitting ? 'Assigning…' : selectedStudent ? `Assign to ${selectedStudent.fullName}` : 'Select a student first →'}
                  </Button>
                )}

                {mode === MODES.RETURN && !scannedBook.isIsbnLookup && (
                  <Button
                    variant="accent"
                    style={{ width: '100%', height: 46 }}
                    onClick={handleReturn}
                    disabled={!canReturn || submitting}
                  >
                    {submitting ? 'Processing…' : '↩️ Confirm Return'}
                  </Button>
                )}

                <Button variant="secondary" style={{ width: '100%' }} onClick={resetScanState}>
                  Clear &amp; Scan Again
                </Button>
              </div>
            </Card>
          )}

        </div>
        )}

        {/* ── RIGHT PANEL — student search (assign only) */}
        {mode === MODES.ASSIGN && (
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
                    key={student.studentId || student.id}
                    style={{
                      ...styles.studentItem,
                      ...(selectedStudent === student ? styles.studentItemSelected : {}),
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
                    {selectedStudent === student && <span style={styles.studentCheck}>✓</span>}
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* ── RIGHT PANEL — recent activity ────────── */}
        {mode !== MODES.ASSIGN && (
          <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={styles.studentPanelHeader}>🕐 Recent Activity</div>
            <div style={styles.activityList}>
              {recentActivity.length === 0 ? (
                <div style={styles.studentListEmpty}>No recent activity</div>
              ) : (
                recentActivity.map((record, i) => (
                  <div key={i} style={styles.activityItem}>
                    <div style={styles.activityBook}>
                      {record.bookCopy?.bookDetails?.titleName || record.bookCopy?.qrCode}
                    </div>
                    <div style={styles.activityStudent}>{record.student?.fullName}</div>
                    <StatusBadge status={record.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

      </div>

      {/* ── CONFIRMATION MODAL FOR FLAG LOST ──────────── */}
      {confirmModal && (
        <Modal title="⚠️ Flag Book as Lost?" onClose={cancelFlagLost} maxWidth={480}>
          <div style={styles.modalSection}>
            <label style={styles.modalLabel}>Book Title</label>
            <div style={styles.modalValue}>{confirmModal.bookCopy?.bookDetails?.titleName}</div>
          </div>
          <div style={styles.modalSection}>
            <label style={styles.modalLabel}>Subject</label>
            <div style={styles.modalValue}>{confirmModal.bookCopy?.bookDetails?.subject}</div>
          </div>
          <div style={styles.modalSection}>
            <label style={styles.modalLabel}>Student</label>
            <div style={styles.modalValue}>{confirmModal.student?.fullName}</div>
          </div>
          <div style={styles.modalSection}>
            <label style={styles.modalLabel}>Admission #</label>
            <div style={styles.modalValue}>{confirmModal.student?.admissionNumber}</div>
          </div>
          <div style={styles.modalSection}>
            <label style={styles.modalLabel}>Barcode</label>
            <div style={{ ...styles.modalValue, fontFamily: tokens.font.mono, fontSize: 12 }}>
              {confirmModal.bookCopy?.qrCode}
            </div>
          </div>

          <Banner type="error">
            This action will create a loss report. The book will be marked as LOST in the system.
          </Banner>

          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={cancelFlagLost} disabled={submitting}>Cancel</Button>
            <Button variant="danger" onClick={confirmFlagLost} disabled={submitting}>
              {submitting ? 'Processing…' : '⚠️ Flag as Lost'}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── ALL STYLES ────────────────────────────────────────────────────────
const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.lg },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },

  workArea: { display: 'flex', gap: tokens.spacing.lg, alignItems: 'flex-start' },
  leftPanel: { flex: '0 0 420px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.md },

  scanLabel: { fontSize: 15, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 6 },
  scanHint: { fontSize: 12, color: tokens.colors.textMuted, marginBottom: 14, lineHeight: 1.5 },
  scanInputWrap: { display: 'flex', gap: 8, marginBottom: 8, position: 'relative', alignItems: 'center' },
  scanInputIcon: { position: 'absolute', left: 14, fontSize: 15, pointerEvents: 'none', zIndex: 1 },
  scanInput: {
    flex: 1, height: 48, paddingLeft: 40,
    border: `2px solid ${tokens.colors.primary}`, borderRadius: tokens.radius.sm,
    fontSize: 14, fontFamily: tokens.font.mono, background: tokens.colors.surface,
  },
  scanLookupBtn: { height: 48, padding: '0 20px' },
  scanTip: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 4 },
  scanLoadingMsg: {
    fontSize: 13, color: tokens.colors.info, marginTop: 10,
    padding: '8px 12px', background: tokens.colors.infoLight, borderRadius: tokens.radius.sm,
  },
  scanErrorMsg: {
    fontSize: 13, color: tokens.colors.danger, marginTop: 10,
    padding: '8px 12px', background: tokens.colors.dangerLight,
    borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.dangerBorder}`,
  },

  bookInfoHeader: {
    fontSize: 14, fontWeight: 700, color: tokens.colors.textPrimary,
    marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${tokens.colors.border}`,
  },
  bookInfoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: `1px solid ${tokens.colors.surface}`,
  },
  bookInfoLabel: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: 500 },
  bookInfoValue: { fontSize: 13, color: tokens.colors.textPrimary, fontWeight: 600, textAlign: 'right', maxWidth: '60%' },

  holderInfo: {
    marginTop: 14, padding: 12, background: tokens.colors.warningLight,
    borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.warningBorder}`,
  },
  holderLabel: { fontSize: 11, color: tokens.colors.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 },
  holderName: { fontSize: 15, fontWeight: 700, color: tokens.colors.textPrimary },
  holderMeta: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },

  returnTable: { marginTop: 14, border: `1.5px solid ${tokens.colors.border}`, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  returnTableHeader: { background: tokens.colors.surface, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: tokens.colors.textSecondary, borderBottom: `1px solid ${tokens.colors.border}` },
  returnRow: { display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${tokens.colors.surface}`, gap: 10 },
  returnStudentInfo: { flex: 1 },
  returnStudentName: { fontSize: 13, fontWeight: 600, color: tokens.colors.textPrimary },
  returnStudentMeta: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },

  actionButtons: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },

  studentPanelHeader: {
    padding: '16px 20px', borderBottom: `1px solid ${tokens.colors.border}`,
    fontWeight: 700, fontSize: 14, color: tokens.colors.textPrimary, background: tokens.colors.surface,
  },
  fieldLabel: {
    display: 'block', fontSize: 11, fontWeight: 700, color: tokens.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  studentSearch: { padding: '14px 20px', borderBottom: `1px solid ${tokens.colors.border}` },
  studentList: { maxHeight: 420, overflowY: 'auto' },
  studentListEmpty: { padding: '30px 20px', textAlign: 'center', color: tokens.colors.textMuted, fontSize: 13 },
  studentItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
    borderBottom: `1px solid ${tokens.colors.surface}`, cursor: 'pointer', transition: 'background 0.15s',
  },
  studentItemSelected: { background: tokens.colors.infoLight, borderLeft: `3px solid ${tokens.colors.primary}` },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: 600, color: tokens.colors.textPrimary },
  studentAdm: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 1 },
  studentCheck: { color: tokens.colors.success, fontWeight: 700, fontSize: 16 },

  activityList: { maxHeight: 420, overflowY: 'auto' },
  activityItem: {
    padding: '12px 20px', borderBottom: `1px solid ${tokens.colors.surface}`,
    display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
  },
  activityBook: { fontSize: 13, fontWeight: 600, color: tokens.colors.textPrimary },
  activityStudent: { fontSize: 12, color: tokens.colors.textSecondary },

  listCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: `2px solid ${tokens.colors.border}`,
    fontWeight: 700, fontSize: 14, color: tokens.colors.textPrimary,
  },
  countBadge: { background: tokens.colors.danger, color: '#fff', padding: '4px 12px', borderRadius: tokens.radius.full, fontSize: 12, fontWeight: 700 },
  loadingText: { textAlign: 'center', padding: 40, color: tokens.colors.textMuted, fontSize: 14 },
  emptyList: { textAlign: 'center', padding: 40, color: tokens.colors.textMuted, fontSize: 16, fontWeight: 500 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: tokens.colors.textMuted,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, background: tokens.colors.surface,
  },
  tableRow: { borderBottom: `1px solid ${tokens.colors.border}`, transition: 'background 0.1s' },
  td: { padding: '14px 16px', color: tokens.colors.textPrimary },
  bookTitleCell: { fontWeight: 600, color: tokens.colors.textPrimary },
  bookSubject: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },
  studentNameCell: { fontWeight: 600, color: tokens.colors.textPrimary },
  codeText: { fontFamily: tokens.font.mono, fontSize: 11, background: tokens.colors.surface, padding: '2px 6px', borderRadius: 4, color: tokens.colors.textSecondary },

  modalSection: { marginBottom: 16 },
  modalLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: tokens.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalValue: { fontSize: 14, fontWeight: 600, color: tokens.colors.textPrimary, padding: '10px 12px', background: tokens.colors.surface, borderRadius: tokens.radius.sm },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
};
