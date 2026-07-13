package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.services.SchoolClassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/classes")
public class SchoolController {
    @Autowired
    private SchoolClassService schoolClassService;

    @PostMapping
    public ResponseEntity<?>createClass(@RequestBody SchoolClass schoolClass){
        try{
            SchoolClass created = schoolClassService.addClass(schoolClass);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        }catch(RuntimeException e ){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<SchoolClass>>getAllClasses(){
        List<SchoolClass>classes = schoolClassService.viewAllClasses();
        return ResponseEntity.ok(classes);
    }







}
