package com.example.connectchat.dto;

import com.example.connectchat.model.MessageType;
import com.example.connectchat.model.Story;
import java.time.LocalDateTime;

public class StoryDto {
    private Long id;
    private Long userId;
    private String username;
    private String userFullName;
    private String userAvatarUrl;
    private MessageType mediaType;
    private String mediaUrl;
    private String caption;
    private String backgroundColor;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public StoryDto() {
    }

    public StoryDto(Long id, Long userId, String username, String userFullName, String userAvatarUrl,
                    MessageType mediaType, String mediaUrl, String caption, String backgroundColor,
                    LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.userFullName = userFullName;
        this.userAvatarUrl = userAvatarUrl;
        this.mediaType = mediaType;
        this.mediaUrl = mediaUrl;
        this.caption = caption;
        this.backgroundColor = backgroundColor;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public static StoryDto fromEntity(Story story) {
        if (story == null) return null;
        return new StoryDto(
            story.getId(),
            story.getUser().getId(),
            story.getUser().getUsername(),
            story.getUser().getFullName(),
            story.getUser().getAvatarUrl(),
            story.getMediaType(),
            story.getMediaUrl(),
            story.getCaption(),
            story.getBackgroundColor(),
            story.getCreatedAt(),
            story.getExpiresAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getUserAvatarUrl() {
        return userAvatarUrl;
    }

    public void setUserAvatarUrl(String userAvatarUrl) {
        this.userAvatarUrl = userAvatarUrl;
    }

    public MessageType getMediaType() {
        return mediaType;
    }

    public void setMediaType(MessageType mediaType) {
        this.mediaType = mediaType;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getBackgroundColor() {
        return backgroundColor;
    }

    public void setBackgroundColor(String backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
