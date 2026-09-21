package com.example.connectchat.dto;

public class CreateUserRequest {

    private String fullName;
    private String username;
    private String email;
    private String bio;
    private String avatarUrl;
    private String bgWallpaper;
    private String password;

    public CreateUserRequest() {
    }

    public CreateUserRequest(String fullName, String username, String email, String bio, String avatarUrl, String bgWallpaper, String password) {
        this.fullName = fullName;
        this.username = username;
        this.email = email;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.bgWallpaper = bgWallpaper;
        this.password = password;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBgWallpaper() {
        return bgWallpaper;
    }

    public void setBgWallpaper(String bgWallpaper) {
        this.bgWallpaper = bgWallpaper;
    }
}
