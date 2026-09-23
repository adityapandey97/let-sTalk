/**
 * Let's Talk — WebRTC Audio & Video Calling Module
 * Manages peer connection, STUN/TURN, signaling over WebSocket, local/remote streams, and call states.
 */
window.Calls = (function () {
    let peerConnection = null;
    let localStream = null;
    let remoteStream = null;
    let activeCallType = 'video';
    let targetPeerId = null;
    let activeCallId = null;
    let callTimerInterval = null;
    let callSeconds = 0;

    const rtcConfig = {
        iceServers: (window.APP_CONFIG && window.APP_CONFIG.ICE_SERVERS) || [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function startCall(receiverId, type = 'video') {
        if (!window.state || !window.state.currentUser) return;
        targetPeerId = receiverId;
        activeCallType = type;

        showCallModal(true, 'Calling...', type);
        initiatePeerConnection(receiverId, type, true);
    }

    async function initiatePeerConnection(peerId, type, isInitiator) {
        try {
            const constraints = {
                audio: true,
                video: type === 'video'
            };

            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            const localVid = document.getElementById('call-local-video');
            if (localVid) {
                localVid.srcObject = localStream;
                localVid.play().catch(() => {});
            }

            peerConnection = new RTCPeerConnection(rtcConfig);

            // Add local tracks
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Handle remote streams
            peerConnection.ontrack = (event) => {
                const remoteVid = document.getElementById('call-remote-video');
                if (remoteVid && event.streams[0]) {
                    remoteStream = event.streams[0];
                    remoteVid.srcObject = remoteStream;
                    remoteVid.play().catch(() => {});
                }
            };

            // Relay ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    sendSignal({
                        type: 'ICE_CANDIDATE',
                        callId: activeCallId,
                        senderId: window.state.currentUser.id,
                        receiverId: peerId,
                        payload: event.candidate
                    });
                }
            };

            peerConnection.onconnectionstatechange = () => {
                if (peerConnection.connectionState === 'connected') {
                    onCallConnected();
                } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
                    endCall();
                }
            };

            if (isInitiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                sendSignal({
                    type: 'CALL_OFFER',
                    senderId: window.state.currentUser.id,
                    senderName: window.state.currentUser.fullName || window.state.currentUser.username,
                    senderPhoto: window.state.currentUser.profilePhoto || '',
                    receiverId: peerId,
                    callType: type,
                    payload: offer
                });
            }
        } catch (err) {
            console.error('Call initialization failed:', err);
            window.UI && window.UI.showToast('Could not access camera/microphone.', 'error');
            endCall();
        }
    }

    async function handleIncomingCallSignal(signal) {
        if (!signal || !signal.type) return;

        const sigType = signal.type.toUpperCase();

        if (sigType === 'CALL_OFFER' || sigType === 'OFFER') {
            targetPeerId = signal.senderId;
            activeCallId = signal.callId;
            activeCallType = signal.callType || 'video';
            if (window.state) {
                if (!window.state.call) window.state.call = {};
                window.state.call.pendingOffer = signal;
            }
            showIncomingRingingModal(signal);
        } else if (sigType === 'CALL_ANSWER' || sigType === 'ANSWER') {
            if (peerConnection) {
                activeCallId = signal.callId || activeCallId;
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            }
        } else if (sigType === 'ICE_CANDIDATE') {
            if (peerConnection && signal.payload) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
                } catch (e) {
                    console.warn('Error adding ICE candidate:', e);
                }
            }
        } else if (sigType === 'CALL_REJECTED' || sigType === 'CALL_REJECT') {
            window.UI && window.UI.showToast('Call was declined.', 'info');
            cleanupCall();
        } else if (sigType === 'CALL_ENDED' || sigType === 'CALL_END') {
            window.UI && window.UI.showToast('Call ended.', 'info');
            cleanupCall();
        }
    }

    function showIncomingRingingModal(signal) {
        const modal = document.getElementById('incoming-call-modal');
        const callerNameEl = document.getElementById('incoming-caller-name');
        const callTypeEl = document.getElementById('incoming-call-type');

        if (callerNameEl) callerNameEl.textContent = signal.senderName || 'Contact';
        if (callTypeEl) callTypeEl.textContent = signal.callType === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call';

        if (modal) modal.classList.remove('hidden');
    }

    async function acceptIncomingCall() {
        const modal = document.getElementById('incoming-call-modal');
        if (modal) modal.classList.add('hidden');

        const offerSignal = window.state && window.state.call && window.state.call.pendingOffer;
        if (!offerSignal) return;

        activeCallId = offerSignal.callId;
        showCallModal(true, 'Connecting...', offerSignal.callType || 'video');

        try {
            await initiatePeerConnection(offerSignal.senderId, offerSignal.callType || 'video', false);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSignal.payload));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            sendSignal({
                type: 'CALL_ANSWER',
                callId: activeCallId,
                senderId: window.state.currentUser.id,
                receiverId: offerSignal.senderId,
                payload: answer
            });
        } catch (err) {
            console.error('Failed to accept call:', err);
            endCall();
        }
    }

    function rejectIncomingCall() {
        const modal = document.getElementById('incoming-call-modal');
        if (modal) modal.classList.add('hidden');

        const offerSignal = window.state && window.state.call && window.state.call.pendingOffer;
        if (offerSignal) {
            sendSignal({
                type: 'CALL_REJECTED',
                callId: offerSignal.callId,
                senderId: window.state.currentUser.id,
                receiverId: offerSignal.senderId
            });
        }
        if (window.state && window.state.call) {
            window.state.call.pendingOffer = null;
        }
    }

    function onCallConnected() {
        const statusEl = document.getElementById('call-status-label');
        callSeconds = 0;
        if (callTimerInterval) clearInterval(callTimerInterval);

        callTimerInterval = setInterval(() => {
            callSeconds++;
            const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const secs = String(callSeconds % 60).padStart(2, '0');
            if (statusEl) statusEl.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function endCall() {
        if (targetPeerId && window.state && window.state.currentUser) {
            sendSignal({
                type: 'CALL_ENDED',
                callId: activeCallId,
                senderId: window.state.currentUser.id,
                receiverId: targetPeerId
            });
        }
        cleanupCall();
    }

    function cleanupCall() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        remoteStream = null;
        targetPeerId = null;
        activeCallId = null;
        if (window.state && window.state.call) {
            window.state.call.pendingOffer = null;
        }

        showCallModal(false);
    }

    function toggleMic() {
        if (!localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('btn-call-mute');
            if (btn) btn.classList.toggle('active-off', !audioTrack.enabled);
        }
    }

    function toggleCamera() {
        if (!localStream) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = document.getElementById('btn-call-video');
            if (btn) btn.classList.toggle('active-off', !videoTrack.enabled);
        }
    }

    function showCallModal(show, statusText = '', callType = 'video') {
        const modal = document.getElementById('webrtc-call-modal');
        const statusEl = document.getElementById('call-status-label');
        const peerNameEl = document.getElementById('call-peer-name');
        const localVid = document.getElementById('call-local-video');

        if (statusEl && statusText) statusEl.textContent = statusText;
        if (peerNameEl && window.state && window.state.activeChat) {
            peerNameEl.textContent = window.state.activeChat.name;
        }

        if (localVid) localVid.style.display = callType === 'video' ? 'block' : 'none';
        if (modal) modal.classList.toggle('hidden', !show);
    }

    function sendSignal(signal) {
        if (window.WebSocketManager) {
            window.WebSocketManager.send('/app/call.signal', signal);
        }
    }

    return {
        startCall,
        handleIncomingCallSignal,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMic,
        toggleCamera
    };
})();
