package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.dto.story.CreateStoryRequest;
import com.connectchat.dto.story.StoryDto;
import com.connectchat.dto.story.StoryGroupDto;
import com.connectchat.entity.User;
import com.connectchat.service.StoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final StoryService storyService;

    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @PostMapping
    public ResponseEntity<StoryDto> createStory(@AuthenticationPrincipal User currentUser,
                                                @RequestBody CreateStoryRequest request) {
        StoryDto story = storyService.createStory(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(story);
    }

    @GetMapping
    public ResponseEntity<List<StoryGroupDto>> getStories(@AuthenticationPrincipal User currentUser) {
        List<StoryGroupDto> stories = storyService.getActiveStoriesGrouped(currentUser.getId());
        return ResponseEntity.ok(stories);
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<ApiResponse> markStoryViewed(@PathVariable Long id,
                                                       @AuthenticationPrincipal User currentUser) {
        storyService.markStoryViewed(id, currentUser.getId());
        return ResponseEntity.ok(new ApiResponse(true, "Story marked as viewed"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteStory(@PathVariable Long id,
                                                   @AuthenticationPrincipal User currentUser) {
        storyService.deleteStory(id, currentUser.getId());
        return ResponseEntity.ok(new ApiResponse(true, "Story deleted successfully"));
    }
}
