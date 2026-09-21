package com.example.connectchat.dto;

import com.example.connectchat.model.GroupMember;
import java.time.LocalDateTime;

public class GroupMemberDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String username;
    private LocalDateTime joinedAt;

    public GroupMemberDto() {
    }

    public GroupMemberDto(Long id, Long userId, String fullName, String username, LocalDateTime joinedAt) {
        this.id = id;
        this.userId = userId;
        this.fullName = fullName;
        this.username = username;
        this.joinedAt = joinedAt;
    }

    public static GroupMemberDto fromEntity(GroupMember member) {
        if (member == null) return null;
        return new GroupMemberDto(
            member.getId(),
            member.getUser().getId(),
            member.getUser().getFullName(),
            member.getUser().getUsername(),
            member.getJoinedAt()
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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
}
