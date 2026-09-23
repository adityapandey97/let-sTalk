package com.connectchat.entity;

import com.connectchat.enums.CallStatus;
import com.connectchat.enums.CallType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "calls", indexes = {
    @Index(name = "idx_call_caller", columnList = "caller_id"),
    @Index(name = "idx_call_receiver", columnList = "receiver_id"),
    @Index(name = "idx_call_started", columnList = "started_at")
})
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caller_id", nullable = false)
    private User caller;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CallType type = CallType.AUDIO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CallStatus status = CallStatus.MISSED;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    public Call() {}

    public Call(User caller, User receiver, CallType type, CallStatus status) {
        this.caller = caller;
        this.receiver = receiver;
        this.type = type != null ? type : CallType.AUDIO;
        this.status = status != null ? status : CallStatus.MISSED;
        this.startedAt = LocalDateTime.now();
        this.durationSeconds = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getCaller() { return caller; }
    public void setCaller(User caller) { this.caller = caller; }

    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }

    public CallType getType() { return type; }
    public void setType(CallType type) { this.type = type; }

    public CallStatus getStatus() { return status; }
    public void setStatus(CallStatus status) { this.status = status; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
}
