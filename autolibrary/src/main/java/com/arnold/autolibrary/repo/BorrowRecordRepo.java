package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.BorrowRecord;
import com.arnold.autolibrary.model.BorrowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BorrowRecordRepo extends JpaRepository<BorrowRecord,Integer> {

   Optional <BorrowRecord>findByBookCopyBookIdAndStatus(int bookID, BorrowStatus borrowStatus);

    List<BorrowRecord> findByStatusAndDateDueBefore(BorrowStatus borrowStatus, LocalDate now);

    List<BorrowRecord> findByStudentStudentId(int studentId);

    List<BorrowRecord> findByStatus(BorrowStatus borrowStatus);
}
