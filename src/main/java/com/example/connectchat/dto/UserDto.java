package com.example.connectchat.dto;

import com.example.connectchat.model.User;
import java.time.LocalDateTime;

public class UserDto {

    private Long id;
    private String fullName;
    private String username;
    private String email;
    private boolean emailVerified;
    private String bio;
    private String avatarUrl;
    private String bgWallpaper;
    private boolean online;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;

    public UserDto() {
    }

    public UserDto(Long id, String fullName, String username, String email, boolean emailVerified,
                   String bio, String avatarUrl, String bgWallpaper, boolean online,
                   LocalDateTime lastSeen, LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.username = username;
        this.email = email;
        this.emailVerified = emailVerified;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.bgWallpaper = bgWallpaper;
        this.online = online;
        this.lastSeen = lastSeen;
        this.createdAt = createdAt;
    }

    public static UserDto fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return new UserDto(
            user.getId(),
            user.getFullName(),
            user.getUsername(),
            user.getEmail(),
            user.isEmailVerified(),
            user.getBio(),
            user.getAvatarUrl(),
            user.getBgWallpaper(),
            user.isOnline(),
            user.getLastSeen(),
            user.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
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

    public boolean isOnline() {
        return online;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public LocalDateTime getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(LocalDateTime lastSeen) {
        this.lastSeen = lastSeen;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
