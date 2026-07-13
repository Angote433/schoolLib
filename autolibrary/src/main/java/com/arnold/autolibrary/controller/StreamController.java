package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.services.StreamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/streams")
public class StreamController {

    @Autowired
    StreamService streamService;
    @PostMapping
    public ResponseEntity<?> createStream(@RequestBody Stream stream ,@RequestParam int classId){
        try{
            Stream created = streamService.createStream(stream,classId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        }catch(RuntimeException e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }

    }

    @GetMapping
    public ResponseEntity<List<Stream>>getAllStreams(){
        return ResponseEntity.ok(streamService.getAllStreams());
    }

    //Get streams under a class
    @GetMapping("class/{classId}")
    public ResponseEntity<List<Stream>>getStreamsByClass(@PathVariable int classId){
        return ResponseEntity.ok(streamService.getBySchoolClass(classId));
    }

    //Assingning a teacehr to a stream
    @PutMapping("/{id}/teacher")
    public ResponseEntity<?>AssignTeacher(@PathVariable int id , @RequestParam int userId){
        try{
            Stream updated = streamService.assignTeacher(id,userId);
            return ResponseEntity.ok(updated);
        }catch(RuntimeException e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


}
