package com.connectchat.dto.connection;

public class ConnectionRequestDto {
    private Long targetUserId;
    private Long receiverId;

    public ConnectionRequestDto() {}

    public ConnectionRequestDto(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public Long getTargetUserId() {
        return targetUserId != null ? targetUserId : receiverId;
    }

    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public Long getReceiverId() {
        return receiverId != null ? receiverId : targetUserId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }
}
