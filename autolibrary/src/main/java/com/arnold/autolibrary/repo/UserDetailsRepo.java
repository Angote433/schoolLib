package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.UserDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDetailsRepo extends JpaRepository<UserDetails,Integer> {
    //May or may not exist
    Optional<UserDetails> findByUserName(String userName);

    //active users
    List<UserDetails>findByIsActive(boolean isActive);
    List<UserDetails>findByRoleAndIsActive(Role role,boolean isActive);

    //username exists?
    boolean existsByUserName(String userName);


    List<UserDetails> findByRole(Role role);

}
