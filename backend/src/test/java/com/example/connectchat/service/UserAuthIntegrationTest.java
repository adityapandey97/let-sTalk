package com.example.connectchat.service;

import com.example.connectchat.dto.CreateUserRequest;
import com.example.connectchat.dto.EmailLoginRequest;
import com.example.connectchat.dto.UserDto;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.DuplicateResourceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class UserAuthIntegrationTest {

    @Autowired
    private UserService userService;

    @Test
    void testRegisterWithUniqueUsernameProfilePicAndLoginWithUsernameOrEmail() {
        CreateUserRequest req = new CreateUserRequest();
        req.setFullName("John Doe");
        req.setUsername("johndoe_test");
        req.setEmail("johndoe@test.com");
        req.setPassword("mySecurePassword123");
        req.setAvatarUrl("🚀");
        req.setBio("Hello world!");

        // 1. Register user
        UserDto registered = userService.createUser(req);
        assertNotNull(registered);
        assertEquals("johndoe_test", registered.getUsername());
        assertEquals("johndoe@test.com", registered.getEmail());
        assertTrue(registered.isEmailVerified(), "Registered user should be directly verified without OTP");
        assertEquals("🚀", registered.getAvatarUrl());

        // 2. Duplicate username should be rejected
        CreateUserRequest duplicateUsernameReq = new CreateUserRequest();
        duplicateUsernameReq.setFullName("Jane Doe");
        duplicateUsernameReq.setUsername("johndoe_test");
        duplicateUsernameReq.setEmail("different@test.com");
        duplicateUsernameReq.setPassword("password456");
        assertThrows(DuplicateResourceException.class, () -> userService.createUser(duplicateUsernameReq));

        // 3. Login using username and password
        EmailLoginRequest loginWithUsername = new EmailLoginRequest("johndoe_test", "mySecurePassword123");
        UserDto loggedInWithUsername = userService.login(loginWithUsername);
        assertNotNull(loggedInWithUsername);
        assertEquals(registered.getId(), loggedInWithUsername.getId());

        // 4. Login using email and password
        EmailLoginRequest loginWithEmail = new EmailLoginRequest("johndoe@test.com", "mySecurePassword123");
        UserDto loggedInWithEmail = userService.login(loginWithEmail);
        assertNotNull(loggedInWithEmail);
        assertEquals(registered.getId(), loggedInWithEmail.getId());

        // 5. Login with invalid password should fail
        EmailLoginRequest invalidPwdReq = new EmailLoginRequest("johndoe_test", "wrongPassword");
        assertThrows(BadRequestException.class, () -> userService.login(invalidPwdReq));
    }
}
