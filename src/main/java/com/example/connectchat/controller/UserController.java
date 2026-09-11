package com.example.connectchat.controller;

import com.example.connectchat.dto.*;
import com.example.connectchat.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
        UserDto created = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@RequestBody SendOtpRequest request) {
        String otp = userService.sendVerificationOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Verification code sent to email", "otp", otp));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<UserDto> verifyOtp(@RequestBody VerifyOtpRequest request) {
        UserDto verified = userService.verifyOtp(request);
        return ResponseEntity.ok(verified);
    }

    @PostMapping("/login")
    public ResponseEntity<UserDto> login(@RequestBody EmailLoginRequest request) {
        UserDto user = userService.login(request);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<UserDto> updateProfile(@PathVariable("id") Long id,
                                                 @RequestBody UpdateProfileRequest request) {
        UserDto updated = userService.updateProfile(id, request);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/username-available")
    public ResponseEntity<Map<String, Boolean>> isUsernameAvailable(@RequestParam("username") String username) {
        boolean available = userService.isUsernameAvailable(username);
        return ResponseEntity.ok(Collections.singletonMap("available", available));
    }

    @GetMapping("/email-available")
    public ResponseEntity<Map<String, Boolean>> isEmailAvailable(@RequestParam("email") String email) {
        boolean available = userService.isEmailAvailable(email);
        return ResponseEntity.ok(Collections.singletonMap("available", available));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResultDto>> searchUsers(@RequestParam("username") String query,
                                                                 @RequestParam("currentUserId") Long currentUserId) {
        List<UserSearchResultDto> results = userService.searchUsers(query, currentUserId);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable("id") Long id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
}
