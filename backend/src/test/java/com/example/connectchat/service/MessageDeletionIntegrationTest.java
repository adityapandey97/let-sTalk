package com.example.connectchat.service;

import com.example.connectchat.dto.PrivateMessageDto;
import com.example.connectchat.model.Message;
import com.example.connectchat.model.MessageStatus;
import com.example.connectchat.model.MessageType;
import com.example.connectchat.model.User;
import com.example.connectchat.repository.MessageRepository;
import com.example.connectchat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class MessageDeletionIntegrationTest {

    @Autowired
    private PrivateMessageService privateMessageService;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAll();

        user1 = userRepository.findByUsername("alice_del_test").orElseGet(() ->
            userRepository.save(new User("Alice Wonderland", "alice_del_test", "alice_del@example.com", "Bio", "avatar1", "default"))
        );
        user2 = userRepository.findByUsername("bob_del_test").orElseGet(() ->
            userRepository.save(new User("Bob Builder", "bob_del_test", "bob_del@example.com", "Bio", "avatar2", "default"))
        );
    }

    @Test
    void testDeleteSingleMessageSuccessfully() {
        Message msg = messageRepository.save(new Message(user1, user2, "Hello Bob!", MessageType.TEXT, null, null, MessageStatus.SENT));
        Long msgId = msg.getId();

        assertTrue(messageRepository.existsById(msgId));

        // Delete message
        privateMessageService.deleteMessage(msgId, user1.getId());

        assertFalse(messageRepository.existsById(msgId));
    }

    @Test
    void testDeleteEntireConversationSuccessfully() {
        messageRepository.save(new Message(user1, user2, "Msg 1", MessageType.TEXT, null, null, MessageStatus.SENT));
        messageRepository.save(new Message(user2, user1, "Msg 2", MessageType.TEXT, null, null, MessageStatus.SENT));
        messageRepository.save(new Message(user1, user2, "Msg 3", MessageType.FILE, "/uploads/test.pdf", "test.pdf", MessageStatus.SENT));

        List<Message> history = messageRepository.findConversationBetween(user1.getId(), user2.getId());
        assertEquals(3, history.size());

        // Clear conversation
        privateMessageService.deleteConversation(user1.getId(), user2.getId());

        List<Message> clearedHistory = messageRepository.findConversationBetween(user1.getId(), user2.getId());
        assertEquals(0, clearedHistory.size());
    }

    @Test
    void testReactToMessageSuccessfully() {
        Message msg = messageRepository.save(new Message(user1, user2, "React test message", MessageType.TEXT, null, null, MessageStatus.SENT));
        PrivateMessageDto reacted = privateMessageService.reactToMessage(msg.getId(), user1.getId(), "❤️");
        assertNotNull(reacted);
        assertNotNull(reacted.getReactions());
        assertTrue(reacted.getReactions().contains("❤️"));

        // Toggle off reaction
        PrivateMessageDto unreacted = privateMessageService.reactToMessage(msg.getId(), user1.getId(), "❤️");
        assertNotNull(unreacted);
        assertFalse(unreacted.getReactions().contains("❤️"));
    }
}
