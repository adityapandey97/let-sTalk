package com.example.connectchat.model;

/**
 * Enumeration of supported chat message types in Let's Talk.
 * Supports standard text, multimedia (images, videos, voice notes),
 * interactive contact cards, and document/file attachments (PDFs, ZIPs, docs, etc.).
 */
public enum MessageType {
    TEXT,
    IMAGE,
    VIDEO,
    AUDIO,
    CONTACT,
    FILE
}

