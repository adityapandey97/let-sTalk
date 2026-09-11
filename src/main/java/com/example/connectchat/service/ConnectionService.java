package com.example.connectchat.service;

import com.example.connectchat.dto.ConnectionRequestDto;
import com.example.connectchat.dto.ConnectionResponseDto;
import com.example.connectchat.dto.NotificationDto;
import com.example.connectchat.dto.UserDto;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.DuplicateResourceException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.ConnectionStatus;
import com.example.connectchat.model.Message;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.ConnectionRequestRepository;
import com.example.connectchat.repository.MessageRepository;
import com.example.connectchat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ConnectionService {

    private final ConnectionRequestRepository connectionRequestRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ConnectionService(ConnectionRequestRepository connectionRequestRepository,
                             UserRepository userRepository,
                             MessageRepository messageRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.connectionRequestRepository = connectionRequestRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ConnectionResponseDto sendConnectionRequest(ConnectionRequestDto requestDto) {
        if (requestDto.getSenderId() == null || requestDto.getReceiverId() == null) {
            throw new BadRequestException("Sender ID and Receiver ID are required");
        }

        if (requestDto.getSenderId().equals(requestDto.getReceiverId())) {
            throw new BadRequestException("Cannot send a connection request to yourself");
        }

        User sender = userRepository.findById(requestDto.getSenderId())
            .orElseThrow(() -> new ResourceNotFoundException("Sender not found with id: " + requestDto.getSenderId()));

        User receiver = userRepository.findById(requestDto.getReceiverId())
            .orElseThrow(() -> new ResourceNotFoundException("Receiver not found with id: " + requestDto.getReceiverId()));

        Optional<ConnectionRequest> existingOpt = connectionRequestRepository.findRelationshipBetween(sender.getId(), receiver.getId());

        ConnectionRequest connectionRequest;

        if (existingOpt.isPresent()) {
            connectionRequest = existingOpt.get();
            if (connectionRequest.getStatus() == ConnectionStatus.ACCEPTED) {
                throw new DuplicateResourceException("You are already connected with this user");
            }
            if (connectionRequest.getStatus() == ConnectionStatus.PENDING) {
                if (connectionRequest.getSender().getId().equals(sender.getId())) {
                    throw new DuplicateResourceException("A connection request is already pending for this user");
                } else {
                    // Receiver is attempting to connect to sender who already sent a pending request -> auto accept
                    connectionRequest.setStatus(ConnectionStatus.ACCEPTED);
                    ConnectionRequest updated = connectionRequestRepository.save(connectionRequest);
                    notifyConnectionAccepted(updated);
                    return mapToResponseDto(updated, receiver);
                }
            }
            // If previously REJECTED, allow re-requesting by updating sender and status
            connectionRequest.setSender(sender);
            connectionRequest.setReceiver(receiver);
            connectionRequest.setStatus(ConnectionStatus.PENDING);
        } else {
            connectionRequest = new ConnectionRequest(sender, receiver, ConnectionStatus.PENDING);
        }

        ConnectionRequest saved = connectionRequestRepository.save(connectionRequest);

        // Send real-time notification to receiver
        NotificationDto notification = new NotificationDto("NEW_CONNECTION_REQUEST", "You received a connection request from " + sender.getFullName());
        notification.setRequestId(saved.getId());
        notification.setSenderId(sender.getId());
        notification.setSenderUsername(sender.getUsername());
        notification.setSenderFullName(sender.getFullName());
        messagingTemplate.convertAndSend("/topic/user/" + receiver.getId() + "/notifications", notification);

        return mapToResponseDto(saved, receiver);
    }

    @Transactional
    public ConnectionResponseDto acceptConnectionRequest(Long requestId, Long currentUserId) {
        ConnectionRequest request = connectionRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Connection request not found with id: " + requestId));

        if (!request.getReceiver().getId().equals(currentUserId)) {
            throw new UnauthorizedException("Unauthorized: Only the recipient can accept this connection request");
        }

        if (request.getStatus() == ConnectionStatus.ACCEPTED) {
            return mapToResponseDto(request, request.getSender());
        }

        request.setStatus(ConnectionStatus.ACCEPTED);
        ConnectionRequest updated = connectionRequestRepository.save(request);

        notifyConnectionAccepted(updated);

        return mapToResponseDto(updated, request.getSender());
    }

    @Transactional
    public ConnectionResponseDto rejectConnectionRequest(Long requestId, Long currentUserId) {
        ConnectionRequest request = connectionRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Connection request not found with id: " + requestId));

        if (!request.getReceiver().getId().equals(currentUserId)) {
            throw new UnauthorizedException("Unauthorized: Only the recipient can reject this connection request");
        }

        request.setStatus(ConnectionStatus.REJECTED);
        ConnectionRequest updated = connectionRequestRepository.save(request);

        NotificationDto notification = new NotificationDto("CONNECTION_REJECTED", "Your connection request was rejected.");
        notification.setRequestId(requestId);
        messagingTemplate.convertAndSend("/topic/user/" + request.getSender().getId() + "/notifications", notification);

        return mapToResponseDto(updated, request.getSender());
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponseDto> getPendingRequestsForUser(Long userId) {
        List<ConnectionRequest> pending = connectionRequestRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(userId, ConnectionStatus.PENDING);
        List<ConnectionResponseDto> dtos = new ArrayList<>();
        for (ConnectionRequest cr : pending) {
            dtos.add(mapToResponseDto(cr, cr.getSender()));
        }
        return dtos;
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponseDto> getAcceptedConnections(Long userId) {
        List<ConnectionRequest> accepted = connectionRequestRepository.findAllAcceptedConnectionsForUser(userId);
        List<ConnectionResponseDto> dtos = new ArrayList<>();

        for (ConnectionRequest cr : accepted) {
            User otherUser = cr.getSender().getId().equals(userId) ? cr.getReceiver() : cr.getSender();
            ConnectionResponseDto dto = mapToResponseDto(cr, otherUser);

            // Fetch last message preview between users
            Optional<Message> lastMessageOpt = messageRepository.findLastMessageBetween(userId, otherUser.getId());
            if (lastMessageOpt.isPresent()) {
                Message lastMsg = lastMessageOpt.get();
                dto.setLastMessage(lastMsg.getContent());
                dto.setLastMessageTime(lastMsg.getSentAt());
                dto.setLastMessageStatus(lastMsg.getStatus().name());
                dto.setLastMessageSenderId(lastMsg.getSender().getId());
            }

            // Unread count
            long unread = messageRepository.countUnreadMessages(otherUser.getId(), userId);
            dto.setUnreadCount(unread);

            dtos.add(dto);
        }

        // Sort by last message time if available, otherwise by connection creation time
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

    private void notifyConnectionAccepted(ConnectionRequest cr) {
        // Send notification to original sender
        NotificationDto senderNotification = new NotificationDto("CONNECTION_ACCEPTED", cr.getReceiver().getFullName() + " accepted your connection request");
        senderNotification.setRequestId(cr.getId());
        senderNotification.setSenderId(cr.getReceiver().getId());
        senderNotification.setSenderUsername(cr.getReceiver().getUsername());
        senderNotification.setSenderFullName(cr.getReceiver().getFullName());
        messagingTemplate.convertAndSend("/topic/user/" + cr.getSender().getId() + "/notifications", senderNotification);

        // Also notify receiver
        NotificationDto receiverNotification = new NotificationDto("CONNECTION_ACCEPTED", "You are now connected with " + cr.getSender().getFullName());
        receiverNotification.setRequestId(cr.getId());
        receiverNotification.setSenderId(cr.getSender().getId());
        receiverNotification.setSenderUsername(cr.getSender().getUsername());
        receiverNotification.setSenderFullName(cr.getSender().getFullName());
        messagingTemplate.convertAndSend("/topic/user/" + cr.getReceiver().getId() + "/notifications", receiverNotification);
    }

    private ConnectionResponseDto mapToResponseDto(ConnectionRequest cr, User otherUser) {
        return new ConnectionResponseDto(
            cr.getId(),
            UserDto.fromEntity(otherUser),
            cr.getStatus(),
            cr.getCreatedAt()
        );
    }
}
