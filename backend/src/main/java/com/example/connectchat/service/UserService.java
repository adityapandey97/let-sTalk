package com.example.connectchat.service;

import com.example.connectchat.dto.*;
import com.example.connectchat.exception.BadRequestException;
import com.example.connectchat.exception.DuplicateResourceException;
import com.example.connectchat.exception.ResourceNotFoundException;
import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.ConnectionStatus;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.ConnectionRequestRepository;
import com.example.connectchat.repository.UserRepository;
import com.example.connectchat.util.PasswordUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{3,30}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$");
    private static final SecureRandom RANDOM = new SecureRandom();

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

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new BadRequestException("Email is required");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new BadRequestException("Password is required");
        }

        if (request.getPassword().trim().length() < 4) {
            throw new BadRequestException("Password must be at least 4 characters long");
        }

        String sanitizedUsername = request.getUsername().trim().toLowerCase();
        String sanitizedEmail = request.getEmail().trim().toLowerCase();

        if (!USERNAME_PATTERN.matcher(sanitizedUsername).matches()) {
            throw new BadRequestException("Username must be 3-30 characters long and contain only letters, numbers, and underscores");
        }

        if (!EMAIL_PATTERN.matcher(sanitizedEmail).matches()) {
            throw new BadRequestException("Please enter a valid email address");
        }

        if (userRepository.existsByUsername(sanitizedUsername)) {
            throw new DuplicateResourceException("Username already taken");
        }

        if (userRepository.existsByEmail(sanitizedEmail)) {
            throw new DuplicateResourceException("Email already registered with another account");
        }

        User user = new User(
            request.getFullName().trim(),
            sanitizedUsername,
            sanitizedEmail,
            request.getBio() != null ? request.getBio().trim() : "",
            request.getAvatarUrl(),
            request.getBgWallpaper()
        );

        user.setPassword(PasswordUtils.hashPassword(request.getPassword().trim()));
        user.setEmailVerified(true);
        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        return UserDto.fromEntity(savedUser);
    }

    @Transactional
    public String sendVerificationOtp(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new BadRequestException("Email or username is required");
        }

        String sanitized = identifier.trim().toLowerCase();
        User user = userRepository.findByUsernameOrEmail(sanitized)
            .orElseThrow(() -> new ResourceNotFoundException("No account found with email or username: " + sanitized));

        String otp = generateOtpCode();
        user.setVerificationCode(otp);
        user.setCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        return otp;
    }

    @Transactional
    public UserDto verifyOtp(VerifyOtpRequest request) {
        String identifier = request.getIdentifier();
        if (identifier == null || identifier.trim().isEmpty() || request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new BadRequestException("Email/username and 4-digit verification code are required");
        }

        String sanitized = identifier.trim().toLowerCase();
        User user = userRepository.findByUsernameOrEmail(sanitized)
            .orElseThrow(() -> new ResourceNotFoundException("No account found with: " + sanitized));

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(request.getCode().trim())) {
            throw new BadRequestException("Verification code does not match. Please try again.");
        }

        if (user.getCodeExpiresAt() != null && user.getCodeExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification code has expired. Please request a new one.");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setCodeExpiresAt(null);
        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());

        User saved = userRepository.save(user);
        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto login(EmailLoginRequest request) {
        if (request.getIdentifier() == null || request.getIdentifier().trim().isEmpty()) {
            throw new BadRequestException("Email or username is required");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new BadRequestException("Password is required");
        }

        String identifier = request.getIdentifier().trim().toLowerCase();
        User user = userRepository.findByUsernameOrEmail(identifier)
            .orElseThrow(() -> new BadRequestException("Invalid email/username or password"));

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            if (!PasswordUtils.verifyPassword(request.getPassword().trim(), user.getPassword())) {
                throw new BadRequestException("Invalid email/username or password");
            }
        }

        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());
        User saved = userRepository.save(user);
        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getBgWallpaper() != null) {
            user.setBgWallpaper(request.getBgWallpaper());
        }

        user.setLastSeen(LocalDateTime.now());
        User updated = userRepository.save(user);
        return UserDto.fromEntity(updated);
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
    public boolean isEmailAvailable(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        String sanitized = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.matcher(sanitized).matches()) {
            return false;
        }
        return !userRepository.existsByEmail(sanitized);
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
                user.getEmail(),
                user.getBio(),
                user.getAvatarUrl(),
                relationshipState,
                requestId
            ));
        }

        return results;
    }

    private String generateOtpCode() {
        int code = 1000 + RANDOM.nextInt(9000);
        return String.valueOf(code);
    }
}
