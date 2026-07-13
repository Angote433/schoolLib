package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.Student;
import com.arnold.autolibrary.repo.StudentRepo;
import com.arnold.autolibrary.services.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    @Autowired
    StudentService studService;

    //Teacher adds students to their class

    @PostMapping
    public ResponseEntity<?>addStudent(@RequestBody Student student, @RequestParam int streamId ){
        try {
            Student created = studService.createStudent(student, streamId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    //get all active student in a stream-teachers use this on a mobile app to see classlist
    @GetMapping("/stream/{streamId}")
    public ResponseEntity<List<Student>>getStudentsByStream(@PathVariable int streamId){
        List<Student>students = studService.getByStream(streamId);
        return ResponseEntity.ok(students);
    }

    //get one student by their admmission
    @GetMapping("admission/{admission}")
    public ResponseEntity<?>getStudentByAdmisiion(@PathVariable String admission){
        try {
            Student student = studService.getStudentByAdmission(admission);
            return ResponseEntity.ok(student);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?>updateStudent(@PathVariable int id ,@RequestParam Student updatedInfo){
        try {
            Student updated = studService.updateStudent(id, updatedInfo);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
   @PutMapping("/{id}/deactivate")
    public ResponseEntity<?>deactivateStudent(@PathVariable int id){
        try{
            Student deactivated = studService.deactivateStudent(id);
            return ResponseEntity.ok(deactivated);
        }catch(RuntimeException e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
   }
    @PutMapping("/{id}/activate")
    public ResponseEntity<?>activateStudent(@PathVariable  int id){
        try{
            Student activated = studService.activateStudent(id);
            return ResponseEntity.ok(activated);
        }catch(RuntimeException e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @GetMapping
    public ResponseEntity<List<Student>>getAllStudents(){
        List<Student>students = studService.getAllStudents();
        return ResponseEntity.ok(students);
    }


   //check if this admission xists,,quick check
    @GetMapping("exists/{admissionNumber}")
    public ResponseEntity<?>existsByAdmission(@PathVariable String admissionNumber){
        try{
            boolean exists = studService.admissionExists(admissionNumber);
            return ResponseEntity.ok(exists);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}
