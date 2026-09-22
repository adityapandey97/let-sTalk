package com.example.connectchat.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class PasswordUtils {

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder(12);

    private PasswordUtils() {
    }

    /**
     * Hashes password using standard BCrypt
     */
    public static String hashPassword(String plainPassword) {
        if (plainPassword == null || plainPassword.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        return BCRYPT.encode(plainPassword);
    }

    /**
     * Verifies password against BCrypt or legacy salt:hash
     */
    public static boolean verifyPassword(String plainPassword, String storedHash) {
        if (plainPassword == null || storedHash == null || storedHash.isEmpty()) {
            return false;
        }

        // Standard BCrypt check
        if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
            return BCRYPT.matches(plainPassword, storedHash);
        }

        // Fallback for legacy salt:hash
        if (storedHash.contains(":")) {
            try {
                String[] parts = storedHash.split(":", 2);
                if (parts.length != 2) return false;
                HexFormat hex = HexFormat.of();
                byte[] salt = hex.parseHex(parts[0]);
                byte[] expectedHash = hex.parseHex(parts[1]);
                byte[] actualHash = computeLegacyHash(salt, plainPassword);
                return MessageDigest.isEqual(expectedHash, actualHash);
            } catch (Exception e) {
                return false;
            }
        }

        return false;
    }

    private static byte[] computeLegacyHash(byte[] salt, String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            return digest.digest(password.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not found", e);
        }
    }
}

