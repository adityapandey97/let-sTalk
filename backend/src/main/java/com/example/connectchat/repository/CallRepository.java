package com.example.connectchat.repository;

import com.example.connectchat.model.CallRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallRepository extends JpaRepository<CallRecord, Long> {

    @Query("SELECT c FROM CallRecord c WHERE c.caller.id = :userId OR c.receiver.id = :userId ORDER BY c.startedAt DESC")
    List<CallRecord> findCallsForUser(@Param("userId") Long userId);
}
