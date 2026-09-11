package com.example.connectchat.repository;

import com.example.connectchat.model.ConnectionRequest;
import com.example.connectchat.model.ConnectionStatus;
import com.example.connectchat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRequestRepository extends JpaRepository<ConnectionRequest, Long> {

    @Query("SELECT cr FROM ConnectionRequest cr WHERE " +
           "(cr.sender.id = :user1Id AND cr.receiver.id = :user2Id) OR " +
           "(cr.sender.id = :user2Id AND cr.receiver.id = :user1Id)")
    Optional<ConnectionRequest> findRelationshipBetween(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    @Query("SELECT cr FROM ConnectionRequest cr WHERE " +
           "((cr.sender.id = :user1Id AND cr.receiver.id = :user2Id) OR " +
           " (cr.sender.id = :user2Id AND cr.receiver.id = :user1Id)) AND " +
           "cr.status = com.example.connectchat.model.ConnectionStatus.ACCEPTED")
    Optional<ConnectionRequest> findAcceptedConnectionBetween(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    List<ConnectionRequest> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, ConnectionStatus status);

    @Query("SELECT cr FROM ConnectionRequest cr WHERE " +
           "(cr.sender.id = :userId OR cr.receiver.id = :userId) AND " +
           "cr.status = com.example.connectchat.model.ConnectionStatus.ACCEPTED ORDER BY cr.updatedAt DESC")
    List<ConnectionRequest> findAllAcceptedConnectionsForUser(@Param("userId") Long userId);
}
