package com.example.connectchat.dto;

import java.util.List;

public class CreateGroupRequest {
    private Long creatorId;
    private String name;
    private List<Long> memberIds;

    public CreateGroupRequest() {
    }

    public CreateGroupRequest(Long creatorId, String name, List<Long> memberIds) {
        this.creatorId = creatorId;
        this.name = name;
        this.memberIds = memberIds;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Long> getMemberIds() {
        return memberIds;
    }

    public void setMemberIds(List<Long> memberIds) {
        this.memberIds = memberIds;
    }
}
