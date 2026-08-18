package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookStatus;
import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.ResolutionStatus;
import com.arnold.autolibrary.repo.BookCopyRepo;
import com.arnold.autolibrary.repo.LossReportRepo;
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

    //All penidng reports
    public List<LossReport>getPendingReports(){
        return lossRepo.findByResolutionStatus(ResolutionStatus.PENDING);
    }

    public List<LossReport>getReportByStudent(int studentId){
        return lossRepo.findByStudentStudentId(studentId);
    }

    public List<LossReport>getAllReports(){
        return lossRepo.findAll();
    }

    @Transactional
    public LossReport resolveReport(int reportId,String notes){
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

    public LossReport writeOff(int reportId,String notes){
        LossReport report = lossRepo.findById(reportId).orElseThrow(
                ()->new RuntimeException("Report not found")
        );
        report.setResolutionStatus(ResolutionStatus.WRITTEN_OFF);
        report.setDateResolved(LocalDate.now());
        report.setNotes(notes);

        return lossRepo.save(report);
    }
}
