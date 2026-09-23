package com.connectchat.dto.story;

import java.util.List;

public class StoryGroupDto {
    private Long userId;
    private String username;
    private String fullName;
    private String profilePhoto;
    private boolean isOwnStory;
    private boolean hasUnviewed;
    private List<StoryDto> stories;

    public StoryGroupDto() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public boolean isOwnStory() { return isOwnStory; }
    public void setOwnStory(boolean ownStory) { isOwnStory = ownStory; }

    public boolean isHasUnviewed() { return hasUnviewed; }
    public void setHasUnviewed(boolean hasUnviewed) { this.hasUnviewed = hasUnviewed; }

    public List<StoryDto> getStories() { return stories; }
    public void setStories(List<StoryDto> stories) { this.stories = stories; }
}
