package com.connectchat.websocket;

import com.connectchat.entity.User;
import com.connectchat.repository.UserRepository;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventListener(UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal instanceof UsernamePasswordAuthenticationToken auth && auth.getPrincipal() instanceof User user) {
            userRepository.findById(user.getId()).ifPresent(u -> {
                u.setOnline(true);
                userRepository.save(u);

                try {
                    messagingTemplate.convertAndSend("/topic/presence", Map.of(
                            "userId", u.getId(),
                            "online", true
                    ));
                } catch (Exception ignored) {}
            });
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal instanceof UsernamePasswordAuthenticationToken auth && auth.getPrincipal() instanceof User user) {
            userRepository.findById(user.getId()).ifPresent(u -> {
                u.setOnline(false);
                u.setLastSeen(LocalDateTime.now());
                userRepository.save(u);

                try {
                    messagingTemplate.convertAndSend("/topic/presence", Map.of(
                            "userId", u.getId(),
                            "online", false,
                            "lastSeen", u.getLastSeen().toString()
                    ));
                } catch (Exception ignored) {}
            });
        }
    }
}
