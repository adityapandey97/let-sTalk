package com.example.connectchat.dto;

import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.ConnectionStatus;
import com.example.connectchat.model.User;
import java.time.LocalDateTime;

public class ConnectionResponseDto {
    private Long requestId;
    private UserDto user; // The other user in the connection
    private ConnectionStatus status;
    private LocalDateTime createdAt;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private String lastMessageStatus;
    private Long lastMessageSenderId;
    private long unreadCount;

    public ConnectionResponseDto() {
    }

    public ConnectionResponseDto(Long requestId, UserDto user, ConnectionStatus status, LocalDateTime createdAt) {
        this.requestId = requestId;
        this.user = user;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public UserDto getUser() {
        return user;
    }

    public void setUser(UserDto user) {
        this.user = user;
    }

    public ConnectionStatus getStatus() {
        return status;
    }

    public void setStatus(ConnectionStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public LocalDateTime getLastMessageTime() {
        return lastMessageTime;
    }

    public void setLastMessageTime(LocalDateTime lastMessageTime) {
        this.lastMessageTime = lastMessageTime;
    }

    public String getLastMessageStatus() {
        return lastMessageStatus;
    }

    public void setLastMessageStatus(String lastMessageStatus) {
        this.lastMessageStatus = lastMessageStatus;
    }

    public Long getLastMessageSenderId() {
        return lastMessageSenderId;
    }

    public void setLastMessageSenderId(Long lastMessageSenderId) {
        this.lastMessageSenderId = lastMessageSenderId;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
