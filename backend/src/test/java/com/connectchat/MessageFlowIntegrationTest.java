package com.connectchat;

import com.connectchat.dto.auth.AuthResponse;
import com.connectchat.dto.auth.RegisterRequest;
import com.connectchat.dto.message.MessageDto;
import com.connectchat.dto.message.SendMessageRequest;
import com.connectchat.entity.Conversation;
import com.connectchat.enums.MessageType;
import com.connectchat.service.AuthService;
import com.connectchat.service.ConversationService;
import com.connectchat.service.MessageService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SpringBootTest
@Transactional
class MessageFlowIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private MessageService messageService;

    @Test
    void testMessageSendAndHistory() {
        // Register User 1 & 2
        RegisterRequest req1 = new RegisterRequest();
        req1.setFullName("User One");
        req1.setUsername("user_one_msg");
        req1.setEmail("u1_msg@test.com");
        req1.setPassword("Secret123!");
        req1.setConfirmPassword("Secret123!");
        AuthResponse u1 = authService.register(req1);

        RegisterRequest req2 = new RegisterRequest();
        req2.setFullName("User Two");
        req2.setUsername("user_two_msg");
        req2.setEmail("u2_msg@test.com");
        req2.setPassword("Secret123!");
        req2.setConfirmPassword("Secret123!");
        AuthResponse u2 = authService.register(req2);

        // Create private conversation
        Conversation conv = conversationService.getOrCreatePrivateConversation(u1.getUser().getId(), u2.getUser().getId());
        Assertions.assertNotNull(conv.getId());

        // Send message from U1
        SendMessageRequest sendReq = new SendMessageRequest();
        sendReq.setConversationId(conv.getId());
        sendReq.setContent("Hello from User One!");
        sendReq.setType(MessageType.TEXT);

        MessageDto sent = messageService.sendMessage(u1.getUser().getId(), sendReq);
        Assertions.assertNotNull(sent.getId());
        Assertions.assertEquals("Hello from User One!", sent.getContent());

        // Fetch messages as U2
        List<MessageDto> history = messageService.getConversationMessages(conv.getId(), u2.getUser().getId());
        Assertions.assertEquals(1, history.size());
        Assertions.assertEquals("Hello from User One!", history.get(0).getContent());

        // Test delete for everyone
        MessageDto deleted = messageService.deleteForEveryone(sent.getId(), u1.getUser().getId());
        Assertions.assertTrue(deleted.getDeletedForEveryone());
    }
}
