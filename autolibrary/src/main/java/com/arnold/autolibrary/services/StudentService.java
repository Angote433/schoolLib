package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.Student;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.StudentRepo;
import com.arnold.autolibrary.security.AuthUtil;
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
    @Autowired
    private AuthUtil authUtil;

    public Student createStudent(Student student,int streamId){
        UserDetails caller = authUtil.getCurrentUser();

        // A teacher can only ever add students to their own stream —
        // the streamId query param is ignored for them, never trusted.
        int effectiveStreamId = authUtil.isLibrarian(caller)
                ? streamId
                : authUtil.getCallerStreamId(caller);

        //id to be unique amongst students
        if(studentRepo.existsByAdmissionNumber(student.getAdmissionNumber())){
            throw new RuntimeException("Student with adm"+ student.getAdmissionNumber()+
                    "ecists");
        }

        //stream to nbe active /exist
        Stream stream = streamRepo.findById(effectiveStreamId).
        orElseThrow(()->new RuntimeException("Stream not found"));

        if(!stream.isActive()){
            throw new RuntimeException("Stream not active ");
        }

        student.setStream(stream);
        student.setActive(true);
        return studentRepo.save(student);
    }

    public List<Student> getByStream(int streamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertCanAccessStream(caller, streamId);
        return studentRepo.findByStreamStreamIdAndIsActive(streamId,true);
    }
    public Student getStudentByAdmission(String admission){
        UserDetails caller = authUtil.getCurrentUser();
        Student student = studentRepo.findStudentByAdmissionNumber(admission).orElseThrow(
                ()->new RuntimeException("Student not found" + admission)
        );
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());
        return student;
    }
    @Transactional
    public Student deactivateStudent(int studentId){
        UserDetails caller = authUtil.getCurrentUser();
        Student student = getStudentById(studentId);
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());
        student.setActive(false);
        return studentRepo.save(student);
    }
    @Transactional
    public Student activateStudent(int studentId){
        UserDetails caller = authUtil.getCurrentUser();
        Student student = getStudentById(studentId);
        authUtil.assertCanAccessStream(caller, student.getStream().getStreamId());
        student.setActive(true);
        return studentRepo.save(student);
    }

    public Student updateStudent(int studentId,Student updatedData){
        UserDetails caller = authUtil.getCurrentUser();
        Student existing = getStudentById(studentId);
        authUtil.assertCanAccessStream(caller, existing.getStream().getStreamId());

        //update fields that are safe to change
        existing.setFullName(updatedData.getFullName());
        existing.setYearEnrolled(updatedData.getYearEnrolled());

        return studentRepo.save(existing);
    }

    // Librarian-only — moving a student between streams is a
    // school-administration decision, not something a teacher can do
    // even for their own stream.
    @Transactional
    public Student transferStudent(int studentId, int newStreamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        Student student = getStudentById(studentId);
        Stream newStream = streamRepo.findById(newStreamId).orElseThrow(
                ()->new RuntimeException("Stream not found"));

        if(!newStream.isActive()){
            throw new RuntimeException("Target stream is not active");
        }

        student.setStream(newStream);
        return studentRepo.save(student);
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
        UserDetails caller = authUtil.getCurrentUser();
        if(authUtil.isLibrarian(caller)){
            return studentRepo.findAll();
        }
        int streamId = authUtil.getCallerStreamId(caller);
        return studentRepo.findByStreamStreamIdAndIsActive(streamId, true);
    }
}
