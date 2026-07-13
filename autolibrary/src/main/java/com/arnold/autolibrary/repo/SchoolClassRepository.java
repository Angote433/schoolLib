package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass,Integer> {
    List<SchoolClass>findByClassName( String className);
    List<SchoolClass>findByClassNameAndAcademicYear(String className, int year);

    SchoolClass findByGradeLevelAndAcademicYear(int gradeLevel, int academicYear);
}
