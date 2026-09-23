package com.connectchat.service;

import com.connectchat.dto.group.CreateGroupRequest;
import com.connectchat.dto.group.GroupDto;
import com.connectchat.dto.group.UpdateGroupRequest;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.entity.*;
import com.connectchat.enums.ConnectionStatus;
import com.connectchat.enums.ConversationType;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.exception.UnauthorizedException;
import com.connectchat.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ConnectionRepository connectionRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;

    public GroupService(GroupRepository groupRepository,
                        GroupMemberRepository groupMemberRepository,
                        UserRepository userRepository,
                        ConnectionRepository connectionRepository,
                        ConversationRepository conversationRepository,
                        ConversationMemberRepository conversationMemberRepository) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.connectionRepository = connectionRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
    }

    @Transactional
    public GroupDto createGroup(Long creatorId, CreateGroupRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Group name cannot be empty.");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found."));

        Group group = new Group(request.getName().trim(), request.getPhoto(), creator);
        Group savedGroup = groupRepository.save(group);

        // Add creator as member
        GroupMember creatorMember = new GroupMember(savedGroup, creator);
        groupMemberRepository.save(creatorMember);
        savedGroup.getMembers().add(creatorMember);

        // Create unified Conversation for the group
        Conversation conversation = new Conversation(ConversationType.GROUP, savedGroup.getName(), savedGroup.getPhoto(), creator);
        Conversation savedConversation = conversationRepository.save(conversation);

        ConversationMember cmCreator = new ConversationMember(savedConversation, creator, "ADMIN");
        conversationMemberRepository.save(cmCreator);

        // Add valid initial members (must be connected users)
        if (request.getMemberIds() != null) {
            for (Long memberId : request.getMemberIds()) {
                if (memberId.equals(creatorId)) continue;

                boolean isConnected = connectionRepository.areUsersConnected(creatorId, memberId, ConnectionStatus.ACCEPTED);
                if (isConnected) {
                    userRepository.findById(memberId).ifPresent(user -> {
                        GroupMember gm = new GroupMember(savedGroup, user);
                        groupMemberRepository.save(gm);
                        savedGroup.getMembers().add(gm);

                        ConversationMember cm = new ConversationMember(savedConversation, user, "MEMBER");
                        conversationMemberRepository.save(cm);
                    });
                }
            }
        }

        return toDto(savedGroup, savedConversation.getId());
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getUserGroups(Long userId) {
        List<Group> groups = groupRepository.findGroupsByUserId(userId);
        List<GroupDto> dtos = new ArrayList<>();
        for (Group g : groups) {
            Long convId = findConversationIdForGroup(g);
            dtos.add(toDto(g, convId));
        }
        return dtos;
    }

    @Transactional(readOnly = true)
    public GroupDto getGroupById(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this group.");
        }

        Long convId = findConversationIdForGroup(group);
        return toDto(group, convId);
    }

    @Transactional
    public GroupDto updateGroup(Long groupId, Long userId, UpdateGroupRequest request) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (!group.getCreatedBy().getId().equals(userId)) {
            throw new UnauthorizedException("Only the group creator can update group details.");
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            group.setName(request.getName().trim());
        }
        if (request.getPhoto() != null) {
            group.setPhoto(request.getPhoto().trim());
        }

        Group saved = groupRepository.save(group);

        // Update conversation title / photo
        Long convId = findConversationIdForGroup(saved);
        if (convId != null) {
            conversationRepository.findById(convId).ifPresent(c -> {
                c.setTitle(saved.getName());
                c.setPhotoUrl(saved.getPhoto());
                conversationRepository.save(c);
            });
        }

        return toDto(saved, convId);
    }

    @Transactional
    public GroupDto addMember(Long groupId, Long userId, Long memberIdToAdd) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found."));

        boolean isRequesterMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!isRequesterMember) {
            throw new UnauthorizedException("Only group members can add new participants.");
        }

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, memberIdToAdd)) {
            throw new BadRequestException("User is already a member of this group.");
        }

        boolean isConnected = connectionRepository.areUsersConnected(userId, memberIdToAdd, ConnectionStatus.ACCEPTED);
        if (!isConnected) {
            throw new BadRequestException("You can only add users who are in your connections.");
        }

        User newMember = userRepository.findById(memberIdToAdd)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        GroupMember gm = new GroupMember(group, newMember);
        groupMemberRepository.save(gm);
        group.getMembers().add(gm);

        Long convId = findConversationIdForGroup(group);
        if (convId != null) {
            conversationRepository.findById(convId).ifPresent(c -> {
                if (!conversationMemberRepository.existsByConversationIdAndUserId(convId, memberIdToAdd)) {
                    ConversationMember cm = new ConversationMember(c, newMember, "MEMBER");
                    conversationMemberRepository.save(cm);
                }
            });
        }

        return toDto(group, convId);
    }

    @Transactional
    public void removeMember(Long groupId, Long currentUserId, Long memberIdToRemove) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found."));

        boolean isCreator = group.getCreatedBy().getId().equals(currentUserId);
        boolean isSelf = currentUserId.equals(memberIdToRemove);

        if (!isCreator && !isSelf) {
            throw new UnauthorizedException("You are not allowed to remove this member.");
        }

        groupMemberRepository.deleteByGroupIdAndUserId(groupId, memberIdToRemove);

        Long convId = findConversationIdForGroup(group);
        if (convId != null) {
            conversationMemberRepository.findByConversationIdAndUserId(convId, memberIdToRemove)
                    .ifPresent(conversationMemberRepository::delete);
        }
    }

    private Long findConversationIdForGroup(Group group) {
        // Find group conversation created by the group creator with the group title
        List<Conversation> convs = conversationRepository.findConversationsByUserId(group.getCreatedBy().getId());
        for (Conversation c : convs) {
            if (c.getType() == ConversationType.GROUP && group.getName().equals(c.getTitle())) {
                return c.getId();
            }
        }
        return null;
    }

    private GroupDto toDto(Group group, Long conversationId) {
        GroupDto dto = new GroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setPhoto(group.getPhoto());
        dto.setCreatedBy(new UserProfileDto(group.getCreatedBy()));
        dto.setCreatedAt(group.getCreatedAt());
        dto.setConversationId(conversationId);

        List<UserProfileDto> memberDtos = new ArrayList<>();
        if (group.getMembers() != null) {
            for (GroupMember gm : group.getMembers()) {
                memberDtos.add(new UserProfileDto(gm.getUser()));
            }
        }
        dto.setMembers(memberDtos);
        return dto;
    }
}
