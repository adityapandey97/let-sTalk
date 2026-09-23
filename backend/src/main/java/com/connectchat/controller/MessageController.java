package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.dto.message.MessageDto;
import com.connectchat.dto.message.SendMessageRequest;
import com.connectchat.entity.User;
import com.connectchat.service.MessageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/api/conversations/{id}/messages")
    public ResponseEntity<List<MessageDto>> getConversationMessages(@PathVariable Long id,
                                                                    @AuthenticationPrincipal User currentUser) {
        List<MessageDto> messages = messageService.getConversationMessages(id, currentUser.getId());
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/api/messages")
    public ResponseEntity<MessageDto> sendMessage(@AuthenticationPrincipal User currentUser,
                                                  @RequestBody SendMessageRequest request) {
        MessageDto sent = messageService.sendMessage(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(sent);
    }

    @DeleteMapping("/api/messages/{id}")
    public ResponseEntity<ApiResponse> deleteForMe(@PathVariable Long id,
                                                   @AuthenticationPrincipal User currentUser) {
        // "Delete for me" is handled client-side in the local UI session and can be acknowledged by API
        return ResponseEntity.ok(new ApiResponse(true, "Message removed from view"));
    }

    @PostMapping("/api/messages/{id}/delete-for-everyone")
    public ResponseEntity<MessageDto> deleteForEveryone(@PathVariable Long id,
                                                        @AuthenticationPrincipal User currentUser) {
        MessageDto updated = messageService.deleteForEveryone(id, currentUser.getId());
        return ResponseEntity.ok(updated);
    }
}
