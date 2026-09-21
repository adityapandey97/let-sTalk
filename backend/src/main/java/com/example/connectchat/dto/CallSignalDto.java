package com.example.connectchat.dto;

/**
 * Data Transfer Object for WebRTC Audio & Video Calling signaling.
 * Transferred through WebSocket STOMP between caller and callee to exchange
 * SDP offers, SDP answers, ICE candidates, and call lifecycle states (ring, accept, reject, end).
 */
public class CallSignalDto {

    /**
     * Signal type: "OFFER", "ANSWER", "ICE_CANDIDATE", "CALL_REQUEST", "CALL_REJECT", "CALL_END", "CALL_BUSY"
     */
    private String type;

    private Long senderId;
    private String senderName;
    private String senderAvatar;

    private Long receiverId;

    /**
     * Call medium: "audio" or "video"
     */
    private String callType;

    /**
     * SDP payload (offer/answer object) or ICE candidate payload
     */
    private Object payload;

    private long timestamp = System.currentTimeMillis();

    public CallSignalDto() {
    }

    public CallSignalDto(String type, Long senderId, Long receiverId) {
        this.type = type;
        this.senderId = senderId;
        this.receiverId = receiverId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderAvatar() {
        return senderAvatar;
    }

    public void setSenderAvatar(String senderAvatar) {
        this.senderAvatar = senderAvatar;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getCallType() {
        return callType;
    }

    public void setCallType(String callType) {
        this.callType = callType;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
