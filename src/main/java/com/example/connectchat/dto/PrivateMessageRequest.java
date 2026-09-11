package com.example.connectchat.dto;

import com.example.connectchat.model.MessageType;

public class PrivateMessageRequest {
    private Long senderId;
    private Long receiverId;
    private String content;
    private MessageType messageType = MessageType.TEXT;
    private String mediaUrl;
    private String mediaMetadata;

    public PrivateMessageRequest() {
    }

    public PrivateMessageRequest(Long senderId, Long receiverId, String content, MessageType messageType, String mediaUrl, String mediaMetadata) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.messageType = messageType != null ? messageType : MessageType.TEXT;
        this.mediaUrl = mediaUrl;
        this.mediaMetadata = mediaMetadata;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public void setMessageType(MessageType messageType) {
        this.messageType = messageType;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaMetadata() {
        return mediaMetadata;
    }

    public void setMediaMetadata(String mediaMetadata) {
        this.mediaMetadata = mediaMetadata;
    }
}
