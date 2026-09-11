package com.example.connectchat.dto;

import com.example.connectchat.model.GroupMessage;
import com.example.connectchat.model.MessageType;
import java.time.LocalDateTime;

public class GroupMessageDto {
    private Long id;
    private Long groupId;
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private String senderAvatarUrl;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private String mediaMetadata;
    private LocalDateTime sentAt;

    public GroupMessageDto() {
    }

    public GroupMessageDto(Long id, Long groupId, Long senderId, String senderUsername, String senderFullName,
                           String senderAvatarUrl, String content, MessageType messageType, String mediaUrl,
                           String mediaMetadata, LocalDateTime sentAt) {
        this.id = id;
        this.groupId = groupId;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.senderFullName = senderFullName;
        this.senderAvatarUrl = senderAvatarUrl;
        this.content = content;
        this.messageType = messageType;
        this.mediaUrl = mediaUrl;
        this.mediaMetadata = mediaMetadata;
        this.sentAt = sentAt;
    }

    public static GroupMessageDto fromEntity(GroupMessage gm) {
        if (gm == null) return null;
        return new GroupMessageDto(
            gm.getId(),
            gm.getGroup().getId(),
            gm.getSender().getId(),
            gm.getSender().getUsername(),
            gm.getSender().getFullName(),
            gm.getSender().getAvatarUrl(),
            gm.getContent(),
            gm.getMessageType(),
            gm.getMediaUrl(),
            gm.getMediaMetadata(),
            gm.getSentAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getSenderFullName() {
        return senderFullName;
    }

    public void setSenderFullName(String senderFullName) {
        this.senderFullName = senderFullName;
    }

    public String getSenderAvatarUrl() {
        return senderAvatarUrl;
    }

    public void setSenderAvatarUrl(String senderAvatarUrl) {
        this.senderAvatarUrl = senderAvatarUrl;
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

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
