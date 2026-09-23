package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.dto.group.AddMemberRequest;
import com.connectchat.dto.group.CreateGroupRequest;
import com.connectchat.dto.group.GroupDto;
import com.connectchat.dto.group.UpdateGroupRequest;
import com.connectchat.entity.User;
import com.connectchat.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<GroupDto> createGroup(@AuthenticationPrincipal User currentUser,
                                                @RequestBody CreateGroupRequest request) {
        GroupDto created = groupService.createGroup(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<GroupDto>> getUserGroups(@AuthenticationPrincipal User currentUser) {
        List<GroupDto> groups = groupService.getUserGroups(currentUser.getId());
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupDto> getGroupById(@PathVariable Long id,
                                                 @AuthenticationPrincipal User currentUser) {
        GroupDto group = groupService.getGroupById(id, currentUser.getId());
        return ResponseEntity.ok(group);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupDto> updateGroup(@PathVariable Long id,
                                                @AuthenticationPrincipal User currentUser,
                                                @RequestBody UpdateGroupRequest request) {
        GroupDto updated = groupService.updateGroup(id, currentUser.getId(), request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<GroupDto> addMember(@PathVariable Long id,
                                              @AuthenticationPrincipal User currentUser,
                                              @RequestBody AddMemberRequest request) {
        GroupDto updated = groupService.addMember(id, currentUser.getId(), request.getUserId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<ApiResponse> removeMember(@PathVariable Long id,
                                                    @PathVariable Long userId,
                                                    @AuthenticationPrincipal User currentUser) {
        groupService.removeMember(id, currentUser.getId(), userId);
        return ResponseEntity.ok(new ApiResponse(true, "Member removed successfully"));
    }
}
