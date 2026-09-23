package com.connectchat.service;

import com.connectchat.dto.user.UpdateProfileRequest;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.dto.user.UserSearchDto;
import com.connectchat.entity.Connection;
import com.connectchat.entity.User;
import com.connectchat.enums.ConnectionStatus;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.repository.ConnectionRepository;
import com.connectchat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{3,30}$");

    private final UserRepository userRepository;
    private final ConnectionRepository connectionRepository;

    public UserService(UserRepository userRepository, ConnectionRepository connectionRepository) {
        this.userRepository = userRepository;
        this.connectionRepository = connectionRepository;
    }

    @Transactional(readOnly = true)
    public List<UserSearchDto> searchUsers(String query, Long currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        List<User> matchedUsers = userRepository.searchUsers(query.trim());
        List<UserSearchDto> results = new ArrayList<>();

        for (User u : matchedUsers) {
            if (u.getId().equals(currentUserId)) {
                continue; // Do not return oneself in search
            }

            UserSearchDto dto = new UserSearchDto();
            dto.setId(u.getId());
            dto.setFullName(u.getFullName());
            dto.setUsername(u.getUsername());
            dto.setBio(u.getBio());
            dto.setProfilePhoto(u.getProfilePhoto());
            dto.setOnline(u.getOnline());

            // Determine connection relationship
            Optional<Connection> connOpt = connectionRepository.findBetweenUsers(currentUserId, u.getId());
            if (connOpt.isPresent()) {
                Connection conn = connOpt.get();
                dto.setConnectionId(conn.getId());
                if (conn.getStatus() == ConnectionStatus.ACCEPTED) {
                    dto.setConnectionStatus("ACCEPTED");
                } else if (conn.getStatus() == ConnectionStatus.PENDING) {
                    if (conn.getSender().getId().equals(currentUserId)) {
                        dto.setConnectionStatus("PENDING_SENT");
                    } else {
                        dto.setConnectionStatus("PENDING_RECEIVED");
                    }
                } else {
                    dto.setConnectionStatus("NONE");
                }
            } else {
                dto.setConnectionStatus("NONE");
            }

            results.add(dto);
        }

        return results;
    }

    @Transactional(readOnly = true)
    public UserProfileDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return new UserProfileDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getUsername() != null && !request.getUsername().trim().equalsIgnoreCase(user.getUsername())) {
            String newUsername = request.getUsername().trim();
            if (!USERNAME_PATTERN.matcher(newUsername).matches()) {
                throw new BadRequestException("Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.");
            }
            if (userRepository.existsByUsernameIgnoreCase(newUsername)) {
                throw new BadRequestException("Username '" + newUsername + "' is already taken.");
            }
            user.setUsername(newUsername);
        }

        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }

        if (request.getProfilePhoto() != null) {
            user.setProfilePhoto(request.getProfilePhoto().trim());
        }

        User saved = userRepository.save(user);
        return new UserProfileDto(saved);
    }

    @Transactional
    public UserProfileDto updateProfilePhoto(Long userId, String photoUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setProfilePhoto(photoUrl != null ? photoUrl : "");
        User saved = userRepository.save(user);
        return new UserProfileDto(saved);
    }
}
