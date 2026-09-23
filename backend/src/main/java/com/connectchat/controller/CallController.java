package com.connectchat.controller;

import com.connectchat.dto.call.CallDto;
import com.connectchat.entity.User;
import com.connectchat.enums.CallStatus;
import com.connectchat.enums.CallType;
import com.connectchat.service.CallService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    @GetMapping
    public ResponseEntity<List<CallDto>> getCallHistory(@AuthenticationPrincipal User currentUser) {
        List<CallDto> history = callService.getUserCallHistory(currentUser.getId());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/initiate")
    public ResponseEntity<CallDto> initiateCall(@AuthenticationPrincipal User currentUser,
                                                @RequestBody Map<String, Object> body) {
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        String callTypeStr = body.getOrDefault("callType", "AUDIO").toString();
        CallType type = "VIDEO".equalsIgnoreCase(callTypeStr) ? CallType.VIDEO : CallType.AUDIO;

        CallDto dto = callService.initiateCall(currentUser.getId(), receiverId, type);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<CallDto> updateCallStatus(@PathVariable Long id,
                                                    @RequestBody Map<String, String> body) {
        String statusStr = body.getOrDefault("status", "ENDED");
        CallStatus status = CallStatus.valueOf(statusStr.toUpperCase());
        CallDto dto = callService.updateCallStatus(id, status);
        return ResponseEntity.ok(dto);
    }
}
