package com.example.connectchat.dto;

public class EmailLoginRequest {
    private String identifier; // Email or Username

    public EmailLoginRequest() {
    }

    public EmailLoginRequest(String identifier) {
        this.identifier = identifier;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}
