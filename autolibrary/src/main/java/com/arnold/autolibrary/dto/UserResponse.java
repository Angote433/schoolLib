package com.arnold.autolibrary.dto;

import com.arnold.autolibrary.model.Role;

public class UserResponse {
    private Long userID;
    private String userName;
    private Role role;

    public UserResponse(long userID, String userName, Role role){
        this.userID = userID;
        this.userName = userName;
        this.role = role;

    }
    public Long getUserID() {return userID;}
    public void setUserID(Long userID) {this.userID = userID;}

    public String getUserName() {return userName;}
    public void setUserName(String userName) {this.userName = userName;}

    public Role getRole() {return role;}
    public void setRole(Role role) {this.role = role;}
}
