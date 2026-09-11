package com.example.connectchat.dto;

public class UserSearchResultDto {
    private Long id;
    private String fullName;
    private String username;
    private String bio;
    private String relationshipState; // NONE, OUTGOING_PENDING, INCOMING_PENDING, CONNECTED, REJECTED
    private Long requestId;

    public UserSearchResultDto() {
    }

    public UserSearchResultDto(Long id, String fullName, String username, String bio, String relationshipState, Long requestId) {
        this.id = id;
        this.fullName = fullName;
        this.username = username;
        this.bio = bio;
        this.relationshipState = relationshipState;
        this.requestId = requestId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getRelationshipState() {
        return relationshipState;
    }

    public void setRelationshipState(String relationshipState) {
        this.relationshipState = relationshipState;
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }
}
