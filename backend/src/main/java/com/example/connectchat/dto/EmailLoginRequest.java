package com.example.connectchat.dto;

public class EmailLoginRequest {
    private String identifier; // Email or Username
    private String password;

    public EmailLoginRequest() {
    }

    public EmailLoginRequest(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
