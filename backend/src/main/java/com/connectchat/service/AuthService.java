package com.connectchat.service;

import com.connectchat.dto.auth.AuthResponse;
import com.connectchat.dto.auth.LoginRequest;
import com.connectchat.dto.auth.RegisterRequest;
import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.entity.User;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.UnauthorizedException;
import com.connectchat.repository.UserRepository;
import com.connectchat.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{3,30}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new BadRequestException("Full name is required.");
        }

        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new BadRequestException("Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.");
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BadRequestException("Username '" + username + "' is already taken.");
        }

        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new BadRequestException("A valid email address is required.");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Email '" + email + "' is already registered.");
        }

        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters long.");
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match.");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(
                request.getFullName().trim(),
                username,
                email,
                hashedPassword,
                request.getBio(),
                request.getProfilePhoto()
        );
        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getId(), savedUser.getUsername());
        return new AuthResponse(token, new UserProfileDto(savedUser));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        String password = request.getPassword() != null ? request.getPassword() : "";

        if (identifier.isEmpty() || password.isEmpty()) {
            throw new BadRequestException("Username/email and password are required.");
        }

        User user = userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials. Please verify your username/email and password."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials. Please verify your username/email and password.");
        }

        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(token, new UserProfileDto(user));
    }

    @Transactional
    public void logout(Long userId) {
        if (userId == null) return;
        userRepository.findById(userId).ifPresent(user -> {
            user.setOnline(false);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found or session invalid."));
        return new UserProfileDto(user);
    }
}
