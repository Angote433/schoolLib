import { useState, useEffect, useRef } from 'react';
import { bookService } from '../services/libraryApi';
import { tokens, getStatusColor } from '../styles/tokens';
import {
  Modal, FormField, Input, Select, Textarea, Button, Banner, EmptyState,
  Card, StatusBadge, ModalActions,
} from '../components/SharedComponents';
import Icon from '../components/Icon';
import useScreenSize from '../hooks/useScreenSize';

// Copy registration modes — see FEATURE_BATCH_2_PROMPT.md Feature 1.
// AUTO stays the default so existing behaviour is unchanged for anyone
// who doesn't need the other two.
const COPY_MODES = [
  { key: 'AUTO', label: 'Auto-generate' },
  { key: 'RANGE', label: 'Number range' },
  { key: 'LIST', label: 'Paste a list' },
];

const DEFAULT_COPIES_FORM = {
  dateAcquired: new Date().toISOString().split('T')[0],
  quantity: 1,
  prefix: '', start: 1, count: 1, padWidth: 3, suffix: '',
  rawList: '',
};

const PREVIEW_STATUS_LABEL = {
  OK: 'OK',
  DUPLICATE_IN_DB: 'Already used',
  DUPLICATE_IN_BATCH: 'Duplicated in this list',
  BLANK: 'Blank',
  TOO_LONG: 'Too long (max 50 characters)',
};

const STICKER_LAYOUTS = {
  '4x5': { labelCols: 4, labelRows: 5, orientation: 'landscape', labelWidthMm: 63.5, labelHeightMm: 38.1, gapMm: 4 },
  '3x7': { labelCols: 3, labelRows: 7, orientation: 'portrait', labelWidthMm: 63.5, labelHeightMm: 38.1, gapMm: 4 },
  '4x3': { labelCols: 4, labelRows: 3, orientation: 'landscape', labelWidthMm: 63.5, labelHeightMm: 38.1, gapMm: 4 },
  '3x3': { labelCols: 3, labelRows: 3, orientation: 'portrait', labelWidthMm: 63.5, labelHeightMm: 38.1, gapMm: 4 },
};

