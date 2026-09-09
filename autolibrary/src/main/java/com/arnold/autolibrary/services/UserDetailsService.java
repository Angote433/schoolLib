package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import com.arnold.autolibrary.security.AuthUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsService {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private static final Logger log = LoggerFactory.getLogger(UserDetailsService.class);

    @Autowired
    UserDetailsRepo userDetailsRepo;

    @Autowired
    private StreamService streamService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private AuthUtil authUtil;


    public UserDetails createUser(UserDetails user){
        //username to be unique
        if(userDetailsRepo.existsByUserName(user.getUserName())){
            throw new BusinessRuleException("Username already exists");
        }

        user.setPasswordHash(
                passwordEncoder.encode(user.getPasswordHash())
        );

        user.setActive(true);
        UserDetails saved = userDetailsRepo.save(user);
        log.info("User created: user={} role={}", saved.getUserName(), saved.getRole());
        return saved;
    }

    public List<UserDetails>getAllUSers(){
        return userDetailsRepo.findAll();
    }

    public UserDetails getUserById(int userId){
        return userDetailsRepo.findById(userId).orElseThrow(
                ()->new ResourceNotFoundException("User not found with id "+ userId)
        );
    }

    public  List<UserDetails>getUsersByRole(Role role){
        return userDetailsRepo.findByRole(role);
    }

    public UserDetails deactivateUser(int userId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new ResourceNotFoundException("User not found")
        );
        //cannot deactivate the only librarian
        if(user.getRole() == Role.LIBRARIAN){
            long librarianCount = userDetailsRepo.findByRole(Role.LIBRARIAN).stream()
                    .filter(UserDetails::isActive).count();

            if(librarianCount <=1){
                throw new BusinessRuleException("Cannot deactivate the only librarian");
            }

        }
        user.setActive(false);
        UserDetails saved = userDetailsRepo.save(user);
        log.info("User deactivated: user={}", saved.getUserName());
        return saved;
    }

    public UserDetails activateUser(int userId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new ResourceNotFoundException("User not found")
        );
        user.setActive(true);
        UserDetails saved = userDetailsRepo.save(user);
        log.info("User activated: user={}", saved.getUserName());
        return saved;
    }

    // Legacy path (PUT /api/users/{id}/stream). Delegates to
    // StreamService.assignTeacher — the single method that writes
    // stream.teacher_id / user_details.stream_id — instead of writing
    // either column itself, so the two can never drift apart by having
    // two independent implementations (see Feature 3.1). This endpoint
    // has no confirm concept, so it auto-confirms; the dedicated
    // PUT /api/streams/{id}/teacher endpoint is the one that surfaces the
    // "this will displace an existing assignment" warning to a caller.
    @org.springframework.transaction.annotation.Transactional
    public UserDetails assignStream(int userId,int streamId){
        streamService.assignTeacher(streamId, userId, true);
        return userDetailsRepo.findById(userId).orElseThrow(
                ()->new ResourceNotFoundException("User not found")
        );
    }

    // Self-service — a user editing their own fullName. userName, role,
    // streamId and isActive are never touched here (see 2.1) — the
    // request DTO only carries fullName, so there is nothing else to
    // even accidentally trust from the client.
    public UserDetails updateOwnProfile(String fullName){
        UserDetails user = authUtil.getCurrentUser();

        if(fullName == null || fullName.isBlank()){
            throw new IllegalArgumentException("Full name cannot be blank");
        }

        user.setFullName(fullName.trim());
        UserDetails saved = userDetailsRepo.save(user);
        log.info("Profile updated: user={}", saved.getUserName());
        return saved;
    }

    // Self-service password change. The caller is always resolved from
    // the SecurityContext (never a userId from the request) — see
    // AuthUtil. currentPassword must match before anything is written.
    @org.springframework.transaction.annotation.Transactional
    public void changeOwnPassword(String currentPassword, String newPassword, String confirmPassword){
        UserDetails user = authUtil.getCurrentUser();

        if(!passwordEncoder.matches(currentPassword, user.getPasswordHash())){
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if(newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH){
            throw new IllegalArgumentException("New password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        if(!newPassword.equals(confirmPassword)){
            throw new IllegalArgumentException("New password and confirmation do not match");
        }
        if(passwordEncoder.matches(newPassword, user.getPasswordHash())){
            throw new IllegalArgumentException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userDetailsRepo.save(user);
        // Stateless JWTs already issued to this user stay valid until they
        // expire — no token blacklist. The frontend clears the session and
        // sends the user back to login instead (see Settings.jsx).
        log.info("Password changed (self-service): user={}", user.getUserName());
    }

    // Librarian-only — resets another user's password without knowing
    // their current one. A librarian may not use this path on their own
    // account; the self-service endpoint above is for that.
    @org.springframework.transaction.annotation.Transactional
    public void resetPassword(int targetUserId, String newPassword){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        if(caller.getUserId() == targetUserId){
            throw new BusinessRuleException("Use Settings to change your own password, not the reset action");
        }

        UserDetails target = getUserById(targetUserId);

        if(newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH){
            throw new IllegalArgumentException("New password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        target.setPasswordHash(passwordEncoder.encode(newPassword));
        userDetailsRepo.save(target);
        log.info("Password reset: user={} by={}", target.getUserName(), caller.getUserName());
    }
}
