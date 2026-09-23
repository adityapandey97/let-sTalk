package com.connectchat.dto.connection;

import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.enums.ConnectionStatus;
import java.time.LocalDateTime;

public class ConnectionDto {
    private Long id;
    private UserProfileDto user; // The other user in the connection
    private ConnectionStatus status;
    private Boolean isSender;
    private LocalDateTime createdAt;

    public ConnectionDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UserProfileDto getUser() { return user; }
    public void setUser(UserProfileDto user) { this.user = user; }

    public ConnectionStatus getStatus() { return status; }
    public void setStatus(ConnectionStatus status) { this.status = status; }

    public Boolean getIsSender() { return isSender; }
    public void setIsSender(Boolean isSender) { this.isSender = isSender; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
