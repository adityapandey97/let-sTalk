package com.example.connectchat.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class PasswordUtils {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int SALT_BYTES = 16;

    private PasswordUtils() {
    }

    /**
     * Hashes a plain-text password using SHA-256 with a unique random salt.
     * Returns a string formatted as: hex(salt):hex(hash)
     */
    public static String hashPassword(String plainPassword) {
        if (plainPassword == null || plainPassword.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }

        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);

        byte[] hash = computeHash(salt, plainPassword);
        HexFormat hex = HexFormat.of();
        return hex.formatHex(salt) + ":" + hex.formatHex(hash);
    }

    /**
     * Verifies a plain-text password against the stored salt:hash string.
     */
    public static boolean verifyPassword(String plainPassword, String storedHash) {
        if (plainPassword == null || storedHash == null || !storedHash.contains(":")) {
            return false;
        }

        try {
            String[] parts = storedHash.split(":", 2);
            if (parts.length != 2) {
                return false;
            }

            HexFormat hex = HexFormat.of();
            byte[] salt = hex.parseHex(parts[0]);
            byte[] expectedHash = hex.parseHex(parts[1]);

            byte[] actualHash = computeHash(salt, plainPassword);
            return MessageDigest.isEqual(expectedHash, actualHash);
        } catch (Exception e) {
            return false;
        }
    }

    private static byte[] computeHash(byte[] salt, String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            return digest.digest(password.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not found", e);
        }
    }
}
