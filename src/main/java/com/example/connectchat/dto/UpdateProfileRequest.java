package com.example.connectchat.dto;

public class UpdateProfileRequest {
    private String fullName;
    private String bio;
    private String avatarUrl;
    private String bgWallpaper;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, String bio, String avatarUrl, String bgWallpaper) {
        this.fullName = fullName;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.bgWallpaper = bgWallpaper;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
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
