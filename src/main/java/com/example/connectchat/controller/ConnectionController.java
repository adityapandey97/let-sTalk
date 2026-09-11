package com.example.connectchat.controller;

import com.example.connectchat.dto.ConnectionRequestDto;
import com.example.connectchat.dto.ConnectionResponseDto;
import com.example.connectchat.service.ConnectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @PostMapping("/request")
    public ResponseEntity<ConnectionResponseDto> sendConnectionRequest(@RequestBody ConnectionRequestDto requestDto) {
        ConnectionResponseDto response = connectionService.sendConnectionRequest(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/requests/{userId}")
    public ResponseEntity<List<ConnectionResponseDto>> getPendingRequests(@PathVariable("userId") Long userId) {
        List<ConnectionResponseDto> requests = connectionService.getPendingRequestsForUser(userId);
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/{requestId}/accept")
    public ResponseEntity<ConnectionResponseDto> acceptRequest(@PathVariable("requestId") Long requestId,
                                                               @RequestParam("userId") Long currentUserId) {
        ConnectionResponseDto response = connectionService.acceptConnectionRequest(requestId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<ConnectionResponseDto> rejectRequest(@PathVariable("requestId") Long requestId,
                                                               @RequestParam("userId") Long currentUserId) {
        ConnectionResponseDto response = connectionService.rejectConnectionRequest(requestId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<ConnectionResponseDto>> getAcceptedConnections(@PathVariable("userId") Long userId) {
        List<ConnectionResponseDto> connections = connectionService.getAcceptedConnections(userId);
        return ResponseEntity.ok(connections);
    }
}
