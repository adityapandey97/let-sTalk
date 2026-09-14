package com.example.connectchat.dto;

public class VerifyOtpRequest {
    private String email;
    private String identifier;
    private String code;

    public VerifyOtpRequest() {
    }

    public VerifyOtpRequest(String email, String code) {
        this.email = email;
        this.identifier = email;
        this.code = code;
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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
