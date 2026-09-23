package com.connectchat.controller;

import com.connectchat.dto.user.UpdateProfileRequest;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.dto.user.UserSearchDto;
import com.connectchat.entity.User;
import com.connectchat.service.FileService;
import com.connectchat.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final FileService fileService;

    public UserController(UserService userService, FileService fileService) {
        this.userService = userService;
        this.fileService = fileService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchDto>> searchUsers(@RequestParam(value = "q", required = false) String q,
                                                           @RequestParam(value = "query", required = false) String query,
                                                           @AuthenticationPrincipal User currentUser) {
        String searchQuery = (q != null) ? q.trim() : (query != null ? query.trim() : "");
        List<UserSearchDto> users = userService.searchUsers(searchQuery, currentUser.getId());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getUserById(@PathVariable Long id) {
        UserProfileDto profile = userService.getUserById(id);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileDto> updateProfile(@AuthenticationPrincipal User currentUser,
                                                        @RequestBody UpdateProfileRequest request) {
        UserProfileDto updated = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/profile-photo")
    public ResponseEntity<UserProfileDto> updateProfilePhoto(@AuthenticationPrincipal User currentUser,
                                                            @RequestParam(value = "file", required = false) MultipartFile file,
                                                            @RequestBody(required = false) Map<String, String> body) {
        String photoUrl;
        if (file != null && !file.isEmpty()) {
            photoUrl = fileService.storeFile(file, "profile");
        } else if (body != null && body.containsKey("photoUrl")) {
            photoUrl = body.get("photoUrl");
        } else {
            photoUrl = "";
        }
        UserProfileDto updated = userService.updateProfilePhoto(currentUser.getId(), photoUrl);
        return ResponseEntity.ok(updated);
    }
}
