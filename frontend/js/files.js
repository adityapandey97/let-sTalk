/**
 * ConnectChat File & Media Upload Module
 */
window.Files = (function () {
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

    async function uploadFile(file) {
        if (!file) return null;

        const maxMb = window.APP_CONFIG.MAX_FILE_SIZE_MB || 50;
        if (file.size > maxMb * 1024 * 1024) {
            window.UI.showToast(`File size exceeds ${maxMb}MB limit`, 'error');
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            window.UI.showToast('Uploading attachment...', 'info');
            const result = await window.ApiClient.request('/api/media/upload', {
                method: 'POST',
                body: formData
            });

            if (result && result.url) {
                window.UI.showToast('Upload completed', 'success');
                return result;
            }
            throw new Error(result.error || 'Upload failed');
        } catch (err) {
            window.UI.showToast(err.message || 'File upload failed', 'error');
            return null;
        }
    }

    async function handleFileSelect(inputElement, expectedType) {
        closeAttachmentMenu();
        const file = inputElement.files && inputElement.files[0];
        if (!file) return;

        const uploadRes = await uploadFile(file);
        if (!uploadRes) return;

        // Determine messageType
        let msgType = 'FILE';
        if (file.type.startsWith('image/')) msgType = 'IMAGE';
        else if (file.type.startsWith('video/')) msgType = 'VIDEO';
        else if (file.type.startsWith('audio/')) msgType = 'AUDIO';

        const metadata = JSON.stringify({
            fileName: uploadRes.fileName,
            fileSize: uploadRes.fileSize,
            contentType: uploadRes.contentType
        });

        if (window.Chat) {
            window.Chat.sendMessage(file.name, msgType, uploadRes.url, metadata);
        }

        inputElement.value = '';
    }

    // Voice Note Recording
    let mediaRecorder = null;
    let audioChunks = [];
    let recordInterval = null;
    let recordSeconds = 0;

    async function startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            recordSeconds = 0;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                if (audioChunks.length === 0) return;

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                const uploadRes = await uploadFile(audioFile);
                if (uploadRes && window.Chat) {
                    const metadata = JSON.stringify({
                        fileName: uploadRes.fileName,
                        fileSize: uploadRes.fileSize,
                        duration: recordSeconds
                    });
                    window.Chat.sendMessage('Voice note', 'AUDIO', uploadRes.url, metadata);
                }
            };

            mediaRecorder.start();
            showVoiceRecordHUD(true);
            recordInterval = setInterval(() => {
                recordSeconds++;
                const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
                const secs = String(recordSeconds % 60).padStart(2, '0');
                const timerEl = document.getElementById('voice-record-timer');
                if (timerEl) timerEl.textContent = `${mins}:${secs}`;
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied:', err);
            window.UI.showToast('Microphone access denied or not available', 'error');
        }
    }

    function stopVoiceRecording(save = true) {
        if (recordInterval) {
            clearInterval(recordInterval);
            recordInterval = null;
        }
        showVoiceRecordHUD(false);

        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        if (!save) {
            audioChunks = [];
        }
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    function cancelVoiceRecording() {
        stopVoiceRecording(false);
        window.UI.showToast('Voice recording cancelled', 'info');
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
        cancelVoiceRecording
    };
})();
