package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookDetails;
import com.arnold.autolibrary.model.BookStatus;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.BookDetailsRepo;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    @Autowired
    private BookDetailsRepo bookDetailsRepo;
    @Autowired
    private BookCopyRepo bookCopyRepo;

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
    private String generateAccessionNumber(int detailsId, int sequenceNumber){
        return String.format("ACC-%d-%04d", detailsId, sequenceNumber);
    }

    //registering multiple copies at once - each copy gets a sequential accession number
    //qrCode is kept in sync with accessionNumber for backward compatibility
    @Transactional
    public List<BookCopy>registerMultipleCopies(int detailsId,int quantity,LocalDate date){
        BookDetails details = getBookByID(detailsId);

        int existingCount = bookCopyRepo.countByBookDetailsDetailsId(detailsId);

        List<BookCopy>copies = new ArrayList<>();
        for(int i = 1;i<= quantity;i++){
            int sequenceNumber = existingCount + i;
            String accessionNumber = generateAccessionNumber(detailsId, sequenceNumber);

            BookCopy copy = new BookCopy(details, accessionNumber, date);
            copy.setAccessionNumber(accessionNumber);

            copies.add(bookCopyRepo.save(copy));
        }

        details.setCopies(existingCount + quantity);
        bookDetailsRepo.save(details);

        log.info("Copies registered: titleId={} quantity={} range={}..{}",
                detailsId, quantity,
                generateAccessionNumber(detailsId, existingCount + 1),
                generateAccessionNumber(detailsId, existingCount + quantity));

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
