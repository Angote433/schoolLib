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
import java.util.UUID;

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
    @Transactional
    public BookCopy registerCopy(int detailsId, LocalDate dateAcquired){
        BookDetails details = getBookByID(detailsId);

        //qr genetation
        String qrCode = generateUniqueQrCode(detailsId);
        BookCopy copy  = new BookCopy(details,qrCode,dateAcquired);

        BookCopy savedCopy = bookCopyRepo.save(copy);

        //update number of copies count
        details.setCopies(details.getCopies() + 1);
        bookDetailsRepo.save(details);

        return savedCopy;

    }
    //registering multiple copies at once
    @Transactional
    public List<BookCopy>registerMultipleCopies(int detailsId,int quantity,LocalDate date){
        List<BookCopy>copies = new ArrayList<>();
        for(int i = 0;i< quantity;i++){
            copies.add(registerCopy(detailsId,date));
        }

        return copies;
    }

    public BookCopy findByQR(String qrCode){
        return bookCopyRepo.findByQrCode(qrCode).orElseThrow(()
        -> new RuntimeException("No book found with qr code "+ qrCode
        +" .Book may not be registered in the system"));
    }
    public List<BookCopy>getCopiesByByBook(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsId(detailsId);
    }
    public List<BookCopy>getAvailableCopies(int detailsId){
        return bookCopyRepo.findByBookDetailsDetailsIdAndStatus(detailsId, BookStatus.AVAILABLE);
    }

    private String generateUniqueQrCode(int detailsId){
        String qrCode;
        do{
            qrCode = "BOOK-"+detailsId + "-"+UUID.randomUUID().toString()
                    .substring(0,8).toUpperCase();
        }while(bookCopyRepo.existsByQrCode(qrCode));
        return qrCode;
    }


    public BookCopy getCopyById(int copyId) {
        return bookCopyRepo.findById(copyId).orElseThrow(
                ()->new RuntimeException("Book copy not found")
        );
    }
}
