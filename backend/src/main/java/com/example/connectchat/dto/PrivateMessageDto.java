package com.example.connectchat.dto;

import com.example.connectchat.model.Message;
import com.example.connectchat.model.MessageStatus;
import com.example.connectchat.model.MessageType;
import java.time.LocalDateTime;

public class PrivateMessageDto {
    private Long id;
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private String senderAvatarUrl;
    private Long receiverId;
    private String receiverUsername;
    private String receiverFullName;
    private String receiverAvatarUrl;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private String mediaMetadata;
    private LocalDateTime sentAt;
    private MessageStatus status;

    public PrivateMessageDto() {
    }

    public PrivateMessageDto(Long id, Long senderId, String senderUsername, String senderFullName, String senderAvatarUrl,
                             Long receiverId, String receiverUsername, String receiverFullName, String receiverAvatarUrl,
                             String content, MessageType messageType, String mediaUrl, String mediaMetadata,
                             LocalDateTime sentAt, MessageStatus status) {
        this.id = id;
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.senderFullName = senderFullName;
        this.senderAvatarUrl = senderAvatarUrl;
        this.receiverId = receiverId;
        this.receiverUsername = receiverUsername;
        this.receiverFullName = receiverFullName;
        this.receiverAvatarUrl = receiverAvatarUrl;
        this.content = content;
        this.messageType = messageType;
        this.mediaUrl = mediaUrl;
        this.mediaMetadata = mediaMetadata;
        this.sentAt = sentAt;
        this.status = status;
    }

    public static PrivateMessageDto fromEntity(Message message) {
        if (message == null) return null;
        return new PrivateMessageDto(
            message.getId(),
            message.getSender().getId(),
            message.getSender().getUsername(),
            message.getSender().getFullName(),
            message.getSender().getAvatarUrl(),
            message.getReceiver().getId(),
            message.getReceiver().getUsername(),
            message.getReceiver().getFullName(),
            message.getReceiver().getAvatarUrl(),
            message.getContent(),
            message.getMessageType(),
            message.getMediaUrl(),
            message.getMediaMetadata(),
            message.getSentAt(),
            message.getStatus()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }

    public String getReceiverFullName() {
        return receiverFullName;
    }

    public void setReceiverFullName(String receiverFullName) {
        this.receiverFullName = receiverFullName;
    }

    public String getReceiverAvatarUrl() {
        return receiverAvatarUrl;
    }

    public void setReceiverAvatarUrl(String receiverAvatarUrl) {
        this.receiverAvatarUrl = receiverAvatarUrl;
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

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }
}
