package com.arnold.autolibrary.services;

import com.arnold.autolibrary.dto.CopyPreviewEntry;
import com.arnold.autolibrary.dto.CopyPreviewResponse;
import com.arnold.autolibrary.dto.CopyRegistrationRequest;
import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookDetails;
import com.arnold.autolibrary.model.BookStatus;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.BookDetailsRepo;
import com.arnold.autolibrary.security.AuthUtil;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    // Guard against a typo (e.g. 10000 instead of 1000) locking up the
    // server or producing an unmanageable batch to review.
    private static final int MAX_BATCH_SIZE = 1000;
    private static final int MAX_ACCESSION_LENGTH = 50;

    @Autowired
    private BookDetailsRepo bookDetailsRepo;
    @Autowired
    private BookCopyRepo bookCopyRepo;
    @Autowired
    private AuthUtil authUtil;

    public BookDetails registerTitle(BookDetails bookDetails){
        bookDetails.setCopies(0);
        BookDetails saved = bookDetailsRepo.save(bookDetails);
        log.info("Book title registered: id={} title='{}' isbn={}",
                saved.getDetailsId(), saved.getTitleName(), saved.getIsbn());
        return saved;
    }
    public List<BookDetails>getAllBooks(){
        return bookDetailsRepo.findAll();
    }
    public List getBooksByGradeLevel(int gradeLevel){
        return bookDetailsRepo.findByGradeLevel(gradeLevel);
    }
    public BookDetails getBookByID(int detailsId){return bookDetailsRepo.findById(detailsId)
            .orElseThrow(()->new ResourceNotFoundException("Book with id: "+ detailsId + " not found"));}

    //book copies
    //Accession number format: ACC-{detailsId}-{sequentialNumber padded to 4 digits}
    //e.g. ACC-3-0001. The librarian writes this number inside the physical book.
    //Mode A (AUTO) only — must keep producing exactly this format.
    private String generateAccessionNumber(int detailsId, int sequenceNumber){
        return String.format("ACC-%d-%04d", detailsId, sequenceNumber);
    }

    // Mode B — a consecutive range for books a school already numbered by
    // hand, e.g. prefix "LIB/2019/", start 1, count 80, pad 3
    // -> LIB/2019/001 .. LIB/2019/080. padWidth 0 means unpadded (1, 2, 3).
    List<String> generateRange(String prefix, int start, int count, int padWidth, String suffix){
        String p = prefix == null ? "" : prefix;
        String s = suffix == null ? "" : suffix;
        List<String> numbers = new ArrayList<>();
        for(int i = 0; i < count; i++){
            int n = start + i;
            String padded = padWidth > 0 ? String.format("%0" + padWidth + "d", n) : String.valueOf(n);
            numbers.add(p + padded + s);
        }
        return numbers;
    }

    // Mode C — one accession number per line, or comma-separated. Blank
    // lines/entries are dropped, every entry is trimmed.
    List<String> parseAccessionList(String raw){
        if(raw == null || raw.isBlank()){
            return new ArrayList<>();
        }
        List<String> numbers = new ArrayList<>();
        for(String part : raw.split("[\\r\\n,]+")){
            String trimmed = part.trim();
            if(!trimmed.isEmpty()){
                numbers.add(trimmed);
            }
        }
        return numbers;
    }

    // Builds the raw candidate list for the chosen mode and enforces the
    // purely structural rules (quantity/count bounds) that make no sense
    // to defer to the per-entry preview — there is nothing to preview for
    // a quantity of 0 or -5.
    private List<String> generateCandidateNumbers(BookDetails details, CopyRegistrationRequest request){
        String mode = request.getMode() == null ? "AUTO" : request.getMode().toUpperCase();

        switch(mode){
            case "AUTO": {
                Integer quantity = request.getQuantity();
                if(quantity == null || quantity <= 0){
                    throw new IllegalArgumentException("Quantity must be greater than zero");
                }
                if(quantity > MAX_BATCH_SIZE){
                    throw new IllegalArgumentException(
                            "Quantity exceeds the maximum of " + MAX_BATCH_SIZE + " copies in a single batch");
                }
                int existingCount = bookCopyRepo.countByBookDetailsDetailsId(details.getDetailsId());
                List<String> numbers = new ArrayList<>();
                for(int i = 1; i <= quantity; i++){
                    numbers.add(generateAccessionNumber(details.getDetailsId(), existingCount + i));
                }
                return numbers;
            }
            case "RANGE": {
                Integer count = request.getCount();
                if(count == null || count <= 0){
                    throw new IllegalArgumentException("Count must be greater than zero");
                }
                if(count > MAX_BATCH_SIZE){
                    throw new IllegalArgumentException(
                            "Count exceeds the maximum of " + MAX_BATCH_SIZE + " copies in a single batch");
                }
                int start = request.getStart() == null ? 1 : request.getStart();
                int padWidth = request.getPadWidth() == null ? 3 : request.getPadWidth();
                return generateRange(request.getPrefix(), start, count, padWidth, request.getSuffix());
            }
            case "LIST": {
                List<String> numbers = parseAccessionList(request.getRawList());
                if(numbers.isEmpty()){
                    throw new IllegalArgumentException("Paste at least one accession number");
                }
                if(numbers.size() > MAX_BATCH_SIZE){
                    throw new IllegalArgumentException(
                            "List exceeds the maximum of " + MAX_BATCH_SIZE + " copies in a single batch");
                }
                return numbers;
            }
            default:
                throw new IllegalArgumentException("Unknown registration mode: " + request.getMode());
        }
    }

    // Checks every candidate number against the database (one query for
    // the whole batch) and against the rest of the batch itself. Never
    // writes anything — safe to call from both the preview endpoint and
    // as the re-check at the top of the real registration transaction.
    private CopyPreviewResponse buildPreview(List<String> numbers){
        List<BookCopy> existing = bookCopyRepo.findByAccessionNumberIn(numbers);
        Map<String, String> titleByExistingNumber = new HashMap<>();
        for(BookCopy copy : existing){
            titleByExistingNumber.put(copy.getAccessionNumber(), copy.getBookDetails().getTitleName());
        }

        List<CopyPreviewEntry> entries = new ArrayList<>();
        Set<String> seenInBatch = new HashSet<>();
        int okCount = 0;
        int conflictCount = 0;

        for(String raw : numbers){
            String trimmed = raw == null ? "" : raw.trim();
            CopyPreviewEntry entry = new CopyPreviewEntry();
            entry.setAccessionNumber(trimmed);

            if(trimmed.isEmpty()){
                entry.setStatus("BLANK");
                conflictCount++;
            } else if(trimmed.length() > MAX_ACCESSION_LENGTH){
                entry.setStatus("TOO_LONG");
                conflictCount++;
            } else if(titleByExistingNumber.containsKey(trimmed)){
                entry.setStatus("DUPLICATE_IN_DB");
                entry.setConflictTitle(titleByExistingNumber.get(trimmed));
                conflictCount++;
            } else if(!seenInBatch.add(trimmed)){
                entry.setStatus("DUPLICATE_IN_BATCH");
                conflictCount++;
            } else {
                entry.setStatus("OK");
                okCount++;
            }
            entries.add(entry);
        }

        CopyPreviewResponse response = new CopyPreviewResponse();
        response.setTotalRequested(numbers.size());
        response.setEntries(entries);
        response.setOkCount(okCount);
        response.setConflictCount(conflictCount);
        return response;
    }

    // Read-only — generates the full candidate list and checks it, but
    // never inserts anything.
    public CopyPreviewResponse previewCopyRegistration(int detailsId, CopyRegistrationRequest request){
        BookDetails details = getBookByID(detailsId);
        List<String> numbers = generateCandidateNumbers(details, request);
        return buildPreview(numbers);
    }

    // All-or-nothing. Re-runs the same checks the preview ran — another
    // librarian may have inserted a conflicting number since the preview
    // was shown — and rejects (no rows inserted) rather than partially
    // committing if anything still conflicts.
    // qrCode is kept in sync with accessionNumber for backward compatibility.
    @Transactional
    public List<BookCopy> registerCopies(int detailsId, CopyRegistrationRequest request){
        UserDetails caller = authUtil.getCurrentUser();
        BookDetails details = getBookByID(detailsId);
        String mode = request.getMode() == null ? "AUTO" : request.getMode().toUpperCase();

        List<String> numbers = generateCandidateNumbers(details, request);
        CopyPreviewResponse check = buildPreview(numbers);

        if(check.getConflictCount() > 0){
            List<String> conflicting = new ArrayList<>();
            for(CopyPreviewEntry entry : check.getEntries()){
                if(!"OK".equals(entry.getStatus())){
                    conflicting.add(entry.getAccessionNumber() + " (" + entry.getStatus() + ")");
                }
            }
            log.warn("Copy registration rejected: titleId={} mode={} reason=CONFLICTS conflicts={}",
                    detailsId, mode, conflicting);
            throw new BusinessRuleException(
                    "Cannot register copies — conflicting accession numbers: " + String.join(", ", conflicting));
        }

        LocalDate date = request.getDateAcquired();
        List<BookCopy> copies = new ArrayList<>();
        for(String number : numbers){
            BookCopy copy = new BookCopy(details, number, date);
            copy.setAccessionNumber(number);
            copies.add(bookCopyRepo.save(copy));
        }

        details.setCopies(details.getCopies() + numbers.size());
        bookDetailsRepo.save(details);

        log.info("Copies registered: titleId={} mode={} count={} range='{}..{}' by={}",
                detailsId, mode, numbers.size(), numbers.get(0), numbers.get(numbers.size() - 1),
                caller.getUserName());

        return copies;
    }


    public BookCopy findByQR(String qrCode){
        return bookCopyRepo.findByQrCode(qrCode).orElseThrow(() -> {
            log.warn("Copy lookup failed: qrCode={} (not found)", qrCode);
            return new ResourceNotFoundException("No book found with qr code "+ qrCode
                    +" .Book may not be registered in the system");
        });
    }

    //Teacher types the accession number written inside the book
    public BookCopy findByAccessionNumber(String accessionNumber){
        return bookCopyRepo.findByAccessionNumber(accessionNumber).orElseThrow(() -> {
            log.warn("Copy lookup failed: accession={} (not found)", accessionNumber);
            return new ResourceNotFoundException("No book found with accession number: " + accessionNumber
                    + ". Check the number written inside the book.");
        });
    }

    //Teacher scans the ISBN barcode on the book's back cover
    public BookDetails getByIsbn(String isbn){
        return bookDetailsRepo.findByIsbn(isbn).orElseThrow(() -> {
            log.warn("Title lookup failed: isbn={} (not found)", isbn);
            return new ResourceNotFoundException("No book registered with ISBN: " + isbn
                    + ". Ask the librarian to register this book title first.");
        });
    }

    public List<BookCopy>getCopiesByByBook(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsId(detailsId);
    }
    public List<BookCopy>getAvailableCopies(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsIdAndStatus(detailsId, BookStatus.AVAILABLE);
    }

    public BookCopy getCopyById(int copyId) {
        return bookCopyRepo.findById(copyId).orElseThrow(
                ()->new ResourceNotFoundException("Book copy not found")
        );
    }
}
