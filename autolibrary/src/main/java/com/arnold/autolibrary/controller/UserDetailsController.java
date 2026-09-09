package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.dto.UserResponse;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import com.arnold.autolibrary.security.AuthUtil;
import com.arnold.autolibrary.services.UserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserDetailsController {
    @Autowired
    private UserDetailsService userdetailsService;
    @Autowired
    private UserDetailsRepo userDetailsRepo;
    @Autowired
    private AuthUtil authUtil;

    // A teacher may always fetch their own profile — this is one of the
    // few /api/users/** endpoints not restricted to LIBRARIAN (see
    // SecurityConfig). It never accepts an id, so there is nothing to
    // scope: it always returns the caller's own record.
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(){
        return ResponseEntity.ok(profileResponse(authUtil.getCurrentUser()));
    }

    // streamId/streamName are always present in the response (null when
    // the caller has no stream) rather than omitted — the frontend uses
    // this to detect a stream being *removed*, which it can only do if
    // the key is there to compare against, not just missing.
    private Map<String, Object> profileResponse(UserDetails user){
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("fullName", user.getFullName());
        response.put("userName", user.getUserName());
        response.put("role", user.getRole());
        response.put("isActive", user.isActive());
        response.put("streamId", user.getStream() != null ? user.getStream().getStreamId() : null);
        response.put("streamName", user.getStream() != null ? user.getStream().getStreamName() : null);
        return response;
    }

    // Self-service — only fullName may change (see UserDetailsService for
    // the full list of what is deliberately NOT touched here).
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody ProfileUpdateRequest request){
        UserDetails updated = userdetailsService.updateOwnProfile(request.getFullName());
        return ResponseEntity.ok(profileResponse(updated));
    }

    // Self-service password change. The API is stateless — a JWT already
    // issued stays valid until it expires — so the frontend is expected
    // to clear the session and redirect to login on success rather than
    // this endpoint trying to invalidate anything server-side.
    @PutMapping("/me/password")
    public ResponseEntity<?> changeMyPassword(@RequestBody PasswordChangeRequest request){
        userdetailsService.changeOwnPassword(
                request.getCurrentPassword(), request.getNewPassword(), request.getConfirmPassword());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password updated. Please log in again.");
        return ResponseEntity.ok(response);
    }

    // Librarian only (enforced at the route level and again in the
    // service) — for the "teacher forgot their password" case. Does not
    // require the current password.
    @PutMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable int id, @RequestBody ResetPasswordRequest request){
        userdetailsService.resetPassword(id, request.getNewPassword());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?>createUser(@RequestBody UserDetails userDetails){
        UserDetails created = userdetailsService.createUser(userDetails);
        UserResponse response = new UserResponse(created.getUserId(), created.getUserName(), created.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<UserDetails>>getAllUsers(){
        return ResponseEntity.ok(userdetailsService.getAllUSers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?>getUserById(@PathVariable int id){
        UserDetails user = userdetailsService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    //get users by role
    @GetMapping("/role/{role}")
    public ResponseEntity<?>getUserByRole(@PathVariable String role){
        Role roleVal;
        try {
            roleVal = Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role. Use TEACHER or LIBRARIAN");
        }
        List<UserDetails> users = userdetailsService.getUsersByRole(roleVal);
        return ResponseEntity.ok(users);
    }

    //deactivate user
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?>deactivateUser(@PathVariable int id){
        UserDetails updated = userdetailsService.deactivateUser(id);
        return ResponseEntity.ok(updated);
    }
    //activate user
    @PutMapping("{id}/activate")
    public ResponseEntity<?>activateUser(@PathVariable int id){
        UserDetails updated = userdetailsService.activateUser(id);
        return ResponseEntity.ok(updated);
    }

    //Assigning teacher to a stream
    @PutMapping("/{id}/stream")
    public ResponseEntity<?>assignStream(@PathVariable int id,@RequestParam int streamId){
        UserDetails updated = userdetailsService.assignStream(id,streamId);
        return ResponseEntity.ok(updated);
    }

    public static class ProfileUpdateRequest {
        private String fullName;

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
    }

    public static class PasswordChangeRequest {
        private String currentPassword;
        private String newPassword;
        private String confirmPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }

        public String getConfirmPassword() { return confirmPassword; }
        public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
    }

    public static class ResetPasswordRequest {
        private String newPassword;

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
