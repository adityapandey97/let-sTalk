package com.connectchat.service;

import com.connectchat.dto.conversation.ConversationDto;
import com.connectchat.dto.conversation.ConversationMemberDto;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.entity.Conversation;
import com.connectchat.entity.ConversationMember;
import com.connectchat.entity.Message;
import com.connectchat.entity.User;
import com.connectchat.enums.ConversationType;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.repository.ConversationMemberRepository;
import com.connectchat.repository.ConversationRepository;
import com.connectchat.repository.MessageRepository;
import com.connectchat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               ConversationMemberRepository conversationMemberRepository,
                               UserRepository userRepository,
                               MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional
    public Conversation getOrCreatePrivateConversation(Long u1, Long u2) {
        if (u1.equals(u2)) {
            throw new BadRequestException("Cannot create a conversation with yourself.");
        }

        Optional<Conversation> existing = conversationRepository.findPrivateConversationBetweenUsers(u1, u2);
        if (existing.isPresent()) {
            return existing.get();
        }

        User user1 = userRepository.findById(u1)
                .orElseThrow(() -> new ResourceNotFoundException("User " + u1 + " not found."));
        User user2 = userRepository.findById(u2)
                .orElseThrow(() -> new ResourceNotFoundException("User " + u2 + " not found."));

        Conversation conv = new Conversation(ConversationType.PRIVATE, null, null, user1);
        Conversation saved = conversationRepository.save(conv);

        ConversationMember m1 = new ConversationMember(saved, user1, "MEMBER");
        ConversationMember m2 = new ConversationMember(saved, user2, "MEMBER");
        conversationMemberRepository.save(m1);
        conversationMemberRepository.save(m2);

        saved.getMembers().add(m1);
        saved.getMembers().add(m2);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(Long userId) {
        List<Conversation> convs = conversationRepository.findConversationsByUserId(userId);
        List<ConversationDto> dtos = new ArrayList<>();

        for (Conversation conv : convs) {
            dtos.add(toDto(conv, userId));
        }

        // Sort by latest message time or conversation updated time
        dtos.sort((a, b) -> {
            LocalDateTime tA = a.getLastMessageTime() != null ? a.getLastMessageTime() : a.getUpdatedAt();
            LocalDateTime tB = b.getLastMessageTime() != null ? b.getLastMessageTime() : b.getUpdatedAt();
            if (tA == null) return 1;
            if (tB == null) return -1;
            return tB.compareTo(tA);
        });

        return dtos;
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversationById(Long conversationId, Long userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found."));

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId);
        if (!isMember) {
            throw new BadRequestException("You are not a member of this conversation.");
        }

        return toDto(conv, userId);
    }

    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation membership not found."));

        // Update member's last read to the newest message so it clears their unread/activity
        Optional<Message> latest = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId);
        latest.ifPresent(msg -> member.setLastReadMessageId(msg.getId()));
        conversationMemberRepository.save(member);
    }

    public ConversationDto toDto(Conversation conv, Long currentUserId) {
        ConversationDto dto = new ConversationDto();
        dto.setId(conv.getId());
        dto.setType(conv.getType());
        dto.setTitle(conv.getTitle());
        dto.setPhotoUrl(conv.getPhotoUrl());
        dto.setUpdatedAt(conv.getUpdatedAt());

        // Set other user for PRIVATE conversations
        if (conv.getType() == ConversationType.PRIVATE) {
            for (ConversationMember cm : conv.getMembers()) {
                if (!cm.getUser().getId().equals(currentUserId)) {
                    dto.setOtherUser(new UserProfileDto(cm.getUser()));
                    if (dto.getTitle() == null || dto.getTitle().isEmpty()) {
                        dto.setTitle(cm.getUser().getFullName());
                    }
                    if (dto.getPhotoUrl() == null || dto.getPhotoUrl().isEmpty()) {
                        dto.setPhotoUrl(cm.getUser().getProfilePhoto());
                    }
                    break;
                }
            }
        }

        // Fetch latest message
        Optional<Message> latestOpt = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conv.getId());
        if (latestOpt.isPresent()) {
            Message latest = latestOpt.get();
            if (Boolean.TRUE.equals(latest.getDeletedForEveryone())) {
                dto.setLastMessage("This message was deleted.");
            } else {
                dto.setLastMessage(latest.getContent());
            }
            dto.setLastMessageType(latest.getType().name());
            dto.setLastMessageSenderName(latest.getSender() != null ? latest.getSender().getFullName() : "");
            dto.setLastMessageTime(latest.getCreatedAt());
        }

        // Fetch unread count for current user
        Optional<ConversationMember> memberOpt = conversationMemberRepository.findByConversationIdAndUserId(conv.getId(), currentUserId);
        Long lastReadId = memberOpt.map(ConversationMember::getLastReadMessageId).orElse(null);
        long unread = messageRepository.countUnreadMessages(conv.getId(), currentUserId, lastReadId);
        dto.setUnreadCount(unread);

        // Members list
        List<ConversationMemberDto> memberDtos = new ArrayList<>();
        for (ConversationMember cm : conv.getMembers()) {
            ConversationMemberDto cmd = new ConversationMemberDto();
            cmd.setId(cm.getId());
            cmd.setConversationId(conv.getId());
            cmd.setUser(new UserProfileDto(cm.getUser()));
            cmd.setRole(cm.getRole());
            cmd.setJoinedAt(cm.getJoinedAt());
            memberDtos.add(cmd);
        }
        dto.setMembers(memberDtos);

        return dto;
    }
}
