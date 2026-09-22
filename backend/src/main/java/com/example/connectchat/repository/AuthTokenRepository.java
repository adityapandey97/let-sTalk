package com.example.connectchat.repository;

import com.example.connectchat.model.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {

    Optional<AuthToken> findByToken(String token);

    @Modifying
    @Query("DELETE FROM AuthToken a WHERE a.token = :token")
    void deleteByToken(@Param("token") String token);

    @Modifying
    @Query("DELETE FROM AuthToken a WHERE a.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
