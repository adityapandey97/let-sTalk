package com.connectchat.service;

import com.connectchat.dto.story.CreateStoryRequest;
import com.connectchat.dto.story.StoryDto;
import com.connectchat.dto.story.StoryGroupDto;
import com.connectchat.entity.Story;
import com.connectchat.entity.StoryView;
import com.connectchat.entity.User;
import com.connectchat.enums.ConnectionStatus;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.exception.UnauthorizedException;
import com.connectchat.repository.ConnectionRepository;
import com.connectchat.repository.StoryRepository;
import com.connectchat.repository.StoryViewRepository;
import com.connectchat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class StoryService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final UserRepository userRepository;
    private final ConnectionRepository connectionRepository;
    private final FileService fileService;

    public StoryService(StoryRepository storyRepository,
                        StoryViewRepository storyViewRepository,
                        UserRepository userRepository,
                        ConnectionRepository connectionRepository,
                        FileService fileService) {
        this.storyRepository = storyRepository;
        this.storyViewRepository = storyViewRepository;
        this.userRepository = userRepository;
        this.connectionRepository = connectionRepository;
        this.fileService = fileService;
    }

    @Transactional
    public StoryDto createStory(Long userId, CreateStoryRequest request) {
        if (request.getMediaPath() == null || request.getMediaPath().trim().isEmpty()) {
            throw new BadRequestException("Media path is required for story.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        Story story = new Story(user, request.getMediaPath().trim(), request.getMediaType());
        Story saved = storyRepository.save(story);

        return toDto(saved, userId);
    }

    @Transactional(readOnly = true)
    public List<StoryGroupDto> getActiveStoriesGrouped(Long currentUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<Story> activeStories = storyRepository.findAllActiveStories(now);

        // Map userId -> List<Story>
        Map<Long, List<Story>> userStoriesMap = new LinkedHashMap<>();
        Map<Long, User> userMap = new HashMap<>();

        for (Story s : activeStories) {
            Long ownerId = s.getUser().getId();
            // Show own stories or stories of accepted connections
            if (ownerId.equals(currentUserId) || connectionRepository.areUsersConnected(currentUserId, ownerId, ConnectionStatus.ACCEPTED)) {
                userStoriesMap.computeIfAbsent(ownerId, k -> new ArrayList<>()).add(s);
                userMap.put(ownerId, s.getUser());
            }
        }

        List<StoryGroupDto> result = new ArrayList<>();
        StoryGroupDto ownGroup = null;

        for (Map.Entry<Long, List<Story>> entry : userStoriesMap.entrySet()) {
            Long ownerId = entry.getKey();
            List<Story> stories = entry.getValue();
            User owner = userMap.get(ownerId);

            StoryGroupDto groupDto = new StoryGroupDto();
            groupDto.setUserId(owner.getId());
            groupDto.setUsername(owner.getUsername());
            groupDto.setFullName(owner.getFullName());
            groupDto.setProfilePhoto(owner.getProfilePhoto());
            groupDto.setOwnStory(ownerId.equals(currentUserId));

            boolean hasUnviewed = false;
            List<StoryDto> storyDtos = new ArrayList<>();
            for (Story s : stories) {
                boolean viewed = storyViewRepository.existsByStoryIdAndViewerId(s.getId(), currentUserId);
                if (!viewed && !ownerId.equals(currentUserId)) {
                    hasUnviewed = true;
                }
                StoryDto sd = toDto(s, currentUserId);
                sd.setViewed(viewed);
                storyDtos.add(sd);
            }

            groupDto.setHasUnviewed(hasUnviewed);
            groupDto.setStories(storyDtos);

            if (ownerId.equals(currentUserId)) {
                ownGroup = groupDto;
            } else {
                result.add(groupDto);
            }
        }

        if (ownGroup != null) {
            result.add(0, ownGroup);
        }

        return result;
    }

    @Transactional
    public void markStoryViewed(Long storyId, Long viewerId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found."));

        if (!storyViewRepository.existsByStoryIdAndViewerId(storyId, viewerId)) {
            User viewer = userRepository.findById(viewerId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found."));
            StoryView view = new StoryView(story, viewer);
            storyViewRepository.save(view);
        }
    }

    @Transactional
    public void deleteStory(Long storyId, Long currentUserId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found."));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You can only delete your own stories.");
        }

        String mediaPath = story.getMediaPath();
        storyRepository.delete(story);
        fileService.deleteFile(mediaPath);
    }

    private StoryDto toDto(Story story, Long currentUserId) {
        StoryDto dto = new StoryDto();
        dto.setId(story.getId());
        dto.setUserId(story.getUser().getId());
        dto.setUsername(story.getUser().getUsername());
        dto.setFullName(story.getUser().getFullName());
        dto.setProfilePhoto(story.getUser().getProfilePhoto());
        dto.setMediaPath(story.getMediaPath());
        dto.setMediaType(story.getMediaType());
        dto.setCreatedAt(story.getCreatedAt());
        dto.setExpiresAt(story.getExpiresAt());
        dto.setViewed(storyViewRepository.existsByStoryIdAndViewerId(story.getId(), currentUserId));
        return dto;
    }
}
