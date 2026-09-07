package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookStatus;
import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.ResolutionStatus;
import com.arnold.autolibrary.model.Student;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import com.arnold.autolibrary.security.AuthUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class LossReportService {
    @Autowired
    private LossReportRepo lossRepo;
    @Autowired
    private BookCopyRepo bookCopyRepo;
    @Autowired
    private StudentRepo studentRepo;
    @Autowired
    private AuthUtil authUtil;

    //All pending reports — teacher sees only their stream's
    public List<LossReport>getPendingReports(){
        UserDetails caller = authUtil.getCurrentUser();
        if(authUtil.isLibrarian(caller)){
            return lossRepo.findByResolutionStatus(ResolutionStatus.PENDING);
        }
        int streamId = authUtil.getCallerStreamId(caller);
        return lossRepo.findByResolutionStatusAndStudentStreamStreamId(ResolutionStatus.PENDING, streamId);
    }

    public List<LossReport>getReportByStudent(int studentId){
        UserDetails caller = authUtil.getCurrentUser();
        Student student = studentRepo.findById(studentId).orElseThrow(
                ()->new RuntimeException("Student not found")
        );
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());
        return lossRepo.findByStudentStudentId(studentId);
    }

    //All reports — teacher sees only losses for students in their stream
    public List<LossReport>getAllReports(){
        UserDetails caller = authUtil.getCurrentUser();
        if(authUtil.isLibrarian(caller)){
            return lossRepo.findAll();
        }
        int streamId = authUtil.getCallerStreamId(caller);
        return lossRepo.findByStudentStreamStreamId(streamId);
    }

    // Librarian only — resolving means the school is satisfied the
    // matter is settled (replacement paid, book found).
    @Transactional
    public LossReport resolveReport(int reportId,String notes){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        LossReport report = lossRepo.findById(reportId).orElseThrow(
                ()->new RuntimeException("Report not found")
        );
        if(report.getResolutionStatus() != ResolutionStatus.PENDING){
            throw new RuntimeException("This report is already "+report.getResolutionStatus());
        }
        report.setResolutionStatus(ResolutionStatus.RESOLVED);
        report.setDateResolved(LocalDate.now());
        report.setNotes(notes);

        //book was found — return the physical copy to circulation
        BookCopy copy = report.getBookCopy();
        copy.setStatus(BookStatus.AVAILABLE);
        bookCopyRepo.save(copy);

        return lossRepo.save(report);
    }

    // Librarian only — the school absorbing the loss is an
    // administrative decision, not a teacher one.
    public LossReport writeOff(int reportId,String notes){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        LossReport report = lossRepo.findById(reportId).orElseThrow(
                ()->new RuntimeException("Report not found")
        );
        report.setResolutionStatus(ResolutionStatus.WRITTEN_OFF);
        report.setDateResolved(LocalDate.now());
        report.setNotes(notes);

        return lossRepo.save(report);
    }
}
