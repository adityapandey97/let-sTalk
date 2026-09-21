package com.example.connectchat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register "/ws" endpoint for WebSocket STOMP handshake with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Application prefix for @MessageMapping destinations (e.g., /app/chat.private, /app/chat.group, /app/chat.status, /app/call.signal)
        registry.setApplicationDestinationPrefixes("/app");

        // Message broker prefix for broadcast and user-specific topics (e.g., /topic/private/*, /topic/group/*, /topic/user/*)
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureWebSocketTransport(org.springframework.web.socket.config.annotation.WebSocketTransportRegistration registration) {
        // Generous buffer limits for WebSocket frames, media thumbnails, and WebRTC SDP payloads
        registration.setMessageSizeLimit(2 * 1024 * 1024);     // 2 MB
        registration.setSendBufferSizeLimit(4 * 1024 * 1024); // 4 MB
        registration.setSendTimeLimit(20000);                 // 20 seconds
    }
}
