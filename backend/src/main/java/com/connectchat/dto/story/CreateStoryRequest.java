package com.connectchat.dto.story;

public class CreateStoryRequest {
    private String mediaPath;
    private String mediaType; // IMAGE or VIDEO

    public CreateStoryRequest() {}

    public CreateStoryRequest(String mediaPath, String mediaType) {
        this.mediaPath = mediaPath;
        this.mediaType = mediaType;
    }

    public String getMediaPath() { return mediaPath; }
    public void setMediaPath(String mediaPath) { this.mediaPath = mediaPath; }

    public String getMediaType() { return mediaType; }
    public void setMediaType(String mediaType) { this.mediaType = mediaType; }
}
