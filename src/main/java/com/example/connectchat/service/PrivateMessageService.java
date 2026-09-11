package com.example.connectchat.service;

import com.example.connectchat.dto.MessageStatusUpdateRequest;
import com.example.connectchat.dto.NotificationDto;
import com.example.connectchat.dto.PrivateMessageDto;
import com.example.connectchat.dto.PrivateMessageRequest;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.Message;
import com.example.connectchat.model.MessageStatus;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.ConnectionRequestRepository;
import com.example.connectchat.repository.MessageRepository;
import com.example.connectchat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PrivateMessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ConnectionRequestRepository connectionRequestRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PrivateMessageService(MessageRepository messageRepository,
                                 UserRepository userRepository,
                                 ConnectionRequestRepository connectionRequestRepository,
                                 SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public PrivateMessageDto sendPrivateMessage(PrivateMessageRequest request) {
        if (request.getSenderId() == null || request.getReceiverId() == null) {
            throw new BadRequestException("Sender ID and Receiver ID are required");
        }

        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new BadRequestException("Message content cannot be empty");
        }

        if (request.getContent().length() > 2000) {
            throw new BadRequestException("Message exceeds maximum length of 2000 characters");
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

        Message message = new Message(
            sender,
            receiver,
            request.getContent().trim(),
            MessageStatus.SENT
        );

        Message saved = messageRepository.save(message);
        PrivateMessageDto dto = PrivateMessageDto.fromEntity(saved);

        // Push to receiver's private channel
        messagingTemplate.convertAndSend("/topic/private/" + receiver.getId(), dto);

        // Push confirmation to sender's private channel
        messagingTemplate.convertAndSend("/topic/private/" + sender.getId(), dto);

        return dto;
    }

    @Transactional
    public List<PrivateMessageDto> getConversationHistory(Long userId, Long otherUserId) {
        if (userId == null || otherUserId == null) {
            throw new BadRequestException("User IDs are required");
        }

        // Verify users exist
        userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        userRepository.findById(otherUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + otherUserId));

        // Verify accepted connection
        boolean isConnected = connectionRequestRepository.findAcceptedConnectionBetween(userId, otherUserId).isPresent();
        if (!isConnected) {
            throw new UnauthorizedException("You are not connected with this user");
        }

        // Mark any unread messages from otherUser to userId as READ
        int updatedCount = messageRepository.markMessagesAsRead(otherUserId, userId, MessageStatus.READ);
        if (updatedCount > 0) {
            // Notify the sender (otherUser) that their messages were read
            NotificationDto statusNotif = new NotificationDto("MESSAGE_READ", "Messages read by " + userId);
            statusNotif.setSenderId(userId);
            statusNotif.setMessageStatus("READ");
            messagingTemplate.convertAndSend("/topic/user/" + otherUserId + "/notifications", statusNotif);
        }

        List<Message> messages = messageRepository.findConversationBetween(userId, otherUserId);
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
                // Ensure only the actual receiver can update status to DELIVERED or READ
                if (message.getReceiver().getId().equals(request.getUserId())) {
                    if (request.getStatus() == MessageStatus.READ || 
                       (request.getStatus() == MessageStatus.DELIVERED && message.getStatus() == MessageStatus.SENT)) {
                        message.setStatus(request.getStatus());
                        messageRepository.save(message);

                        // Notify sender of status update
                        NotificationDto notif = new NotificationDto("MESSAGE_STATUS_UPDATE", "Status update");
                        notif.setMessageId(message.getId());
                        notif.setMessageStatus(request.getStatus().name());
                        notif.setSenderId(message.getReceiver().getId());
                        messagingTemplate.convertAndSend("/topic/user/" + message.getSender().getId() + "/notifications", notif);
                    }
                }
            });
        } else if (request.getSenderId() != null && request.getStatus() == MessageStatus.READ) {
            // Mark all unread messages from senderId to userId as READ
            int updated = messageRepository.markMessagesAsRead(request.getSenderId(), request.getUserId(), MessageStatus.READ);
            if (updated > 0) {
                NotificationDto notif = new NotificationDto("MESSAGE_READ", "Messages marked as read");
                notif.setSenderId(request.getUserId());
                notif.setMessageStatus("READ");
                messagingTemplate.convertAndSend("/topic/user/" + request.getSenderId() + "/notifications", notif);
            }
        }
    }
}
