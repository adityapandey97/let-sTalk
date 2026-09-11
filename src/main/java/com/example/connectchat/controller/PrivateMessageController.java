package com.example.connectchat.controller;

import com.example.connectchat.dto.MessageStatusUpdateRequest;
import com.example.connectchat.dto.PrivateMessageDto;
import com.example.connectchat.dto.PrivateMessageRequest;
import com.example.connectchat.service.PrivateMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class PrivateMessageController {

    private final PrivateMessageService privateMessageService;

    public PrivateMessageController(PrivateMessageService privateMessageService) {
        this.privateMessageService = privateMessageService;
    }

    /**
     * REST endpoint to load chat history between two users
     */
    @GetMapping("/api/messages/private")
    public ResponseEntity<List<PrivateMessageDto>> getConversationHistory(@RequestParam("userId") Long userId,
                                                                          @RequestParam("otherUserId") Long otherUserId) {
        List<PrivateMessageDto> history = privateMessageService.getConversationHistory(userId, otherUserId);
        return ResponseEntity.ok(history);
    }

    /**
     * WebSocket STOMP endpoint for sending private messages
     * Destination: /app/chat.private
     */
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload PrivateMessageRequest request) {
        privateMessageService.sendPrivateMessage(request);
    }

    /**
     * WebSocket STOMP endpoint for acknowledging delivered/read status
     * Destination: /app/chat.status
     */
    @MessageMapping("/chat.status")
    public void updateMessageStatus(@Payload MessageStatusUpdateRequest request) {
        privateMessageService.updateMessageStatus(request);
    }
}
