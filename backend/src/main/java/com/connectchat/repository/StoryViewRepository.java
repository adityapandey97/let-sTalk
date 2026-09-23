package com.connectchat.repository;

import com.connectchat.entity.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    Optional<StoryView> findByStoryIdAndViewerId(Long storyId, Long viewerId);

    List<StoryView> findByStoryId(Long storyId);

    boolean existsByStoryIdAndViewerId(Long storyId, Long viewerId);
}
