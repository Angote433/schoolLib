import { useState, useEffect } from 'react';
import { lossService, studentService } from '../services/libraryApi';
import { tokens, getStatusColor } from '../styles/tokens';
import {
  Modal, Input, Button, Banner, StatusBadge, Tabs, Card, Avatar, Textarea,
} from '../components/SharedComponents';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when tab changes
  useEffect(() => {
    if (tab === 'pending') loadPending();
    if (tab === 'all') loadAll();
    if (tab !== 'student') {
      setAdmissionInput('');
      setSearchedStudent(null);
      setStudentLosses([]);
      setSearchError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const studentRes = await studentService.getByAdmission(admNo);
      const student = studentRes.data;
      setSearchedStudent(student);

      const lossRes = await lossService.getByStudent(student.studentId);
      setStudentLosses(lossRes.data);

    } catch (err) {
      if (err.response?.status === 404) {
        setSearchError(`No student found with admission number "${admNo}". Check and try again.`);
      } else {
        setSearchError('Failed to search. Is the server running?');
      }
    } finally {
      setSearchLoading(false);
    }
  };

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
      await lossService.resolve(selectedLoss.reportId, resolutionNotes);
      showSuccess(`Loss report resolved for ${selectedLoss.student?.fullName}`);
      closeModal();
      if (tab === 'pending') loadPending();
      else if (tab === 'all') loadAll();
      if (tab === 'student' && searchedStudent) {
        const res = await lossService.getByStudent(searchedStudent.studentId);
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
      await lossService.writeOff(selectedLoss.reportId, resolutionNotes || 'Written off by librarian');
      showSuccess(`Loss written off for ${selectedLoss.student?.fullName}`);
      closeModal();
      if (tab === 'pending') loadPending();
      else if (tab === 'all') loadAll();
      if (tab === 'student' && searchedStudent) {
        const res = await lossService.getByStudent(searchedStudent.studentId);
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
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:10px 14px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <strong>${loss.student?.fullName || '—'}</strong><br/>
          <small style="color:#94a3b8">${loss.student?.admissionNumber || ''}</small>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">${loss.student?.stream?.streamName || '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          ${loss.bookCopy?.bookDetails?.titleName || '—'}<br/>
          <small style="color:#94a3b8;font-family:monospace">${loss.bookCopy?.qrCode || ''}</small>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <span style="
            padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;
            background:${loss.source === 'DISTRIBUTION' ? '#eff6ff' : '#fef2f2'};
            color:${loss.source === 'DISTRIBUTION' ? '#1d4ed8' : '#dc2626'}
          ">${loss.source}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">${loss.reason || '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">${loss.dateFlagged || '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee">
          <span style="
            padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;
            background:${
              loss.resolutionStatus === 'PENDING' ? '#fffbeb'
              : loss.resolutionStatus === 'RESOLVED' ? '#f0fdf4'
              : '#f8fafc'
            };
            color:${
              loss.resolutionStatus === 'PENDING' ? '#d97706'
              : loss.resolutionStatus === 'RESOLVED' ? '#16a34a'
              : '#64748b'
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
          body{font-family:'Inter','Segoe UI',Arial,sans-serif;margin:0;padding:30px;color:#0F172A;}
          .header{border-bottom:3px solid #1B2B4B;padding-bottom:16px;margin-bottom:24px;}
          .school-name{font-size:22px;font-weight:800;color:#1B2B4B;}
          .report-title{font-size:16px;color:#475569;margin-top:4px;}
          .meta{display:flex;gap:30px;margin-top:12px;font-size:13px;color:#64748B;}
          .meta span strong{color:#1B2B4B;}
          table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
          thead tr{background:#1B2B4B;color:#fff;}
          thead th{padding:10px 14px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px;}
          .summary{margin-top:24px;padding:14px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:13px;}
          .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:10px;}
          .summary-item{text-align:center;padding:10px;background:#fff;border-radius:6px;border:1px solid #E2E8F0;}
          .summary-value{font-size:24px;font-weight:800;color:#1B2B4B;}
          .summary-label{font-size:11px;color:#94A3B8;margin-top:4px;}
          .footer{margin-top:30px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;}
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
    if (!win) {
      setError('Report window was blocked by the browser. Please allow pop-ups for this site and try again.');
      return;
    }
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
  const pendingCount = losses.filter(l => l.resolutionStatus === 'PENDING').length;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Loss Reports</h1>
          <p style={styles.pageSub}>Track, resolve and export book loss reports</p>
        </div>
        <Button
          variant="accent"
          onClick={() => handleDownloadReport(
            tab === 'student' ? studentLosses : filteredLosses,
            tab === 'pending' ? 'Pending Loss Reports'
            : tab === 'student' && searchedStudent
            ? `Loss Report — ${searchedStudent.fullName}`
            : 'All Loss Reports'
          )}
        >
          ⬇️ Download Report
        </Button>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && !modal && <Banner type="error">{error}</Banner>}

      {/* ── TABS ─────────────────────────────────────── */}
      <Tabs
        variant="pill"
        active={tab}
        onChange={setTab}
        items={[
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'all', label: 'All Reports' },
          { key: 'student', label: 'By Student' },
        ]}
      />

      {/* ── SOURCE FILTER (pending + all tabs) ───────── */}
      {(tab === 'pending' || tab === 'all') && (
        <div style={styles.filterRow}>
          <span style={styles.filterRowLabel}>Source:</span>
          {['ALL', 'DISTRIBUTION', 'BORROWING'].map(src => (
            <button
              key={src}
              style={{ ...styles.filterChip, ...(sourceFilter === src ? styles.filterChipActive : {}) }}
              onClick={() => setSourceFilter(src)}
            >
              {src === 'ALL' ? 'All' : src === 'DISTRIBUTION' ? '📦 Distribution' : '📖 Borrowing'}
            </button>
          ))}
          {filteredLosses.length > 0 && (
            <Button
              variant="secondary" size="sm"
              onClick={() => handleDownloadReport(
                filteredLosses,
                sourceFilter === 'ALL' ? 'Loss Report' : `${sourceFilter} Loss Report`
              )}
            >
              ⬇️ Download Filtered
            </Button>
          )}
        </div>
      )}

      {/* ── PENDING / ALL LOSS TABLE ─────────────────── */}
      {(tab === 'pending' || tab === 'all') && (
        <Card style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
          {loading ? (
            <div style={styles.loadingText}>Loading loss reports…</div>
          ) : filteredLosses.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>{tab === 'pending' ? '🎉' : '📋'}</div>
              <div style={styles.emptyTitle}>{tab === 'pending' ? 'No pending loss reports' : 'No loss reports found'}</div>
              <div style={styles.emptySub}>
                {tab === 'pending' ? 'All losses have been resolved' : 'Loss reports will appear here when books are flagged'}
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
        </Card>
      )}

      {/* ── BY STUDENT TAB ───────────────────────────── */}
      {tab === 'student' && (
        <div style={styles.studentTab}>

          {/* ── SEARCH BAR ───────────────────────────── */}
          <Card>
            <div style={styles.searchTitle}>🔍 Search by Admission Number</div>
            <p style={styles.searchHint}>
              Enter the student's admission number and press Search or hit Enter.
            </p>
            <div style={styles.searchRow}>
              <Input
                style={styles.admInput}
                placeholder="e.g. ADM2025001"
                value={admissionInput}
                onChange={e => {
                  setAdmissionInput(e.target.value);
                  if (searchedStudent) {
                    setSearchedStudent(null);
                    setStudentLosses([]);
                    setSearchError('');
                  }
                }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Button variant="primary" onClick={handleStudentSearch} disabled={searchLoading} style={{ height: 40 }}>
                {searchLoading ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {searchError && <div style={{ marginTop: 10 }}><Banner type="error">{searchError}</Banner></div>}
          </Card>

          {/* ── STUDENT PROFILE ──────────────────────── */}
          {searchedStudent && (
            <div style={styles.studentProfile}>
              <Avatar name={searchedStudent.fullName} size={48} background="rgba(255,255,255,0.15)" />
              <div style={styles.profileInfo}>
                <div style={styles.profileName}>{searchedStudent.fullName}</div>
                <div style={styles.profileMeta}>
                  {searchedStudent.admissionNumber}
                  {searchedStudent.stream?.streamName ? ` • Stream ${searchedStudent.stream.streamName}` : ''}
                  {searchedStudent.yearEnrolled ? ` • Enrolled ${searchedStudent.yearEnrolled}` : ''}
                </div>
                <div style={styles.profileLossCount}>
                  {studentLosses.length === 0
                    ? 'No loss records'
                    : `${studentLosses.length} loss ${studentLosses.length === 1 ? 'record' : 'records'} found`}
                </div>
              </div>

              {studentLosses.length > 0 && (
                <Button
                  variant="secondary"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => handleDownloadReport(studentLosses, `Loss Report — ${searchedStudent.fullName}`)}
                >
                  ⬇️ Download Report
                </Button>
              )}
            </div>
          )}

          {/* ── STUDENT LOSS TABLE ───────────────────── */}
          {searchedStudent && (
            <Card style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
              {studentLosses.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>✅</div>
                  <div style={styles.emptyTitle}>No loss records</div>
                  <div style={styles.emptySub}>{searchedStudent.fullName} has no loss reports</div>
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
            </Card>
          )}

          {/* ── INITIAL EMPTY STATE ──────────────────── */}
          {!searchedStudent && !searchError && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>Enter an admission number above</div>
              <div style={styles.emptySub}>
                Type the student's admission number and click Search to view their loss history
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── RESOLVE MODAL ────────────────────────────── */}
      {modal === 'resolve' && (
        <Modal title="Resolve Loss Report" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.lossModalSummary}>
            <div style={styles.lossModalBook}>📚 {selectedLoss?.bookCopy?.bookDetails?.titleName}</div>
            <div style={styles.lossModalStudent}>Student: {selectedLoss?.student?.fullName}</div>
            <div style={styles.lossModalMeta}>
              Source: {selectedLoss?.source}{' • '}Flagged: {selectedLoss?.dateFlagged}
            </div>
          </div>
          <Banner type="success">
            Mark as Resolved when the student has paid a replacement cost, the book was found, or the matter has been settled.
          </Banner>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.modalLabel}>Resolution Notes</label>
            <Textarea
              placeholder="e.g. Student paid replacement cost of KES 850. Receipt number 001."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="success" onClick={handleResolve} disabled={submitting}>
              {submitting ? 'Resolving…' : '✅ Mark Resolved'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── WRITE OFF MODAL ──────────────────────────── */}
      {modal === 'writeoff' && (
        <Modal title="Write Off Loss" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.lossModalSummary}>
            <div style={styles.lossModalBook}>📚 {selectedLoss?.bookCopy?.bookDetails?.titleName}</div>
            <div style={styles.lossModalStudent}>Student: {selectedLoss?.student?.fullName}</div>
          </div>
          <Banner type="warning">
            Write Off means the school absorbs the loss. No further action required from the student.
            Typically used when the student has left, the book is of low value, or other circumstances.
          </Banner>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.modalLabel}>Notes (optional)</label>
            <Textarea
              placeholder="e.g. Student left school. Loss written off by administration."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={handleWriteOff}
              disabled={submitting}
              style={{ background: tokens.colors.warning, color: '#fff' }}
            >
              {submitting ? 'Processing…' : '⚠️ Write Off'}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── LOSS ROW COMPONENT ────────────────────────────────────────────────
function LossRow({ loss, index, onResolve, onWriteOff }) {
  const sourceColor = loss.source === 'DISTRIBUTION' ? tokens.colors.info : tokens.colors.danger;
  const isPending = loss.resolutionStatus === 'PENDING';

  return (
    <tr
      style={{ ...styles.tableRow, borderLeft: `3px solid ${sourceColor}` }}
      onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surface}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={styles.td}>{index + 1}</td>
      <td style={styles.td}>
        <div style={styles.cellPrimary}>{loss.student?.fullName || '—'}</div>
        <div style={styles.cellSub}>{loss.student?.admissionNumber}</div>
      </td>
      <td style={styles.td}>{loss.student?.stream?.streamName || '—'}</td>
      <td style={styles.td}>
        <div style={styles.cellPrimary}>{loss.bookCopy?.bookDetails?.titleName || '—'}</div>
        <div style={{ ...styles.cellSub, fontFamily: tokens.font.mono }}>{loss.bookCopy?.qrCode}</div>
      </td>
      <td style={styles.td}><StatusBadge status={loss.source} /></td>
      <td style={styles.td}>
        <div style={{ fontSize: 12, color: tokens.colors.textSecondary, maxWidth: 180 }}>{loss.reason || '—'}</div>
      </td>
      <td style={styles.td}><div style={{ fontSize: 13 }}>{loss.dateFlagged}</div></td>
      <td style={styles.td}>
        <StatusBadge status={loss.resolutionStatus} label={loss.resolutionStatus?.replace('_', ' ')} />
        {loss.dateResolved && <div style={{ fontSize: 10, color: tokens.colors.textMuted, marginTop: 2 }}>{loss.dateResolved}</div>}
      </td>
      <td style={styles.td}>
        {isPending ? (
          <div style={styles.actionRow}>
            <Button variant="success" size="sm" onClick={onResolve}>✅ Resolve</Button>
            <Button
              size="sm"
              onClick={onWriteOff}
              style={{ background: tokens.colors.warningLight, color: tokens.colors.warning, border: `1.5px solid ${tokens.colors.warningBorder}` }}
            >
              ⚠️ Write Off
            </Button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: tokens.colors.textMuted }}>{loss.notes || 'Closed'}</span>
        )}
      </td>
    </tr>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.lg, flexWrap: 'wrap', gap: 12 },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },

  filterRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: tokens.spacing.md, flexWrap: 'wrap' },
  filterRowLabel: { fontSize: 13, fontWeight: 600, color: tokens.colors.textMuted },
  filterChip: {
    padding: '5px 14px', borderRadius: tokens.radius.full,
    border: `1.5px solid ${tokens.colors.border}`, background: tokens.colors.card,
    color: tokens.colors.textSecondary, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', fontFamily: tokens.font.family,
  },
  filterChipActive: { background: tokens.colors.primary, color: '#fff', border: `1.5px solid ${tokens.colors.primary}`, fontWeight: 700 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 },
  th: {
    padding: '10px 14px', textAlign: 'left', color: tokens.colors.textMuted, fontWeight: 600,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
    background: tokens.colors.surface, borderBottom: `2px solid ${tokens.colors.border}`, whiteSpace: 'nowrap',
  },
  tableRow: { borderBottom: `1px solid ${tokens.colors.border}`, transition: 'background 0.15s' },
  td: { padding: '11px 14px', color: tokens.colors.textPrimary, verticalAlign: 'top' },
  cellPrimary: { fontWeight: 600, color: tokens.colors.textPrimary, fontSize: 13 },
  cellSub: { fontSize: 11, color: tokens.colors.textMuted, marginTop: 2 },
  actionRow: { display: 'flex', flexDirection: 'column', gap: 4 },

  loadingText: { padding: 40, textAlign: 'center', color: tokens.colors.textMuted, fontSize: 14 },
  emptyState: { padding: 60, textAlign: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 6 },
  emptySub: { color: tokens.colors.textMuted, fontSize: 13 },

  studentTab: { display: 'flex', flexDirection: 'column', gap: tokens.spacing.md },
  searchTitle: { fontSize: 15, fontWeight: 700, color: tokens.colors.textPrimary, marginBottom: 6 },
  searchHint: { fontSize: 13, color: tokens.colors.textMuted, margin: '0 0 14px', lineHeight: 1.5 },
  searchRow: { display: 'flex', gap: 10 },
  admInput: { flex: 1, maxWidth: 320, fontFamily: tokens.font.mono, border: `2px solid ${tokens.colors.primary}`, background: tokens.colors.surface },

  studentProfile: {
    background: `linear-gradient(120deg, ${tokens.colors.primary}, ${tokens.colors.primaryDark})`,
    borderRadius: tokens.radius.md, padding: '16px 22px', display: 'flex',
    alignItems: 'center', gap: 14, boxShadow: tokens.shadows.md,
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontWeight: 700, fontSize: 17 },
  profileMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  profileLossCount: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 },

  modalLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: tokens.colors.textSecondary, marginBottom: 6 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  lossModalSummary: { background: tokens.colors.surface, borderRadius: tokens.radius.sm, padding: '12px 14px', marginBottom: 14 },
  lossModalBook: { fontWeight: 700, fontSize: 14, color: tokens.colors.textPrimary, marginBottom: 4 },
  lossModalStudent: { fontSize: 13, color: tokens.colors.textSecondary },
  lossModalMeta: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 2 },
};
