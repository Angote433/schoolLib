package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.DistributionRecord;
import com.arnold.autolibrary.model.DistributionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistributionRecordRepo extends JpaRepository<DistributionRecord,Integer> {
    List<DistributionRecord> findByStudent_AdmissionNumber(String admissionNo);

    List<DistributionRecord>findByAcademicYear(int academicYear);
    //track unreturned books
    List<DistributionRecord>findByStudentStudentIdAndAcademicYear(int studentId,int year);

    Optional<DistributionRecord>findByBookCopyBookIdAndStatus(int bookID, DistributionStatus distributionStatus);

    List<DistributionRecord> findByStudentStudentId(int studentId);
}
