package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.Student;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {
    @Autowired
    private StudentRepo studentRepo;
    @Autowired
    private StreamRepo streamRepo;

    public Student createStudent(Student student,int streamId){
        //id to be unique amongst students
        if(studentRepo.existsByAdmissionNumber(student.getAdmissionNumber())){
            throw new RuntimeException("Student with adm"+ student.getAdmissionNumber()+
                    "ecists");
        }

        //stream to nbe active /exist
        Stream stream = streamRepo.findById(streamId).
        orElseThrow(()->new RuntimeException("Stream not found"));

        if(!stream.isActive()){
            throw new RuntimeException("Stream not active ");
        }

        student.setStream(stream);
        student.setActive(true);
        return studentRepo.save(student);
    }

    public List<Student> getByStream(int streamId){
        return studentRepo.findByStreamStreamIdAndIsActive(streamId,true);
    }
    public Student getStudentByAdmission(String admission){
        return studentRepo.findStudentByAdmissionNumber(admission).orElseThrow(
                ()->new RuntimeException("Student not found" + admission)
        );
    }
    @Transactional
    public Student deactivateStudent(int studentId){
        Student student = studentRepo.getById(studentId);
        student.setActive(false);
        return studentRepo.save(student);
    }
    @Transactional
    public Student activateStudent(int studentId){
        Student student = studentRepo.getById(studentId);
        student.setActive(true);
        return studentRepo.save(student);
    }

    public Student updateStudent(int studentId,Student updatedData){
        Student existing = getStudentById(studentId);

        //update fields that are safe to change
        existing.setFullName(updatedData.getFullName());
        existing.setYearEnrolled(updatedData.getYearEnrolled());

        return studentRepo.save(existing);
    }

    public boolean admissionExists(String admNumber){
        return studentRepo.existsByAdmissionNumber(admNumber);
    }

    private Student getStudentById(int studentId) {
        return studentRepo.findById(studentId).orElseThrow(
                ()->new RuntimeException("Student not found")
        );
    }


    public List<Student> getAllStudents() {
        return studentRepo.findAll();
    }
}
