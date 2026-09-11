package com.example.connectchat.service;

import com.example.connectchat.dto.CreateUserRequest;
import com.example.connectchat.dto.UserDto;
import com.example.connectchat.dto.UserSearchResultDto;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.DuplicateResourceException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.ConnectionStatus;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.ConnectionRequestRepository;
import com.example.connectchat.repository.UserRepository;
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
    private final ConnectionRequestRepository connectionRequestRepository;

    public UserService(UserRepository userRepository, ConnectionRequestRepository connectionRequestRepository) {
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new BadRequestException("Full name is required");
        }

        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BadRequestException("Username is required");
        }

        String sanitizedUsername = request.getUsername().trim().toLowerCase();

        if (!USERNAME_PATTERN.matcher(sanitizedUsername).matches()) {
            throw new BadRequestException("Username must be 3-30 characters long and contain only letters, numbers, and underscores");
        }

        if (userRepository.existsByUsername(sanitizedUsername)) {
            throw new DuplicateResourceException("Username already taken");
        }

        User user = new User(
            request.getFullName().trim(),
            sanitizedUsername,
            request.getBio() != null ? request.getBio().trim() : ""
        );

        User savedUser = userRepository.save(user);
        return UserDto.fromEntity(savedUser);
    }

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        if (username == null || username.trim().isEmpty()) {
            return false;
        }
        String sanitized = username.trim().toLowerCase();
        if (!USERNAME_PATTERN.matcher(sanitized).matches()) {
            return false;
        }
        return !userRepository.existsByUsername(sanitized);
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserDto.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public List<UserSearchResultDto> searchUsers(String query, Long currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String sanitizedQuery = query.trim().toLowerCase();
        List<User> matchingUsers = userRepository.searchByUsernameExcludingSelf(sanitizedQuery, currentUserId);
        List<UserSearchResultDto> results = new ArrayList<>();

        for (User user : matchingUsers) {
            String relationshipState = "NONE";
            Long requestId = null;

            Optional<ConnectionRequest> relationOpt = connectionRequestRepository.findRelationshipBetween(currentUserId, user.getId());
            if (relationOpt.isPresent()) {
                ConnectionRequest cr = relationOpt.get();
                requestId = cr.getId();
                if (cr.getStatus() == ConnectionStatus.ACCEPTED) {
                    relationshipState = "CONNECTED";
                } else if (cr.getStatus() == ConnectionStatus.PENDING) {
                    if (cr.getSender().getId().equals(currentUserId)) {
                        relationshipState = "OUTGOING_PENDING";
                    } else {
                        relationshipState = "INCOMING_PENDING";
                    }
                } else if (cr.getStatus() == ConnectionStatus.REJECTED) {
                    relationshipState = "REJECTED";
                }
            }

            results.add(new UserSearchResultDto(
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getBio(),
                relationshipState,
                requestId
            ));
        }

        return results;
    }
}
