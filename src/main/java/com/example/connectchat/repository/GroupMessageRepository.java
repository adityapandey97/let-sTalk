package com.example.connectchat.repository;

import com.example.connectchat.model.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {

    List<GroupMessage> findByGroupIdOrderBySentAtAsc(Long groupId);

    Optional<GroupMessage> findFirstByGroupIdOrderBySentAtDesc(Long groupId);

    default Optional<GroupMessage> findLastMessageInGroup(Long groupId) {
        return findFirstByGroupIdOrderBySentAtDesc(groupId);
    }
}
