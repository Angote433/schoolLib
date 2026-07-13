package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.dto.UserResponse;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import com.arnold.autolibrary.services.UserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserDetailsController {
    @Autowired
    private UserDetailsService userdetailsService;
    @Autowired
    private UserDetailsRepo userDetailsRepo;

    @PostMapping
    public ResponseEntity<?>createUser(@RequestBody UserDetails userDetails){
        try{
            UserDetails created = userdetailsService.createUser(userDetails);
            UserResponse response = new UserResponse(created.getUserId(), created.getUserName(), created.getRole());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<UserDetails>>getAllUsers(){
        return ResponseEntity.ok(userdetailsService.getAllUSers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?>getUserById(@PathVariable int id){
        try {
            UserDetails user = userdetailsService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }

    }

    //get users by role
    @GetMapping("/role/{role}")
    public ResponseEntity<?>getUserByRole(@PathVariable String role){
        try {
            Role roleVal = Role.valueOf(role.toUpperCase());
            List<UserDetails> users = userdetailsService.getUsersByRole(roleVal);
            return ResponseEntity.ok(users);
        }catch(IllegalArgumentException e){
            return ResponseEntity.badRequest().body("Invalid role.Use TEACHER or LIBRARIAN");
        }
    }

    //deactivate user
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?>deactivateUser(@PathVariable int id){
        try{
            UserDetails updated = userdetailsService.deactivateUser(id);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    //activate user
    @PutMapping("{id}/activate")
    public ResponseEntity<?>activateUser(@PathVariable int id){
        try{
            UserDetails updated = userdetailsService.activateUser(id);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //Assigning teacher to a stream
    @PutMapping("/{id}/stream")
    public ResponseEntity<?>assignStream(@PathVariable int id,@RequestParam int streamId){
        try{
            UserDetails updated = userdetailsService.assignStream(id,streamId);
            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
