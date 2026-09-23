package com.connectchat.dto.call;

import com.connectchat.dto.user.UserProfileDto;
import com.connectchat.entity.Call;
import com.connectchat.enums.CallStatus;
import com.connectchat.enums.CallType;
import java.time.LocalDateTime;

public class CallDto {
    private Long id;
    private UserProfileDto caller;
    private UserProfileDto receiver;
    private CallType type;
    private CallStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer durationSeconds;
    private Boolean isOutgoing;

    public CallDto() {}

    public CallDto(Call call, Long currentUserId) {
        if (call != null) {
            this.id = call.getId();
            this.caller = new UserProfileDto(call.getCaller());
            this.receiver = new UserProfileDto(call.getReceiver());
            this.type = call.getType();
            this.status = call.getStatus();
            this.startedAt = call.getStartedAt();
            this.endedAt = call.getEndedAt();
            this.durationSeconds = call.getDurationSeconds();
            this.isOutgoing = (currentUserId != null && call.getCaller().getId().equals(currentUserId));
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UserProfileDto getCaller() { return caller; }
    public void setCaller(UserProfileDto caller) { this.caller = caller; }

    public UserProfileDto getReceiver() { return receiver; }
    public void setReceiver(UserProfileDto receiver) { this.receiver = receiver; }

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

    public Boolean getIsOutgoing() { return isOutgoing; }
    public void setIsOutgoing(Boolean isOutgoing) { this.isOutgoing = isOutgoing; }
}
