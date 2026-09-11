package com.example.connectchat.dto;

import com.example.connectchat.model.MessageType;

public class CreateStoryRequest {
    private Long userId;
    private MessageType mediaType = MessageType.IMAGE;
    private String mediaUrl;
    private String caption;
    private String backgroundColor;

    public CreateStoryRequest() {
    }

    public CreateStoryRequest(Long userId, MessageType mediaType, String mediaUrl, String caption, String backgroundColor) {
        this.userId = userId;
        this.mediaType = mediaType != null ? mediaType : MessageType.IMAGE;
        this.mediaUrl = mediaUrl;
        this.caption = caption;
        this.backgroundColor = backgroundColor;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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
}
