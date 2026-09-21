package com.example.connectchat.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_msg_sender_receiver", columnList = "sender_id, receiver_id"),
    @Index(name = "idx_msg_sent_at", columnList = "sent_at"),
    @Index(name = "idx_msg_status", columnList = "status")
})
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(name = "content", length = 4000, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private MessageType messageType = MessageType.TEXT;

    @Column(name = "media_url", columnDefinition = "LONGTEXT")
    private String mediaUrl;

    @Column(name = "media_metadata", columnDefinition = "TEXT")
    private String mediaMetadata;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MessageStatus status;

    public Message() {
    }

    public Message(User sender, User receiver, String content, MessageType messageType, String mediaUrl, String mediaMetadata, MessageStatus status) {
        this.sender = sender;
        this.receiver = receiver;
        this.content = content;
        this.messageType = messageType != null ? messageType : MessageType.TEXT;
        this.mediaUrl = mediaUrl;
        this.mediaMetadata = mediaMetadata;
        this.status = status;
        this.sentAt = LocalDateTime.now();
    }

    public Message(User sender, User receiver, String content, MessageStatus status) {
        this(sender, receiver, content, MessageType.TEXT, null, null, status);
    }

    @PrePersist
    protected void onCreate() {
        if (this.sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = MessageStatus.SENT;
        }
        if (this.messageType == null) {
            this.messageType = MessageType.TEXT;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public User getReceiver() {
        return receiver;
    }

    public void setReceiver(User receiver) {
        this.receiver = receiver;
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
