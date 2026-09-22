package com.example.connectchat.security;

import com.example.connectchat.exception.UnauthorizedException;
import com.example.connectchat.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER_ATTR = "authenticatedUser";
    private final TokenProvider tokenProvider;

    public AuthInterceptor(TokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        String uri = request.getRequestURI();

        // Whitelisted public endpoints
        if (uri.startsWith("/api/auth/login") ||
            uri.startsWith("/api/auth/register") ||
            uri.startsWith("/api/media/") ||
            uri.startsWith("/api/files/") ||
            uri.startsWith("/uploads/") ||
            uri.startsWith("/h2-console") ||
            uri.startsWith("/ws") ||
            !uri.startsWith("/api/")) {
            return true;
        }

        // Check Authorization header or query param token
        String token = resolveToken(request);
        if (token == null) {
            throw new UnauthorizedException("Authentication token is missing. Please sign in.");
        }

        Optional<User> userOpt = tokenProvider.validateTokenAndGetUser(token);
        if (userOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid or expired session. Please sign in again.");
        }

        request.setAttribute(CURRENT_USER_ATTR, userOpt.get());
        return true;
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
