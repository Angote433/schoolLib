package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import com.arnold.autolibrary.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/auth")
public class AuthController {

    @Autowired
    private UserDetailsRepo userRepo;
    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?>login(@RequestBody LoginRequest request){
        UserDetails user = userRepo.findByUserName(request.getUserName()).orElse(null);

        //user exists?
        if(user == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        }
        //user active?
        if(!user.isActive()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Account deactivated,contact the librarian");

        }

        //password matches?
        if (!passwordEncoder.matches(
                request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid username or password");
        }

        //generate the tokens
        String token = jwtUtil.generateToken(
                user.getUserName(),
                user.getRole().name(),
                user.getUserId()
        );

        Map<String , Object>response = new HashMap<>();
        response.put("token",token);
        response.put("userId",user.getUserId());
        response.put("fullName",user.getFullName());
        response.put("role",user.getRole());
        response.put("userName",user.getUserName());

        // If teacher — include their stream info
        if (user.getStream() != null) {
            response.put("streamId",
                    user.getStream().getStreamId());
            response.put("streamName",
                    user.getStream().getStreamName());
        }

        return ResponseEntity.ok(response);

    }

    //creating the first librarian
    //to remove it later
    @PostMapping("/register-librarian")
    public ResponseEntity<?>registerFirstLibrarian(@RequestBody LoginRequest request){
        //Librarian exists?
        boolean librarianExists = userRepo.findByRole(Role.LIBRARIAN)
                .stream().anyMatch(UserDetails :: isActive);

        if(librarianExists){
            return ResponseEntity.badRequest().body("Librarian account already exists");
        }

        UserDetails librarian = new UserDetails();
        librarian.setFullName(request.getFullName());
        librarian.setUserName(request.getUserName());
        librarian.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        librarian.setRole(Role.LIBRARIAN);
        librarian.setActive(true);
        userRepo.save(librarian);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Librarian account created successfully");



    }

    public static class LoginRequest {
        private String userName;
        private String password;
        private String fullName;

        public String getUserName() { return userName; }
        public void setUserName(String userName) {
            this.userName = userName;
        }

        public String getPassword() { return password; }
        public void setPassword(String password) {
            this.password = password;
        }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) {
            this.fullName = fullName;
        }
    }

}
