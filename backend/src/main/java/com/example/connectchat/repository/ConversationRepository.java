package com.example.connectchat.repository;

import com.example.connectchat.model.Conversation;
import com.example.connectchat.model.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c JOIN ConversationMember cm ON cm.conversation.id = c.id WHERE cm.user.id = :userId ORDER BY c.updatedAt DESC")
    List<Conversation> findConversationsForUser(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c " +
           "JOIN ConversationMember cm1 ON cm1.conversation.id = c.id " +
           "JOIN ConversationMember cm2 ON cm2.conversation.id = c.id " +
           "WHERE c.type = 'PRIVATE' AND cm1.user.id = :user1Id AND cm2.user.id = :user2Id")
    Optional<Conversation> findPrivateConversationBetweenUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    List<Conversation> findByType(ConversationType type);
}
