package com.example.connectchat.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordUtilsTest {

    @Test
    void testHashAndVerifySuccess() {
        String password = "SecretPassword123!";
        String hash = PasswordUtils.hashPassword(password);

        assertNotNull(hash);
        assertTrue(hash.contains(":"));
        assertTrue(PasswordUtils.verifyPassword(password, hash));
    }

    @Test
    void testVerifyFailureOnWrongPassword() {
        String password = "SecretPassword123!";
        String hash = PasswordUtils.hashPassword(password);

        assertFalse(PasswordUtils.verifyPassword("WrongPassword", hash));
    }

    @Test
    void testUniqueSaltProducesDifferentHashes() {
        String password = "SamePassword";
        String hash1 = PasswordUtils.hashPassword(password);
        String hash2 = PasswordUtils.hashPassword(password);

        assertNotEquals(hash1, hash2);
        assertTrue(PasswordUtils.verifyPassword(password, hash1));
        assertTrue(PasswordUtils.verifyPassword(password, hash2));
    }

    @Test
    void testInvalidInputs() {
        assertThrows(IllegalArgumentException.class, () -> PasswordUtils.hashPassword(null));
        assertThrows(IllegalArgumentException.class, () -> PasswordUtils.hashPassword(""));
        assertFalse(PasswordUtils.verifyPassword(null, "somehash"));
        assertFalse(PasswordUtils.verifyPassword("password", null));
        assertFalse(PasswordUtils.verifyPassword("password", "invalidformat"));
    }
}
