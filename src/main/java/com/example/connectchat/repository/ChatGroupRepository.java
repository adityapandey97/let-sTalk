package com.example.connectchat.repository;

import com.example.connectchat.model.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {

    @Query("SELECT g FROM ChatGroup g JOIN GroupMember gm ON g.id = gm.group.id WHERE gm.user.id = :userId ORDER BY g.createdAt DESC")
    List<ChatGroup> findGroupsByUserId(@Param("userId") Long userId);
}
