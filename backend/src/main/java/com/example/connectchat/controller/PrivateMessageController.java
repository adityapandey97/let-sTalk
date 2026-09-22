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
import java.util.Map;

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
     * REST endpoint for sending private messages (fallback or REST clients)
     */
    @PostMapping("/api/messages/private")
    public ResponseEntity<PrivateMessageDto> sendPrivateMessageRest(@RequestBody PrivateMessageRequest request) {
        PrivateMessageDto dto = privateMessageService.sendPrivateMessage(request);
        return ResponseEntity.ok(dto);
    }

    /**
     * WebSocket STOMP endpoint for acknowledging delivered/read status
     * Destination: /app/chat.status
     */
    @MessageMapping("/chat.status")
    public void updateMessageStatus(@Payload MessageStatusUpdateRequest request) {
        privateMessageService.updateMessageStatus(request);
    }

    /**
     * REST endpoint to clear entire conversation between two users (delete for me)
     */
    @DeleteMapping("/api/messages/private")
    public ResponseEntity<Map<String, Object>> deleteConversation(@RequestParam("userId") Long userId,
                                                                  @RequestParam("otherUserId") Long otherUserId) {
        privateMessageService.deleteConversationForMe(userId, otherUserId);
        return ResponseEntity.ok(Map.of("message", "Conversation cleared successfully", "success", true));
    }

    /**
     * REST endpoint to delete a specific message (delete for me)
     */
    @DeleteMapping("/api/messages/{messageId}")
    public ResponseEntity<Map<String, Object>> deleteMessage(@PathVariable("messageId") Long messageId,
                                                             @RequestParam("userId") Long userId) {
        privateMessageService.deleteMessage(messageId, userId);
        return ResponseEntity.ok(Map.of("message", "Message deleted successfully", "success", true));
    }

    /**
     * REST endpoint to delete a message for everyone (sender within 24h)
     */
    @PostMapping("/api/messages/{messageId}/delete-for-everyone")
    public ResponseEntity<PrivateMessageDto> deleteForEveryone(@PathVariable("messageId") Long messageId,
                                                               @RequestParam("userId") Long userId) {
        PrivateMessageDto updated = privateMessageService.deleteMessageForEveryone(messageId, userId);
        return ResponseEntity.ok(updated);
    }

    /**
     * REST endpoint to toggle emoji reactions on a message
     */
    @PostMapping("/api/messages/{messageId}/react")
    public ResponseEntity<PrivateMessageDto> reactToMessage(@PathVariable("messageId") Long messageId,
                                                            @RequestParam("userId") Long userId,
                                                            @RequestParam(value = "emoji", required = false) String emoji) {
        PrivateMessageDto updated = privateMessageService.reactToMessage(messageId, userId, emoji);
        return ResponseEntity.ok(updated);
    }

    /**
     * WebSocket STOMP endpoint to toggle emoji reactions on a message
     * Destination: /app/chat.react
     */
    @MessageMapping("/chat.react")
    public void reactToMessageStomp(@Payload Map<String, Object> payload) {
        if (payload != null && payload.containsKey("messageId") && payload.containsKey("userId")) {
            Long messageId = Long.valueOf(payload.get("messageId").toString());
            Long userId = Long.valueOf(payload.get("userId").toString());
            String emoji = payload.containsKey("emoji") && payload.get("emoji") != null ? payload.get("emoji").toString() : null;
            privateMessageService.reactToMessage(messageId, userId, emoji);
        }
    }
}
