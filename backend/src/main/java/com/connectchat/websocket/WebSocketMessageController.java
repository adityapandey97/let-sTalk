package com.connectchat.websocket;

import com.connectchat.dto.call.CallSignalDto;
import com.connectchat.dto.message.MessageDto;
import com.connectchat.dto.message.MessageStatusUpdateDto;
import com.connectchat.dto.message.SendMessageRequest;
import com.connectchat.dto.message.TypingSignalDto;
import com.connectchat.entity.User;
import com.connectchat.enums.CallStatus;
import com.connectchat.enums.CallType;
import com.connectchat.service.CallService;
import com.connectchat.service.MessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class WebSocketMessageController {

    private final MessageService messageService;
    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketMessageController(MessageService messageService,
                                      CallService callService,
                                      SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.callService = callService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void handleSendMessage(@Payload SendMessageRequest request, Principal principal) {
        Long senderId = getUserIdFromPrincipal(principal);
        if (senderId != null) {
            messageService.sendMessage(senderId, request);
        }
    }

    @MessageMapping("/chat.status")
    public void handleMessageStatus(@Payload MessageStatusUpdateDto update, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId != null) {
            messageService.updateMessageStatus(update, userId);
        }
    }

    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload TypingSignalDto typing, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId != null && typing.getConversationId() != null) {
            typing.setUserId(userId);
            messagingTemplate.convertAndSend("/topic/conversation/" + typing.getConversationId() + "/typing", typing);
        }
    }

    @MessageMapping("/call.signal")
    public void handleCallSignal(@Payload CallSignalDto signal, Principal principal) {
        Long senderId = getUserIdFromPrincipal(principal);
        if (senderId != null) {
            signal.setSenderId(senderId);
        }

        if (signal.getReceiverId() == null) {
            return;
        }

        // Handle call lifecycle events
        if ("CALL_OFFER".equalsIgnoreCase(signal.getType())) {
            try {
                CallType type = "VIDEO".equalsIgnoreCase(signal.getCallType()) ? CallType.VIDEO : CallType.AUDIO;
                var callDto = callService.initiateCall(signal.getSenderId(), signal.getReceiverId(), type);
                signal.setCallId(callDto.getId());
            } catch (Exception ignored) {}
        } else if ("CALL_ACCEPTED".equalsIgnoreCase(signal.getType()) && signal.getCallId() != null) {
            try {
                callService.updateCallStatus(signal.getCallId(), CallStatus.ACCEPTED);
            } catch (Exception ignored) {}
        } else if ("CALL_REJECTED".equalsIgnoreCase(signal.getType()) && signal.getCallId() != null) {
            try {
                callService.updateCallStatus(signal.getCallId(), CallStatus.REJECTED);
            } catch (Exception ignored) {}
        } else if ("CALL_ENDED".equalsIgnoreCase(signal.getType()) && signal.getCallId() != null) {
            try {
                callService.updateCallStatus(signal.getCallId(), CallStatus.ENDED);
            } catch (Exception ignored) {}
        }

        // Relay signaling packet to receiver's private call topic
        messagingTemplate.convertAndSend("/topic/user/" + signal.getReceiverId() + "/call", signal);
    }

    private Long getUserIdFromPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof User user) {
                return user.getId();
            }
        }
        return null;
    }
}
