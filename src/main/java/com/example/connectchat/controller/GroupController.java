package com.example.connectchat.controller;

import com.example.connectchat.dto.*;
import com.example.connectchat.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping("/api/groups")
    public ResponseEntity<GroupDto> createGroup(@RequestBody CreateGroupRequest request) {
        GroupDto created = groupService.createGroup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/api/groups/user/{userId}")
    public ResponseEntity<List<GroupDto>> getGroupsForUser(@PathVariable("userId") Long userId) {
        List<GroupDto> groups = groupService.getGroupsForUser(userId);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/api/groups/{groupId}")
    public ResponseEntity<GroupDto> getGroupDetails(@PathVariable("groupId") Long groupId,
                                                    @RequestParam("userId") Long userId) {
        GroupDto details = groupService.getGroupDetails(groupId, userId);
        return ResponseEntity.ok(details);
    }

    @GetMapping("/api/groups/{groupId}/members")
    public ResponseEntity<List<GroupMemberDto>> getGroupMembers(@PathVariable("groupId") Long groupId,
                                                                @RequestParam("userId") Long userId) {
        List<GroupMemberDto> members = groupService.getGroupMembers(groupId, userId);
        return ResponseEntity.ok(members);
    }

    @GetMapping("/api/groups/{groupId}/messages")
    public ResponseEntity<List<GroupMessageDto>> getGroupMessages(@PathVariable("groupId") Long groupId,
                                                                  @RequestParam("userId") Long userId) {
        List<GroupMessageDto> messages = groupService.getGroupMessages(groupId, userId);
        return ResponseEntity.ok(messages);
    }

    /**
     * WebSocket STOMP endpoint for sending group messages
     * Destination: /app/chat.group
     */
    @MessageMapping("/chat.group")
    public void sendGroupMessage(@Payload GroupMessageDto messageDto) {
        groupService.sendGroupMessage(messageDto);
    }
}
