package com.example.connectchat.controller;

import com.example.connectchat.dto.CreateStoryRequest;
import com.example.connectchat.dto.StoryDto;
import com.example.connectchat.service.StoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final StoryService storyService;

    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @PostMapping
    public ResponseEntity<StoryDto> createStory(@RequestBody CreateStoryRequest request) {
        StoryDto created = storyService.createStory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/feed/{userId}")
    public ResponseEntity<List<StoryDto>> getStoriesFeed(@PathVariable("userId") Long userId) {
        List<StoryDto> stories = storyService.getFeedStories(userId);
        return ResponseEntity.ok(stories);
    }

    @DeleteMapping("/{storyId}")
    public ResponseEntity<Map<String, String>> deleteStory(@PathVariable("storyId") Long storyId,
                                                           @RequestParam("userId") Long userId) {
        storyService.deleteStory(storyId, userId);
        return ResponseEntity.ok(Map.of("message", "Story deleted successfully"));
    }
}
