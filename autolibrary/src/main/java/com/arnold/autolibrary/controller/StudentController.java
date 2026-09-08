package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.Student;
import com.arnold.autolibrary.services.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
        Student created = studService.createStudent(student, streamId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    //get all active student in a stream-teachers use this on a mobile app to see classlist
    @GetMapping("/stream/{streamId}")
    public ResponseEntity<?>getStudentsByStream(@PathVariable int streamId){
        List<Student> students = studService.getByStream(streamId);
        return ResponseEntity.ok(students);
    }

    //get one student by their admmission
    @GetMapping("admission/{admission}")
    public ResponseEntity<?>getStudentByAdmisiion(@PathVariable String admission){
        Student student = studService.getStudentByAdmission(admission);
        return ResponseEntity.ok(student);
    }
    @PutMapping("/{id}")
    public ResponseEntity<?>updateStudent(@PathVariable int id ,@RequestBody Student updatedInfo){
        Student updated = studService.updateStudent(id, updatedInfo);
        return ResponseEntity.ok(updated);
    }
   @PutMapping("/{id}/deactivate")
    public ResponseEntity<?>deactivateStudent(@PathVariable int id){
        Student deactivated = studService.deactivateStudent(id);
        return ResponseEntity.ok(deactivated);
   }
    @PutMapping("/{id}/activate")
    public ResponseEntity<?>activateStudent(@PathVariable  int id){
        Student activated = studService.activateStudent(id);
        return ResponseEntity.ok(activated);
    }

    // Librarian only — moving a student to a different stream.
    // Enforced both here at the route level (SecurityConfig) and again
    // in the service (AuthUtil.assertLibrarian).
    @PutMapping("/{id}/transfer")
    public ResponseEntity<?>transferStudent(@PathVariable int id, @RequestParam int streamId){
        Student transferred = studService.transferStudent(id, streamId);
        return ResponseEntity.ok(transferred);
    }

    @GetMapping
    public ResponseEntity<?>getAllStudents(){
        List<Student> students = studService.getAllStudents();
        return ResponseEntity.ok(students);
    }


   //check if this admission xists,,quick check
    @GetMapping("exists/{admissionNumber}")
    public ResponseEntity<?>existsByAdmission(@PathVariable String admissionNumber){
        boolean exists = studService.admissionExists(admissionNumber);
        return ResponseEntity.ok(exists);
    }

}
