package com.example.connectchat.controller;

import com.example.connectchat.dto.CallSignalDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Controller handling real-time WebRTC audio and video calling signals over WebSocket.
 * Routes SDP offers, SDP answers, ICE candidates, and call lifecycle states directly to the destination peer.
 */
@Controller
public class CallSignalingController {

    private static final Logger log = LoggerFactory.getLogger(CallSignalingController.class);

    private final SimpMessagingTemplate messagingTemplate;

    public CallSignalingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Handles WebRTC signaling packets dispatched to /app/call.signal
     * Forwards packet directly to destination recipient's private topic: /topic/user/{receiverId}/call
     *
     * @param signal CallSignalDto containing signal type, caller/callee IDs, callType, and payload
     */
    @MessageMapping("/call.signal")
    public void processCallSignal(@Payload CallSignalDto signal) {
        if (signal == null || signal.getReceiverId() == null) {
            log.warn("Received invalid call signal: missing receiverId");
            return;
        }

        log.info("Relaying WebRTC call signal '{}' (type: {}) from user {} to user {}",
                signal.getType(), signal.getCallType(), signal.getSenderId(), signal.getReceiverId());

        // Forward signaling packet to the target user's personal call channel
        messagingTemplate.convertAndSend("/topic/user/" + signal.getReceiverId() + "/call", signal);
    }
}
