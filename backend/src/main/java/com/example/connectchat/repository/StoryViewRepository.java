package com.example.connectchat.repository;

import com.example.connectchat.model.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoryViewRepository extends JpaRepository<StoryView, Long> {
    long countByStoryId(Long storyId);
    boolean existsByStoryIdAndViewerId(Long storyId, Long viewerId);
    List<StoryView> findByStoryId(Long storyId);
}
