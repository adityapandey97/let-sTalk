package com.connectchat.service;

import com.connectchat.dto.call.CallDto;
import com.connectchat.dto.call.CallSignalDto;
import com.connectchat.entity.Call;
import com.connectchat.entity.User;
import com.connectchat.enums.CallStatus;
import com.connectchat.enums.CallType;
import com.connectchat.exception.BadRequestException;
import com.connectchat.exception.ResourceNotFoundException;
import com.connectchat.repository.CallRepository;
import com.connectchat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CallService {

    private final CallRepository callRepository;
    private final UserRepository userRepository;

    public CallService(CallRepository callRepository, UserRepository userRepository) {
        this.callRepository = callRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CallDto initiateCall(Long callerId, Long receiverId, CallType type) {
        if (callerId.equals(receiverId)) {
            throw new BadRequestException("Cannot call yourself.");
        }

        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("Caller not found."));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found."));

        Call call = new Call(caller, receiver, type, CallStatus.MISSED);
        Call saved = callRepository.save(call);

        return new CallDto(saved, callerId);
    }

    @Transactional
    public CallDto updateCallStatus(Long callId, CallStatus status) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found with id: " + callId));

        call.setStatus(status);

        if (status == CallStatus.ACCEPTED && call.getStartedAt() == null) {
            call.setStartedAt(LocalDateTime.now());
        } else if (status == CallStatus.ENDED || status == CallStatus.REJECTED || status == CallStatus.MISSED) {
            LocalDateTime now = LocalDateTime.now();
            call.setEndedAt(now);
            if (call.getStartedAt() != null && status == CallStatus.ENDED) {
                int duration = (int) Duration.between(call.getStartedAt(), now).getSeconds();
                call.setDurationSeconds(Math.max(0, duration));
            }
        }

        Call saved = callRepository.save(call);
        return new CallDto(saved, call.getCaller().getId());
    }

    @Transactional(readOnly = true)
    public List<CallDto> getUserCallHistory(Long userId) {
        List<Call> calls = callRepository.findCallHistoryForUser(userId);
        List<CallDto> dtos = new ArrayList<>();
        for (Call c : calls) {
            dtos.add(new CallDto(c, userId));
        }
        return dtos;
    }
}
