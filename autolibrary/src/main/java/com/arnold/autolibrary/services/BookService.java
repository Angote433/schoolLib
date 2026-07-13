package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookDetails;
import com.arnold.autolibrary.model.BookStatus;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.BookDetailsRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookService {
    @Autowired
    private BookDetailsRepo bookDetailsRepo;
    @Autowired
    private BookCopyRepo bookCopyRepo;

    public BookDetails registerTitle(BookDetails bookDetails){
        bookDetails.setCopies(0);
        return bookDetailsRepo.save(bookDetails);
    }
    public List<BookDetails>getAllBooks(){
        return bookDetailsRepo.findAll();
    }
    public List getBooksByGradeLevel(int gradeLevel){
        return bookDetailsRepo.findByGradeLevel(gradeLevel);
    }
    public BookDetails getBookByID(int detailsId){return bookDetailsRepo.findById(detailsId)
            .orElseThrow(()->new RuntimeException("Book with id: "+ detailsId + " not found"));}

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

        return copies;
    }

    public BookCopy findByQR(String qrCode){
        return bookCopyRepo.findByQrCode(qrCode).orElseThrow(()
        -> new RuntimeException("No book found with qr code "+ qrCode
        +" .Book may not be registered in the system"));
    }

    //Teacher types the accession number written inside the book
    public BookCopy findByAccessionNumber(String accessionNumber){
        return bookCopyRepo.findByAccessionNumber(accessionNumber).orElseThrow(()
        -> new RuntimeException("No book found with accession number: " + accessionNumber
        + ". Check the number written inside the book."));
    }

    //Teacher scans the ISBN barcode on the book's back cover
    public BookDetails getByIsbn(String isbn){
        return bookDetailsRepo.findByIsbn(isbn).orElseThrow(()
        -> new RuntimeException("No book registered with ISBN: " + isbn
        + ". Ask the librarian to register this book title first."));
    }

    public List<BookCopy>getCopiesByByBook(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsId(detailsId);
    }
    public List<BookCopy>getAvailableCopies(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsIdAndStatus(detailsId, BookStatus.AVAILABLE);
    }

    public BookCopy getCopyById(int copyId) {
        return bookCopyRepo.findById(copyId).orElseThrow(
                ()->new RuntimeException("Book copy not found")
        );
    }
}
