package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepo extends JpaRepository<Student,Integer> {
    Optional<Student>findStudentByAdmissionNumber(String admissionNumber);
    List<Student> findByStreamStreamName(String streamName);

    //adm exists?
    boolean existsByAdmissionNumber(String admissionNo);


    List<Student> findByStreamStreamIdAndIsActive(int streamId, boolean b);


}
