package com.example.connectchat.service;

import com.example.connectchat.dto.CreateStoryRequest;
import com.example.connectchat.dto.StoryDto;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.MessageType;
import com.example.connectchat.model.Story;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.ConnectionRequestRepository;
import com.example.connectchat.repository.StoryRepository;
import com.example.connectchat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class StoryService {

    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
    private final ConnectionRequestRepository connectionRequestRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public StoryService(StoryRepository storyRepository,
                        UserRepository userRepository,
                        ConnectionRequestRepository connectionRequestRepository,
                        SimpMessagingTemplate messagingTemplate) {
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public StoryDto createStory(CreateStoryRequest request) {
        if (request.getUserId() == null) {
            throw new BadRequestException("User ID is required");
        }

        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));

        MessageType mediaType = request.getMediaType() != null ? request.getMediaType() : MessageType.IMAGE;
        
        if (mediaType == MessageType.TEXT && (request.getCaption() == null || request.getCaption().trim().isEmpty())) {
            throw new BadRequestException("Text status content is required");
        }

        Story story = new Story(
            user,
            mediaType,
            request.getMediaUrl(),
            request.getCaption() != null ? request.getCaption().trim() : "",
            request.getBackgroundColor()
        );

        Story saved = storyRepository.save(story);
        StoryDto dto = StoryDto.fromEntity(saved);

        // Notify connected users of new story
        List<ConnectionRequest> connections = connectionRequestRepository.findAllAcceptedConnectionsForUser(user.getId());
        for (ConnectionRequest cr : connections) {
            Long contactId = cr.getSender().getId().equals(user.getId()) ? cr.getReceiver().getId() : cr.getSender().getId();
            messagingTemplate.convertAndSend("/topic/user/" + contactId + "/stories", dto);
        }
        messagingTemplate.convertAndSend("/topic/user/" + user.getId() + "/stories", dto);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<StoryDto> getFeedStories(Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User ID is required");
        }

        userRepository.findById(currentUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + currentUserId));

        List<Long> eligibleUserIds = new ArrayList<>();
        eligibleUserIds.add(currentUserId);

        List<ConnectionRequest> connections = connectionRequestRepository.findAllAcceptedConnectionsForUser(currentUserId);
        for (ConnectionRequest cr : connections) {
            Long otherId = cr.getSender().getId().equals(currentUserId) ? cr.getReceiver().getId() : cr.getSender().getId();
            eligibleUserIds.add(otherId);
        }

        List<Story> activeStories = storyRepository.findActiveStoriesForUsers(eligibleUserIds, LocalDateTime.now());
        List<StoryDto> dtos = new ArrayList<>();
        for (Story s : activeStories) {
            dtos.add(StoryDto.fromEntity(s));
        }
        return dtos;
    }

    @Transactional
    public void deleteStory(Long storyId, Long currentUserId) {
        Story story = storyRepository.findById(storyId)
            .orElseThrow(() -> new ResourceNotFoundException("Story not found with id: " + storyId));

        if (!story.getUser().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to delete this story");
        }

        storyRepository.delete(story);
    }
}
