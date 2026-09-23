package com.connectchat;

import com.connectchat.dto.auth.AuthResponse;
import com.connectchat.dto.auth.RegisterRequest;
import com.connectchat.dto.connection.ConnectionDto;
import com.connectchat.enums.ConnectionStatus;
import com.connectchat.exception.BadRequestException;
import com.connectchat.service.AuthService;
import com.connectchat.service.ConnectionService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ConnectionIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private ConnectionService connectionService;

    @Test
    void testConnectionFlow() {
        // Register User A
        RegisterRequest reqA = new RegisterRequest();
        reqA.setFullName("Alice Smith");
        reqA.setUsername("alice_test");
        reqA.setEmail("alice@test.com");
        reqA.setPassword("Secret123!");
        reqA.setConfirmPassword("Secret123!");
        AuthResponse userA = authService.register(reqA);

        // Register User B
        RegisterRequest reqB = new RegisterRequest();
        reqB.setFullName("Bob Jones");
        reqB.setUsername("bob_test");
        reqB.setEmail("bob@test.com");
        reqB.setPassword("Secret123!");
        reqB.setConfirmPassword("Secret123!");
        AuthResponse userB = authService.register(reqB);

        // Cannot send request to self
        Assertions.assertThrows(BadRequestException.class, () ->
                connectionService.sendRequest(userA.getUser().getId(), userA.getUser().getId()));

        // Send connection request A -> B
        ConnectionDto pending = connectionService.sendRequest(userA.getUser().getId(), userB.getUser().getId());
        Assertions.assertEquals(ConnectionStatus.PENDING, pending.getStatus());

        // Prevent duplicate request
        Assertions.assertThrows(BadRequestException.class, () ->
                connectionService.sendRequest(userA.getUser().getId(), userB.getUser().getId()));

        // User B accepts request
        ConnectionDto accepted = connectionService.acceptRequest(pending.getId(), userB.getUser().getId());
        Assertions.assertEquals(ConnectionStatus.ACCEPTED, accepted.getStatus());
    }
}
