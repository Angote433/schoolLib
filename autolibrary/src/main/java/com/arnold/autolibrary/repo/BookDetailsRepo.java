package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.BookDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookDetailsRepo extends JpaRepository<BookDetails,Integer> {
   Optional<BookDetails> findBookDetailsByTitleName(String titleName);
   List<BookDetails>findBySubject(String subjectName);
   List<BookDetails>findByGradeLevel(int gradeLevel);




}
