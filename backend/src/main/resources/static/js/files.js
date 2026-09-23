/**
 * Let's Talk — File & Media Upload Module
 * Robust media upload, voice note recording lifecycle, and attachment handling.
 */
window.Files = (function () {
    let activeMediaStream = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let recordInterval = null;
    let recordSeconds = 0;
    let isRecording = false;

    function toggleAttachmentMenu() {
        const popup = document.getElementById('attachment-popup-menu');
        if (popup) {
            popup.classList.toggle('hidden');
        }
    }

    function closeAttachmentMenu() {
        const popup = document.getElementById('attachment-popup-menu');
        if (popup) {
            popup.classList.add('hidden');
        }
    }

    async function uploadFile(file, category = 'documents') {
        if (!file) return null;

        const maxMb = (window.APP_CONFIG && window.APP_CONFIG.MAX_FILE_SIZE_MB) || 50;
        if (file.size > maxMb * 1024 * 1024) {
            window.UI && window.UI.showToast(`File size exceeds ${maxMb}MB limit`, 'error');
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        try {
            window.UI && window.UI.showToast('Uploading attachment...', 'info');
            const result = await window.ApiClient.request('/api/files/upload', {
                method: 'POST',
                body: formData
            });

            if (result && result.fileUrl) {
                window.UI && window.UI.showToast('Upload completed', 'success');
                return result;
            }
            throw new Error(result.error || 'Upload failed');
        } catch (err) {
            console.error('File upload error:', err);
            window.UI && window.UI.showToast(err.message || 'File upload failed', 'error');
            return null;
        }
    }

    async function handleFileSelect(inputElement, expectedType) {
        closeAttachmentMenu();
        const file = inputElement.files && inputElement.files[0];
        if (!file) return;

        let category = 'documents';
        let msgType = 'DOCUMENT';

        if (file.type.startsWith('image/')) {
            category = 'images';
            msgType = 'IMAGE';
        } else if (file.type.startsWith('video/')) {
            category = 'videos';
            msgType = 'VIDEO';
        } else if (file.type.startsWith('audio/')) {
            category = 'voice';
            msgType = 'VOICE';
        }

        const uploadRes = await uploadFile(file, category);
        if (!uploadRes) {
            inputElement.value = '';
            return;
        }

        if (window.Chat) {
            window.Chat.sendMessage(file.name, msgType, uploadRes.fileUrl, uploadRes.fileName || file.name, uploadRes.fileSize || file.size);
        }

        inputElement.value = '';
    }

    // Voice Note Recording with Leak-Proof Track Management
    async function startVoiceRecording() {
        if (isRecording) {
            return;
        }

        if (!window.state || !window.state.activeConversationId) {
            window.UI && window.UI.showToast('Please select a conversation first', 'info');
            return;
        }

        // Clean any existing tracks first
        cleanupMediaStream();

        try {
            activeMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            recordSeconds = 0;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg');

            mediaRecorder = new MediaRecorder(activeMediaStream, { mimeType: mimeType });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const chunksToSave = [...audioChunks];
                audioChunks = [];
                cleanupMediaStream();

                if (chunksToSave.length === 0) return;

                const audioBlob = new Blob(chunksToSave, { type: mimeType });
                if (audioBlob.size < 100) return; // Discard empty/accidental clicks

                const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
                const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: mimeType });
                const uploadRes = await uploadFile(audioFile, 'voice');

                if (uploadRes && window.Chat) {
                    window.Chat.sendMessage(
                        'Voice note',
                        'VOICE',
                        uploadRes.fileUrl,
                        uploadRes.fileName || audioFile.name,
                        uploadRes.fileSize || audioFile.size
                    );
                }
            };

            mediaRecorder.start(250); // Slice every 250ms for reliable chunks
            isRecording = true;
            showVoiceRecordHUD(true);

            const timerEl = document.getElementById('voice-record-timer');
            if (timerEl) timerEl.textContent = '00:00';

            if (recordInterval) clearInterval(recordInterval);
            recordInterval = setInterval(() => {
                recordSeconds++;
                const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
                const secs = String(recordSeconds % 60).padStart(2, '0');
                if (timerEl) timerEl.textContent = `${mins}:${secs}`;
            }, 1000);

        } catch (err) {
            console.error('Microphone access denied:', err);
            cleanupMediaStream();
            showVoiceRecordHUD(false);
            window.UI && window.UI.showToast('Microphone access denied or unavailable', 'error');
        }
    }

    function stopVoiceRecording(save = true) {
        if (recordInterval) {
            clearInterval(recordInterval);
            recordInterval = null;
        }

        showVoiceRecordHUD(false);
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            if (!save) {
                // If cancelling, remove handlers so nothing gets uploaded
                audioChunks = [];
                mediaRecorder.ondataavailable = null;
                mediaRecorder.onstop = null;
                try { mediaRecorder.stop(); } catch (e) {}
                cleanupMediaStream();
            } else {
                try { mediaRecorder.stop(); } catch (e) {}
            }
        } else {
            cleanupMediaStream();
        }

        mediaRecorder = null;
    }

    function cancelVoiceRecording() {
        stopVoiceRecording(false);
        cleanupMediaStream();
        window.UI && window.UI.showToast('Voice recording cancelled', 'info');
    }

    function cleanupMediaStream() {
        if (activeMediaStream) {
            try {
                activeMediaStream.getTracks().forEach(track => {
                    track.stop();
                });
            } catch (e) {
                console.warn('Error stopping audio tracks:', e);
            }
            activeMediaStream = null;
        }
        isRecording = false;
        if (recordInterval) {
            clearInterval(recordInterval);
            recordInterval = null;
        }
    }

    function showVoiceRecordHUD(show) {
        const hud = document.getElementById('voice-record-hud');
        const normalRow = document.getElementById('chat-input-controls-row');
        if (hud) hud.classList.toggle('hidden', !show);
        if (normalRow) normalRow.classList.toggle('hidden', show);
    }

    return {
        toggleAttachmentMenu,
        closeAttachmentMenu,
        uploadFile,
        handleFileSelect,
        startVoiceRecording,
        stopVoiceRecording,
        cancelVoiceRecording,
        cleanupMediaStream,
        isRecording: () => isRecording
    };
})();
