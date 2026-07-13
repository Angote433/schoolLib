package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.*;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.BorrowRecordRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class BorrowService {
    @Autowired
    private BorrowRecordRepo borrowRepo;

    @Autowired
    private BookCopyRepo bookRepo;

    @Autowired
    private StudentRepo studRepo;
    @Autowired
    private LossReportRepo lossRepo;

    @Transactional
    public BorrowRecord borrowBoook(String qrCode, int studentId, LocalDate dateDue, UserDetails issuedBy){
        /*
        Find the book and validate
        Check if it is avaiabkle-only abvailabe can be borrowed
        Find and validate student
        Date due not in the past
        Crete borrow record
        Update book dstatus
         */

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new RuntimeException("Book not found")
        );

        if(book.getStatus()!= BookStatus.AVAILABLE){
            throw new RuntimeException("Book is not available. Status: "+book.getStatus() );
        }

        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new RuntimeException("Student not found")
        );

        if(!student.isActive()){
            throw new RuntimeException("Cannot distribute to inactive students.");
        }

        if(dateDue.isBefore(LocalDate.now())){
            throw new RuntimeException("Due date cannot be in the past");
        }

        BorrowRecord borrowRecord = new BorrowRecord(book,student,dateDue,issuedBy);
        borrowRepo.save(borrowRecord);

        book.setStatus(BookStatus.BORROWED);
        bookRepo.save(book);

        return borrowRecord;

    }
    @Transactional
    public BorrowRecord returnBook(String qrCode){
        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new RuntimeException("Book not found")
        );

        BorrowRecord borrowRecord = borrowRepo.findByBookCopyBookIdAndStatus(book.getBookId(),BorrowStatus.ACTIVE)
                .orElseThrow(()->new RuntimeException("No active borrow for this book found"));

        borrowRecord.setDateReturned(LocalDate.now());
        borrowRecord.setStatus(BorrowStatus.RETURNED);
        borrowRepo.save(borrowRecord);

        book.setStatus(BookStatus.AVAILABLE);
        bookRepo.save(book);

        return borrowRecord;
    }

    //overdue borrows

    List<BorrowRecord>getOverdueBorrrows(){
        return borrowRepo.findByStatusAndDateDueBefore(BorrowStatus.ACTIVE,LocalDate.now());
    }

    //Lost
    @Transactional
    public LossReport flagAsLost(String qrCode,String reason){
        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new RuntimeException("Book not found ")
        );

        BorrowRecord record = borrowRepo
                .findByBookCopyBookIdAndStatus(
                        book.getBookId(), BorrowStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException(
                        "No active borrow found for this book"
                ));
        LossReport lossReport = new LossReport(book,record.getStudent(),LossSource.BORROWING,reason);
        lossRepo.save(lossReport);

        record.setStatus(BorrowStatus.LOST);
        borrowRepo.save(record);

        book.setStatus(BookStatus.LOST);
        bookRepo.save(book);

        return lossReport;

    }

    public List<BorrowRecord>getStudentBorrows(int studentId){
        return borrowRepo.findByStudentStudentId(studentId);
    }
    public List<BorrowRecord>getActiveBorrows(){
        return borrowRepo.findByStatus(BorrowStatus.ACTIVE);
    }

    public List<BorrowRecord> getOverdueBorrows() {
        return borrowRepo.findByStatus(BorrowStatus.OVERDUE);
    }
}
