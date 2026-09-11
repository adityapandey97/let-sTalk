package com.example.connectchat.controller;

import com.example.connectchat.dto.CreateUserRequest;
import com.example.connectchat.dto.UserDto;
import com.example.connectchat.dto.UserSearchResultDto;
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

    @GetMapping("/username-available")
    public ResponseEntity<Map<String, Boolean>> isUsernameAvailable(@RequestParam("username") String username) {
        boolean available = userService.isUsernameAvailable(username);
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
