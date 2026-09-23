package com.connectchat;

import com.connectchat.dto.auth.AuthResponse;
import com.connectchat.dto.auth.LoginRequest;
import com.connectchat.dto.auth.RegisterRequest;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.UnauthorizedException;
import com.connectchat.service.AuthService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuthIntegrationTest {

    @Autowired
    private AuthService authService;

    @Test
    void testRegisterAndLoginFlow() {
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setFullName("Test User");
        registerReq.setUsername("testuser1");
        registerReq.setEmail("testuser1@example.com");
        registerReq.setPassword("Password123!");
        registerReq.setConfirmPassword("Password123!");
        registerReq.setBio("Hello, ConnectChat!");

        AuthResponse regResponse = authService.register(registerReq);
        Assertions.assertNotNull(regResponse.getToken());
        Assertions.assertEquals("testuser1", regResponse.getUser().getUsername());

        // Test login
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier("testuser1");
        loginReq.setPassword("Password123!");

        AuthResponse loginResponse = authService.login(loginReq);
        Assertions.assertNotNull(loginResponse.getToken());
        Assertions.assertEquals("testuser1", loginResponse.getUser().getUsername());
    }

    @Test
    void testDuplicateUsernameFails() {
        RegisterRequest req1 = new RegisterRequest();
        req1.setFullName("User One");
        req1.setUsername("duplicate_user");
        req1.setEmail("user1@example.com");
        req1.setPassword("Password123!");
        req1.setConfirmPassword("Password123!");
        authService.register(req1);

        RegisterRequest req2 = new RegisterRequest();
        req2.setFullName("User Two");
        req2.setUsername("duplicate_user");
        req2.setEmail("user2@example.com");
        req2.setPassword("Password123!");
        req2.setConfirmPassword("Password123!");

        Assertions.assertThrows(BadRequestException.class, () -> authService.register(req2));
    }

    @Test
    void testDuplicateEmailFails() {
        RegisterRequest req1 = new RegisterRequest();
        req1.setFullName("User One");
        req1.setUsername("unique_user_1");
        req1.setEmail("same@example.com");
        req1.setPassword("Password123!");
        req1.setConfirmPassword("Password123!");
        authService.register(req1);

        RegisterRequest req2 = new RegisterRequest();
        req2.setFullName("User Two");
        req2.setUsername("unique_user_2");
        req2.setEmail("same@example.com");
        req2.setPassword("Password123!");
        req2.setConfirmPassword("Password123!");

        Assertions.assertThrows(BadRequestException.class, () -> authService.register(req2));
    }

    @Test
    void testInvalidLoginCredentials() {
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier("nonexistent_user");
        loginReq.setPassword("WrongPassword");

        Assertions.assertThrows(UnauthorizedException.class, () -> authService.login(loginReq));
    }
}
