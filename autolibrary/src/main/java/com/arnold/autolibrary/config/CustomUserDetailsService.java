package com.arnold.autolibrary.config;

import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserDetailsRepo userDetailsRepository;


    @Override
    public org.springframework.security.core.userdetails.UserDetails
    loadUserByUsername(String username)
            throws UsernameNotFoundException {

        // Find the user in your database by username
        UserDetails user = userDetailsRepository
                .findByUserName(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found: " + username
                ));

        // Spring Security needs its own UserDetails format
        // not your custom UserDetails model class
        // So we convert here using Spring's built in User builder
        return new User(
                user.getUserName(),
                user.getPasswordHash(),

                // Convert your Role enum to a Spring Security authority
                // The ROLE_ prefix is required by Spring Security
                List.of(new SimpleGrantedAuthority(
                        "ROLE_" + user.getRole().name()
                ))
        );
    }
}