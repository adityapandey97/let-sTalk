package com.connectchat.repository;

import com.connectchat.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c JOIN c.members m WHERE m.user.id = :userId ORDER BY c.updatedAt DESC")
    List<Conversation> findConversationsByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c JOIN c.members m1 JOIN c.members m2 WHERE c.type = 'PRIVATE' AND m1.user.id = :u1 AND m2.user.id = :u2")
    Optional<Conversation> findPrivateConversationBetweenUsers(@Param("u1") Long u1, @Param("u2") Long u2);
}
