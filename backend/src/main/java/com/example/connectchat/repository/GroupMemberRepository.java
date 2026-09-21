package com.example.connectchat.repository;

import com.example.connectchat.model.ChatGroup;
import com.example.connectchat.model.GroupMember;
import com.example.connectchat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    List<GroupMember> findByGroupIdOrderByJoinedAtAsc(Long groupId);

    void deleteByGroupIdAndUserId(Long groupId, Long userId);
}
