/**
 * Let's Talk — Messages Module
 * Handles message creation, media attachments, audio recording (MediaRecorder),
 * status updates, replies, and deletions.
 */
window.Messages = (function () {
    let mediaRecorder = null;
    let audioChunks = [];
    let recordTimerInterval = null;
    let recordStartTime = null;
    let isRecording = false;

    // Send text message or reply
    async function sendMessage(conversationId, content, replyToMessageId = null) {
        if (!content || !content.trim()) return null;

        const payload = {
            conversationId: conversationId,
            content: content.trim(),
            type: 'TEXT',
            replyToMessageId: replyToMessageId
        };

        if (window.ChatWs && window.ChatWs.isConnected()) {
            window.ChatWs.send('/app/chat.send', payload);
            return null;
        } else {
            return await window.ApiClient.post('/api/messages', payload);
        }
    }

    // Send media message (image, video, document, voice)
    async function sendMediaMessage(conversationId, file, type, replyToMessageId = null) {
        if (!file) return null;

        let category = 'documents';
        if (type === 'IMAGE') category = 'images';
        else if (type === 'VIDEO') category = 'videos';
        else if (type === 'VOICE') category = 'voice';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const uploadRes = await window.ApiClient.post('/api/files/upload', formData);
        if (!uploadRes || !uploadRes.fileUrl) {
            throw new Error('File upload failed');
        }

        const payload = {
            conversationId: conversationId,
            content: file.name || (type === 'VOICE' ? 'Voice message' : 'Media attachment'),
            type: type,
            mediaUrl: uploadRes.fileUrl,
            fileName: uploadRes.fileName || file.name,
            fileSize: uploadRes.fileSize || file.size,
            replyToMessageId: replyToMessageId
        };

        if (window.ChatWs && window.ChatWs.isConnected()) {
            window.ChatWs.send('/app/chat.send', payload);
            return null;
        } else {
            return await window.ApiClient.post('/api/messages', payload);
        }
    }

    // Voice recording delegates to window.Files
    async function startVoiceRecording(onTick, onError) {
        if (window.Files) return window.Files.startVoiceRecording();
    }

    function stopVoiceRecording() {
        if (window.Files) return window.Files.stopVoiceRecording(true);
    }

    function cancelVoiceRecording() {
        if (window.Files) return window.Files.cancelVoiceRecording();
    }

    // Mark message as READ or DELIVERED
    function updateMessageStatus(messageId, conversationId, status) {
        if (window.ChatWs && window.ChatWs.isConnected()) {
            window.ChatWs.send('/app/chat.status', {
                messageId: messageId,
                conversationId: conversationId,
                status: status
            });
        }
    }

    // Delete for me
    async function deleteForMe(messageId) {
        return await window.ApiClient.delete(`/api/messages/${messageId}`);
    }

    // Delete for everyone
    async function deleteForEveryone(messageId) {
        return await window.ApiClient.post(`/api/messages/${messageId}/delete-for-everyone`);
    }

    return {
        sendMessage,
        sendMediaMessage,
        startVoiceRecording,
        stopVoiceRecording,
        cancelVoiceRecording,
        isRecording: () => isRecording,
        updateMessageStatus,
        deleteForMe,
        deleteForEveryone
    };
})();
