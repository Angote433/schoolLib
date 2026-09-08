package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserDetailsService.class);

    @Autowired
    UserDetailsRepo userDetailsRepo;

    @Autowired
    StreamRepo streamRepo;
    @Autowired
    private PasswordEncoder passwordEncoder;


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

    @org.springframework.transaction.annotation.Transactional
    public UserDetails assignStream(int userId,int streamId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new ResourceNotFoundException("User not found")
        );
        //only teachers get assigned streams
        if(user.getRole() != Role.TEACHER  ){
            throw new BusinessRuleException("Only teachers are assigned streams");
        }

        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id"+ streamId)
        );

        //teacher already managing a different stream?
        streamRepo.findByTeacher(user).ifPresent(existingStream -> {
            if(existingStream.getStreamId() != streamId){
                throw new BusinessRuleException("Teacher manages another stream "+ existingStream.getStreamName());
            }
        });

        //clear the previous teacher of this stream (if being reassigned)
        UserDetails previousTeacher = stream.getTeacher();
        if(previousTeacher != null && previousTeacher.getUserId() != userId){
            previousTeacher.setStream(null);
            userDetailsRepo.save(previousTeacher);
        }

        //keep both sides of the relationship in sync
        user.setStream(stream);
        stream.setTeacher(user);
        streamRepo.save(stream);

        UserDetails saved = userDetailsRepo.save(user);
        log.info("Teacher assigned to stream: user={} stream={}", saved.getUserName(), stream.getStreamName());
        return saved;
    }
}
