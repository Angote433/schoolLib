package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.exception.ApiErrors;
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
            return ApiErrors.toResponse(e);
        }
    }


    //get all active student in a stream-teachers use this on a mobile app to see classlist
    @GetMapping("/stream/{streamId}")
    public ResponseEntity<?>getStudentsByStream(@PathVariable int streamId){
        try {
            List<Student> students = studService.getByStream(streamId);
            return ResponseEntity.ok(students);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }

    //get one student by their admmission
    @GetMapping("admission/{admission}")
    public ResponseEntity<?>getStudentByAdmisiion(@PathVariable String admission){
        try {
            Student student = studService.getStudentByAdmission(admission);
            return ResponseEntity.ok(student);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e, HttpStatus.NOT_FOUND);
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?>updateStudent(@PathVariable int id ,@RequestBody Student updatedInfo){
        try {
            Student updated = studService.updateStudent(id, updatedInfo);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }
   @PutMapping("/{id}/deactivate")
    public ResponseEntity<?>deactivateStudent(@PathVariable int id){
        try{
            Student deactivated = studService.deactivateStudent(id);
            return ResponseEntity.ok(deactivated);
        }catch(RuntimeException e){
            return ApiErrors.toResponse(e);
        }
   }
    @PutMapping("/{id}/activate")
    public ResponseEntity<?>activateStudent(@PathVariable  int id){
        try{
            Student activated = studService.activateStudent(id);
            return ResponseEntity.ok(activated);
        }catch(RuntimeException e){
            return ApiErrors.toResponse(e);
        }
    }

    // Librarian only — moving a student to a different stream.
    // Enforced both here at the route level (SecurityConfig) and again
    // in the service (AuthUtil.assertLibrarian).
    @PutMapping("/{id}/transfer")
    public ResponseEntity<?>transferStudent(@PathVariable int id, @RequestParam int streamId){
        try{
            Student transferred = studService.transferStudent(id, streamId);
            return ResponseEntity.ok(transferred);
        }catch(RuntimeException e){
            return ApiErrors.toResponse(e);
        }
    }

    @GetMapping
    public ResponseEntity<?>getAllStudents(){
        try {
            List<Student> students = studService.getAllStudents();
            return ResponseEntity.ok(students);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }


   //check if this admission xists,,quick check
    @GetMapping("exists/{admissionNumber}")
    public ResponseEntity<?>existsByAdmission(@PathVariable String admissionNumber){
        try{
            boolean exists = studService.admissionExists(admissionNumber);
            return ResponseEntity.ok(exists);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }

}
