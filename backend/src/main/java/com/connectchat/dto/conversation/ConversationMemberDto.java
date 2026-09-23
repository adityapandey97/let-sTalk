package com.connectchat.dto.conversation;

import com.connectchat.dto.user.UserProfileDto;
import java.time.LocalDateTime;

public class ConversationMemberDto {
    private Long id;
    private Long conversationId;
    private UserProfileDto user;
    private String role;
    private LocalDateTime joinedAt;

    public ConversationMemberDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public UserProfileDto getUser() { return user; }
    public void setUser(UserProfileDto user) { this.user = user; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
