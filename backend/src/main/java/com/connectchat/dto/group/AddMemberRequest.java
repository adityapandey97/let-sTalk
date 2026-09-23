package com.connectchat.dto.group;

public class AddMemberRequest {
    private Long userId;

    public AddMemberRequest() {}

    public AddMemberRequest(Long userId) {
        this.userId = userId;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}
