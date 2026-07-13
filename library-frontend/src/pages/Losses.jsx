import { useState, useEffect } from 'react';
import { lossService, studentService } from '../services/libraryApi';
 
export default function Losses() {
 
  const [losses, setLosses] = useState([]);
  const [loading, setLoading] = useState(true);
 
  // Tab control — 'pending' | 'all' | 'student'
  const [tab, setTab] = useState('pending');
 
  // ── STUDENT SEARCH BY ADMISSION NUMBER ───────────────
  const [admissionInput, setAdmissionInput] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [studentLosses, setStudentLosses] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
 
  // Source filter — ALL | DISTRIBUTION | BORROWING
  const [sourceFilter, setSourceFilter] = useState('ALL');
 
  // Modal
  const [modal, setModal] = useState(null);
  const [selectedLoss, setSelectedLoss] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
 
  // Feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
 
  // ── LOAD ON MOUNT ─────────────────────────────────────
  useEffect(() => {
    loadPending();
  }, []);
 
  // Reload when tab changes
  useEffect(() => {
    if (tab === 'pending') loadPending();
    if (tab === 'all') loadAll();
    // Reset student search when switching away
    if (tab !== 'student') {
      setAdmissionInput('');
      setSearchedStudent(null);
      setStudentLosses([]);
      setSearchError('');
    }
  }, [tab]);
 
  // ── LOAD FUNCTIONS ────────────────────────────────────
  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await lossService.getPending();
      setLosses(res.data);
    } catch {
      setError('Failed to load pending losses');
    } finally {
      setLoading(false);
    }
  };
 
  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await lossService.getAll();
      setLosses(res.data);
    } catch {
      setError('Failed to load all losses');
    } finally {
      setLoading(false);
    }
  };
 
  // ── SEARCH STUDENT BY ADMISSION NUMBER ───────────────
  // Called when librarian types admission number and presses
  // Enter or clicks Search
  const handleStudentSearch = async () => {
    const admNo = admissionInput.trim();
    if (!admNo) {
      setSearchError('Enter an admission number first');
      return;
    }
 
    setSearchLoading(true);
    setSearchError('');
    setSearchedStudent(null);
    setStudentLosses([]);
 
    try {
      // Step 1 — find student by admission number
      const studentRes = await studentService.getByAdmission(admNo);
      const student = studentRes.data;
      setSearchedStudent(student);
 
      // Step 2 — load their loss records
      const lossRes = await lossService.getByStudent(
        student.studentId
      );
      setStudentLosses(lossRes.data);
 
    } catch (err) {
      if (err.response?.status === 404) {
        setSearchError(
          `No student found with admission number "${admNo}". Check and try again.`
        );
      } else {
        setSearchError('Failed to search. Is the server running?');
      }
    } finally {
      setSearchLoading(false);
    }
  };
 
  // Allow pressing Enter in the input to trigger search
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleStudentSearch();
  };
 
  // ── RESOLVE ───────────────────────────────────────────
  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      setError('Please enter resolution notes');
      return;
    }
    setSubmitting(true);
    try {
      await lossService.resolve(
        selectedLoss.reportId, resolutionNotes
      );
      showSuccess(
        `Loss report resolved for ${selectedLoss.student?.fullName}`
      );
      closeModal();
      if (tab === 'pending') loadPending();
      else if (tab === 'all') loadAll();
      // Refresh student losses if on student tab
      if (tab === 'student' && searchedStudent) {
        const res = await lossService.getByStudent(
          searchedStudent.studentId
        );
        setStudentLosses(res.data);
      }
    } catch (err) {
      setError(err.response?.data || 'Failed to resolve');
    } finally {
      setSubmitting(false);
    }
  };
 
  // ── WRITE OFF ─────────────────────────────────────────
  const handleWriteOff = async () => {
    setSubmitting(true);
    try {
      await lossService.writeOff(
        selectedLoss.reportId,
        resolutionNotes || 'Written off by librarian'
      );
      showSuccess(
        `Loss written off for ${selectedLoss.student?.fullName}`
      );
      closeModal();
      if (tab === 'pending') loadPending();
      else if (tab === 'all') loadAll();
      if (tab === 'student' && searchedStudent) {
        const res = await lossService.getByStudent(
          searchedStudent.studentId
        );
        setStudentLosses(res.data);
      }
    } catch (err) {
      setError(err.response?.data || 'Failed to write off');
    } finally {
      setSubmitting(false);
    }
  };
 
  // ── DOWNLOAD REPORT ───────────────────────────────────
  const handleDownloadReport = (reportData, title) => {
    const rows = reportData.map((loss, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${i + 1}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <strong>${loss.student?.fullName || '—'}</strong><br/>
          <small style="color:#888">
            ${loss.student?.admissionNumber || ''}
          </small>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${loss.student?.stream?.streamName || '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${loss.bookCopy?.bookDetails?.titleName || '—'}<br/>
          <small style="color:#888;font-family:monospace">
            ${loss.bookCopy?.qrCode || ''}
          </small>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <span style="
            padding:2px 8px;border-radius:12px;font-size:12px;
            font-weight:600;
            background:${loss.source === 'DISTRIBUTION' ? '#ebf8ff' : '#fff5f5'};
            color:${loss.source === 'DISTRIBUTION' ? '#2b6cb0' : '#c53030'}
          ">${loss.source}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${loss.reason || '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${loss.dateFlagged || '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <span style="
            padding:2px 8px;border-radius:12px;font-size:12px;
            font-weight:600;
            background:${
              loss.resolutionStatus === 'PENDING' ? '#fffff0'
              : loss.resolutionStatus === 'RESOLVED' ? '#f0fff4'
              : '#f7fafc'
            };
            color:${
              loss.resolutionStatus === 'PENDING' ? '#744210'
              : loss.resolutionStatus === 'RESOLVED' ? '#276749'
              : '#666'
            }
          ">${loss.resolutionStatus}</span>
        </td>
      </tr>
    `).join('');
 
    const html = `
      <!DOCTYPE html><html>
      <head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <style>
          *{box-sizing:border-box;}
          body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:30px;color:#1a1a2e;}
          .header{border-bottom:3px solid #1a1a2e;padding-bottom:16px;margin-bottom:24px;}
          .school-name{font-size:22px;font-weight:800;color:#1a1a2e;}
          .report-title{font-size:16px;color:#555;margin-top:4px;}
          .meta{display:flex;gap:30px;margin-top:12px;font-size:13px;color:#666;}
          .meta span strong{color:#1a1a2e;}
          table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
          thead tr{background:#1a1a2e;color:#fff;}
          thead th{padding:10px 14px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px;}
          .summary{margin-top:24px;padding:14px;background:#f7fafc;border-radius:8px;border:1px solid #e0e0e0;font-size:13px;}
          .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:10px;}
          .summary-item{text-align:center;padding:10px;background:#fff;border-radius:6px;border:1px solid #e8ecf0;}
          .summary-value{font-size:24px;font-weight:800;color:#1a1a2e;}
          .summary-label{font-size:11px;color:#888;margin-top:4px;}
          .footer{margin-top:30px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:12px;color:#aaa;}
          @media print{body{padding:15px;}.no-print{display:none;}}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">📚 School Library System</div>
          <div class="report-title">${title}</div>
          <div class="meta">
            <span>Generated: <strong>${new Date().toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}</strong></span>
            <span>Total Records: <strong>${reportData.length}</strong></span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Student</th><th>Stream</th>
              <th>Book Lost</th><th>Source</th><th>Reason</th>
              <th>Date Flagged</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <strong>Summary</strong>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${reportData.length}</div>
              <div class="summary-label">Total Losses</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.filter(l=>l.source==='DISTRIBUTION').length}</div>
              <div class="summary-label">From Distribution</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.filter(l=>l.source==='BORROWING').length}</div>
              <div class="summary-label">From Borrowing</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.filter(l=>l.resolutionStatus==='PENDING').length}</div>
              <div class="summary-label">Pending</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.filter(l=>l.resolutionStatus==='RESOLVED').length}</div>
              <div class="summary-label">Resolved</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.filter(l=>l.resolutionStatus==='WRITTEN_OFF').length}</div>
              <div class="summary-label">Written Off</div>
            </div>
          </div>
        </div>
        <div class="footer">
          This report was generated by the School Library Management System.
          Forward to the secretary for follow-up with parents.
        </div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>
    `;
 
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };
 
  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };
 
  const closeModal = () => {
    setModal(null);
    setSelectedLoss(null);
    setResolutionNotes('');
    setError('');
  };
 
  const openResolve = (loss) => {
    setSelectedLoss(loss);
    setResolutionNotes('');
    setModal('resolve');
  };
 
  const openWriteOff = (loss) => {
    setSelectedLoss(loss);
    setResolutionNotes('');
    setModal('writeoff');
  };
 
  const applySourceFilter = (data) => {
    if (sourceFilter === 'ALL') return data;
    return data.filter(l => l.source === sourceFilter);
  };
 
  const filteredLosses = applySourceFilter(losses);
  const pendingCount = losses.filter(
    l => l.resolutionStatus === 'PENDING'
  ).length;
 
  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>
 
      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Loss Reports</h1>
          <p style={styles.pageSub}>
            Track, resolve and export book loss reports
          </p>
        </div>
        <button
          style={styles.downloadBtn}
          onClick={() => handleDownloadReport(
            tab === 'student' ? studentLosses : filteredLosses,
            tab === 'pending' ? 'Pending Loss Reports'
            : tab === 'student' && searchedStudent
            ? `Loss Report — ${searchedStudent.fullName}`
            : 'All Loss Reports'
          )}
        >
          ⬇️ Download Report
        </button>
      </div>
 
      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>✅ {success}</div>
      )}
      {error && !modal && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}
 
      {/* ── TABS ─────────────────────────────────────── */}
      <div style={styles.tabs}>
        {[
          {
            key: 'pending',
            label: `Pending (${pendingCount})`,
            desc: 'Awaiting resolution',
          },
          {
            key: 'all',
            label: 'All Reports',
            desc: 'Full history',
          },
          {
            key: 'student',
            label: 'By Student',
            desc: 'Search by admission no.',
          },
        ].map(t => (
          <div
            key={t.key}
            style={{
              ...styles.tab,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
            onClick={() => setTab(t.key)}
          >
            <div style={{
              ...styles.tabLabel,
              color: tab === t.key ? '#fff' : '#1a1a2e',
            }}>
              {t.label}
            </div>
            <div style={{
              ...styles.tabDesc,
              color: tab === t.key
                ? 'rgba(255,255,255,0.6)' : '#888',
            }}>
              {t.desc}
            </div>
          </div>
        ))}
      </div>
 
      {/* ── SOURCE FILTER (pending + all tabs) ───────── */}
      {(tab === 'pending' || tab === 'all') && (
        <div style={styles.filterRow}>
          <span style={styles.filterRowLabel}>Source:</span>
          {['ALL', 'DISTRIBUTION', 'BORROWING'].map(src => (
            <button
              key={src}
              style={{
                ...styles.filterChip,
                ...(sourceFilter === src
                  ? styles.filterChipActive : {}),
              }}
              onClick={() => setSourceFilter(src)}
            >
              {src === 'ALL' ? 'All'
                : src === 'DISTRIBUTION' ? '📦 Distribution'
                : '📖 Borrowing'}
            </button>
          ))}
          {filteredLosses.length > 0 && (
            <button
              style={styles.downloadSmallBtn}
              onClick={() => handleDownloadReport(
                filteredLosses,
                sourceFilter === 'ALL' ? 'Loss Report'
                  : `${sourceFilter} Loss Report`
              )}
            >
              ⬇️ Download Filtered
            </button>
          )}
        </div>
      )}
 
      {/* ── PENDING / ALL LOSS TABLE ─────────────────── */}
      {(tab === 'pending' || tab === 'all') && (
        <div style={styles.tableCard}>
          {loading ? (
            <div style={styles.loadingText}>
              Loading loss reports...
            </div>
          ) : filteredLosses.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                {tab === 'pending' ? '🎉' : '📋'}
              </div>
              <div style={styles.emptyTitle}>
                {tab === 'pending'
                  ? 'No pending loss reports'
                  : 'No loss reports found'}
              </div>
              <div style={styles.emptySub}>
                {tab === 'pending'
                  ? 'All losses have been resolved'
                  : 'Loss reports will appear here when books are flagged'}
              </div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Stream</th>
                  <th style={styles.th}>Book Lost</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Date Flagged</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLosses.map((loss, i) => (
                  <LossRow
                    key={loss.reportId}
                    loss={loss}
                    index={i}
                    onResolve={() => openResolve(loss)}
                    onWriteOff={() => openWriteOff(loss)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
 
      {/* ── BY STUDENT TAB ───────────────────────────── */}
      {tab === 'student' && (
        <div style={styles.studentTab}>
 
          {/* ── SEARCH BAR ───────────────────────────── */}
          <div style={styles.searchCard}>
            <div style={styles.searchTitle}>
              🔍 Search by Admission Number
            </div>
            <p style={styles.searchHint}>
              Enter the student's admission number and press
              Search or hit Enter.
            </p>
            <div style={styles.searchRow}>
              <input
                style={styles.admInput}
                placeholder="e.g. ADM2025001"
                value={admissionInput}
                onChange={e => {
                  setAdmissionInput(e.target.value);
                  // Clear previous results when typing
                  if (searchedStudent) {
                    setSearchedStudent(null);
                    setStudentLosses([]);
                    setSearchError('');
                  }
                }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                style={{
                  ...styles.searchBtn,
                  opacity: searchLoading ? 0.7 : 1,
                }}
                onClick={handleStudentSearch}
                disabled={searchLoading}
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
 
            {/* Search error */}
            {searchError && (
              <div style={styles.searchError}>
                ❌ {searchError}
              </div>
            )}
          </div>
 
          {/* ── STUDENT PROFILE ──────────────────────── */}
          {searchedStudent && (
            <div style={styles.studentProfile}>
              <div style={styles.profileAvatar}>
                {searchedStudent.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={styles.profileInfo}>
                <div style={styles.profileName}>
                  {searchedStudent.fullName}
                </div>
                <div style={styles.profileMeta}>
                  {searchedStudent.admissionNumber}
                  {searchedStudent.stream?.streamName
                    ? ` • Stream ${searchedStudent.stream.streamName}`
                    : ''}
                  {searchedStudent.yearEnrolled
                    ? ` • Enrolled ${searchedStudent.yearEnrolled}`
                    : ''}
                </div>
                <div style={styles.profileLossCount}>
                  {studentLosses.length === 0
                    ? 'No loss records'
                    : `${studentLosses.length} loss ${studentLosses.length === 1 ? 'record' : 'records'} found`}
                </div>
              </div>
 
              {/* Download for this student */}
              {studentLosses.length > 0 && (
                <button
                  style={styles.profileDownloadBtn}
                  onClick={() => handleDownloadReport(
                    studentLosses,
                    `Loss Report — ${searchedStudent.fullName}`
                  )}
                >
                  ⬇️ Download Report
                </button>
              )}
            </div>
          )}
 
          {/* ── STUDENT LOSS TABLE ───────────────────── */}
          {searchedStudent && (
            <div style={styles.tableCard}>
              {studentLosses.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>✅</div>
                  <div style={styles.emptyTitle}>
                    No loss records
                  </div>
                  <div style={styles.emptySub}>
                    {searchedStudent.fullName} has no loss reports
                  </div>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Stream</th>
                      <th style={styles.th}>Book Lost</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Date Flagged</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentLosses.map((loss, i) => (
                      <LossRow
                        key={loss.reportId}
                        loss={loss}
                        index={i}
                        onResolve={() => openResolve(loss)}
                        onWriteOff={() => openWriteOff(loss)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
 
          {/* ── INITIAL EMPTY STATE ──────────────────── */}
          {!searchedStudent && !searchError && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>
                Enter an admission number above
              </div>
              <div style={styles.emptySub}>
                Type the student's admission number and
                click Search to view their loss history
              </div>
            </div>
          )}
 
        </div>
      )}
 
      {/* ── RESOLVE MODAL ────────────────────────────── */}
      {modal === 'resolve' && (
        <Modal title="Resolve Loss Report" onClose={closeModal}>
          {error && <div style={styles.modalError}>{error}</div>}
          <div style={styles.lossModalSummary}>
            <div style={styles.lossModalBook}>
              📚 {selectedLoss?.bookCopy?.bookDetails?.titleName}
            </div>
            <div style={styles.lossModalStudent}>
              Student: {selectedLoss?.student?.fullName}
            </div>
            <div style={styles.lossModalMeta}>
              Source: {selectedLoss?.source}
              {' • '}Flagged: {selectedLoss?.dateFlagged}
            </div>
          </div>
          <div style={styles.resolveInfo}>
            ✅ Mark as Resolved when the student has paid a
            replacement cost, the book was found, or the
            matter has been settled.
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.modalLabel}>
              Resolution Notes
            </label>
            <textarea
              style={styles.textarea}
              placeholder="e.g. Student paid replacement cost of KES 850. Receipt number 001."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button
              style={{
                ...styles.resolveBtn,
                opacity: submitting ? 0.7 : 1,
              }}
              onClick={handleResolve}
              disabled={submitting}
            >
              {submitting ? 'Resolving...' : '✅ Mark Resolved'}
            </button>
          </div>
        </Modal>
      )}
 
      {/* ── WRITE OFF MODAL ──────────────────────────── */}
      {modal === 'writeoff' && (
        <Modal title="Write Off Loss" onClose={closeModal}>
          {error && <div style={styles.modalError}>{error}</div>}
          <div style={styles.lossModalSummary}>
            <div style={styles.lossModalBook}>
              📚 {selectedLoss?.bookCopy?.bookDetails?.titleName}
            </div>
            <div style={styles.lossModalStudent}>
              Student: {selectedLoss?.student?.fullName}
            </div>
          </div>
          <div style={styles.writeOffInfo}>
            ⚠️ Write Off means the school absorbs the loss.
            No further action required from the student.
            Typically used when the student has left, the book
            is of low value, or other circumstances.
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.modalLabel}>Notes (optional)</label>
            <textarea
              style={styles.textarea}
              placeholder="e.g. Student left school. Loss written off by administration."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button
              style={{
                ...styles.writeOffBtn,
                opacity: submitting ? 0.7 : 1,
              }}
              onClick={handleWriteOff}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : '⚠️ Write Off'}
            </button>
          </div>
        </Modal>
      )}
 
    </div>
  );
}
 
// ── LOSS ROW COMPONENT ────────────────────────────────────────────────
function LossRow({ loss, index, onResolve, onWriteOff }) {
  const sourceColors = {
    DISTRIBUTION: { bg: '#ebf8ff', color: '#2b6cb0' },
    BORROWING:    { bg: '#fff5f5', color: '#c53030' },
  };
  const statusColors = {
    PENDING:     { bg: '#fffff0', color: '#744210' },
    RESOLVED:    { bg: '#f0fff4', color: '#276749' },
    WRITTEN_OFF: { bg: '#f7fafc', color: '#666' },
  };
 
  const sc = sourceColors[loss.source] || { bg: '#f0f2f5', color: '#666' };
  const stc = statusColors[loss.resolutionStatus] || { bg: '#f0f2f5', color: '#666' };
  const isPending = loss.resolutionStatus === 'PENDING';
 
  return (
    <tr
      style={styles.tableRow}
      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={styles.td}>{index + 1}</td>
      <td style={styles.td}>
        <div style={styles.cellPrimary}>
          {loss.student?.fullName || '—'}
        </div>
        <div style={styles.cellSub}>
          {loss.student?.admissionNumber}
        </div>
      </td>
      <td style={styles.td}>
        {loss.student?.stream?.streamName || '—'}
      </td>
      <td style={styles.td}>
        <div style={styles.cellPrimary}>
          {loss.bookCopy?.bookDetails?.titleName || '—'}
        </div>
        <div style={{ ...styles.cellSub, fontFamily: 'monospace' }}>
          {loss.bookCopy?.qrCode}
        </div>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: sc.bg, color: sc.color }}>
          {loss.source}
        </span>
      </td>
      <td style={styles.td}>
        <div style={{ fontSize: 12, color: '#555', maxWidth: 180 }}>
          {loss.reason || '—'}
        </div>
      </td>
      <td style={styles.td}>
        <div style={{ fontSize: 13 }}>{loss.dateFlagged}</div>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: stc.bg, color: stc.color }}>
          {loss.resolutionStatus?.replace('_', ' ')}
        </span>
        {loss.dateResolved && (
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
            {loss.dateResolved}
          </div>
        )}
      </td>
      <td style={styles.td}>
        {isPending ? (
          <div style={styles.actionRow}>
            <button style={styles.resolveSmallBtn} onClick={onResolve}>
              ✅ Resolve
            </button>
            <button style={styles.writeOffSmallBtn} onClick={onWriteOff}>
              ⚠️ Write Off
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {loss.notes || 'Closed'}
          </span>
        )}
      </td>
    </tr>
  );
}
 
// ── MODAL ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div style={modalStyles.box} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}
 
// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
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
  downloadBtn: {
    background: '#1a1a2e', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 20px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  downloadSmallBtn: {
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '7px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
    whiteSpace: 'nowrap',
  },
  tabs: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  tab: {
    padding: '12px 20px', background: '#fff', borderRadius: 10,
    border: '2px solid transparent', cursor: 'pointer',
    flex: 1, minWidth: 150,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'all 0.15s',
  },
  tabActive: { background: '#1a1a2e', border: '2px solid #1a1a2e' },
  tabLabel: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  tabDesc: { fontSize: 11 },
  filterRow: {
    display: 'flex', alignItems: 'center',
    gap: 8, marginBottom: 14, flexWrap: 'wrap',
  },
  filterRowLabel: { fontSize: 13, fontWeight: 600, color: '#888' },
  filterChip: {
    padding: '5px 14px', borderRadius: 20,
    border: '1.5px solid #e0e0e0', background: '#fff',
    color: '#555', fontSize: 12, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
  filterChipActive: {
    background: '#1a1a2e', color: '#fff',
    border: '1.5px solid #1a1a2e', fontWeight: 700,
  },
  tableCard: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden', overflowX: 'auto',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 13, minWidth: 900,
  },
  th: {
    padding: '10px 14px', textAlign: 'left',
    color: '#888', fontWeight: 600, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5,
    background: '#fafbfc', borderBottom: '2px solid #f0f2f5',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #f0f2f5', transition: 'background 0.15s',
  },
  td: { padding: '11px 14px', color: '#333', verticalAlign: 'top' },
  cellPrimary: { fontWeight: 600, color: '#1a1a2e', fontSize: 13 },
  cellSub: { fontSize: 11, color: '#999', marginTop: 2 },
  badge: {
    fontSize: 11, fontWeight: 600, padding: '3px 8px',
    borderRadius: 20, display: 'inline-block', whiteSpace: 'nowrap',
  },
  actionRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  resolveSmallBtn: {
    padding: '4px 10px', background: '#f0fff4', color: '#276749',
    border: '1.5px solid #c6f6d5', borderRadius: 6,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif', whiteSpace: 'nowrap',
  },
  writeOffSmallBtn: {
    padding: '4px 10px', background: '#fffff0', color: '#744210',
    border: '1.5px solid #fefcbf', borderRadius: 6,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif', whiteSpace: 'nowrap',
  },
  loadingText: { padding: 40, textAlign: 'center', color: '#888', fontSize: 14 },
  emptyState: { padding: 60, textAlign: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 },
  emptySub: { color: '#888', fontSize: 13 },
 
  // Student search tab
  studentTab: { display: 'flex', flexDirection: 'column', gap: 16 },
  searchCard: {
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  searchTitle: {
    fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6,
  },
  searchHint: {
    fontSize: 13, color: '#888', margin: '0 0 14px', lineHeight: 1.5,
  },
  searchRow: { display: 'flex', gap: 10 },
  admInput: {
    flex: 1, padding: '10px 14px',
    border: '2px solid #1a1a2e', borderRadius: 8,
    fontSize: 14, outline: 'none',
    fontFamily: 'monospace', background: '#fafbfc',
    maxWidth: 320,
  },
  searchBtn: {
    padding: '10px 24px', background: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  searchError: {
    marginTop: 10, padding: '8px 12px',
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 6, color: '#c53030', fontSize: 13,
  },
  studentProfile: {
    background: '#1a1a2e', borderRadius: 12,
    padding: '16px 20px', display: 'flex',
    alignItems: 'center', gap: 14,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 20, flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontWeight: 700, fontSize: 17 },
  profileMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  profileLossCount: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 },
  profileDownloadBtn: {
    padding: '8px 16px', background: 'rgba(255,255,255,0.15)',
    color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
    flexShrink: 0, whiteSpace: 'nowrap',
  },
 
  // Modal
  modalError: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 14px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  lossModalSummary: {
    background: '#f7fafc', borderRadius: 8,
    padding: '12px 14px', marginBottom: 14,
  },
  lossModalBook: { fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 },
  lossModalStudent: { fontSize: 13, color: '#555' },
  lossModalMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  resolveInfo: {
    background: '#f0fff4', border: '1px solid #c6f6d5',
    borderRadius: 8, padding: '10px 14px',
    color: '#276749', fontSize: 13, marginBottom: 14,
  },
  writeOffInfo: {
    background: '#fffff0', border: '1px solid #fefcbf',
    borderRadius: 8, padding: '10px 14px',
    color: '#744210', fontSize: 13, marginBottom: 14,
  },
  modalLabel: {
    display: 'block', fontSize: 13,
    fontWeight: 600, color: '#333', marginBottom: 6,
  },
  textarea: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif', resize: 'vertical',
  },
  modalActions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20,
  },
  cancelBtn: {
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '9px 18px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
  resolveBtn: {
    background: '#276749', color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  writeOffBtn: {
    background: '#744210', color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
};
 
const modalStyles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  box: {
    background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480,
    maxHeight: '90vh', overflow: 'hidden', display: 'flex',
    flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '18px 22px',
    borderBottom: '1px solid #f0f2f5',
  },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 16, cursor: 'pointer', color: '#888', padding: 4,
  },
  body: { padding: '20px 22px', overflowY: 'auto' },
};