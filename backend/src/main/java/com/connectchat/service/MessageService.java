package com.connectchat.service;

import com.connectchat.dto.message.MessageDto;
import com.connectchat.dto.message.MessageStatusUpdateDto;
import com.connectchat.dto.message.SendMessageRequest;
import com.connectchat.entity.*;
import com.connectchat.enums.MessageStatus;
import com.connectchat.enums.MessageType;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(MessageRepository messageRepository,
                          ConversationRepository conversationRepository,
                          ConversationMemberRepository conversationMemberRepository,
                          UserRepository userRepository,
                          AttachmentRepository attachmentRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.userRepository = userRepository;
        this.attachmentRepository = attachmentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public MessageDto sendMessage(Long senderId, SendMessageRequest request) {
        if (request.getConversationId() == null) {
            throw new BadRequestException("Conversation ID is required.");
        }

        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found."));

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(conversation.getId(), senderId);
        if (!isMember) {
            throw new BadRequestException("You are not a member of this conversation.");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found."));

        Message replyTo = null;
        if (request.getReplyToMessageId() != null) {
            replyTo = messageRepository.findById(request.getReplyToMessageId()).orElse(null);
        }

        MessageType type = request.getType() != null ? request.getType() : MessageType.TEXT;
        String content = request.getContent() != null ? request.getContent().trim() : "";

        // Text messages require non-empty content; media messages may have mediaUrl
        if (type == MessageType.TEXT && content.isEmpty()) {
            throw new BadRequestException("Message content cannot be empty.");
        }

        Message message = new Message(conversation, sender, content, type, replyTo);
        message.setStatus(MessageStatus.SENT);
        Message savedMessage = messageRepository.save(message);

        // Attach media file if provided
        if (request.getMediaUrl() != null && !request.getMediaUrl().trim().isEmpty()) {
            String originalName = request.getFileName() != null ? request.getFileName() : "file";
            Long fileSize = request.getFileSize() != null ? request.getFileSize() : 0L;
            Attachment attachment = new Attachment(
                    savedMessage,
                    originalName,
                    request.getMediaUrl(),
                    type.name(),
                    fileSize,
                    request.getMediaUrl()
            );
            Attachment savedAttachment = attachmentRepository.save(attachment);
            savedMessage.getAttachments().add(savedAttachment);
        }

        // Update conversation timestamp
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        MessageDto dto = new MessageDto(savedMessage);

        // Broadcast to conversation STOMP topic
        broadcastToConversation(conversation.getId(), dto);

        // Notify other conversation members
        notifyConversationMembers(conversation, sender, dto);

        return dto;
    }

    @Transactional
    public List<MessageDto> getConversationMessages(Long conversationId, Long currentUserId) {
        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(conversationId, currentUserId);
        if (!isMember) {
            throw new BadRequestException("You are not a member of this conversation.");
        }

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<MessageDto> dtos = new ArrayList<>();

        Message lastMsg = null;
        for (Message m : messages) {
            dtos.add(new MessageDto(m));
            lastMsg = m;
        }

        // Update member's last read message ID
        if (lastMsg != null) {
            final Long lastId = lastMsg.getId();
            conversationMemberRepository.findByConversationIdAndUserId(conversationId, currentUserId)
                    .ifPresent(cm -> {
                        cm.setLastReadMessageId(lastId);
                        conversationMemberRepository.save(cm);
                    });
        }

        return dtos;
    }

    @Transactional
    public void updateMessageStatus(MessageStatusUpdateDto update, Long currentUserId) {
        if (update.getMessageId() == null || update.getConversationId() == null) {
            return;
        }

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(update.getConversationId(), currentUserId);
        if (!isMember) return;

        Optional<Message> msgOpt = messageRepository.findById(update.getMessageId());
        if (msgOpt.isPresent()) {
            Message message = msgOpt.get();
            // Recipient can advance status
            if (!message.getSender().getId().equals(currentUserId)) {
                if (update.getStatus() == MessageStatus.READ) {
                    message.setStatus(MessageStatus.READ);
                } else if (update.getStatus() == MessageStatus.DELIVERED && message.getStatus() == MessageStatus.SENT) {
                    message.setStatus(MessageStatus.DELIVERED);
                }
                messageRepository.save(message);

                // Broadcast status acknowledgment to conversation
                try {
                    messagingTemplate.convertAndSend("/topic/conversation/" + update.getConversationId() + "/status", Map.of(
                            "messageId", message.getId(),
                            "conversationId", update.getConversationId(),
                            "status", message.getStatus().name()
                    ));
                } catch (Exception ignored) {}
            }
        }
    }

    @Transactional
    public MessageDto deleteForEveryone(Long messageId, Long currentUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found."));

        if (!message.getSender().getId().equals(currentUserId)) {
            throw new BadRequestException("You can only delete your own messages for everyone.");
        }

        // Reasonable time window check (e.g. 24 hours)
        if (message.getCreatedAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new BadRequestException("Messages older than 24 hours cannot be deleted for everyone.");
        }

        message.setDeletedForEveryone(true);
        Message saved = messageRepository.save(message);

        MessageDto dto = new MessageDto(saved);

        // Broadcast deletion event to conversation topic
        try {
            messagingTemplate.convertAndSend("/topic/conversation/" + message.getConversation().getId() + "/delete", Map.of(
                    "messageId", message.getId(),
                    "conversationId", message.getConversation().getId(),
                    "deletedForEveryone", true
            ));
        } catch (Exception ignored) {}

        return dto;
    }

    private void broadcastToConversation(Long conversationId, MessageDto dto) {
        try {
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, dto);
        } catch (Exception ignored) {}
    }

    private void notifyConversationMembers(Conversation conversation, User sender, MessageDto messageDto) {
        for (ConversationMember member : conversation.getMembers()) {
            if (!member.getUser().getId().equals(sender.getId())) {
                try {
                    messagingTemplate.convertAndSend("/topic/user/" + member.getUser().getId() + "/notifications", Map.of(
                            "type", "NEW_MESSAGE",
                            "conversationId", conversation.getId(),
                            "senderName", sender.getFullName(),
                            "message", messageDto.getContent(),
                            "messageType", messageDto.getType().name()
                    ));
                } catch (Exception ignored) {}
            }
        }
    }
}
