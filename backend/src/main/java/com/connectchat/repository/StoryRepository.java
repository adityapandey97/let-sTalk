package com.connectchat.repository;

import com.connectchat.entity.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    List<Story> findByUserIdAndExpiresAtAfterOrderByCreatedAtAsc(Long userId, LocalDateTime now);

    @Query("SELECT s FROM Story s WHERE s.expiresAt > :now ORDER BY s.createdAt ASC")
    List<Story> findAllActiveStories(@Param("now") LocalDateTime now);
}
