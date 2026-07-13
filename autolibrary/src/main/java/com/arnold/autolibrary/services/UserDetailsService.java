package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsService {
    @Autowired
    UserDetailsRepo userDetailsRepo;

    @Autowired
    StreamRepo streamRepo;
    @Autowired
    private PasswordEncoder passwordEncoder;


    public UserDetails createUser(UserDetails user){
        //username to be unique
        if(userDetailsRepo.existsByUserName(user.getUserName())){
            throw new RuntimeException("Username already exists");
        }

        user.setPasswordHash(
                passwordEncoder.encode(user.getPasswordHash())
        );

        user.setActive(true);
        return userDetailsRepo.save(user);
    }

    public List<UserDetails>getAllUSers(){
        return userDetailsRepo.findAll();
    }

    public UserDetails getUserById(int userId){
        return userDetailsRepo.findById(userId).orElseThrow(
                ()->new RuntimeException("User not found with id "+ userId)
        );
    }

    public  List<UserDetails>getUsersByRole(Role role){
        return userDetailsRepo.findByRole(role);
    }

    public UserDetails deactivateUser(int userId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new RuntimeException("User not found")
        );
        //cannot deactivate the only librarian
        if(user.getRole() == Role.LIBRARIAN){
            long librarianCount = userDetailsRepo.findByRole(Role.LIBRARIAN).stream()
                    .filter(UserDetails::isActive).count();

            if(librarianCount <=1){
                throw new RuntimeException("Cannot deactivate the only librarian");
            }

        }
        user.setActive(false);
        return userDetailsRepo.save(user);
    }

    public UserDetails activateUser(int userId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new RuntimeException("User not found")
        );
        user.setActive(true);
        return userDetailsRepo.save(user);
    }

    public UserDetails assignStream(int userId,int streamId){
        UserDetails user = userDetailsRepo.findById(userId).orElseThrow(
                ()->new RuntimeException("User not found")
        );
        //only teachers get assigned streams
        if(user.getRole() != Role.TEACHER  ){
            throw new RuntimeException("Only teachers are assigned streams");
        }

        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new RuntimeException("Stream not found with id"+ streamId)
        );

        user.setStream(stream);
        return userDetailsRepo.save(user);
    }
}