export default function Books() {
  const { isMobile } = useScreenSize();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Which book is expanded to show copies
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Selected copies for printing
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());

  // Modal control
  const [modal, setModal] = useState(null);
  // null | 'addTitle' | 'addCopies' | 'printQr'

  const [workingBook, setWorkingBook] = useState(null);

  // Forms
  const [titleForm, setTitleForm] = useState({
    titleName: '', subject: '', gradeLevel: '', publisher: '', isbn: '',
  });

  const [copyMode, setCopyMode] = useState('AUTO');
  const [copiesForm, setCopiesForm] = useState(DEFAULT_COPIES_FORM);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // Feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search
  const [searchText, setSearchText] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Print ref — the div we send to printer
  const printRef = useRef();
  const [printLayout, setPrintLayout] = useState('4x5');
  const currentLayout = STICKER_LAYOUTS[printLayout];
  const printLabelWidth = currentLayout.labelWidthMm;
  const printLabelHeight = currentLayout.labelHeightMm;
  const printGap = currentLayout.gapMm;

  // ── LOAD BOOKS ────────────────────────────────────────
  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await bookService.getAll();
      setBooks(res.data);
    } catch {
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  // ── EXPAND BOOK TO SEE COPIES ─────────────────────────
  const handleExpandBook = async (bookId) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
      setCopies([]);
      setSelectedForPrint(new Set());
      return;
    }

    setExpandedBookId(bookId);
    setSelectedForPrint(new Set());
    await loadCopies(bookId);
  };

  const loadCopies = async (bookId) => {
    setLoadingCopies(true);
    try {
      const res = await bookService.getCopies(parseInt(bookId));
      setCopies(res.data);
    } catch {
      setError('Failed to load copies');
    } finally {
      setLoadingCopies(false);
    }
  };

  // ── REGISTER BOOK TITLE ───────────────────────────────
  const handleAddTitle = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await bookService.create({
        ...titleForm,
        gradeLevel: parseInt(titleForm.gradeLevel),
        isbn: titleForm.isbn || null,
      });
      showSuccess('Book title registered successfully');
      closeModal();
      loadBooks();
      setTitleForm({ titleName: '', subject: '', gradeLevel: '', publisher: '', isbn: '' });
    } catch (err) {
      setError(err.response?.data || 'Failed to register book');
    } finally {
      setSubmitting(false);
    }
  };

  // ── REGISTER COPIES ───────────────────────────────────
  // Builds the request payload for whichever mode is currently selected —
  // only the fields relevant to that mode are sent.
  const buildCopyRequest = () => {
    const base = { mode: copyMode, dateAcquired: copiesForm.dateAcquired };
    if (copyMode === 'AUTO') {
      return { ...base, quantity: parseInt(copiesForm.quantity) || 0 };
    }
    if (copyMode === 'RANGE') {
      return {
        ...base,
        prefix: copiesForm.prefix,
        start: parseInt(copiesForm.start),
        count: parseInt(copiesForm.count) || 0,
        padWidth: parseInt(copiesForm.padWidth),
        suffix: copiesForm.suffix,
      };
    }
    return { ...base, rawList: copiesForm.rawList };
  };

  // Any change to the mode or its fields invalidates the current preview —
  // the librarian must preview again before the register button re-enables.
  const updateCopiesForm = (changes) => {
    setCopiesForm(prev => ({ ...prev, ...changes }));
    setPreview(null);
  };

  const handlePreviewCopies = async () => {
    setError('');
    setPreviewing(true);
    try {
      const res = await bookService.previewCopies(workingBook.detailsId, buildCopyRequest());
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to preview copies');
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleAddCopies = async (e) => {
    e.preventDefault();
    if (!preview || preview.conflictCount > 0) return;
    setError('');
    setSubmitting(true);

    try {
      await bookService.registerCopies(workingBook.detailsId, buildCopyRequest());

      showSuccess(`${preview.okCount} ${preview.okCount === 1 ? 'copy' : 'copies'} registered with accession numbers`);
      closeModal();
      loadBooks();
      await loadCopies(workingBook.detailsId);
      setExpandedBookId(workingBook.detailsId);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register copies');
    } finally {
      setSubmitting(false);
    }
  };

  // ── QR PRINT SELECTION ────────────────────────────────
  const toggleSelectForPrint = (bookId) => {
    const newSet = new Set(selectedForPrint);
    if (newSet.has(bookId)) newSet.delete(bookId);
    else newSet.add(bookId);
    setSelectedForPrint(newSet);
  };

  const selectAllForPrint = () => setSelectedForPrint(new Set(copies.map(c => c.bookId)));
  const clearSelection = () => setSelectedForPrint(new Set());

  const copiesToPrint = copies.filter(c => selectedForPrint.has(c.bookId));

  // ── PRINT ─────────────────────────────────────────────
  const handlePrint = () => {
    if (selectedForPrint.size === 0) {
      setError('Select at least one QR code to print');
      return;
    }
    setModal('printQr');
  };

  const triggerPrint = () => {
    window.print();
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const closeModal = () => {
    setModal(null);
    setWorkingBook(null);
    setError('');
    setCopyMode('AUTO');
    setCopiesForm(DEFAULT_COPIES_FORM);
    setPreview(null);
  };

  const expandedBook = books.find(b => b.detailsId === expandedBookId);
  const grades = [...new Set(books.map(b => b.gradeLevel))].sort();

  const filteredBooks = books.filter(book => {
    const searchMatch =
      searchText === '' ||
      book.titleName.toLowerCase().includes(searchText.toLowerCase()) ||
      book.subject.toLowerCase().includes(searchText.toLowerCase());
    const gradeMatch = gradeFilter === '' || String(book.gradeLevel) === gradeFilter;
    return searchMatch && gradeMatch;
  });

  const statusCount = (status) => copies.filter(c => c.status === status).length;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: selectedForPrint.size > 0 ? 76 : 0 }}>

      {/* Print styles — injected into head */}
      <style>{`
        @page { size: A4 ${currentLayout.orientation}; margin: 5mm; }
        @media print {
          body, html { margin: 0 !important; padding: 0 !important; min-height: auto !important; overflow: visible !important; }
          body * { visibility: hidden !important; }
          #qr-print-area, #qr-print-area * { visibility: visible !important; }
          #qr-print-area {
            position: absolute !important; top: 0 !important; left: 0 !important;
            width: calc(100% - 10mm) !important; padding: 5mm !important;
            box-sizing: border-box !important; overflow: visible !important;
            page-break-after: auto !important; break-after: auto !important;
          }
          #qr-print-area > div { margin: 0 !important; }
          .printGrid {
            display: grid !important;
            grid-template-columns: repeat(${currentLayout.labelCols}, ${printLabelWidth}mm) !important;
            grid-auto-rows: ${printLabelHeight}mm !important;
            gap: ${printGap}mm !important; justify-content: center !important;
            page-break-inside: avoid !important; break-inside: avoid !important;
          }
          .printItem {
            width: ${printLabelWidth}mm !important; height: ${printLabelHeight}mm !important;
            padding: 1.5mm !important; box-sizing: border-box !important;
            page-break-inside: avoid !important; break-inside: avoid !important; overflow: hidden !important;
          }
          .printItem img { width: 50mm !important; height: 30mm !important; object-fit: contain !important; display: block !important; margin: 0 auto !important; }
          .printCode, .printBookTitle { font-size: 6px !important; line-height: 1.1 !important; margin: 0 !important; padding: 0 !important; }
          .printTitle { display: none !important; }
        }
      `}</style>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Books</h1>
          <p style={styles.pageSub}>Register book titles, manage copies and print QR codes</p>
        </div>
        <Button variant="primary" onClick={() => setModal('addTitle')}>
          + Register Book Title
        </Button>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && !modal && <Banner type="error">{error}</Banner>}

      {/* ── SEARCH AND FILTER ────────────────────────── */}
      <div style={styles.filterBar}>
        <Input
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Search by title or subject..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <Select style={{ width: 'auto', minWidth: 150 }} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
          <option value="">All Grades</option>
          {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </Select>
      </div>

      {/* ── BOOKS LIST ───────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingText}>Loading books…</div>
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          icon="book"
          title={searchText || gradeFilter ? 'No books match your search' : 'No books registered yet'}
          subtitle={!searchText && !gradeFilter && 'Click "Register Book Title" to add the first book'}
        />
      ) : (
        <div style={styles.booksList}>
          {filteredBooks.map(book => {
            const isExpanded = expandedBookId === book.detailsId;

            return (
              <Card key={book.detailsId} style={{ padding: 0, overflow: 'hidden' }}>

                {/* ── BOOK TITLE ROW ─────────────────── */}
                <div
                  style={{ ...styles.bookRow, ...(isMobile ? { flexWrap: 'wrap', gap: 10 } : {}) }}
                  onClick={() => handleExpandBook(book.detailsId)}
                >
                  <div style={styles.bookLeft}>
                    <span style={styles.arrow}>{isExpanded ? '▼' : '▶'}</span>
                    <div style={styles.bookIcon}>{book.gradeLevel}</div>
                    <div>
                      <div style={styles.bookTitle}>{book.titleName}</div>
                      <div style={styles.bookMeta}>
                        {book.subject}
                        {book.publisher ? ` • ${book.publisher}` : ''}
                        {' • '}Grade {book.gradeLevel}
                      </div>
                    </div>
                  </div>

                  <div style={styles.bookRight}>
                    <div style={styles.copiesCount}>
                      <span style={styles.copiesNumber}>{book.copies}</span>
                      <span style={styles.copiesLabel}>copies</span>
                    </div>
                    <Button
                      variant="secondary" size="sm"
                      onClick={e => { e.stopPropagation(); setWorkingBook(book); setModal('addCopies'); }}
                    >
                      + Add Copies
                    </Button>
                  </div>
                </div>

                {/* ── COPIES SECTION ─────────────────── */}
                {isExpanded && (
                  <div style={styles.copiesSection}>

                    <div style={styles.statusSummary}>
                      <StatusPill label="Available" count={statusCount('AVAILABLE')} status="AVAILABLE" />
                      <StatusPill label="Distributed" count={statusCount('DISTRIBUTED')} status="DISTRIBUTED" />
                      <StatusPill label="Borrowed" count={statusCount('BORROWED')} status="BORROWED" />
                      <StatusPill label="Lost" count={statusCount('LOST')} status="LOST" />
                    </div>

                    {loadingCopies ? (
                      <div style={styles.loadingText}>Loading copies…</div>
                    ) : copies.length === 0 ? (
                      <div style={styles.noCopies}>No copies registered yet. Click "+ Add Copies" to register.</div>
                    ) : (
                      <>
                        <div style={styles.qrActionsBar}>
                          <div style={styles.qrActionsLeft}>
                            <Button variant="secondary" size="sm" onClick={selectAllForPrint}>Select All</Button>
                            <Button variant="secondary" size="sm" onClick={clearSelection}>Clear</Button>
                            <span style={styles.selectedCount}>
                              {selectedForPrint.size > 0 ? `${selectedForPrint.size} selected` : 'Select QR codes to print'}
                            </span>
                          </div>
                        </div>

                        <div style={styles.copiesGrid}>
                          {copies.map(copy => (
                            <CopyCard
                              key={copy.bookId}
                              copy={copy}
                              isSelected={selectedForPrint.has(copy.bookId)}
                              onToggleSelect={() => toggleSelectForPrint(copy.bookId)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </Card>
            );
          })}
        </div>
      )}

      {/* ── STICKY PRINT SELECTION BAR ───────────────── */}
      <div style={{
        ...styles.stickyPrintBar,
        ...(isMobile ? { padding: '12px 16px', flexWrap: 'wrap', gap: 10 } : {}),
        transform: selectedForPrint.size > 0 ? 'translateY(0)' : 'translateY(100%)',
      }}>
        <span style={{ ...styles.stickyPrintCount, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="tag" size={16} />
          {selectedForPrint.size} {selectedForPrint.size === 1 ? 'copy' : 'copies'} selected
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={clearSelection} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}>
            Clear
          </Button>
          <Button variant="accent" onClick={handlePrint}>
            <Icon name="printer" size={16} /> Print Barcodes
          </Button>
        </div>
      </div>

      {/* ── ADD BOOK TITLE MODAL ─────────────────────── */}
      {modal === 'addTitle' && (
        <Modal title="Register New Book Title" onClose={closeModal}>
          <form onSubmit={handleAddTitle}>
            {error && <Banner type="error">{error}</Banner>}
            <FormField label="Book Title">
              <Input
                placeholder="e.g. Mathematics Form 2"
                value={titleForm.titleName}
                onChange={e => setTitleForm({ ...titleForm, titleName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Subject">
              <Input
                placeholder="e.g. Mathematics"
                value={titleForm.subject}
                onChange={e => setTitleForm({ ...titleForm, subject: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Grade Level">
              <Select
                value={titleForm.gradeLevel}
                onChange={e => setTitleForm({ ...titleForm, gradeLevel: e.target.value })}
                required
              >
                <option value="">Select grade</option>
                {[7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </Select>
            </FormField>
            <FormField label="Publisher (optional)">
              <Input
                placeholder="e.g. KLB"
                value={titleForm.publisher}
                onChange={e => setTitleForm({ ...titleForm, publisher: e.target.value })}
              />
            </FormField>
            <FormField
              label="ISBN (for barcode scanning)"
              hint="Found on the barcode on the back cover of the book. Teachers scan this to look up the title during returns."
            >
              <Input
                placeholder="e.g. 9789966254123"
                value={titleForm.isbn}
                onChange={e => setTitleForm({ ...titleForm, isbn: e.target.value })}
              />
            </FormField>
            <ModalActions>
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register Title'}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── ADD COPIES MODAL ─────────────────────────── */}
      {modal === 'addCopies' && (
        <Modal title={`Add Copies — ${workingBook?.titleName}`} onClose={closeModal} maxWidth={620}>
          <form onSubmit={handleAddCopies}>
            {error && <Banner type="error">{error}</Banner>}

            <FormField label="How are these copies numbered?">
              <div style={styles.modeSelector}>
                {COPY_MODES.map(m => (
                  <button
                    type="button" key={m.key}
                    onClick={() => { setCopyMode(m.key); setPreview(null); }}
                    style={{ ...styles.modeOption, ...(copyMode === m.key ? styles.modeOptionSelected : {}) }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </FormField>

            {copyMode === 'AUTO' && (
              <Banner type="info">
                Each copy will automatically receive a unique accession number (e.g. ACC-1-0001).
                Write this number inside the front cover of each book.
              </Banner>
            )}
            {(copyMode === 'RANGE' || copyMode === 'LIST') && (
              <Banner type="info">
                {copyMode === 'RANGE'
                  ? 'Use this when a school\'s existing books are already numbered consecutively by hand (e.g. a shelf numbered 001 to 080).'
                  : 'Use this for books with irregular, non-sequential hand-written numbers — paste exactly what is written in each book.'}
              </Banner>
            )}

            {copyMode === 'AUTO' && (
              <FormField label="Number of Copies">
                <Input
                  type="number" min="1" max="1000"
                  value={copiesForm.quantity}
                  onChange={e => updateCopiesForm({ quantity: e.target.value })}
                  required
                />
              </FormField>
            )}

            {copyMode === 'RANGE' && (
              <>
                <FormField label="Prefix (optional)" hint='e.g. "LIB/2019/"'>
                  <Input
                    value={copiesForm.prefix}
                    onChange={e => updateCopiesForm({ prefix: e.target.value })}
                  />
                </FormField>
                <div style={styles.rangeRow}>
                  <FormField label="Start number">
                    <Input
                      type="number" min="0"
                      value={copiesForm.start}
                      onChange={e => updateCopiesForm({ start: e.target.value })}
                      required
                    />
                  </FormField>
                  <FormField label="Count">
                    <Input
                      type="number" min="1" max="1000"
                      value={copiesForm.count}
                      onChange={e => updateCopiesForm({ count: e.target.value })}
                      required
                    />
                  </FormField>
                  <FormField label="Zero-pad width">
                    <Input
                      type="number" min="0" max="10"
                      value={copiesForm.padWidth}
                      onChange={e => updateCopiesForm({ padWidth: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField label="Suffix (optional)">
                  <Input
                    value={copiesForm.suffix}
                    onChange={e => updateCopiesForm({ suffix: e.target.value })}
                  />
                </FormField>
              </>
            )}

            {copyMode === 'LIST' && (
              <FormField label="Accession numbers" hint="One per line, or comma-separated. Blank lines are ignored.">
                <Textarea
                  rows={6}
                  placeholder={'LIB/2019/001\nLIB/2019/002\nHIST-12'}
                  value={copiesForm.rawList}
                  onChange={e => updateCopiesForm({ rawList: e.target.value })}
                />
              </FormField>
            )}

            <FormField label="Date Acquired">
              <Input
                type="date"
                value={copiesForm.dateAcquired}
                onChange={e => updateCopiesForm({ dateAcquired: e.target.value })}
                required
              />
            </FormField>

            <Button
              type="button" variant="secondary" onClick={handlePreviewCopies}
              disabled={previewing} style={{ marginBottom: 16 }}
            >
              {previewing ? 'Previewing…' : <><Icon name="eye" size={16} /> Preview</>}
            </Button>

            {preview && (
              <div style={styles.previewBox}>
                <div style={styles.previewSummary}>
                  <strong>{preview.okCount}</strong> OK
                  {preview.conflictCount > 0 && (
                    <span style={{ color: tokens.colors.danger }}> · <strong>{preview.conflictCount}</strong> conflict{preview.conflictCount === 1 ? '' : 's'}</span>
                  )}
                  {' · '}{preview.totalRequested} total
                </div>
                <div style={styles.previewList}>
                  {preview.entries.slice(0, 20).map((entry, i) => (
                    <div
                      key={i}
                      style={{ ...styles.previewRow, ...(entry.status !== 'OK' ? styles.previewRowConflict : {}) }}
                    >
                      <span style={styles.previewNumber}>{entry.accessionNumber || '(blank)'}</span>
                      <span style={{ ...styles.previewStatus, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {entry.status === 'OK' && <Icon name="check" size={13} color={tokens.colors.success} />}
                        {entry.status === 'DUPLICATE_IN_DB' && entry.conflictTitle
                          ? `Already used by "${entry.conflictTitle}"`
                          : PREVIEW_STATUS_LABEL[entry.status] || entry.status}
                      </span>
                    </div>
                  ))}
                </div>
                {preview.entries.length > 20 && (
                  <div style={styles.previewMore}>
                    …and {preview.entries.length - 20} more ({preview.okCount} OK, {preview.conflictCount} conflicts overall)
                  </div>
                )}
              </div>
            )}

            <ModalActions>
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button
                type="submit" variant="primary"
                disabled={submitting || !preview || preview.conflictCount > 0}
              >
                {submitting
                  ? 'Registering…'
                  : preview
                  ? `Register ${preview.okCount} ${preview.okCount === 1 ? 'Copy' : 'Copies'}`
                  : 'Preview first'}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── PRINT QR MODAL ───────────────────────────── */}
      {modal === 'printQr' && (
        <Modal title={`Print ${copiesToPrint.length} QR Codes`} onClose={closeModal} maxWidth={540}>
          <div style={styles.printPreviewNote}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: tokens.colors.textPrimary }}>
              <strong>Print preview</strong> — QR codes will print in a grid. Cut and stick each one to its book copy.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: tokens.colors.textMuted }}>
              The QR code ID and book title print below each code so you know which sticker goes on which book.
            </p>
          </div>

          {isMobile && (
            <Banner type="info">
              Printing sticker sheets is best done from a desktop or laptop browser connected to your printer.
            </Banner>
          )}

          <FormField label="Sticker sheet layout" hint="Choose the sticker paper format you are using.">
            <Select value={printLayout} onChange={e => setPrintLayout(e.target.value)}>
              {Object.entries(STICKER_LAYOUTS).map(([key, layout]) => (
                <option key={key} value={key}>
                  {`${layout.labelCols} × ${layout.labelRows} — ${key}`}
                </option>
              ))}
            </Select>
          </FormField>

          <div style={styles.printPreviewGrid}>
            {copiesToPrint.map(copy => (
              <div key={copy.bookId} style={styles.printPreviewItem}>
                <img
                  src={bookService.getQrImageUrl(copy.bookId)}
                  alt={copy.qrCode}
                  style={styles.qrPreviewImg}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div style={styles.qrPreviewCode}>{copy.accessionNumber || copy.qrCode}</div>
                <div style={styles.qrPreviewTitle}>{expandedBook?.titleName}</div>
              </div>
            ))}
          </div>

          <ModalActions>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="accent" onClick={triggerPrint}><Icon name="printer" size={16} /> Print Now</Button>
          </ModalActions>
        </Modal>
      )}

      {/* ── HIDDEN PRINT AREA ────────────────────────── */}
      <div id="qr-print-area" style={styles.hiddenPrintArea}>
        <div className="printTitle" style={styles.printTitle}>
          QR Codes — {expandedBook?.titleName}
        </div>
        <div className="printGrid" style={styles.printGrid}>
          {copiesToPrint.map(copy => (
            <div key={copy.bookId} className="printItem" style={styles.printItem}>
              <img
                src={bookService.getQrImageUrl(copy.bookId)}
                alt={`Barcode: ${copy.qrCode}`}
                style={copyStyles.qrImg}
              />
              <div className="printCode" style={styles.printCode}>{copy.accessionNumber || copy.qrCode}</div>
              <div className="printBookTitle" style={styles.printBookTitle}>{expandedBook?.titleName}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── COPY CARD ─────────────────────────────────────────────────────────
function CopyCard({ copy, isSelected, onToggleSelect }) {
  const sc = getStatusColor(copy.status);

  return (
    <div
      style={{
        ...copyStyles.card,
        border: isSelected ? `2px solid ${tokens.colors.primary}` : `1.5px solid ${tokens.colors.border}`,
        background: isSelected ? tokens.colors.surface : tokens.colors.card,
        borderTop: `4px solid ${sc.color}`,
      }}
      onClick={onToggleSelect}
    >
      <div style={copyStyles.selectRow}>
        <div style={{
          ...copyStyles.checkbox,
          background: isSelected ? tokens.colors.primary : '#fff',
          border: isSelected ? `2px solid ${tokens.colors.primary}` : `2px solid ${tokens.colors.border}`,
        }}>
          {isSelected && <Icon name="check" size={12} color="#fff" />}
        </div>
        <StatusBadge status={copy.status} />
      </div>

      <div style={copyStyles.qrCode}>{copy.accessionNumber || copy.qrCode}</div>
      <div style={copyStyles.date}>{copy.dateAcquired || 'No date'}</div>
    </div>
  );
}

// ── STATUS PILL ───────────────────────────────────────────────────────
function StatusPill({ label, count, status }) {
  const c = getStatusColor(status);
  return (
    <div style={{ ...pillStyles.pill, background: c.bg }}>
      <span style={{ ...pillStyles.count, color: c.color }}>{count}</span>
      <span style={{ ...pillStyles.label, color: c.color }}>{label}</span>
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
  filterBar: { display: 'flex', gap: 12, marginBottom: tokens.spacing.md, flexWrap: 'wrap' },
  loadingText: { color: tokens.colors.textMuted, padding: 40, textAlign: 'center', fontSize: 14 },
  booksList: { display: 'flex', flexDirection: 'column', gap: 12 },
  bookRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px', cursor: 'pointer',
  },
  bookLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  arrow: { color: tokens.colors.textMuted, fontSize: 12, width: 16 },
  bookIcon: {
    width: 42, height: 42, borderRadius: tokens.radius.sm,
    background: tokens.colors.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  bookTitle: { fontWeight: 700, fontSize: 15, color: tokens.colors.textPrimary },
  bookMeta: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 2 },
  bookRight: { display: 'flex', alignItems: 'center', gap: 16 },
  copiesCount: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  copiesNumber: { fontSize: 22, fontWeight: 700, color: tokens.colors.textPrimary, lineHeight: 1 },
  copiesLabel: { fontSize: 11, color: tokens.colors.textMuted },
  copiesSection: {
    borderTop: `1px solid ${tokens.colors.border}`,
    padding: '18px 20px', background: tokens.colors.surface,
  },
  statusSummary: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  noCopies: { color: tokens.colors.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' },
  qrActionsBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, padding: '10px 14px', background: tokens.colors.card,
    borderRadius: tokens.radius.sm, border: `1.5px solid ${tokens.colors.border}`,
  },
  qrActionsLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  selectedCount: { fontSize: 13, color: tokens.colors.textMuted },
  copiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
  },
  stickyPrintBar: {
    position: 'fixed', left: 0, right: 0, bottom: 0,
    background: tokens.colors.primaryDark,
    padding: '16px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
    transition: 'transform 0.25s ease',
    zIndex: 90,
  },
  stickyPrintCount: { color: '#fff', fontSize: 14, fontWeight: 600 },
  printPreviewNote: { background: tokens.colors.surface, borderRadius: tokens.radius.sm, padding: '12px 14px', marginBottom: 16 },
  printPreviewGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12, maxHeight: 360, overflowY: 'auto', padding: 4,
  },
  printPreviewItem: { border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.sm, padding: 8, textAlign: 'center', background: tokens.colors.card },
  qrPreviewImg: { width: 90, height: 90, display: 'block', margin: '0 auto' },
  qrPreviewCode: { fontSize: 9, color: tokens.colors.textSecondary, marginTop: 4, wordBreak: 'break-all', fontFamily: tokens.font.mono },
  qrPreviewTitle: { fontSize: 9, color: tokens.colors.textMuted, marginTop: 2, fontWeight: 600 },
  modeSelector: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  modeOption: {
    flex: '1 1 auto', padding: '9px 14px', borderRadius: tokens.radius.sm,
    border: `1.5px solid ${tokens.colors.border}`, background: tokens.colors.card,
    color: tokens.colors.textSecondary, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: tokens.font.family, transition: tokens.transition,
    whiteSpace: 'nowrap',
  },
  modeOptionSelected: {
    border: `1.5px solid ${tokens.colors.primary}`,
    background: tokens.colors.primary, color: '#fff',
  },
  rangeRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  previewBox: {
    border: `1.5px solid ${tokens.colors.border}`, borderRadius: tokens.radius.sm,
    marginBottom: 16, overflow: 'hidden',
  },
  previewSummary: {
    padding: '10px 14px', background: tokens.colors.surface,
    fontSize: 13, color: tokens.colors.textSecondary,
    borderBottom: `1px solid ${tokens.colors.border}`,
  },
  previewList: { maxHeight: 260, overflowY: 'auto' },
  previewRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', fontSize: 12.5, borderBottom: `1px solid ${tokens.colors.border}`,
  },
  previewRowConflict: { background: tokens.colors.dangerLight },
  previewNumber: { fontFamily: tokens.font.mono, color: tokens.colors.textPrimary, wordBreak: 'break-all' },
  previewStatus: { color: tokens.colors.textMuted, fontSize: 11.5, flexShrink: 0, marginLeft: 12, textAlign: 'right' },
  previewMore: {
    padding: '8px 14px', fontSize: 12, color: tokens.colors.textMuted,
    background: tokens.colors.surface, textAlign: 'center',
  },
  hiddenPrintArea: { visibility: 'hidden' },
  printTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16, color: tokens.colors.textPrimary },
  printGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  printItem: { border: '1px solid #ddd', borderRadius: 6, padding: 8, textAlign: 'center', pageBreakInside: 'avoid' },
  printCode: { fontSize: 8, color: '#555', marginTop: 4, wordBreak: 'break-all', fontFamily: tokens.font.mono },
  printBookTitle: { fontSize: 9, color: '#333', marginTop: 2, fontWeight: 600 },
};

const copyStyles = {
  card: {
    borderRadius: tokens.radius.sm, padding: '12px 10px',
    cursor: 'pointer', transition: tokens.transition, textAlign: 'center',
  },
  selectRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: tokens.transition,
  },
  qrImg: { width: 120, height: 40, display: 'block', margin: '0 auto 6px' },
  qrCode: { fontSize: 16, fontWeight: 700, color: tokens.colors.textPrimary, wordBreak: 'break-all', fontFamily: tokens.font.mono, marginBottom: 4 },
  date: { fontSize: 10, color: tokens.colors.textMuted },
};

const pillStyles = {
  pill: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: tokens.radius.full },
  count: { fontSize: 16, fontWeight: 700 },
  label: { fontSize: 12, fontWeight: 500 },
};
