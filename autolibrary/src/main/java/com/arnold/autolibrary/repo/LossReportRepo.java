package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.ResolutionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LossReportRepo extends JpaRepository<LossReport,Integer> {

    boolean existsByBookCopyBookIdAndResolutionStatus(int bookID, ResolutionStatus resolutionStatus);

    List<LossReport> findByResolutionStatus(ResolutionStatus resolutionStatus);

    List<LossReport> findByStudentStudentId(int studentId);
}
