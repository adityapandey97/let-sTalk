package com.example.connectchat.dto;

import com.example.connectchat.model.ChatGroup;
import java.time.LocalDateTime;

public class GroupDto {
    private Long id;
    private String name;
    private Long createdById;
    private String createdByUsername;
    private LocalDateTime createdAt;
    private int memberCount;
    private String lastMessage;
    private String lastMessageSenderName;
    private LocalDateTime lastMessageTime;

    public GroupDto() {
    }

    public GroupDto(Long id, String name, Long createdById, String createdByUsername, LocalDateTime createdAt, int memberCount) {
        this.id = id;
        this.name = name;
        this.createdById = createdById;
        this.createdByUsername = createdByUsername;
        this.createdAt = createdAt;
        this.memberCount = memberCount;
    }

    public static GroupDto fromEntity(ChatGroup group, int memberCount) {
        if (group == null) return null;
        return new GroupDto(
            group.getId(),
            group.getName(),
            group.getCreatedBy().getId(),
            group.getCreatedBy().getUsername(),
            group.getCreatedAt(),
            memberCount
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getCreatedById() {
        return createdById;
    }

    public void setCreatedById(Long createdById) {
        this.createdById = createdById;
    }

    public String getCreatedByUsername() {
        return createdByUsername;
    }

    public void setCreatedByUsername(String createdByUsername) {
        this.createdByUsername = createdByUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public int getMemberCount() {
        return memberCount;
    }

    public void setMemberCount(int memberCount) {
        this.memberCount = memberCount;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public String getLastMessageSenderName() {
        return lastMessageSenderName;
    }

    public void setLastMessageSenderName(String lastMessageSenderName) {
        this.lastMessageSenderName = lastMessageSenderName;
    }

    public LocalDateTime getLastMessageTime() {
        return lastMessageTime;
    }

    public void setLastMessageTime(LocalDateTime lastMessageTime) {
        this.lastMessageTime = lastMessageTime;
    }
}
