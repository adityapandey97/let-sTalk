package com.example.connectchat.controller;

import com.example.connectchat.dto.AuthResponseDto;
import com.example.connectchat.dto.CreateUserRequest;
import com.example.connectchat.dto.EmailLoginRequest;
import com.example.connectchat.dto.UserDto;
import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.UserRepository;
import com.example.connectchat.security.AuthInterceptor;
import com.example.connectchat.security.TokenProvider;
import com.example.connectchat.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller handling user authentication, session tokens, and identity resolution.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final TokenProvider tokenProvider;

    public AuthController(UserService userService, UserRepository userRepository, TokenProvider tokenProvider) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.tokenProvider = tokenProvider;
    }

    /**
     * Registers a new account and generates an active auth session token.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@RequestBody CreateUserRequest request) {
        UserDto userDto = userService.createUser(request);
        User userEntity = userRepository.findById(userDto.getId())
                .orElseThrow(() -> new UnauthorizedException("User creation verification failed"));
        String token = tokenProvider.generateToken(userEntity);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponseDto(token, userDto, "Registration successful"));
    }

    /**
     * Authenticates existing user with username/email and BCrypt password,
     * issuing an active auth token.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody EmailLoginRequest request) {
        UserDto userDto = userService.login(request);
        User userEntity = userRepository.findById(userDto.getId())
                .orElseThrow(() -> new UnauthorizedException("Authentication failed"));
        String token = tokenProvider.generateToken(userEntity);
        return ResponseEntity.ok(new AuthResponseDto(token, userDto, "Login successful"));
    }

    /**
     * Terminates active session by invalidating the bearer token.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        String token = resolveToken(request);
        if (token != null) {
            tokenProvider.invalidateToken(token);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * Returns profile of the currently authenticated user based on bearer token.
     */
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(HttpServletRequest request) {
        User user = (User) request.getAttribute(AuthInterceptor.CURRENT_USER_ATTR);
        if (user == null) {
            // Check authorization token directly in case interceptor was bypassed
            String token = resolveToken(request);
            if (token != null) {
                user = tokenProvider.validateTokenAndGetUser(token).orElse(null);
            }
        }

        if (user == null) {
            throw new UnauthorizedException("Not authenticated. Please provide valid bearer token.");
        }

        return ResponseEntity.ok(UserDto.fromEntity(user));
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7).trim();
        }
        String paramToken = request.getParameter("token");
        if (paramToken != null && !paramToken.trim().isEmpty()) {
            return paramToken.trim();
        }
        return null;
    }
}
