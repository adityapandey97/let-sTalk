package com.example.connectchat.dto;

import com.example.connectchat.model.MessageStatus;
import java.util.List;

public class MessageStatusUpdateRequest {
    private Long userId; // The receiver acknowledging status
    private Long senderId; // The user whose messages are being updated
    private Long messageId; // Single message id if applicable
    private List<Long> messageIds; // List of message IDs if batch
    private MessageStatus status; // DELIVERED or READ

    public MessageStatusUpdateRequest() {
    }

    public MessageStatusUpdateRequest(Long userId, Long senderId, Long messageId, MessageStatus status) {
        this.userId = userId;
        this.senderId = senderId;
        this.messageId = messageId;
        this.status = status;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public List<Long> getMessageIds() {
        return messageIds;
    }

    public void setMessageIds(List<Long> messageIds) {
        this.messageIds = messageIds;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }
}
