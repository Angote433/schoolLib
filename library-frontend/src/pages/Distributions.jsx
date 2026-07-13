import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  studentService,
  streamService,
  distributionService,
} from '../services/libraryApi';

// The three modes of this page
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
  // The barcode value typed/scanned into the input
  const [barcodeInput, setBarcodeInput] = useState('');

  // The book copy found after scanning
  const [scannedBook, setScannedBook] = useState(null);

  // Loading while looking up the book
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  // ── STUDENT SEARCH STATE (for assign mode) ────────────
  const [studentSearch, setStudentSearch] = useState('');
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchText,setSearchText] = useState('');

  // ── RESULT STATE ──────────────────────────────────────
  // The active distribution record found on a scanned book
  // (used during return/loss to show who has the book)
  const [activeDistribution, setActiveDistribution] = useState(null);

  // ── FEEDBACK ──────────────────────────────────────────
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── CONFIRMATION MODAL ────────────────────────────────
  const [confirmModal, setConfirmModal] = useState(null);

  //ACTIVE DISTRIBUTIONS lIST
  const [activeDistributions, setActiveDistributions] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  

  // ── RECENT ACTIVITY ───────────────────────────────────
  const [recentActivity, setRecentActivity] = useState([]);

  // Ref for the scan input — auto focus it
  const scanInputRef = useRef();

  const loadActiveDistributions = async () => {
    setLoadingActive(true);
    try {
      const year = new Date().getFullYear();
      const res = await distributionService.getByYear(year);
      // Only show DISTRIBUTED status — not returned or lost
      const distributed = res.data.filter(d => d.status === 'DISTRIBUTED');
      console.log('Loaded distributions:', distributed.length, distributed);
      setActiveDistributions(distributed);
    } catch (err) {
      console.error('Failed to load active distributions:', err);
      setError('Failed to load active distributions');
    } finally {
      setLoadingActive(false);
    }
  };

  const handleFlagLost = (record) => {
    setConfirmModal(record);
  };

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

  const cancelFlagLost = () => {
    setConfirmModal(null);
  };

  // ── LOAD STREAMS ──────────────────────────────────────
  useEffect(() => {
    streamService.getAll().then(res => {
      // Map 'active' from backend to 'isActive' for frontend
      const mappedData = res.data.map(stream => ({
        ...stream,
        isActive: stream.active,
      }));
      setStreams(mappedData.filter(s => s.isActive));
    });
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
  }, [mode]);


  // Load students when stream selected
  useEffect(() => {
    if (!selectedStreamId) {
      setStudents([]);
      setSelectedStudent(null);
      return;
    }
    setLoadingStudents(true);
    studentService.getByStream(selectedStreamId)
      .then(res => {
        // Map 'active' from backend to 'isActive' for frontend
        const mappedData = res.data.map(student => ({
          ...student,
          isActive: student.active,
        }));
        console.log("Students loaded:", mappedData);
        setStudents(mappedData.filter(s => s.isActive));
        setSelectedStudent(null);
      })
      .finally(() => setLoadingStudents(false));
  }, [selectedStreamId]);

  // ── LOAD RECENT ACTIVITY ──────────────────────────────
  const loadRecentActivity = async () => {
    try {
      const year = new Date().getFullYear();
      const res = await distributionService.getByYear(year);
      // Show last 10 records most recent first
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
    setSelectedStudent(null);
    setStudentSearch('');
    setError('');
    setSuccess('');
  };

  // ── HANDLE SCAN / LOOKUP ──────────────────────────────
  // Called when Enter is pressed in the scan input
  // OR when the USB scanner sends Enter after scanning
  const handleScan = async (e) => {
    // Only act on Enter key
    if (e.key !== 'Enter') return;

    const code = barcodeInput.trim();
    if (!code) return;

    setScanLoading(true);
    setScanError('');
    setScannedBook(null);
    setActiveDistribution(null);

    try {
      // Look up the book by barcode
      const res = await bookService.scanByQr(code);
      const book = res.data;
      setScannedBook(book);

      // For return and loss modes — find who currently has it
      if (mode === MODES.RETURN || mode === MODES.LOSS) {
        if (book.status !== 'DISTRIBUTED') {
          setScanError(
            `This book is ${book.status.toLowerCase()}, not currently distributed.`
          );
        } else {
          // Find the active distribution record
          const distRes = await distributionService.getByYear(
            new Date().getFullYear()
          );
          const activeDist = distRes.data.find(
            d => d.bookCopy?.qrCode === code &&
                 d.status === 'DISTRIBUTED'
          );
          setActiveDistribution(activeDist || null);
        }
      }

      // For assign mode — check book is available
      if (mode === MODES.ASSIGN && book.status !== 'AVAILABLE') {
        setScanError(
          `This book is currently ${book.status.toLowerCase()}. It must be AVAILABLE to assign.`
        );
      }

    } catch (err) {
      if (err.response?.status === 404) {
        setScanError(
          'No book found with this barcode. Check the barcode and try again.'
        );
      } else {
        setScanError('Failed to look up book.');
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
      const requestData = {
        qrCode: scannedBook.qrCode,
        studentId: studentId,
        academicYear: new Date().getFullYear(),
        teacherId: user.userId,
      };
      console.log('Assigning book with data:', requestData);
      await distributionService.distribute(requestData);

      showSuccess(
        `✅ "${scannedBook.bookDetails?.titleName}" assigned to ${selectedStudent.fullName}`
      );
      resetScanState();
      loadRecentActivity();

      // Re-focus scan input for next scan
      setTimeout(() => {
        if (scanInputRef.current) scanInputRef.current.focus();
      }, 100);

    } catch (err) {
      console.error('Assign error:', err.response?.data, err.response?.status, err);
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

      showSuccess(
        `✅ "${scannedBook.bookDetails?.titleName}" returned successfully`
      );
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

  // ── MARK AS LOST ──────────────────────────────────────
  const handleMarkLost = async () => {
    if (!scannedBook) return;

    setSubmitting(true);
    setError('');

    try {
      await distributionService.flagLost({
        qrCode: scannedBook.qrCode,
        reason: 'Book not returned — marked as lost by librarian',
        teacherId: user.userId,
      });

      showSuccess(
        `⚠️ "${scannedBook.bookDetails?.titleName}" marked as lost. Loss report created.`
      );
      resetScanState();
      loadRecentActivity();

    } catch (err) {
      setError(err.response?.data || 'Failed to mark as lost');
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
  };

  // Filter students by search text locally
  const filteredStudents = students.filter(s =>
    studentSearch === '' ||
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(
      studentSearch.toLowerCase()
    )
  );

  const canAssign =
    scannedBook &&
    scannedBook.status === 'AVAILABLE' &&
    selectedStudent &&
    !scanError;

  const canReturn =
    scannedBook &&
    scannedBook.status === 'DISTRIBUTED' &&
    !scanError;

  const canMarkLost =
    scannedBook &&
    scannedBook.status === 'DISTRIBUTED' &&
    !scanError;

  // Status color helper
  const statusColor = {
    AVAILABLE:   { bg: '#f0fff4', color: '#276749' },
    DISTRIBUTED: { bg: '#fffff0', color: '#744210' },
    BORROWED:    { bg: '#ebf8ff', color: '#2b6cb0' },
    LOST:        { bg: '#fff5f5', color: '#c53030' },
  };

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Book Distribution</h1>
          <p style={styles.pageSub}>
            Assign, return and manage book allocations
          </p>
        </div>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>{success}</div>
      )}
      {error && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}

      {/* ── MODE TABS ────────────────────────────────── */}
      <div style={styles.modeTabs}>
        <ModeTab
          active={mode === MODES.ASSIGN}
          onClick={() => setMode(MODES.ASSIGN)}
          icon="📦"
          label="Assign Book"
          desc="Allocate a book to a student"
        />
        <ModeTab
          active={mode === MODES.RETURN}
          onClick={() => setMode(MODES.RETURN)}
          icon="↩️"
          label="Return Book"
          desc="Process a book return"
        />
        <ModeTab
          active={mode === MODES.ACTIVE}
          onClick={() => setMode(MODES.ACTIVE)}
          icon="📋"
          label="View Active"
          desc="All currently distributed"
        />
        <ModeTab
          active={mode === MODES.UNRETURNED}
          onClick={() => setMode(MODES.UNRETURNED)}
          icon="🔍"
          label="Find Unreturned"
          desc="Flag end-of-term losses"
        />
      </div>

      {/* ── ACTIVE DISTRIBUTIONS VIEW ──────────────── */}
      {mode === MODES.ACTIVE && (
  <div style={styles.listCard}>
    <div style={styles.listCardHeader}>
      <span>📋 Currently Distributed Books</span>
      <span style={styles.countBadge}>
        {activeDistributions.length} books out
      </span>
    </div>

    {loadingActive ? (
      <div style={styles.loadingText}>Loading...</div>
    ) : activeDistributions.length === 0 ? (
      <div style={styles.emptyList}>
        No books currently distributed
      </div>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHead}>
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
            <tr
              key={i}
              style={styles.tableRow}
              onMouseEnter={e =>
                e.currentTarget.style.background = '#f9fafb'
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
                  {record.bookCopy?.bookDetails?.subject}
                </div>
              </td>
              <td style={styles.td}>
                <code style={styles.codeText}>
                  {record.bookCopy?.qrCode}
                </code>
              </td>
              <td style={styles.td}>
                <div style={styles.studentNameCell}>
                  {record.student?.fullName}
                </div>
              </td>
              <td style={styles.td}>
                {record.student?.admissionNumber}
              </td>
              <td style={styles.td}>
                {record.student?.stream?.streamName || '—'}
              </td>
              <td style={styles.td}>
                {record.dateDistributed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
      )}

      {/* ── UNRETURNED / FLAG LOST VIEW ────────────── */}
      {mode === MODES.UNRETURNED && (
        <div style={styles.listCard}>
          <div style={styles.listCardHeader}>
            <span>🔍 Unreturned Books — End of Term Audit</span>
            <span style={styles.countBadge}>
              {activeDistributions.length} unreturned
            </span>
          </div>

          <div style={styles.auditNotice}>
            ℹ️ These books are still marked as DISTRIBUTED.
            Review this list at end of term and flag any books
            that were not returned as Lost.
          </div>

          {loadingActive ? (
            <div style={styles.loadingText}>Loading unreturned books...</div>
          ) : activeDistributions.length === 0 ? (
            <div style={styles.emptyList}>
              🎉 All books have been returned
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
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
                    <tr
                      key={i}
                      style={styles.tableRow}
                      onMouseEnter={e =>
                        e.currentTarget.style.background = '#fef3e2'
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
                          {record.bookCopy?.bookDetails?.subject}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.codeText}>
                          {record.bookCopy?.qrCode}
                        </code>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.studentNameCell}>
                          {record.student?.fullName}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {record.student?.admissionNumber}
                      </td>
                      <td style={styles.td}>
                        {record.student?.stream?.streamName || '—'}
                      </td>
                      <td style={styles.td}>
                        {record.dateDistributed}
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
            </div>
          )}
        </div>
      )}

      {/* ── MAIN WORK AREA ───────────────────────────── */}
      <div style={styles.workArea}>

        {/* ── LEFT PANEL — SCAN ────────────────────── */}
        <div style={styles.leftPanel}>

          {/* Scan input */}
          <div style={styles.scanSection}>
            <div style={styles.scanLabel}>
              {mode === MODES.ASSIGN
                ? '📦 Scan book to assign'
                : mode === MODES.RETURN
                ? '↩️ Scan book to return'
                : '⚠️ Scan book to mark as lost'}
            </div>

            <div style={styles.scanHint}>
              Connect a USB barcode scanner and click below,
              then scan the book. Or type the barcode manually.
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
                onClick={() =>
                  handleScan({ key: 'Enter' })
                }
              >
                Look Up
              </button>
            </div>

            <div style={styles.scanTip}>
              💡 Tip: USB scanner auto-presses Enter after
              scanning — no need to click anything
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

          {/* ── SCANNED BOOK INFO ──────────────────── */}
          {scannedBook && !scanError && (
            <div style={styles.bookInfoCard}>
              <div style={styles.bookInfoHeader}>
                📚 Book Found
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Title</span>
                <span style={styles.bookInfoValue}>
                  {scannedBook.bookDetails?.titleName || '—'}
                </span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Subject</span>
                <span style={styles.bookInfoValue}>
                  {scannedBook.bookDetails?.subject || '—'}
                </span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Grade</span>
                <span style={styles.bookInfoValue}>
                  Grade {scannedBook.bookDetails?.gradeLevel}
                </span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Barcode</span>
                <span style={{
                  ...styles.bookInfoValue,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}>
                  {scannedBook.qrCode}
                </span>
              </div>

              <div style={styles.bookInfoRow}>
                <span style={styles.bookInfoLabel}>Status</span>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  ...(statusColor[scannedBook.status] || {
                    bg: '#f0f2f5', color: '#666',
                  }),
                  background: statusColor[scannedBook.status]?.bg,
                  color: statusColor[scannedBook.status]?.color,
                }}>
                  {scannedBook.status}
                </span>
              </div>

              {/* Current holder info for return/loss */}
              {(mode === MODES.RETURN || mode === MODES.LOSS)
                && activeDistribution && (
                <div style={styles.holderInfo}>
                  <div style={styles.holderLabel}>
                    Currently held by:
                  </div>
                  <div style={styles.holderName}>
                    {activeDistribution.student?.fullName}
                  </div>
                  <div style={styles.holderMeta}>
                    {activeDistribution.student?.admissionNumber}
                    {' • '}Distributed:{' '}
                    {activeDistribution.dateDistributed}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={styles.actionButtons}>
                {mode === MODES.ASSIGN && (
                  <button
                    style={{
                      ...styles.assignBtn,
                      opacity: canAssign ? 1 : 0.4,
                    }}
                    onClick={handleAssign}
                    disabled={!canAssign || submitting}
                  >
                    {submitting
                      ? 'Assigning...'
                      : selectedStudent
                      ? `Assign to ${selectedStudent.fullName}`
                      : 'Select a student first →'}
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

                {mode === MODES.LOSS && (
                  <button
                    style={{
                      ...styles.lossBtn,
                      opacity: canMarkLost ? 1 : 0.4,
                    }}
                    onClick={handleMarkLost}
                    disabled={!canMarkLost || submitting}
                  >
                    {submitting
                      ? 'Processing...'
                      : '⚠️ Mark as Lost'}
                  </button>
                )}

                <button
                  style={styles.clearScanBtn}
                  onClick={resetScanState}
                >
                  Clear & Scan Again
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT PANEL — student search (assign only) */}
        {mode === MODES.ASSIGN && (
          <div style={styles.rightPanel}>
            <div style={styles.studentPanelHeader}>
              🎓 Select Student
            </div>

            {/* Stream selector */}
            <div style={styles.streamSelect}>
              <label style={styles.fieldLabel}>Stream</label>
              <select
                style={styles.select}
                value={selectedStreamId}
                onChange={e => {
                  setSelectedStreamId(e.target.value);
                  setSelectedStudent(null);
                  setStudentSearch('');
                }}
              >
                <option value="">Select a stream</option>
                {streams.map(s => (
                  <option key={s.streamId} value={s.streamId}>
                    {s.streamName}
                    {s.teacher
                      ? ` — ${s.teacher.fullName}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Student search */}
            {selectedStreamId && (
              <div style={styles.studentSearch}>
                <label style={styles.fieldLabel}>
                  Search Student
                </label>
                <input
                  style={styles.searchInput}
                  placeholder="Name or admission number..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
            )}

            {/* Student list */}
            <div style={styles.studentList}>
              {!selectedStreamId ? (
                <div style={styles.studentListEmpty}>
                  Select a stream to see students
                </div>
              ) : loadingStudents ? (
                <div style={styles.studentListEmpty}>
                  Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div style={styles.studentListEmpty}>
                  {studentSearch
                    ? 'No students match your search'
                    : 'No active students in this stream'}
                </div>
              ) : (
                filteredStudents.map(student => (
                  <div
                    key={student.studentId || student.id}
                    style={{
                      ...styles.studentItem,
                      ...(selectedStudent === student
                        ? styles.studentItemSelected
                        : {}),
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
                    {selectedStudent === student && (
                      <span style={styles.studentCheck}>✓</span>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ── RIGHT PANEL — recent activity ────────── */}
        {mode !== MODES.ASSIGN && (
          <div style={styles.rightPanel}>
            <div style={styles.studentPanelHeader}>
              🕐 Recent Activity
            </div>
            <div style={styles.activityList}>
              {recentActivity.length === 0 ? (
                <div style={styles.studentListEmpty}>
                  No recent activity
                </div>
              ) : (
                recentActivity.map((record, i) => (
                  <div key={i} style={styles.activityItem}>
                    <div style={styles.activityBook}>
                      {record.bookCopy?.bookDetails?.titleName
                        || record.bookCopy?.qrCode}
                    </div>
                    <div style={styles.activityStudent}>
                      {record.student?.fullName}
                    </div>
                    <div style={{
                      ...styles.activityStatus,
                      color: record.status === 'RETURNED'
                        ? '#276749'
                        : record.status === 'LOST'
                        ? '#c53030'
                        : '#744210',
                    }}>
                      {record.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── CONFIRMATION MODAL FOR FLAG LOST ──────────── */}
      {confirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>⚠️</span>
              <h2 style={styles.modalTitle}>Flag Book as Lost?</h2>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <label style={styles.modalLabel}>Book Title</label>
                <div style={styles.modalValue}>
                  {confirmModal.bookCopy?.bookDetails?.titleName}
                </div>
              </div>

              <div style={styles.modalSection}>
                <label style={styles.modalLabel}>Subject</label>
                <div style={styles.modalValue}>
                  {confirmModal.bookCopy?.bookDetails?.subject}
                </div>
              </div>

              <div style={styles.modalSection}>
                <label style={styles.modalLabel}>Student</label>
                <div style={styles.modalValue}>
                  {confirmModal.student?.fullName}
                </div>
              </div>

              <div style={styles.modalSection}>
                <label style={styles.modalLabel}>Admission #</label>
                <div style={styles.modalValue}>
                  {confirmModal.student?.admissionNumber}
                </div>
              </div>

              <div style={styles.modalSection}>
                <label style={styles.modalLabel}>Barcode</label>
                <div style={{...styles.modalValue, fontFamily: 'monospace', fontSize: 12}}>
                  {confirmModal.bookCopy?.qrCode}
                </div>
              </div>

              <div style={styles.warningBox}>
                This action will create a loss report. The book will be marked as LOST in the system.
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.modalCancelBtn}
                onClick={cancelFlagLost}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                style={styles.modalConfirmBtn}
                onClick={confirmFlagLost}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : '⚠️ Flag as Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── MODE TAB COMPONENT ────────────────────────────────────────────────
function ModeTab({ active, onClick, icon, label, desc }) {
  return (
    <div
      style={{
        ...tabStyles.tab,
        ...(active ? tabStyles.tabActive : {}),
      }}
      onClick={onClick}
    >
      <span style={tabStyles.icon}>{icon}</span>
      <div>
        <div style={tabStyles.label}>{label}</div>
        <div style={tabStyles.desc}>{desc}</div>
      </div>
    </div>
  );
}

// ── ALL STYLES ────────────────────────────────────────────────────────
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
    display: 'flex', gap: 12, marginBottom: 20,
    flexWrap: 'wrap',
  },
  workArea: {
    display: 'flex', gap: 20, alignItems: 'flex-start',
  },
  leftPanel: {
    flex: '0 0 420px', display: 'flex',
    flexDirection: 'column', gap: 16,
  },
  rightPanel: {
    flex: 1, background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  scanSection: {
    background: '#fff', borderRadius: 12,
    padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  scanLabel: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e',
    marginBottom: 6,
  },
  scanHint: {
    fontSize: 12, color: '#888', marginBottom: 14,
    lineHeight: 1.5,
  },
  scanInputWrap: {
    display: 'flex', gap: 8, marginBottom: 8,
  },
  scanInput: {
    flex: 1, padding: '12px 14px',
    border: '2px solid #1a1a2e', borderRadius: 8,
    fontSize: 14, outline: 'none',
    fontFamily: 'monospace',
    background: '#fafbfc',
  },
  scanLookupBtn: {
    padding: '12px 16px', background: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  scanTip: {
    fontSize: 11, color: '#aaa', marginTop: 4,
  },
  scanLoadingMsg: {
    fontSize: 13, color: '#2b6cb0',
    marginTop: 10, padding: '8px 12px',
    background: '#ebf8ff', borderRadius: 6,
  },
  scanErrorMsg: {
    fontSize: 13, color: '#c53030',
    marginTop: 10, padding: '8px 12px',
    background: '#fff5f5', borderRadius: 6,
    border: '1px solid #fed7d7',
  },
  bookInfoCard: {
    background: '#fff', borderRadius: 12,
    padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
  bookInfoLabel: {
    fontSize: 12, color: '#888', fontWeight: 500,
  },
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
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4,
  },
  holderName: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e',
  },
  holderMeta: {
    fontSize: 11, color: '#888', marginTop: 2,
  },
  actionButtons: {
    display: 'flex', flexDirection: 'column',
    gap: 8, marginTop: 16,
  },
  assignBtn: {
    padding: '12px', background: '#276749',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
    transition: 'opacity 0.2s',
  },
  returnBtn: {
    padding: '12px', background: '#2b6cb0',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  lossBtn: {
    padding: '12px', background: '#c53030',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  clearScanBtn: {
    padding: '9px', background: '#f0f2f5',
    color: '#666', border: '1.5px solid #e0e0e0',
    borderRadius: 8, fontSize: 13,
    fontWeight: 500, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  studentPanelHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f2f5',
    fontWeight: 700, fontSize: 14, color: '#1a1a2e',
    background: '#fafbfc',
  },
  streamSelect: {
    padding: '12px 20px',
    borderBottom: '1px solid #f0f2f5',
  },
  fieldLabel: {
    display: 'block', fontSize: 12,
    fontWeight: 600, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 6,
  },
  select: {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#fff',
    fontFamily: 'Segoe UI, sans-serif', cursor: 'pointer',
  },
  studentSearch: {
    padding: '12px 20px',
    borderBottom: '1px solid #f0f2f5',
  },
  searchInput: {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  studentList: {
    maxHeight: 420, overflowY: 'auto',
  },
  studentListEmpty: {
    padding: '30px 20px', textAlign: 'center',
    color: '#aaa', fontSize: 13,
  },
  studentItem: {
    display: 'flex', alignItems: 'center',
    gap: 12, padding: '12px 20px',
    borderBottom: '1px solid #f7fafc',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  studentItemSelected: {
    background: '#f0f7ff',
    borderLeft: '3px solid #1a1a2e',
  },
  studentAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700,
    fontSize: 15, flexShrink: 0,
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: 14, fontWeight: 600, color: '#1a1a2e',
  },
  studentAdm: { fontSize: 11, color: '#888', marginTop: 1 },
  studentCheck: {
    color: '#276749', fontWeight: 700, fontSize: 16,
  },
  activityList: {
    maxHeight: 420, overflowY: 'auto',
  },
  activityItem: {
    padding: '12px 20px',
    borderBottom: '1px solid #f7fafc',
  },
  activityBook: {
    fontSize: 13, fontWeight: 600, color: '#1a1a2e',
  },
  activityStudent: {
    fontSize: 12, color: '#666', marginTop: 2,
  },
  activityStatus: {
    fontSize: 11, fontWeight: 600,
    marginTop: 2, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listCard: {
    background: '#fff', borderRadius: 12,
    padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 20,
  },
  listCardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
    paddingBottom: 12, borderBottom: '2px solid #f0f2f5',
  },
  countBadge: {
    background: '#c53030', color: '#fff',
    padding: '4px 12px', borderRadius: 12,
    fontSize: 12, fontWeight: 700,
  },
  auditNotice: {
    background: '#fffbea', border: '1px solid #fde68a',
    borderRadius: 8, padding: 12, marginBottom: 16,
    fontSize: 13, color: '#744210', lineHeight: 1.5,
  },
  loadingText: {
    textAlign: 'center', padding: 40,
    color: '#aaa', fontSize: 14,
  },
  emptyList: {
    textAlign: 'center', padding: 40,
    color: '#888', fontSize: 16, fontWeight: 500,
  },
  tableWrapper: {
    overflowX: 'auto', borderRadius: 8,
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 13,
  },
  tableHead: {
    background: '#f5f7fa', borderBottom: '2px solid #e0e0e0',
  },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontWeight: 700, color: '#1a1a2e',
    fontSize: 12, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    borderBottom: '1px solid #f0f2f5',
    transition: 'background 0.1s',
  },
  td: {
    padding: '14px 16px', color: '#333',
  },
  bookTitleCell: {
    fontWeight: 600, color: '#1a1a2e',
  },
  bookSubject: {
    fontSize: 11, color: '#888', marginTop: 2,
  },
  studentNameCell: {
    fontWeight: 600, color: '#1a1a2e',
  },
  codeText: {
    fontFamily: 'monospace', fontSize: 11,
    background: '#f5f7fa', padding: '2px 6px',
    borderRadius: 4, color: '#666',
  },
  flagLostBtn: {
    padding: '8px 14px', background: '#c53030',
    color: '#fff', border: 'none', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    width: '90%', maxWidth: 500, maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '24px', borderBottom: '1px solid #f0f2f5',
    background: '#fef3e2',
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    margin: 0, fontSize: 18, fontWeight: 700,
    color: '#c53030',
  },
  modalBody: {
    padding: '24px',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
  },
  modalValue: {
    fontSize: 14, fontWeight: 600, color: '#1a1a2e',
    padding: '10px 12px', background: '#f5f7fa',
    borderRadius: 6,
  },
  warningBox: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: 12, marginTop: 16,
    fontSize: 13, color: '#c53030', lineHeight: 1.5,
  },
  modalFooter: {
    display: 'flex', gap: 12, padding: '16px 24px',
    borderTop: '1px solid #f0f2f5', justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    padding: '10px 20px', background: '#f0f2f5',
    color: '#666', border: 'none', borderRadius: 6,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif', transition: 'all 0.2s',
  },
  modalConfirmBtn: {
    padding: '10px 20px', background: '#c53030',
    color: '#fff', border: 'none', borderRadius: 6,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif', transition: 'all 0.2s',
  },
};

const tabStyles = {
  tab: {
    display: 'flex', alignItems: 'center',
    gap: 12, padding: '14px 20px',
    background: '#fff', borderRadius: 12,
    border: '2px solid transparent',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.15s', flex: 1, minWidth: 160,
  },
  tabActive: {
    border: '2px solid #1a1a2e',
    background: '#1a1a2e',
  },
  icon: { fontSize: 22 },
  label: {
    fontSize: 14, fontWeight: 700,
    color: '#1a1a2e',
  },
  desc: { fontSize: 11, color: '#888', marginTop: 2 },
};