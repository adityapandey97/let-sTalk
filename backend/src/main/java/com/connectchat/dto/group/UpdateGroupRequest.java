package com.connectchat.dto.group;

public class UpdateGroupRequest {
    private String name;
    private String photo;

    public UpdateGroupRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
}
