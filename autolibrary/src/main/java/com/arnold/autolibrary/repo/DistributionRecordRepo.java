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

    //mobile app: all distributions for a teacher's stream in a given year
    //(Home stat card + "Books Out" tab)
    List<DistributionRecord> findByStudentStreamStreamIdAndAcademicYear(
            int streamId, int academicYear);

    //return flow - students in a stream currently holding a copy of a given ISBN title
    List<DistributionRecord> findByStatusAndBookCopyBookDetailsIsbnAndStudentStreamStreamId(
            DistributionStatus status, String isbn, int streamId);

    //prevent assigning a student two copies of the same title
    boolean existsByStatusAndStudentStudentIdAndBookCopyBookDetailsDetailsId(
            DistributionStatus status, int studentId, int detailsId);
}
