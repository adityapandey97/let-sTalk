package com.connectchat.repository;

import com.connectchat.entity.Connection;
import com.connectchat.entity.User;
import com.connectchat.enums.ConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {

    @Query("SELECT c FROM Connection c WHERE (c.sender.id = :u1 AND c.receiver.id = :u2) OR (c.sender.id = :u2 AND c.receiver.id = :u1)")
    Optional<Connection> findBetweenUsers(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT c FROM Connection c WHERE c.receiver.id = :userId AND c.status = 'PENDING'")
    List<Connection> findPendingRequestsForUser(@Param("userId") Long userId);

    @Query("SELECT c FROM Connection c WHERE (c.sender.id = :userId OR c.receiver.id = :userId) AND c.status = 'ACCEPTED'")
    List<Connection> findAcceptedConnectionsForUser(@Param("userId") Long userId);

    Optional<Connection> findByIdAndReceiverId(Long id, Long receiverId);

    @Query("SELECT COUNT(c) > 0 FROM Connection c WHERE ((c.sender.id = :u1 AND c.receiver.id = :u2) OR (c.sender.id = :u2 AND c.receiver.id = :u1)) AND c.status = :status")
    boolean areUsersConnected(@Param("u1") Long u1, @Param("u2") Long u2, @Param("status") ConnectionStatus status);
}
