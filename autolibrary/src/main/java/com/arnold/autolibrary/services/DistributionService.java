package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.*;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.DistributionRecordRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DistributionService {
    @Autowired
    private DistributionRecordRepo distRepo;

    @Autowired
    private BookCopyRepo bookRepo;

    @Autowired
    private StudentRepo studRepo;

    @Autowired
    private LossReportRepo lossRepo;

    //Scans qr and assigns student a book
    @Transactional
    public DistributionRecord distributeBook(String qrCode, int studentId, int academicYear,
                                             UserDetails distributedBy){
        /*
        Find book by qr
        Book must be available for distribution
        Find student
        Student must be active
        Create the distribution record
        Update book status to distributed
         */

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(()->
                new RuntimeException("Book with qr "+qrCode + " not found" ));

        if(book.getStatus()!= BookStatus.AVAILABLE){
            throw new RuntimeException("This book is currently not available");
        }

        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new RuntimeException("Student not found ")
        );
        if(!student.isActive()){
            throw new RuntimeException("Cannot distribute to inactive student");
        }

        DistributionRecord distributionRecord = new DistributionRecord(book,student,academicYear,distributedBy);
        distRepo.save(distributionRecord);

        book.setStatus(BookStatus.DISTRIBUTED);
        bookRepo.save(book);

        return distributionRecord;

    }

    //Returning - where teacher scans book to return
    @Transactional
    public DistributionRecord returnBook(String qrCode){
        /*
        find the copy
        find active distribution record for this book
        update the record
        Set book to available again
         */

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new RuntimeException("Book not found ")
        );

        DistributionRecord record = distRepo.findByBookCopyBookIdAndStatus(book.getBookId(),DistributionStatus.DISTRIBUTED)
                .orElseThrow(()->new RuntimeException("No active distribution for this book"));

        record.setDateReturned(LocalDate.now());
        record.setStatus(DistributionStatus.RETURNED);
        distRepo.save(record);

        book.setStatus(BookStatus.AVAILABLE);
        bookRepo.save(book);

        return record;
    }

    //if book not returned to be flagged as lost or if the qr failed

    @Transactional
    public LossReport flagLost(String qrCode,String reason,UserDetails reportedBy){
        /*
        Find the book
        Find active distribution to identify the student
        Prevent duplicate losses for the same book
        create the loss report
        Update distribution record
        update book status

         */
        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new RuntimeException("Book not found ")
        );

        DistributionRecord record = distRepo
                .findByBookCopyBookIdAndStatus(
                        book.getBookId(), DistributionStatus.DISTRIBUTED)
                .orElseThrow(() -> new RuntimeException(
                        "No active distribution found for this book"
                ));
        boolean alreadyReported = lossRepo.existsByBookCopyBookIdAndResolutionStatus(book.getBookId(),ResolutionStatus.PENDING);
        if(alreadyReported){
            throw new RuntimeException("A loss report for this book exists");
        }

        LossReport lossReport = new LossReport(book,record.getStudent(),LossSource.DISTRIBUTION,reason);
        lossRepo.save(lossReport);

        record.setStatus(DistributionStatus.LOST);
        distRepo.save(record);

        book.setStatus(BookStatus.LOST);
        bookRepo.save(book);

        return lossReport;


    }

    public List<DistributionRecord> getStudentDistributions(int studentId){
        return distRepo.findByStudentStudentId(studentId);
    }
    public List<DistributionRecord>getByYear(int year){
        return distRepo.findByAcademicYear(year);
    }

}
