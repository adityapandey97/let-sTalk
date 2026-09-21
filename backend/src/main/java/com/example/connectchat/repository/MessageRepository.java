package com.example.connectchat.repository;

import com.example.connectchat.model.Message;
import com.example.connectchat.model.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender.id = :user1Id AND m.receiver.id = :user2Id) OR " +
           "(m.sender.id = :user2Id AND m.receiver.id = :user1Id) " +
           "ORDER BY m.sentAt ASC")
    List<Message> findConversationBetween(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    Optional<Message> findFirstBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderBySentAtDesc(
            Long senderId1, Long receiverId1, Long senderId2, Long receiverId2);

    default Optional<Message> findLastMessageBetween(Long user1Id, Long user2Id) {
        return findFirstBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderBySentAtDesc(user1Id, user2Id, user2Id, user1Id);
    }

    @Query("SELECT m FROM Message m WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.status <> com.example.connectchat.model.MessageStatus.READ")
    List<Message> findUnreadMessagesFromSender(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.status <> com.example.connectchat.model.MessageStatus.READ")
    long countUnreadMessages(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Message m SET m.status = :newStatus WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.status <> com.example.connectchat.model.MessageStatus.READ")
    int markMessagesAsRead(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId, @Param("newStatus") MessageStatus newStatus);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Message m WHERE (m.sender.id = :user1Id AND m.receiver.id = :user2Id) OR (m.sender.id = :user2Id AND m.receiver.id = :user1Id)")
    int deleteConversationBetween(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Message m WHERE m.id = :messageId AND (m.sender.id = :userId OR m.receiver.id = :userId)")
    int deleteSingleMessage(@Param("messageId") Long messageId, @Param("userId") Long userId);
}
