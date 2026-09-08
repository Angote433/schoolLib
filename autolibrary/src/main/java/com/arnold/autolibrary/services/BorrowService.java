package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.*;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.BorrowRecordRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class BorrowService {

    private static final Logger log = LoggerFactory.getLogger(BorrowService.class);

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
                ()->new ResourceNotFoundException("Book not found")
        );

        if(book.getStatus()!= BookStatus.AVAILABLE){
            log.warn("Issue rejected: accession={} reason=NOT_AVAILABLE status={}", qrCode, book.getStatus());
            throw new BusinessRuleException("Book is not available. Status: "+book.getStatus() );
        }

        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new ResourceNotFoundException("Student not found")
        );

        if(!student.isActive()){
            throw new BusinessRuleException("Cannot distribute to inactive students.");
        }

        if(dateDue.isBefore(LocalDate.now())){
            throw new BusinessRuleException("Due date cannot be in the past");
        }

        BorrowRecord borrowRecord = new BorrowRecord(book,student,dateDue,issuedBy);
        borrowRepo.save(borrowRecord);

        book.setStatus(BookStatus.BORROWED);
        bookRepo.save(book);

        log.info("Book issued: accession={} student={} due={} by={}",
                qrCode, student.getAdmissionNumber(), dateDue, issuedBy.getUserName());

        return borrowRecord;

    }
    @Transactional
    public BorrowRecord returnBook(String qrCode){
        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new ResourceNotFoundException("Book not found")
        );

        BorrowRecord borrowRecord = borrowRepo.findByBookCopyBookIdAndStatus(book.getBookId(),BorrowStatus.ACTIVE)
                .orElseThrow(()->new ResourceNotFoundException("No active borrow for this book found"));

        borrowRecord.setDateReturned(LocalDate.now());
        borrowRecord.setStatus(BorrowStatus.RETURNED);
        borrowRepo.save(borrowRecord);

        book.setStatus(BookStatus.AVAILABLE);
        bookRepo.save(book);

        long daysOverdue = Math.max(0, ChronoUnit.DAYS.between(borrowRecord.getDateDue(), LocalDate.now()));
        log.info("Book returned: accession={} student={} daysOverdue={}",
                qrCode, borrowRecord.getStudent().getAdmissionNumber(), daysOverdue);

        return borrowRecord;
    }

    //Lost
    @Transactional
    public LossReport flagAsLost(String qrCode,String reason){
        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new ResourceNotFoundException("Book not found ")
        );

        BorrowRecord record = borrowRepo
                .findByBookCopyBookIdAndStatus(
                        book.getBookId(), BorrowStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active borrow found for this book"
                ));
        LossReport lossReport = new LossReport(book,record.getStudent(),LossSource.BORROWING,reason);
        lossRepo.save(lossReport);

        record.setStatus(BorrowStatus.LOST);
        borrowRepo.save(record);

        book.setStatus(BookStatus.LOST);
        bookRepo.save(book);

        log.info("Loss report created: reportId={} student={} source=BORROWING",
                lossReport.getReportId(), record.getStudent().getAdmissionNumber());

        return lossReport;

    }

    public List<BorrowRecord>getStudentBorrows(int studentId){
        return borrowRepo.findByStudentStudentId(studentId);
    }
    public List<BorrowRecord>getActiveBorrows(){
        return borrowRepo.findByStatus(BorrowStatus.ACTIVE);
    }

    public List<BorrowRecord> getOverdueBorrows() {
        //no scheduled job flips ACTIVE -> OVERDUE, so derive it live:
        //active borrows whose due date has already passed
        return borrowRepo.findByStatusAndDateDueBefore(BorrowStatus.ACTIVE, LocalDate.now());
    }
}
