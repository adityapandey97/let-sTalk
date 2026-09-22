package com.example.connectchat.config;

import com.example.connectchat.model.*;
import com.example.connectchat.repository.*;
import com.example.connectchat.util.PasswordUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Initializes default test accounts, connections, and sample conversations
 * if the database is newly initialized.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ConnectionRequestRepository connectionRequestRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRepository messageRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final StoryRepository storyRepository;

    public DataInitializer(UserRepository userRepository,
                           ConnectionRequestRepository connectionRequestRepository,
                           ConversationRepository conversationRepository,
                           ConversationMemberRepository conversationMemberRepository,
                           MessageRepository messageRepository,
                           ChatGroupRepository chatGroupRepository,
                           GroupMemberRepository groupMemberRepository,
                           GroupMessageRepository groupMessageRepository,
                           StoryRepository storyRepository) {
        this.userRepository = userRepository;
        this.connectionRequestRepository = connectionRequestRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messageRepository = messageRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.storyRepository = storyRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already contains users. Skipping initial seed.");
            return;
        }

        log.info("Seeding initial ConnectChat users and conversations...");

        String passwordHash = PasswordUtils.hashPassword("password123");

        // 1. Create Core Users
        User aditya = new User("Aditya Pandey", "aditya", "aditya@connectchat.com",
                "Lead Full-Stack Engineer & Architect at ConnectChat", null, null);
        aditya.setPassword(passwordHash);
        aditya.setEmailVerified(true);
        aditya.setOnline(true);
        aditya.setLastSeen(LocalDateTime.now());
        User savedAditya = userRepository.save(aditya);

        User rahul = new User("Rahul Sharma", "rahul", "rahul@connectchat.com",
                "Frontend Specialist & UI/UX Designer", null, null);
        rahul.setPassword(passwordHash);
        rahul.setEmailVerified(true);
        rahul.setOnline(true);
        rahul.setLastSeen(LocalDateTime.now());
        User savedRahul = userRepository.save(rahul);

        User priya = new User("Priya Patel", "priya", "priya@connectchat.com",
                "DevOps & Cloud Systems Lead", null, null);
        priya.setPassword(passwordHash);
        priya.setEmailVerified(true);
        priya.setOnline(false);
        priya.setLastSeen(LocalDateTime.now().minusHours(2));
        User savedPriya = userRepository.save(priya);

        // 2. Establish Accepted Connections
        ConnectionRequest req1 = new ConnectionRequest(savedAditya, savedRahul, ConnectionStatus.ACCEPTED);
        connectionRequestRepository.save(req1);

        ConnectionRequest req2 = new ConnectionRequest(savedPriya, savedAditya, ConnectionStatus.ACCEPTED);
        connectionRequestRepository.save(req2);

        // 3. Create Private Conversation between Aditya and Rahul
        Conversation conversation = new Conversation(ConversationType.PRIVATE, null, savedAditya);
        Conversation savedConv = conversationRepository.save(conversation);

        conversationMemberRepository.save(new ConversationMember(savedConv, savedAditya, "MEMBER"));
        conversationMemberRepository.save(new ConversationMember(savedConv, savedRahul, "MEMBER"));

        // 4. Seed Messages in Conversation
        Message msg1 = new Message(savedConv, savedAditya, savedRahul,
                "Hey Rahul! Welcome to ConnectChat. Real-time messaging, WebRTC calling, and media file sharing are active!",
                MessageType.TEXT, null, null, MessageStatus.READ);
        msg1.setSentAt(LocalDateTime.now().minusMinutes(15));
        messageRepository.save(msg1);

        Message msg2 = new Message(savedConv, savedRahul, savedAditya,
                "Hey Aditya! The UI is looking super clean and ultra responsive. Testing out the real-time status ticks and WebRTC audio/video calling!",
                MessageType.TEXT, null, null, MessageStatus.READ);
        msg2.setSentAt(LocalDateTime.now().minusMinutes(10));
        messageRepository.save(msg2);

        Message msg3 = new Message(savedConv, savedAditya, savedRahul,
                "Awesome! Feel free to send documents, photos, audio clips, or test deleting messages.",
                MessageType.TEXT, null, null, MessageStatus.READ);
        msg3.setSentAt(LocalDateTime.now().minusMinutes(5));
        messageRepository.save(msg3);

        savedConv.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(savedConv);

        // 5. Create Sample Group
        ChatGroup group = new ChatGroup("ConnectChat Core Team", savedAditya);
        ChatGroup savedGroup = chatGroupRepository.save(group);
        groupMemberRepository.save(new GroupMember(savedGroup, savedAditya));
        groupMemberRepository.save(new GroupMember(savedGroup, savedRahul));

        GroupMessage gmsg = new GroupMessage(savedGroup, savedAditya, "Welcome everyone to the ConnectChat Core Team group channel!");
        groupMessageRepository.save(gmsg);

        // 6. Create Active Story
        Story story = new Story(savedAditya, MessageType.TEXT, null, "ConnectChat v2.0 is live with WebRTC Calling and high-speed file transfers!", null);
        storyRepository.save(story);

        log.info("ConnectChat initial database seed completed successfully.");
    }
}
