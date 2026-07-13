import { useState, useEffect, useRef } from 'react';
import { bookService } from '../services/libraryApi';

const STICKER_LAYOUTS = {
  '4x5': {
    labelCols: 4,
    labelRows: 5,
    orientation: 'landscape',
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    gapMm: 4,
  },
  '3x7': {
    labelCols: 3,
    labelRows: 7,
    orientation: 'portrait',
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    gapMm: 4,
  },
  '4x3': {
    labelCols: 4,
    labelRows: 3,
    orientation: 'landscape',
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    gapMm: 4,
  },
  '3x3': {
    labelCols: 3,
    labelRows: 3,
    orientation: 'portrait',
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    gapMm: 4,
  },
};

export default function Books() {

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Which book is expanded to show copies
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Selected copies for printing
  // Stores Set of bookIds selected for printing
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());

  // Modal control
  const [modal, setModal] = useState(null);
  // null | 'addTitle' | 'addCopies' | 'printQr'

  // The book title being worked on
  const [workingBook, setWorkingBook] = useState(null);

  // Forms
  const [titleForm, setTitleForm] = useState({
    titleName: '',
    subject: '',
    gradeLevel: '',
    publisher: '',
    isbn: '',
  });

  const [copiesForm, setCopiesForm] = useState({
    quantity: 1,
    dateAcquired: new Date().toISOString().split('T')[0],
  });

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
      console.log("Books loaded successfully:", res.data);
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
      setTitleForm({
        titleName: '', subject: '',
        gradeLevel: '', publisher: '', isbn: '',
      });
    } catch (err) {
      setError(err.response?.data || 'Failed to register book');
    } finally {
      setSubmitting(false);
    }
  };

  // ── REGISTER COPIES ───────────────────────────────────
  const handleAddCopies = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await bookService.registerCopies(
        workingBook.detailsId,
        copiesForm.quantity,
        copiesForm.dateAcquired,
      );

      showSuccess(
        `${copiesForm.quantity} copies registered with accession numbers`
      );
      closeModal();
      loadBooks();
      await loadCopies(workingBook.detailsId);
      setExpandedBookId(workingBook.detailsId);

    } catch (err) {
      setError(err.response?.data || 'Failed to register copies');
    } finally {
      setSubmitting(false);
    }
  };

  // ── QR PRINT SELECTION ────────────────────────────────
  const toggleSelectForPrint = (bookId) => {
    const newSet = new Set(selectedForPrint);
    if (newSet.has(bookId)) {
      newSet.delete(bookId);
    } else {
      newSet.add(bookId);
    }
    setSelectedForPrint(newSet);
  };

  const selectAllForPrint = () => {
    setSelectedForPrint(new Set(copies.map(c => c.bookId)));
  };

  const clearSelection = () => {
    setSelectedForPrint(new Set());
  };

  // Copies selected for printing
  const copiesToPrint = copies.filter(
    c => selectedForPrint.has(c.bookId)
  );

  // ── PRINT ─────────────────────────────────────────────
  // Uses browser's built in print dialog
  // CSS @media print hides everything except the QR sheet
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
  };

  const expandedBook = books.find(
    b => b.detailsId === expandedBookId
  );

  // Unique grade levels for filter
  const grades = [...new Set(books.map(b => b.gradeLevel))].sort();

  // Local filter
  const filteredBooks = books.filter(book => {
    const searchMatch =
      searchText === '' ||
      book.titleName.toLowerCase().includes(
        searchText.toLowerCase()
      ) ||
      book.subject.toLowerCase().includes(
        searchText.toLowerCase()
      );
    const gradeMatch =
      gradeFilter === '' ||
      String(book.gradeLevel) === gradeFilter;
    return searchMatch && gradeMatch;
  });

  // Status counts for expanded book copies
  const statusCount = (status) =>
    copies.filter(c => c.status === status).length;

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* Print styles — injected into head */}
      <style>{`
        @page {
          size: A4 ${currentLayout.orientation};
          margin: 5mm;
        }
        @media print {
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          body * { visibility: hidden !important; }
          #qr-print-area,
          #qr-print-area * { visibility: visible !important; }
          #qr-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: calc(100% - 10mm) !important;
            padding: 5mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          #qr-print-area > div {
            margin: 0 !important;
          }
          .printGrid {
            display: grid !important;
            grid-template-columns: repeat(${currentLayout.labelCols}, ${printLabelWidth}mm) !important;
            grid-auto-rows: ${printLabelHeight}mm !important;
            gap: ${printGap}mm !important;
            justify-content: center !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printItem {
            width: ${printLabelWidth}mm !important;
            height: ${printLabelHeight}mm !important;
            padding: 1.5mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .printItem img {
            width: 50mm !important;
            height: 30mm !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 auto !important;
          }
          .printCode,
          .printBookTitle {
            font-size: 6px !important;
            line-height: 1.1 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printTitle {
            display: none !important;
          }
        }
      `}</style>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Books</h1>
          <p style={styles.pageSub}>
            Register book titles, manage copies and print QR codes
          </p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setModal('addTitle')}
        >
          + Register Book Title
        </button>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>✅ {success}</div>
      )}
      {error && !modal && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}

      {/* ── SEARCH AND FILTER ────────────────────────── */}
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="🔍  Search by title or subject..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <select
          style={styles.select}
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
        >
          <option value="">All Grades</option>
          {grades.map(g => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {/* ── BOOKS LIST ───────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingText}>Loading books...</div>
      ) : filteredBooks.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📚</div>
          <div style={styles.emptyTitle}>
            {searchText || gradeFilter
              ? 'No books match your search'
              : 'No books registered yet'}
          </div>
          <div style={styles.emptySub}>
            {!searchText && !gradeFilter &&
              'Click "Register Book Title" to add the first book'}
          </div>
        </div>
      ) : (
        <div style={styles.booksList}>
          {filteredBooks.map(book => {
            const isExpanded = expandedBookId === book.detailsId;

            return (
              <div key={book.detailsId} style={styles.bookCard}>

                {/* ── BOOK TITLE ROW ─────────────────── */}
                <div
                  style={styles.bookRow}
                  onClick={() => handleExpandBook(book.detailsId)}
                >
                  <div style={styles.bookLeft}>
                    <span style={styles.arrow}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div style={styles.bookIcon}>
                      {book.gradeLevel}
                    </div>
                    <div>
                      <div style={styles.bookTitle}>
                        {book.titleName}
                      </div>
                      <div style={styles.bookMeta}>
                        {book.subject}
                        {book.publisher
                          ? ` • ${book.publisher}`
                          : ''}
                        {' • '}Grade {book.gradeLevel}
                      </div>
                    </div>
                  </div>

                  <div style={styles.bookRight}>
                    <div style={styles.copiesCount}>
                      <span style={styles.copiesNumber}>
                        {book.copies}
                      </span>
                      <span style={styles.copiesLabel}>copies</span>
                    </div>
                    <button
                      style={styles.addCopiesBtn}
                      onClick={e => {
                        e.stopPropagation();
                        setWorkingBook(book);
                        setModal('addCopies');
                      }}
                    >
                      + Add Copies
                    </button>
                  </div>
                </div>

                {/* ── COPIES SECTION ─────────────────── */}
                {isExpanded && (
                  <div style={styles.copiesSection}>

                    {/* Status summary */}
                    <div style={styles.statusSummary}>
                      <StatusPill
                        label="Available"
                        count={statusCount('AVAILABLE')}
                        color="#276749"
                        bg="#f0fff4"
                      />
                      <StatusPill
                        label="Distributed"
                        count={statusCount('DISTRIBUTED')}
                        color="#744210"
                        bg="#fffff0"
                      />
                      <StatusPill
                        label="Borrowed"
                        count={statusCount('BORROWED')}
                        color="#2b6cb0"
                        bg="#ebf8ff"
                      />
                      <StatusPill
                        label="Lost"
                        count={statusCount('LOST')}
                        color="#c53030"
                        bg="#fff5f5"
                      />
                    </div>

                    {loadingCopies ? (
                      <div style={styles.loadingText}>
                        Loading copies...
                      </div>
                    ) : copies.length === 0 ? (
                      <div style={styles.noCopies}>
                        No copies registered yet.
                        Click "+ Add Copies" to register.
                      </div>
                    ) : (
                      <>
                        {/* ── QR ACTIONS BAR ──────────── */}
                        <div style={styles.qrActionsBar}>
                          <div style={styles.qrActionsLeft}>
                            <button
                              style={styles.selectAllBtn}
                              onClick={selectAllForPrint}
                            >
                              Select All
                            </button>
                            <button
                              style={styles.clearBtn}
                              onClick={clearSelection}
                            >
                              Clear
                            </button>
                            <span style={styles.selectedCount}>
                              {selectedForPrint.size > 0
                                ? `${selectedForPrint.size} selected`
                                : 'Select QR codes to print'}
                            </span>
                          </div>

                          {selectedForPrint.size > 0 && (
                            <button
                              style={styles.printBtn}
                              onClick={handlePrint}
                            >
                              🖨️ Print {selectedForPrint.size} QR{' '}
                              {selectedForPrint.size === 1
                                ? 'Code'
                                : 'Codes'}
                            </button>
                          )}
                        </div>

                        {/* ── COPIES GRID ─────────────── */}
                        <div style={styles.copiesGrid}>
                          {copies.map(copy => (
                            <CopyCard
                              key={copy.bookId}
                              copy={copy}
                              bookTitle={book.titleName}
                              isSelected={
                                selectedForPrint.has(copy.bookId)
                              }
                              onToggleSelect={() =>
                                toggleSelectForPrint(copy.bookId)
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD BOOK TITLE MODAL ─────────────────────── */}
      {modal === 'addTitle' && (
        <Modal title="Register New Book Title" onClose={closeModal}>
          <form onSubmit={handleAddTitle}>
            {error && (
              <div style={styles.modalError}>{error}</div>
            )}
            <FormField label="Book Title">
              <input
                style={styles.input}
                placeholder="e.g. Mathematics Form 2"
                value={titleForm.titleName}
                onChange={e => setTitleForm({
                  ...titleForm, titleName: e.target.value,
                })}
                required
              />
            </FormField>
            <FormField label="Subject">
              <input
                style={styles.input}
                placeholder="e.g. Mathematics"
                value={titleForm.subject}
                onChange={e => setTitleForm({
                  ...titleForm, subject: e.target.value,
                })}
                required
              />
            </FormField>
            <FormField label="Grade Level">
              <select
                style={styles.input}
                value={titleForm.gradeLevel}
                onChange={e => setTitleForm({
                  ...titleForm, gradeLevel: e.target.value,
                })}
                required
              >
                <option value="">Select grade</option>
                {[7,8,9,10,11,12].map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Publisher (optional)">
              <input
                style={styles.input}
                placeholder="e.g. KLB"
                value={titleForm.publisher}
                onChange={e => setTitleForm({
                  ...titleForm, publisher: e.target.value,
                })}
              />
            </FormField>
            <FormField label="ISBN (for barcode scanning)">
              <input
                style={styles.input}
                placeholder="e.g. 9789966254123"
                value={titleForm.isbn}
                onChange={e => setTitleForm({
                  ...titleForm, isbn: e.target.value,
                })}
              />
              <span style={styles.inputHint}>
                Found on the barcode on the back cover of the book.
                Teachers scan this to look up the title during returns.
              </span>
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
                {submitting ? 'Registering...' : 'Register Title'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ADD COPIES MODAL ─────────────────────────── */}
      {modal === 'addCopies' && (
        <Modal
          title={`Add Copies — ${workingBook?.titleName}`}
          onClose={closeModal}
        >
          <form onSubmit={handleAddCopies}>
            {error && (
              <div style={styles.modalError}>{error}</div>
            )}

            <div style={styles.infoBox}>
              📌 Each copy will automatically receive a unique
              accession number (e.g. ACC-1-0001).
              Write this number inside the front cover of each book.
              Teachers will use this number to assign books to students.
            </div>

            <FormField label="Number of Copies">
              <input
                style={styles.input}
                type="number"
                min="1"
                max="500"
                value={copiesForm.quantity}
                onChange={e => setCopiesForm({
                  ...copiesForm,
                  quantity: parseInt(e.target.value),
                })}
                required
              />
              <span style={styles.inputHint}>
                QR codes will be generated for each copy
              </span>
            </FormField>

            <FormField label="Date Acquired">
              <input
                style={styles.input}
                type="date"
                value={copiesForm.dateAcquired}
                onChange={e => setCopiesForm({
                  ...copiesForm,
                  dateAcquired: e.target.value,
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
                {submitting
                  ? 'Registering...'
                  : `Register ${copiesForm.quantity} ${copiesForm.quantity === 1 ? 'Copy' : 'Copies'}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── PRINT QR MODAL ───────────────────────────── */}
      {modal === 'printQr' && (
        <Modal
          title={`Print ${copiesToPrint.length} QR Codes`}
          onClose={closeModal}
        >
          <div style={styles.printPreviewNote}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#333' }}>
              <strong>Print preview</strong> — QR codes will print
              in a grid. Cut and stick each one to its book copy.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              The QR code ID and book title print below each code
              so you know which sticker goes on which book.
            </p>
          </div>

          <FormField label="Sticker sheet layout">
            <select
              style={styles.select}
              value={printLayout}
              onChange={e => setPrintLayout(e.target.value)}
            >
              {Object.entries(STICKER_LAYOUTS).map(([key, layout]) => (
                <option key={key} value={key}>
                  {`${layout.labelCols} × ${layout.labelRows} — ${key}`}
                </option>
              ))}
            </select>
            <span style={styles.inputHint}>
              Choose the sticker paper format you are using.
            </span>
          </FormField>

          {/* Preview grid */}
          <div style={styles.printPreviewGrid}>
            {copiesToPrint.map(copy => (
              <div key={copy.bookId} style={styles.printPreviewItem}>
                {/* QR image from Spring Boot */}
                <img
                  src={bookService.getQrImageUrl(copy.bookId)}
                  alt={copy.qrCode}
                  style={styles.qrPreviewImg}
                  onError={e => {
                    e.target.style.display = 'none';
                  }}
                />
                <div style={styles.qrPreviewCode}>
                  {copy.accessionNumber || copy.qrCode}
                </div>
                <div style={styles.qrPreviewTitle}>
                  {expandedBook?.titleName}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.modalActions}>
            <button style={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button
              style={styles.printBtn}
              onClick={triggerPrint}
            >
              🖨️ Print Now
            </button>
          </div>
        </Modal>
      )}

      {/* ── HIDDEN PRINT AREA ────────────────────────── */}
      {/* This div is what actually prints */}
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
              <div className="printBookTitle" style={styles.printBookTitle}>
                {expandedBook?.titleName}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── COPY CARD ─────────────────────────────────────────────────────────
function CopyCard({ copy, bookTitle, isSelected, onToggleSelect }) {
  const statusColors = {
    AVAILABLE:   { bg: '#f0fff4', color: '#276749' },
    DISTRIBUTED: { bg: '#fffff0', color: '#744210' },
    BORROWED:    { bg: '#ebf8ff', color: '#2b6cb0' },
    LOST:        { bg: '#fff5f5', color: '#c53030' },
  };
  const sc = statusColors[copy.status] || {
    bg: '#f0f2f5', color: '#666',
  };

  return (
    <div
      style={{
        ...copyStyles.card,
        border: isSelected
          ? '2px solid #1a1a2e'
          : '1.5px solid #e8ecf0',
        background: isSelected ? '#f7f8fc' : '#fff',
      }}
      onClick={onToggleSelect}
    >
      {/* Selection indicator */}
      <div style={copyStyles.selectRow}>
        <div style={{
          ...copyStyles.checkbox,
          background: isSelected ? '#1a1a2e' : '#fff',
          border: isSelected
            ? '2px solid #1a1a2e'
            : '2px solid #e0e0e0',
        }}>
          {isSelected && (
            <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
          )}
        </div>
        <span style={{
          ...copyStyles.statusBadge,
          background: sc.bg,
          color: sc.color,
        }}>
          {copy.status}
        </span>
      </div>

      {/* QR Image */}
      <img
        src={bookService.getQrImageUrl(copy.bookId)}
        alt={copy.qrCode}
        style={copyStyles.qrImg}
        onError={e => {
          e.target.src = '';
          e.target.alt = 'QR';
        }}
      />

      {/* Accession number text */}
      <div style={copyStyles.qrCode}>{copy.accessionNumber || copy.qrCode}</div>

      {/* Date */}
      <div style={copyStyles.date}>
        {copy.dateAcquired || 'No date'}
      </div>
    </div>
  );
}

// ── STATUS PILL ───────────────────────────────────────────────────────
function StatusPill({ label, count, color, bg }) {
  return (
    <div style={{ ...pillStyles.pill, background: bg }}>
      <span style={{ ...pillStyles.count, color }}>{count}</span>
      <span style={{ ...pillStyles.label, color }}>{label}</span>
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
    borderRadius: 8, padding: '10px 16px',
    color: '#276749', fontSize: 13, marginBottom: 16,
  },
  errorMsg: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 16px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  filterBar: {
    display: 'flex', gap: 12,
    marginBottom: 16, flexWrap: 'wrap',
  },
  searchInput: {
    padding: '9px 14px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', flex: 1, minWidth: 220,
    fontFamily: 'Segoe UI, sans-serif',
  },
  select: {
    padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#fff',
    fontFamily: 'Segoe UI, sans-serif', cursor: 'pointer',
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
  booksList: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  bookCard: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  bookRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
    cursor: 'pointer',
  },
  bookLeft: {
    display: 'flex', alignItems: 'center', gap: 14,
  },
  arrow: { color: '#888', fontSize: 12, width: 16 },
  bookIcon: {
    width: 42, height: 42, borderRadius: 10,
    background: '#1a1a2e', color: '#fff',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700,
    fontSize: 16, flexShrink: 0,
  },
  bookTitle: {
    fontWeight: 700, fontSize: 15, color: '#1a1a2e',
  },
  bookMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  bookRight: {
    display: 'flex', alignItems: 'center', gap: 14,
  },
  copiesCount: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',
  },
  copiesNumber: {
    fontSize: 22, fontWeight: 700, color: '#1a1a2e',
    lineHeight: 1,
  },
  copiesLabel: { fontSize: 11, color: '#aaa' },
  addCopiesBtn: {
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '7px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
  copiesSection: {
    borderTop: '1px solid #f0f2f5',
    padding: '16px 20px', background: '#fafbfc',
  },
  statusSummary: {
    display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
  },
  noCopies: {
    color: '#888', fontSize: 13,
    textAlign: 'center', padding: '20px 0',
  },
  qrActionsBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
    padding: '10px 14px', background: '#fff',
    borderRadius: 8, border: '1.5px solid #e8ecf0',
  },
  qrActionsLeft: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  selectAllBtn: {
    padding: '5px 12px', background: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  clearBtn: {
    padding: '5px 12px', background: '#f0f2f5',
    color: '#333', border: '1.5px solid #e0e0e0',
    borderRadius: 6, fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  selectedCount: { fontSize: 13, color: '#888' },
  printBtn: {
    background: '#276749', color: '#fff',
    border: 'none', borderRadius: 8,
    padding: '8px 18px', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  copiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
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
  input: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  inputHint: {
    fontSize: 11, color: '#999', marginTop: 4, display: 'block',
  },
  infoBox: {
    background: '#ebf8ff', border: '1px solid #bee3f8',
    borderRadius: 8, padding: '10px 14px',
    color: '#2b6cb0', fontSize: 13, marginBottom: 16,
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
  printPreviewNote: {
    background: '#f7fafc', borderRadius: 8,
    padding: '12px 14px', marginBottom: 16,
  },
  printPreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12, maxHeight: 360, overflowY: 'auto',
    padding: 4,
  },
  printPreviewItem: {
    border: '1px solid #e0e0e0', borderRadius: 8,
    padding: 8, textAlign: 'center', background: '#fff',
  },
  qrPreviewImg: {
    width: 90, height: 90, display: 'block', margin: '0 auto',
  },
  qrPreviewCode: {
    fontSize: 9, color: '#555',
    marginTop: 4, wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  qrPreviewTitle: {
    fontSize: 9, color: '#888',
    marginTop: 2, fontWeight: 600,
  },
  // Hidden print area — only visible when printing
  hiddenPrintArea: { visibility: 'hidden' },
  printTitle: {
    fontSize: 16, fontWeight: 700,
    marginBottom: 16, color: '#1a1a2e',
  },
  printGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  printItem: {
    border: '1px solid #ddd', borderRadius: 6,
    padding: 8, textAlign: 'center',
    pageBreakInside: 'avoid',
  },
  printQrImg: { width: 120, height: 120 },
  printCode: {
    fontSize: 8, color: '#555',
    marginTop: 4, wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  printBookTitle: {
    fontSize: 9, color: '#333',
    marginTop: 2, fontWeight: 600,
  },
};

const copyStyles = {
  card: {
    borderRadius: 10, padding: '10px',
    cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'center',
  },
  selectRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.15s',
  },
  statusBadge: {
    fontSize: 9, fontWeight: 600,
    padding: '2px 6px', borderRadius: 10,
  },
  qrImg: {
    width: 120, height: 40,
    display: 'block', margin: '0 auto 6px',
  },
  qrCode: {
    fontSize: 8, color: '#555',
    wordBreak: 'break-all', fontFamily: 'monospace',
    marginBottom: 3,
  },
  date: { fontSize: 9, color: '#aaa' },
};

const pillStyles = {
  pill: {
    display: 'flex', alignItems: 'center',
    gap: 6, padding: '5px 12px', borderRadius: 20,
  },
  count: { fontSize: 16, fontWeight: 700 },
  label: { fontSize: 12, fontWeight: 500 },
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
    width: '100%', maxWidth: 500,
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
    fontSize: 16, cursor: 'pointer', color: '#888', padding: 4,
  },
  body: { padding: '20px 22px', overflowY: 'auto' },
};