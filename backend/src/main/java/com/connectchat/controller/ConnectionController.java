package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.dto.connection.ConnectionDto;
import com.connectchat.dto.connection.ConnectionRequestDto;
import com.connectchat.entity.User;
import com.connectchat.service.ConnectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ResponseEntity<ConnectionDto> sendRequest(@AuthenticationPrincipal User currentUser,
                                                     @RequestBody ConnectionRequestDto request) {
        ConnectionDto dto = connectionService.sendRequest(currentUser.getId(), request.getTargetUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/requests")
    public ResponseEntity<List<ConnectionDto>> getPendingRequests(@AuthenticationPrincipal User currentUser) {
        List<ConnectionDto> requests = connectionService.getPendingRequests(currentUser.getId());
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<ConnectionDto> acceptRequest(@AuthenticationPrincipal User currentUser,
                                                       @PathVariable Long id) {
        ConnectionDto dto = connectionService.acceptRequest(id, currentUser.getId());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse> rejectRequest(@AuthenticationPrincipal User currentUser,
                                                     @PathVariable Long id) {
        connectionService.rejectRequest(id, currentUser.getId());
        return ResponseEntity.ok(new ApiResponse(true, "Connection request rejected"));
    }

    @GetMapping
    public ResponseEntity<List<ConnectionDto>> getAcceptedConnections(@AuthenticationPrincipal User currentUser) {
        List<ConnectionDto> list = connectionService.getAcceptedConnections(currentUser.getId());
        return ResponseEntity.ok(list);
    }
}
