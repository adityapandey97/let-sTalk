package com.connectchat.dto.message;

import com.connectchat.enums.MessageStatus;

public class MessageStatusUpdateDto {
    private Long messageId;
    private Long conversationId;
    private Long userId;
    private MessageStatus status;

    public MessageStatusUpdateDto() {}

    public MessageStatusUpdateDto(Long messageId, Long conversationId, Long userId, MessageStatus status) {
        this.messageId = messageId;
        this.conversationId = conversationId;
        this.userId = userId;
        this.status = status;
    }

    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public MessageStatus getStatus() { return status; }
    public void setStatus(MessageStatus status) { this.status = status; }
}
