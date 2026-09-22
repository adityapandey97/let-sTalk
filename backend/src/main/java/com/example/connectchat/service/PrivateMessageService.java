package com.example.connectchat.service;

import com.example.connectchat.dto.MessageStatusUpdateRequest;
import com.example.connectchat.dto.NotificationDto;
import com.example.connectchat.dto.PrivateMessageDto;
import com.example.connectchat.dto.PrivateMessageRequest;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.*;
import com.example.connectchat.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
public class PrivateMessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ConnectionRequestRepository connectionRequestRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PrivateMessageService(MessageRepository messageRepository,
                                 UserRepository userRepository,
                                 ConnectionRequestRepository connectionRequestRepository,
                                 ConversationRepository conversationRepository,
                                 ConversationMemberRepository conversationMemberRepository,
                                 SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public PrivateMessageDto sendPrivateMessage(PrivateMessageRequest request) {
        if (request.getSenderId() == null || request.getReceiverId() == null) {
            throw new BadRequestException("Sender ID and Receiver ID are required");
        }

        MessageType type = request.getMessageType() != null ? request.getMessageType() : MessageType.TEXT;

        String content = request.getContent();
        if (type == MessageType.TEXT && (content == null || content.trim().isEmpty())) {
            throw new BadRequestException("Message content cannot be empty");
        }
        if (content == null) {
            content = "";
        }

        if (content.length() > 4000) {
            throw new BadRequestException("Message exceeds maximum length of 4000 characters");
        }

        User sender = userRepository.findById(request.getSenderId())
            .orElseThrow(() -> new ResourceNotFoundException("Sender not found with id: " + request.getSenderId()));

        User receiver = userRepository.findById(request.getReceiverId())
            .orElseThrow(() -> new ResourceNotFoundException("Receiver not found with id: " + request.getReceiverId()));

        // Verify users have an accepted connection
        boolean isConnected = connectionRequestRepository.findAcceptedConnectionBetween(sender.getId(), receiver.getId()).isPresent();
        if (!isConnected) {
            throw new UnauthorizedException("Cannot send message: You are not connected with this user");
        }

        // Find or create unified Conversation entity
        Conversation conversation = getOrCreatePrivateConversation(sender, receiver);

        Message message = new Message(
            conversation,
            sender,
            receiver,
            content.trim(),
            type,
            request.getMediaUrl(),
            request.getMediaMetadata(),
            MessageStatus.SENT
        );

        // Handle quoted reply
        if (request.getRepliedMessageId() != null) {
            messageRepository.findById(request.getRepliedMessageId()).ifPresent(message::setRepliedMessage);
        }

        Message saved = messageRepository.save(message);
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        PrivateMessageDto dto = PrivateMessageDto.fromEntity(saved);

        // Push to receiver's private channel
        messagingTemplate.convertAndSend("/topic/private/" + receiver.getId(), dto);

        // Push confirmation to sender's private channel
        messagingTemplate.convertAndSend("/topic/private/" + sender.getId(), dto);

        // Push to conversation topic
        messagingTemplate.convertAndSend("/topic/conversation/" + conversation.getId(), dto);

        return dto;
    }

    @Transactional
    public List<PrivateMessageDto> getConversationHistory(Long userId, Long otherUserId) {
        if (userId == null || otherUserId == null) {
            throw new BadRequestException("User IDs are required");
        }

        userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        userRepository.findById(otherUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + otherUserId));

        boolean isConnected = connectionRequestRepository.findAcceptedConnectionBetween(userId, otherUserId).isPresent();
        if (!isConnected) {
            throw new UnauthorizedException("You are not connected with this user");
        }

        // Mark any unread messages from otherUser to userId as READ
        int updatedCount = messageRepository.markMessagesAsRead(otherUserId, userId, MessageStatus.READ);
        if (updatedCount > 0) {
            NotificationDto statusNotif = new NotificationDto("MESSAGE_READ", "Messages read by " + userId);
            statusNotif.setSenderId(userId);
            statusNotif.setMessageStatus("READ");
            messagingTemplate.convertAndSend("/topic/user/" + otherUserId + "/notifications", statusNotif);
        }

        // Check if user has a clearedAt watermark in this conversation
        Optional<Conversation> convOpt = conversationRepository.findPrivateConversationBetweenUsers(userId, otherUserId);
        List<Message> messages;
        if (convOpt.isPresent()) {
            Conversation conv = convOpt.get();
            Optional<ConversationMember> memberOpt = conversationMemberRepository.findByConversationIdAndUserId(conv.getId(), userId);
            if (memberOpt.isPresent() && memberOpt.get().getClearedAt() != null) {
                messages = messageRepository.findByConversationIdAndSentAtAfter(conv.getId(), memberOpt.get().getClearedAt());
            } else {
                messages = messageRepository.findByConversationIdOrderBySentAtAsc(conv.getId());
            }
        } else {
            messages = messageRepository.findConversationBetween(userId, otherUserId);
        }

        List<PrivateMessageDto> dtos = new ArrayList<>();
        for (Message m : messages) {
            dtos.add(PrivateMessageDto.fromEntity(m));
        }
        return dtos;
    }

    @Transactional
    public void updateMessageStatus(MessageStatusUpdateRequest request) {
        if (request.getUserId() == null) {
            return;
        }

        if (request.getMessageId() != null) {
            messageRepository.findById(request.getMessageId()).ifPresent(message -> {
                if (message.getReceiver() != null && message.getReceiver().getId().equals(request.getUserId())) {
                    if (request.getStatus() == MessageStatus.READ ||
                       (request.getStatus() == MessageStatus.DELIVERED && message.getStatus() == MessageStatus.SENT)) {
                        message.setStatus(request.getStatus());
                        messageRepository.save(message);

                        NotificationDto notif = new NotificationDto("MESSAGE_STATUS_UPDATE", "Status update");
                        notif.setMessageId(message.getId());
                        notif.setMessageStatus(request.getStatus().name());
                        notif.setSenderId(message.getReceiver().getId());
                        messagingTemplate.convertAndSend("/topic/user/" + message.getSender().getId() + "/notifications", notif);
                    }
                }
            });
        } else if (request.getSenderId() != null && request.getStatus() == MessageStatus.READ) {
            int updated = messageRepository.markMessagesAsRead(request.getSenderId(), request.getUserId(), MessageStatus.READ);
            if (updated > 0) {
                NotificationDto notif = new NotificationDto("MESSAGE_READ", "Messages marked as read");
                notif.setSenderId(request.getUserId());
                notif.setMessageStatus("READ");
                messagingTemplate.convertAndSend("/topic/user/" + request.getSenderId() + "/notifications", notif);
            }
        }
    }

    @Transactional
    public void deleteConversationForMe(Long userId, Long otherUserId) {
        if (userId == null || otherUserId == null) {
            throw new BadRequestException("User IDs are required");
        }

        userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        userRepository.findById(otherUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + otherUserId));

        // Update member clearedAt
        Optional<Conversation> convOpt = conversationRepository.findPrivateConversationBetweenUsers(userId, otherUserId);
        if (convOpt.isPresent()) {
            Conversation conv = convOpt.get();
            conversationMemberRepository.findByConversationIdAndUserId(conv.getId(), userId).ifPresent(cm -> {
                cm.setClearedAt(LocalDateTime.now());
                conversationMemberRepository.save(cm);
            });
        } else {
            messageRepository.deleteConversationBetween(userId, otherUserId);
        }

        NotificationDto deleteNotif = new NotificationDto("CONVERSATION_CLEARED", "Chat history cleared");
        deleteNotif.setSenderId(userId);
        deleteNotif.setReceiverId(otherUserId);
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", deleteNotif);
    }

    @Transactional
    public void deleteConversation(Long userId, Long otherUserId) {
        deleteConversationForMe(userId, otherUserId);
    }

    @Transactional
    public PrivateMessageDto deleteMessageForEveryone(Long messageId, Long requesterId) {
        if (messageId == null || requesterId == null) {
            throw new BadRequestException("Message ID and Requester ID are required");
        }

        Message msg = messageRepository.findById(messageId)
            .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!msg.getSender().getId().equals(requesterId)) {
            throw new UnauthorizedException("Only the sender can delete a message for everyone");
        }

        if (msg.getSentAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new BadRequestException("Messages can only be deleted for everyone within 24 hours of sending");
        }

        msg.setDeletedForEveryone(true);
        msg.setContent("This message was deleted");
        msg.setMediaUrl(null);
        msg.setDeletedAt(LocalDateTime.now());
        Message saved = messageRepository.save(msg);

        PrivateMessageDto dto = PrivateMessageDto.fromEntity(saved);

        Long receiverId = msg.getReceiver() != null ? msg.getReceiver().getId() : null;
        if (receiverId != null) {
            messagingTemplate.convertAndSend("/topic/private/" + receiverId, dto);
            NotificationDto deleteNotif = new NotificationDto("MESSAGE_DELETED_FOR_EVERYONE", "A message was deleted");
            deleteNotif.setMessageId(messageId);
            deleteNotif.setSenderId(requesterId);
            messagingTemplate.convertAndSend("/topic/user/" + receiverId + "/notifications", deleteNotif);
        }
        messagingTemplate.convertAndSend("/topic/private/" + requesterId, dto);

        return dto;
    }

    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        if (messageId == null || userId == null) {
            throw new BadRequestException("Message ID and User ID are required");
        }

        Message msg = messageRepository.findById(messageId)
            .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        Long senderId = msg.getSender().getId();
        Long receiverId = msg.getReceiver() != null ? msg.getReceiver().getId() : null;

        if (!senderId.equals(userId) && (receiverId == null || !receiverId.equals(userId))) {
            throw new UnauthorizedException("You are not authorized to delete this message");
        }

        messageRepository.delete(msg);

        NotificationDto deleteNotif = new NotificationDto("MESSAGE_DELETED", "Message deleted");
        deleteNotif.setMessageId(messageId);
        deleteNotif.setSenderId(userId);
        messagingTemplate.convertAndSend("/topic/user/" + senderId + "/notifications", deleteNotif);
        if (receiverId != null) {
            messagingTemplate.convertAndSend("/topic/user/" + receiverId + "/notifications", deleteNotif);
        }
    }

    @Transactional
    public PrivateMessageDto reactToMessage(Long messageId, Long userId, String emoji) {
        if (messageId == null || userId == null) {
            throw new BadRequestException("Message ID and User ID are required");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Reactions are stored as a JSON string map: {"username":"❤️"}
        ObjectMapper mapper = new ObjectMapper();
        Map<String, String> reactionMap = new HashMap<>();
        if (message.getReactions() != null && !message.getReactions().isBlank()) {
            try {
                reactionMap = mapper.readValue(message.getReactions(), new TypeReference<Map<String, String>>() {});
            } catch (Exception ignored) {}
        }

        String userKey = user.getUsername();
        if (emoji == null || emoji.isBlank() || emoji.equals(reactionMap.get(userKey))) {
            // Toggle off reaction if clicked again or blank
            reactionMap.remove(userKey);
        } else {
            reactionMap.put(userKey, emoji.trim());
        }

        try {
            message.setReactions(mapper.writeValueAsString(reactionMap));
        } catch (Exception e) {
            message.setReactions("{}");
        }

        Message saved = messageRepository.save(message);
        PrivateMessageDto dto = PrivateMessageDto.fromEntity(saved);

        // Broadcast reaction to sender and receiver channels
        if (saved.getSender() != null) {
            messagingTemplate.convertAndSend("/topic/private/" + saved.getSender().getId(), dto);
        }
        if (saved.getReceiver() != null) {
            messagingTemplate.convertAndSend("/topic/private/" + saved.getReceiver().getId(), dto);
        }
        if (saved.getConversation() != null) {
            messagingTemplate.convertAndSend("/topic/conversation/" + saved.getConversation().getId(), dto);
        }

        return dto;
    }

    private Conversation getOrCreatePrivateConversation(User user1, User user2) {
        Optional<Conversation> existing = conversationRepository.findPrivateConversationBetweenUsers(user1.getId(), user2.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Conversation conversation = new Conversation(ConversationType.PRIVATE, null, user1);
        Conversation saved = conversationRepository.save(conversation);

        conversationMemberRepository.save(new ConversationMember(saved, user1, "MEMBER"));
        conversationMemberRepository.save(new ConversationMember(saved, user2, "MEMBER"));

        return saved;
    }
}
