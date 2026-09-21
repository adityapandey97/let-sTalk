package com.example.connectchat.controller;

import com.example.connectchat.dto.CallSignalDto;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@SpringBootTest
class CallSignalingTest {

    @Autowired
    private CallSignalingController callSignalingController;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void testProcessCallSignalOffer() {
        CallSignalDto offer = new CallSignalDto("OFFER", 101L, 202L);
        offer.setCallType("video");
        offer.setPayload("v=0;o=- 12345 2 IN IP4 127.0.0.1;s=-;t=0 0");

        callSignalingController.processCallSignal(offer);

        verify(messagingTemplate).convertAndSend(eq("/topic/user/202/call"), eq(offer));
    }

    @Test
    void testProcessCallSignalEnd() {
        CallSignalDto endSignal = new CallSignalDto("CALL_END", 101L, 202L);

        callSignalingController.processCallSignal(endSignal);

        verify(messagingTemplate).convertAndSend(eq("/topic/user/202/call"), eq(endSignal));
    }
}
