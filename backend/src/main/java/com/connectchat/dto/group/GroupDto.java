package com.connectchat.dto.group;

import com.connectchat.dto.user.UserProfileDto;
import java.time.LocalDateTime;
import java.util.List;

public class GroupDto {
    private Long id;
    private String name;
    private String photo;
    private UserProfileDto createdBy;
    private List<UserProfileDto> members;
    private Long conversationId;
    private LocalDateTime createdAt;

    public GroupDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }

    public UserProfileDto getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserProfileDto createdBy) { this.createdBy = createdBy; }

    public List<UserProfileDto> getMembers() { return members; }
    public void setMembers(List<UserProfileDto> members) { this.members = members; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
