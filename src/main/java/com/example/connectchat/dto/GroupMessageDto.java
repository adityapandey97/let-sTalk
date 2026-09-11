package com.example.connectchat.dto;

import com.example.connectchat.model.GroupMessage;
import java.time.LocalDateTime;

public class GroupMessageDto {
    private Long id;
    private Long groupId;
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private String content;
    private LocalDateTime sentAt;

    public GroupMessageDto() {
    }

    public GroupMessageDto(Long id, Long groupId, Long senderId, String senderUsername, String senderFullName, String content, LocalDateTime sentAt) {
        this.id = id;
        this.groupId = groupId;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.senderFullName = senderFullName;
        this.content = content;
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
            gm.getContent(),
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

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
