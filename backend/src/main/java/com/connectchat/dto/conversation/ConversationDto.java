package com.connectchat.dto.conversation;

import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.enums.ConversationType;
import java.time.LocalDateTime;
import java.util.List;

public class ConversationDto {
    private Long id;
    private ConversationType type;
    private String title;
    private String photoUrl;
    private UserProfileDto otherUser; // For PRIVATE conversations
    private String lastMessage;
    private String lastMessageType;
    private String lastMessageSenderName;
    private LocalDateTime lastMessageTime;
    private long unreadCount;
    private List<ConversationMemberDto> members;
    private LocalDateTime updatedAt;

    public ConversationDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ConversationType getType() { return type; }
    public void setType(ConversationType type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public UserProfileDto getOtherUser() { return otherUser; }
    public void setOtherUser(UserProfileDto otherUser) { this.otherUser = otherUser; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public String getLastMessageType() { return lastMessageType; }
    public void setLastMessageType(String lastMessageType) { this.lastMessageType = lastMessageType; }

    public String getLastMessageSenderName() { return lastMessageSenderName; }
    public void setLastMessageSenderName(String lastMessageSenderName) { this.lastMessageSenderName = lastMessageSenderName; }

    public LocalDateTime getLastMessageTime() { return lastMessageTime; }
    public void setLastMessageTime(LocalDateTime lastMessageTime) { this.lastMessageTime = lastMessageTime; }

    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }

    public List<ConversationMemberDto> getMembers() { return members; }
    public void setMembers(List<ConversationMemberDto> members) { this.members = members; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
