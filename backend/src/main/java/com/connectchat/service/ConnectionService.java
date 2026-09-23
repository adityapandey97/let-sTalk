package com.connectchat.service;

import com.connectchat.dto.connection.ConnectionDto;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.entity.Connection;
import com.connectchat.entity.User;
import com.connectchat.enums.ConnectionStatus;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.repository.ConnectionRepository;
import com.connectchat.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    public ConnectionService(ConnectionRepository connectionRepository,
                             UserRepository userRepository,
                             @Lazy ConversationService conversationService,
                             SimpMessagingTemplate messagingTemplate) {
        this.connectionRepository = connectionRepository;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ConnectionDto sendRequest(Long senderId, Long targetUserId) {
        if (targetUserId == null) {
            throw new BadRequestException("Target user ID is required.");
        }
        if (senderId.equals(targetUserId)) {
            throw new BadRequestException("You cannot send a connection request to yourself.");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender user not found."));
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found."));

        Optional<Connection> existingOpt = connectionRepository.findBetweenUsers(senderId, targetUserId);
        if (existingOpt.isPresent()) {
            Connection existing = existingOpt.get();
            if (existing.getStatus() == ConnectionStatus.ACCEPTED) {
                throw new BadRequestException("You are already connected with this user.");
            }
            if (existing.getStatus() == ConnectionStatus.PENDING) {
                throw new BadRequestException("A connection request between you is already pending.");
            }
            // If previously rejected, re-open as pending
            existing.setSender(sender);
            existing.setReceiver(receiver);
            existing.setStatus(ConnectionStatus.PENDING);
            Connection saved = connectionRepository.save(existing);
            notifyReceiverOfRequest(receiver.getId(), sender);
            return toDto(saved, senderId);
        }

        Connection connection = new Connection(sender, receiver, ConnectionStatus.PENDING);
        Connection saved = connectionRepository.save(connection);

        notifyReceiverOfRequest(receiver.getId(), sender);

        return toDto(saved, senderId);
    }

    @Transactional(readOnly = true)
    public List<ConnectionDto> getPendingRequests(Long userId) {
        List<Connection> list = connectionRepository.findPendingRequestsForUser(userId);
        List<ConnectionDto> dtos = new ArrayList<>();
        for (Connection c : list) {
            dtos.add(toDto(c, userId));
        }
        return dtos;
    }

    @Transactional
    public ConnectionDto acceptRequest(Long connectionId, Long currentUserId) {
        Connection connection = connectionRepository.findByIdAndReceiverId(connectionId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Pending connection request not found or unauthorized."));

        connection.setStatus(ConnectionStatus.ACCEPTED);
        Connection saved = connectionRepository.save(connection);

        // Ensure private conversation exists for the newly connected pair
        conversationService.getOrCreatePrivateConversation(connection.getSender().getId(), connection.getReceiver().getId());

        // Real-time notification to the original sender
        notifySenderOfAcceptance(connection.getSender().getId(), connection.getReceiver());

        return toDto(saved, currentUserId);
    }

    @Transactional
    public void rejectRequest(Long connectionId, Long currentUserId) {
        Connection connection = connectionRepository.findByIdAndReceiverId(connectionId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Pending connection request not found or unauthorized."));

        connection.setStatus(ConnectionStatus.REJECTED);
        connectionRepository.save(connection);
    }

    @Transactional(readOnly = true)
    public List<ConnectionDto> getAcceptedConnections(Long userId) {
        List<Connection> list = connectionRepository.findAcceptedConnectionsForUser(userId);
        List<ConnectionDto> dtos = new ArrayList<>();
        for (Connection c : list) {
            dtos.add(toDto(c, userId));
        }
        return dtos;
    }

    private ConnectionDto toDto(Connection connection, Long currentUserId) {
        ConnectionDto dto = new ConnectionDto();
        dto.setId(connection.getId());
        dto.setStatus(connection.getStatus());
        dto.setCreatedAt(connection.getCreatedAt());

        boolean isSender = connection.getSender().getId().equals(currentUserId);
        dto.setIsSender(isSender);

        User otherUser = isSender ? connection.getReceiver() : connection.getSender();
        dto.setUser(new UserProfileDto(otherUser));

        return dto;
    }

    private void notifyReceiverOfRequest(Long receiverId, User sender) {
        try {
            messagingTemplate.convertAndSend("/topic/user/" + receiverId + "/notifications", Map.of(
                    "type", "CONNECTION_REQUEST",
                    "title", "New Connection Request",
                    "message", sender.getFullName() + " sent you a connection request.",
                    "sender", new UserProfileDto(sender)
            ));
        } catch (Exception ignored) {}
    }

    private void notifySenderOfAcceptance(Long senderId, User accepter) {
        try {
            messagingTemplate.convertAndSend("/topic/user/" + senderId + "/notifications", Map.of(
                    "type", "CONNECTION_ACCEPTED",
                    "title", "Connection Accepted",
                    "message", accepter.getFullName() + " accepted your connection request.",
                    "user", new UserProfileDto(accepter)
            ));
        } catch (Exception ignored) {}
    }
}
