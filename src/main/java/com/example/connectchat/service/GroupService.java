package com.example.connectchat.service;

import com.example.connectchat.dto.*;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.ChatGroup;
import com.example.connectchat.model.GroupMember;
import com.example.connectchat.model.GroupMessage;
import com.example.connectchat.model.MessageType;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final UserRepository userRepository;
    private final ConnectionRequestRepository connectionRequestRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public GroupService(ChatGroupRepository chatGroupRepository,
                        GroupMemberRepository groupMemberRepository,
                        GroupMessageRepository groupMessageRepository,
                        UserRepository userRepository,
                        ConnectionRequestRepository connectionRequestRepository,
                        SimpMessagingTemplate messagingTemplate) {
        this.chatGroupRepository = chatGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public GroupDto createGroup(CreateGroupRequest request) {
        if (request.getCreatorId() == null) {
            throw new BadRequestException("Creator ID is required");
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Group name cannot be empty");
        }

        User creator = userRepository.findById(request.getCreatorId())
            .orElseThrow(() -> new ResourceNotFoundException("Creator not found with id: " + request.getCreatorId()));

        ChatGroup group = new ChatGroup(request.getName().trim(), creator);
        ChatGroup savedGroup = chatGroupRepository.save(group);

        // Add creator as first member
        Set<Long> uniqueMemberIds = new HashSet<>();
        uniqueMemberIds.add(creator.getId());

        groupMemberRepository.save(new GroupMember(savedGroup, creator));

        // Add selected members who are accepted connections of the creator
        if (request.getMemberIds() != null) {
            for (Long memberId : request.getMemberIds()) {
                if (memberId != null && !uniqueMemberIds.contains(memberId)) {
                    // Check if member is an accepted connection of creator
                    boolean isConnected = connectionRequestRepository.findAcceptedConnectionBetween(creator.getId(), memberId).isPresent();
                    if (isConnected) {
                        userRepository.findById(memberId).ifPresent(memberUser -> {
                            uniqueMemberIds.add(memberId);
                            groupMemberRepository.save(new GroupMember(savedGroup, memberUser));

                            // Notify member about group creation
                            NotificationDto notif = new NotificationDto("GROUP_CREATED", "You were added to group '" + savedGroup.getName() + "'");
                            messagingTemplate.convertAndSend("/topic/user/" + memberId + "/notifications", notif);
                        });
                    }
                }
            }
        }

        return GroupDto.fromEntity(savedGroup, uniqueMemberIds.size());
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getGroupsForUser(Long userId) {
        if (userId == null) {
            throw new BadRequestException("User ID is required");
        }

        List<ChatGroup> groups = chatGroupRepository.findGroupsByUserId(userId);
        List<GroupDto> dtos = new ArrayList<>();

        for (ChatGroup g : groups) {
            List<GroupMember> members = groupMemberRepository.findByGroupIdOrderByJoinedAtAsc(g.getId());
            GroupDto dto = GroupDto.fromEntity(g, members.size());

            // Fetch last group message
            Optional<GroupMessage> lastMsgOpt = groupMessageRepository.findLastMessageInGroup(g.getId());
            if (lastMsgOpt.isPresent()) {
                GroupMessage lastMsg = lastMsgOpt.get();
                dto.setLastMessage(lastMsg.getContent());
                dto.setLastMessageSenderName(lastMsg.getSender().getFullName());
                dto.setLastMessageTime(lastMsg.getSentAt());
            }

            dtos.add(dto);
        }

        // Sort by last message time if available, otherwise by creation time
        dtos.sort((a, b) -> {
            if (a.getLastMessageTime() != null && b.getLastMessageTime() != null) {
                return b.getLastMessageTime().compareTo(a.getLastMessageTime());
            }
            if (a.getLastMessageTime() != null) return -1;
            if (b.getLastMessageTime() != null) return 1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        return dtos;
    }

    @Transactional(readOnly = true)
    public GroupDto getGroupDetails(Long groupId, Long userId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!isMember) {
            throw new UnauthorizedException("Unauthorized: You are not a member of this group");
        }

        List<GroupMember> members = groupMemberRepository.findByGroupIdOrderByJoinedAtAsc(groupId);
        return GroupDto.fromEntity(group, members.size());
    }

    @Transactional(readOnly = true)
    public List<GroupMemberDto> getGroupMembers(Long groupId, Long userId) {
        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!isMember) {
            throw new UnauthorizedException("Unauthorized: You are not a member of this group");
        }

        return groupMemberRepository.findByGroupIdOrderByJoinedAtAsc(groupId)
            .stream()
            .map(GroupMemberDto::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional
    public GroupMessageDto sendGroupMessage(GroupMessageDto messageDto) {
        if (messageDto.getGroupId() == null || messageDto.getSenderId() == null) {
            throw new BadRequestException("Group ID and Sender ID are required");
        }

        MessageType type = messageDto.getMessageType() != null ? messageDto.getMessageType() : MessageType.TEXT;

        String content = messageDto.getContent();
        if (type == MessageType.TEXT && (content == null || content.trim().isEmpty())) {
            throw new BadRequestException("Message content cannot be empty");
        }
        if (content == null) {
            content = "";
        }

        if (content.length() > 4000) {
            throw new BadRequestException("Message exceeds maximum length of 4000 characters");
        }

        ChatGroup group = chatGroupRepository.findById(messageDto.getGroupId())
            .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + messageDto.getGroupId()));

        User sender = userRepository.findById(messageDto.getSenderId())
            .orElseThrow(() -> new ResourceNotFoundException("Sender not found with id: " + messageDto.getSenderId()));

        // Verify sender is a member of the group
        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(group.getId(), sender.getId());
        if (!isMember) {
            throw new UnauthorizedException("Unauthorized: You cannot send messages to a group you are not a member of");
        }

        GroupMessage message = new GroupMessage(
            group,
            sender,
            content.trim(),
            type,
            messageDto.getMediaUrl(),
            messageDto.getMediaMetadata()
        );
        GroupMessage saved = groupMessageRepository.save(message);

        GroupMessageDto broadcastDto = GroupMessageDto.fromEntity(saved);

        // Broadcast to all members listening to the group topic
        messagingTemplate.convertAndSend("/topic/group/" + group.getId(), broadcastDto);

        return broadcastDto;
    }

    @Transactional(readOnly = true)
    public List<GroupMessageDto> getGroupMessages(Long groupId, Long userId) {
        if (groupId == null || userId == null) {
            throw new BadRequestException("Group ID and User ID are required");
        }

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!isMember) {
            throw new UnauthorizedException("Unauthorized: You are not a member of this group");
        }

        return groupMessageRepository.findByGroupIdOrderBySentAtAsc(groupId)
            .stream()
            .map(GroupMessageDto::fromEntity)
            .collect(Collectors.toList());
    }
}
