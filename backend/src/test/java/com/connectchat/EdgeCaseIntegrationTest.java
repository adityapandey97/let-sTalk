package com.connectchat;

import com.connectchat.dto.auth.AuthResponse;
import com.connectchat.dto.auth.RegisterRequest;
import com.connectchat.dto.connection.ConnectionDto;
import com.connectchat.dto.message.MessageDto;
import com.connectchat.dto.message.SendMessageRequest;
import com.connectchat.dto.user.UserSearchDto;
import com.connectchat.entity.Conversation;
import com.connectchat.enums.MessageType;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.security.JwtService;
import com.connectchat.service.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SpringBootTest
@Transactional
class EdgeCaseIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @Autowired
    private ConnectionService connectionService;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private JwtService jwtService;

    private AuthResponse userA;
    private AuthResponse userB;
    private AuthResponse userC;

    @BeforeEach
    void setUp() {
        long rnd = System.nanoTime() % 100000;
        RegisterRequest reqA = new RegisterRequest();
        reqA.setFullName("Alpha User");
        reqA.setUsername("alpha_" + rnd);
        reqA.setEmail("alpha_" + rnd + "@example.com");
        reqA.setPassword("Password123!");
        reqA.setConfirmPassword("Password123!");
        userA = authService.register(reqA);

        RegisterRequest reqB = new RegisterRequest();
        reqB.setFullName("Beta User");
        reqB.setUsername("beta_" + rnd);
        reqB.setEmail("beta_" + rnd + "@example.com");
        reqB.setPassword("Password123!");
        reqB.setConfirmPassword("Password123!");
        userB = authService.register(reqB);

        RegisterRequest reqC = new RegisterRequest();
        reqC.setFullName("Gamma User");
        reqC.setUsername("gamma_" + rnd);
        reqC.setEmail("gamma_" + rnd + "@example.com");
        reqC.setPassword("Password123!");
        reqC.setConfirmPassword("Password123!");
        userC = authService.register(reqC);
    }

    @Test
    void testEmptyAndWhitespaceUserSearchReturnsEmpty() {
        List<UserSearchDto> emptyResult = userService.searchUsers("", userA.getUser().getId());
        Assertions.assertTrue(emptyResult.isEmpty());

        List<UserSearchDto> whitespaceResult = userService.searchUsers("   ", userA.getUser().getId());
        Assertions.assertTrue(whitespaceResult.isEmpty());

        List<UserSearchDto> nullResult = userService.searchUsers(null, userA.getUser().getId());
        Assertions.assertTrue(nullResult.isEmpty());
    }

    @Test
    void testSelfConnectionRequestFails() {
        Assertions.assertThrows(BadRequestException.class, () ->
                connectionService.sendRequest(userA.getUser().getId(), userA.getUser().getId()));
    }

    @Test
    void testNullTargetConnectionRequestFails() {
        Assertions.assertThrows(BadRequestException.class, () ->
                connectionService.sendRequest(userA.getUser().getId(), null));
    }

    @Test
    void testDuplicateConnectionRequestFails() {
        connectionService.sendRequest(userA.getUser().getId(), userB.getUser().getId());

        Assertions.assertThrows(BadRequestException.class, () ->
                connectionService.sendRequest(userA.getUser().getId(), userB.getUser().getId()));
    }

    @Test
    void testAcceptOtherUserConnectionRequestFails() {
        ConnectionDto req = connectionService.sendRequest(userA.getUser().getId(), userB.getUser().getId());

        // User C is neither sender nor receiver, cannot accept
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                connectionService.acceptRequest(req.getId(), userC.getUser().getId()));
    }

    @Test
    void testNonMemberCannotSendMessage() {
        // Conversation between A and B
        Conversation conv = conversationService.getOrCreatePrivateConversation(userA.getUser().getId(), userB.getUser().getId());

        // User C tries to post message to conversation of A & B
        SendMessageRequest msgReq = new SendMessageRequest();
        msgReq.setConversationId(conv.getId());
        msgReq.setContent("Intruder message!");
        msgReq.setType(MessageType.TEXT);

        Assertions.assertThrows(BadRequestException.class, () ->
                messageService.sendMessage(userC.getUser().getId(), msgReq));
    }

    @Test
    void testNonSenderCannotDeleteForEveryone() {
        Conversation conv = conversationService.getOrCreatePrivateConversation(userA.getUser().getId(), userB.getUser().getId());

        SendMessageRequest msgReq = new SendMessageRequest();
        msgReq.setConversationId(conv.getId());
        msgReq.setContent("Message from Alpha");
        msgReq.setType(MessageType.TEXT);
        MessageDto sent = messageService.sendMessage(userA.getUser().getId(), msgReq);

        // User B tries to delete User A's message for everyone
        Assertions.assertThrows(BadRequestException.class, () ->
                messageService.deleteForEveryone(sent.getId(), userB.getUser().getId()));
    }

    @Test
    void testDeleteNonExistentMessageFails() {
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                messageService.deleteForEveryone(999999L, userA.getUser().getId()));
    }

    @Test
    void testMalformedAndTamperedJwtValidation() {
        Assertions.assertFalse(jwtService.isTokenValid(""));
        Assertions.assertFalse(jwtService.isTokenValid(null));
        Assertions.assertFalse(jwtService.isTokenValid("not.a.valid.jwt.token"));
        Assertions.assertFalse(jwtService.isTokenValid("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.tampered_signature"));
    }
}
