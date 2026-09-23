package com.connectchat.dto.message;

import com.connectchat.entity.Attachment;
import com.connectchat.entity.Message;
import com.connectchat.enums.MessageStatus;
import com.connectchat.enums.MessageType;
import java.time.LocalDateTime;

public class MessageDto {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderPhoto;
    private String content;
    private MessageType type;
    private MessageStatus status;
    private Long replyToMessageId;
    private String replyToSenderName;
    private String replyToContent;
    private Boolean deletedForEveryone;
    private String mediaUrl;
    private String fileName;
    private Long fileSize;
    private java.util.List<AttachmentDto> attachments = new java.util.ArrayList<>();
    private LocalDateTime createdAt;

    public MessageDto() {}

    public MessageDto(Message msg) {
        if (msg != null) {
            this.id = msg.getId();
            this.conversationId = msg.getConversation() != null ? msg.getConversation().getId() : null;
            if (msg.getSender() != null) {
                this.senderId = msg.getSender().getId();
                this.senderName = msg.getSender().getFullName();
                this.senderPhoto = msg.getSender().getProfilePhoto();
            }
            this.deletedForEveryone = msg.getDeletedForEveryone();
            if (Boolean.TRUE.equals(this.deletedForEveryone)) {
                this.content = "This message was deleted.";
                this.type = MessageType.TEXT;
            } else {
                this.content = msg.getContent();
                this.type = msg.getType();
            }
            this.status = msg.getStatus();
            if (msg.getReplyToMessage() != null) {
                this.replyToMessageId = msg.getReplyToMessage().getId();
                if (Boolean.TRUE.equals(msg.getReplyToMessage().getDeletedForEveryone())) {
                    this.replyToContent = "Original message deleted";
                } else {
                    this.replyToContent = msg.getReplyToMessage().getContent();
                }
                if (msg.getReplyToMessage().getSender() != null) {
                    this.replyToSenderName = msg.getReplyToMessage().getSender().getFullName();
                }
            }
            if (msg.getAttachments() != null && !msg.getAttachments().isEmpty() && !Boolean.TRUE.equals(this.deletedForEveryone)) {
                for (Attachment att : msg.getAttachments()) {
                    this.attachments.add(new AttachmentDto(att));
                }
                Attachment att = msg.getAttachments().get(0);
                this.mediaUrl = att.getFilePath();
                this.fileName = att.getOriginalName();
                this.fileSize = att.getFileSize();
            }
            this.createdAt = msg.getCreatedAt();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderPhoto() { return senderPhoto; }
    public void setSenderPhoto(String senderPhoto) { this.senderPhoto = senderPhoto; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public MessageStatus getStatus() { return status; }
    public void setStatus(MessageStatus status) { this.status = status; }

    public Long getReplyToMessageId() { return replyToMessageId; }
    public void setReplyToMessageId(Long replyToMessageId) { this.replyToMessageId = replyToMessageId; }

    public String getReplyToSenderName() { return replyToSenderName; }
    public void setReplyToSenderName(String replyToSenderName) { this.replyToSenderName = replyToSenderName; }

    public String getReplyToContent() { return replyToContent; }
    public void setReplyToContent(String replyToContent) { this.replyToContent = replyToContent; }

    public Boolean getDeletedForEveryone() { return deletedForEveryone; }
    public void setDeletedForEveryone(Boolean deletedForEveryone) { this.deletedForEveryone = deletedForEveryone; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public java.util.List<AttachmentDto> getAttachments() { return attachments; }
    public void setAttachments(java.util.List<AttachmentDto> attachments) { this.attachments = attachments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
