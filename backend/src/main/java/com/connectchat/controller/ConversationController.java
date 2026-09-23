package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.dto.conversation.ConversationDto;
import com.connectchat.entity.Conversation;
import com.connectchat.entity.User;
import com.connectchat.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getUserConversations(@AuthenticationPrincipal User currentUser) {
        List<ConversationDto> conversations = conversationService.getUserConversations(currentUser.getId());
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDto> getConversationById(@PathVariable Long id,
                                                               @AuthenticationPrincipal User currentUser) {
        ConversationDto conversation = conversationService.getConversationById(id, currentUser.getId());
        return ResponseEntity.ok(conversation);
    }

    @PostMapping("/private/{otherUserId}")
    public ResponseEntity<ConversationDto> getOrCreatePrivateConversation(@PathVariable Long otherUserId,
                                                                          @AuthenticationPrincipal User currentUser) {
        Conversation conv = conversationService.getOrCreatePrivateConversation(currentUser.getId(), otherUserId);
        ConversationDto dto = conversationService.toDto(conv, currentUser.getId());
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteConversation(@PathVariable Long id,
                                                          @AuthenticationPrincipal User currentUser) {
        conversationService.deleteConversation(id, currentUser.getId());
        return ResponseEntity.ok(new ApiResponse(true, "Conversation cleared successfully"));
    }
}
