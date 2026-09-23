package com.connectchat.dto.call;

public class CallSignalDto {
    private String type; // CALL_OFFER, CALL_ANSWER, ICE_CANDIDATE, CALL_ACCEPTED, CALL_REJECTED, CALL_ENDED
    private String callType; // AUDIO, VIDEO
    private Long senderId;
    private String senderName;
    private String senderPhoto;
    private Long receiverId;
    private Object payload; // SDP offer/answer or ICE candidate
    private Long callId;

    public CallSignalDto() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCallType() { return callType; }
    public void setCallType(String callType) { this.callType = callType; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderPhoto() { return senderPhoto; }
    public void setSenderPhoto(String senderPhoto) { this.senderPhoto = senderPhoto; }

    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }

    public Long getCallId() { return callId; }
    public void setCallId(Long callId) { this.callId = callId; }
}
