package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
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
        Stream created = streamService.createStream(stream,classId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
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

    // A teacher loads only their own stream this way (no class/stream
    // selector) — access to any other stream id is scoped in the service.
    @GetMapping("/{id}")
    public ResponseEntity<?>getStreamById(@PathVariable int id){
        Stream stream = streamService.getStreamById(id);
        return ResponseEntity.ok(stream);
    }

    //Assigning (or reassigning) a teacher to a stream. When this would
    //displace an existing teacher<->stream link, the service returns a
    //409 with a warning unless confirm=true is sent.
    @PutMapping("/{id}/teacher")
    public ResponseEntity<?>assignTeacher(@PathVariable int id, @RequestBody AssignTeacherRequest request){
        Stream updated = streamService.assignTeacher(id, request.getUserId(), request.isConfirm());
        return ResponseEntity.ok(updated);
    }

    //Unassigns whoever currently holds the stream — students and history
    //are untouched.
    @DeleteMapping("/{id}/teacher")
    public ResponseEntity<?>removeTeacher(@PathVariable int id){
        Stream updated = streamService.removeTeacher(id);
        return ResponseEntity.ok(updated);
    }

    //Currently assigned teacher, or null. Both roles — a teacher may
    //only read their own stream (enforced in the service).
    @GetMapping("/{id}/teacher")
    public ResponseEntity<?>getTeacher(@PathVariable int id){
        UserDetails teacher = streamService.getTeacher(id);
        return ResponseEntity.ok(teacher);
    }

    public static class AssignTeacherRequest {
        private int userId;
        private boolean confirm;

        public int getUserId() { return userId; }
        public void setUserId(int userId) { this.userId = userId; }

        public boolean isConfirm() { return confirm; }
        public void setConfirm(boolean confirm) { this.confirm = confirm; }
    }

}
