package com.example.connectchat.dto;

public class CreateUserRequest {
    private String fullName;
    private String username;
    private String bio;

    public CreateUserRequest() {
    }

    public CreateUserRequest(String fullName, String username, String bio) {
        this.fullName = fullName;
        this.username = username;
        this.bio = bio;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
