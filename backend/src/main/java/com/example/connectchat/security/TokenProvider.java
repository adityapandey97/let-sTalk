package com.example.connectchat.security;

import com.example.connectchat.model.AuthToken;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.AuthTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Component
public class TokenProvider {

    private final AuthTokenRepository authTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.token-expiry-hours:72}")
    private int tokenExpiryHours;

    public TokenProvider(AuthTokenRepository authTokenRepository) {
        this.authTokenRepository = authTokenRepository;
    }

    @Transactional
    public String generateToken(User user) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        LocalDateTime expiresAt = LocalDateTime.now().plusHours(tokenExpiryHours);
        AuthToken authToken = new AuthToken(token, user, expiresAt);
        authTokenRepository.save(authToken);
        return token;
    }

    @Transactional(readOnly = true)
    public Optional<User> validateTokenAndGetUser(String token) {
        if (token == null || token.trim().isEmpty()) {
            return Optional.empty();
        }

        Optional<AuthToken> tokenOpt = authTokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return Optional.empty();
        }

        AuthToken authToken = tokenOpt.get();
        if (authToken.isExpired()) {
            return Optional.empty();
        }

        return Optional.of(authToken.getUser());
    }

    @Transactional
    public void invalidateToken(String token) {
        if (token != null && !token.trim().isEmpty()) {
            authTokenRepository.deleteByToken(token);
        }
    }

    @Transactional
    public void invalidateAllForUser(Long userId) {
        if (userId != null) {
            authTokenRepository.deleteByUserId(userId);
        }
    }
}
