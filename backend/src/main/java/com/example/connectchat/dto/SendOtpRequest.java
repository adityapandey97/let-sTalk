package com.example.connectchat.dto;

public class SendOtpRequest {
    private String email;
    private String identifier;

    public SendOtpRequest() {
    }

    public SendOtpRequest(String email) {
        this.email = email;
        this.identifier = email;
    }

    public String getEmail() {
        return email != null && !email.trim().isEmpty() ? email : identifier;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getIdentifier() {
        return identifier != null && !identifier.trim().isEmpty() ? identifier : email;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}
