package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.*;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.DistributionRecordRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import com.arnold.autolibrary.security.AuthUtil;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DistributionService {

    private static final Logger log = LoggerFactory.getLogger(DistributionService.class);

    @Autowired
    private DistributionRecordRepo distRepo;

    @Autowired
    private BookCopyRepo bookRepo;

    @Autowired
    private StudentRepo studRepo;

    @Autowired
    private LossReportRepo lossRepo;

    @Autowired
    private AuthUtil authUtil;

    //Scans qr and assigns student a book
    @Transactional
    public DistributionRecord distributeBook(String qrCode, int studentId, int academicYear,
                                             UserDetails distributedBy){
        /*
        Find student, confirm caller may act on their stream
        Find book by qr
        Book must be available for distribution
        Student must be active
        Create the distribution record
        Update book status to distributed
         */

        UserDetails caller = authUtil.getCurrentUser();
        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new ResourceNotFoundException("Student not found ")
        );
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(()->
                new ResourceNotFoundException("Book with qr "+qrCode + " not found" ));

        if(book.getStatus()!= BookStatus.AVAILABLE){
            log.warn("Assign rejected: qrCode={} reason=NOT_AVAILABLE status={}", qrCode, book.getStatus());
            throw new BusinessRuleException("This book is currently not available");
        }

        if(!student.isActive()){
            throw new BusinessRuleException("Cannot distribute to inactive student");
        }

        DistributionRecord distributionRecord = new DistributionRecord(book,student,academicYear,distributedBy);
        distRepo.save(distributionRecord);

        book.setStatus(BookStatus.DISTRIBUTED);
        bookRepo.save(book);

        log.info("Book assigned: qrCode={} title='{}' student={} stream={} by={}",
                qrCode, book.getBookDetails().getTitleName(), student.getAdmissionNumber(),
                student.getStream().getStreamName(), distributedBy.getUserName());

        return distributionRecord;

    }

    //Returning - where teacher scans book to return
    @Transactional
    public DistributionRecord returnBook(String qrCode){
        /*
        find the copy
        find active distribution record for this book
        confirm caller may act on the holder's stream
        update the record
        Set book to available again
         */

        UserDetails caller = authUtil.getCurrentUser();

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new ResourceNotFoundException("Book not found ")
        );

        DistributionRecord record = distRepo.findByBookCopyBookIdAndStatus(book.getBookId(),DistributionStatus.DISTRIBUTED)
                .orElseThrow(()->new ResourceNotFoundException("No active distribution for this book"));

        authUtil.assertCanAccessStream(caller, record.getStudent().getStream().getStreamId());

        record.setDateReturned(LocalDate.now());
        record.setStatus(DistributionStatus.RETURNED);
        distRepo.save(record);

        book.setStatus(BookStatus.AVAILABLE);
        bookRepo.save(book);

        log.info("Book returned: accession={} student={} by={}",
                book.getAccessionNumber(), record.getStudent().getAdmissionNumber(), caller.getUserName());

        return record;
    }

    //if book not returned to be flagged as lost or if the qr failed

    @Transactional
    public LossReport flagLost(String qrCode,String reason,UserDetails reportedBy){
        /*
        Find the book
        Find active distribution to identify the student
        Confirm caller may act on that student's stream
        Prevent duplicate losses for the same book
        create the loss report
        Update distribution record
        update book status

         */
        UserDetails caller = authUtil.getCurrentUser();

        BookCopy book = bookRepo.findByQrCode(qrCode).orElseThrow(
                ()->new ResourceNotFoundException("Book not found ")
        );

        DistributionRecord record = distRepo
                .findByBookCopyBookIdAndStatus(
                        book.getBookId(), DistributionStatus.DISTRIBUTED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active distribution found for this book"
                ));

        authUtil.assertCanAccessStream(caller, record.getStudent().getStream().getStreamId());

        boolean alreadyReported = lossRepo.existsByBookCopyBookIdAndResolutionStatus(book.getBookId(),ResolutionStatus.PENDING);
        if(alreadyReported){
            throw new BusinessRuleException("A loss report for this book exists");
        }

        LossReport lossReport = new LossReport(book,record.getStudent(),LossSource.DISTRIBUTION,reason);
        lossRepo.save(lossReport);

        record.setStatus(DistributionStatus.LOST);
        distRepo.save(record);

        book.setStatus(BookStatus.LOST);
        bookRepo.save(book);

        log.info("Book flagged lost: accession={} student={} reason='{}' by={}",
                book.getAccessionNumber(), record.getStudent().getAdmissionNumber(), reason, reportedBy.getUserName());

        return lossReport;


    }

    public List<DistributionRecord> getStudentDistributions(int studentId){
        UserDetails caller = authUtil.getCurrentUser();
        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new ResourceNotFoundException("Student not found ")
        );
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());
        return distRepo.findByStudentStudentId(studentId);
    }

    // Teacher gets only their own stream's records for the year, never
    // the whole school's.
    public List<DistributionRecord>getByYear(int year){
        UserDetails caller = authUtil.getCurrentUser();
        if(authUtil.isLibrarian(caller)){
            return distRepo.findByAcademicYear(year);
        }
        int streamId = authUtil.getCallerStreamId(caller);
        return distRepo.findByStudentStreamStreamIdAndAcademicYear(streamId, year);
    }

    /*
    Mobile app: Home "Books Out" stat and the "Books Out" tab both need
    every distribution record for the teacher's own stream in a given
    academic year, so the count/list can be filtered to DISTRIBUTED
    client-side.
     */
    public List<DistributionRecord> getByStreamAndYear(int streamId, int academicYear){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertCanAccessStream(caller, streamId);
        return distRepo.findByStudentStreamStreamIdAndAcademicYear(streamId, academicYear);
    }

    /*
    Return flow: teacher scans the ISBN on the book's back cover.
    Shows every student in their stream currently holding a copy of that title
    so the teacher can tick off the one returning it.
     */
    public List<DistributionRecord> getActiveByIsbnAndStream(String isbn, int streamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertCanAccessStream(caller, streamId);
        return distRepo.findByStatusAndBookCopyBookDetailsIsbnAndStudentStreamStreamId(
                DistributionStatus.DISTRIBUTED, isbn, streamId);
    }

    /*
    Assign flow: teacher types/scans the accession number written inside the book,
    confirms the title, picks the student, and this assigns the specific copy.
     */
    @Transactional
    public DistributionRecord distributeByAccessionNumber(String accessionNumber, int studentId,
                                                           int academicYear, UserDetails distributedBy){

        UserDetails caller = authUtil.getCurrentUser();
        Student student = studRepo.findById(studentId).orElseThrow(
                ()->new ResourceNotFoundException("Student not found ")
        );
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());

        BookCopy book = bookRepo.findByAccessionNumber(accessionNumber).orElseThrow(()->
                new ResourceNotFoundException("No book found with accession number: " + accessionNumber));

        if(book.getStatus() != BookStatus.AVAILABLE){
            log.warn("Assign rejected: accession={} reason=NOT_AVAILABLE status={}", accessionNumber, book.getStatus());
            throw new BusinessRuleException("This copy is not available. Current status: " + book.getStatus());
        }

        if(!student.isActive()){
            throw new BusinessRuleException("Cannot distribute to inactive student");
        }

        boolean alreadyHasCopy = distRepo.existsByStatusAndStudentStudentIdAndBookCopyBookDetailsDetailsId(
                DistributionStatus.DISTRIBUTED, studentId, book.getBookDetails().getDetailsId());

        if(alreadyHasCopy){
            log.warn("Assign rejected: student={} reason=DUPLICATE_TITLE title='{}'",
                    student.getAdmissionNumber(), book.getBookDetails().getTitleName());
            throw new BusinessRuleException(student.getFullName() + " already has a copy of: "
                    + book.getBookDetails().getTitleName());
        }

        DistributionRecord distributionRecord = new DistributionRecord(book, student, academicYear, distributedBy);
        distRepo.save(distributionRecord);

        book.setStatus(BookStatus.DISTRIBUTED);
        bookRepo.save(book);

        log.info("Book assigned: accession={} title='{}' student={} stream={} by={}",
                accessionNumber, book.getBookDetails().getTitleName(), student.getAdmissionNumber(),
                student.getStream().getStreamName(), distributedBy.getUserName());

        return distributionRecord;
    }

}
