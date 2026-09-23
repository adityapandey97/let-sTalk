package com.connectchat.dto.user;

import com.connectchat.entity.User;
import java.time.LocalDateTime;

public class UserProfileDto {
    private Long id;
    private String fullName;
    private String username;
    private String email;
    private String bio;
    private String profilePhoto;
    private Boolean online;
    private LocalDateTime lastSeen;

    public UserProfileDto() {}

    public UserProfileDto(User user) {
        if (user != null) {
            this.id = user.getId();
            this.fullName = user.getFullName();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.bio = user.getBio();
            this.profilePhoto = user.getProfilePhoto();
            this.online = user.getOnline();
            this.lastSeen = user.getLastSeen();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }

    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
}
