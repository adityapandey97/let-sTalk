/**
 * Let's Talk — Chat & Messaging UI Controller
 * Manages active conversation, message stream, reactions, replies, deletions, and real-time statuses.
 */
window.Chat = (function () {
    const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    let replyingTo = null;
    let typingTimeout = null;

    async function loadConversations() {
        if (!window.state || !window.state.currentUser) return;

        try {
            const conversations = await window.ApiClient.get('/api/conversations');
            window.state.conversations = conversations || [];
            renderSidebarConversations();
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }

    function renderSidebarConversations() {
        const container = document.getElementById('sidebar-chats-list');
        const convs = window.state.conversations || [];
        const directChats = convs.filter(c => c.type !== 'GROUP');

        const countBadge = document.getElementById('chats-count-badge');
        if (countBadge) {
            countBadge.textContent = directChats.length;
            countBadge.classList.toggle('hidden', directChats.length === 0);
        }

        if (!container) return;

        if (convs.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No chats yet.<br/>Connect with friends in <strong>Requests</strong> to chat!
                </div>
            `;
            return;
        }

        container.innerHTML = convs.map(conv => {
            const isActive = window.state.activeConversationId === conv.id;
            const initials = window.Utils.getInitials(conv.title || 'Chat');
            const gradient = window.Utils.getAvatarGradient(conv.title || 'Chat');
            const photoUrl = conv.photoUrl;
            const avatarHtml = photoUrl && photoUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(photoUrl)}" alt="${window.Utils.escapeHtml(conv.title)}" class="avatar" />`
                : `<div class="avatar" style="background: ${gradient}">${initials}</div>`;

            const isOnline = conv.otherUser && conv.otherUser.online;
            const timeStr = conv.lastMessageTime ? window.Utils.formatTime(conv.lastMessageTime) : '';
            const unreadBadge = conv.unreadCount > 0
                ? `<span class="unread-badge" id="conv-badge-${conv.id}">${conv.unreadCount}</span>`
                : `<span class="unread-badge hidden" id="conv-badge-${conv.id}"></span>`;

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" id="conv-item-${conv.id}"
                     onclick="window.Chat.openConversation(${conv.id}, '${window.Utils.escapeHtml(conv.title)}', '${photoUrl || ''}', ${conv.type === 'GROUP'})">
                    <div class="avatar-wrap">
                        ${avatarHtml}
                        <span class="status-indicator ${isOnline ? 'online' : ''}" id="status-ind-${conv.id}"></span>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header-row">
                            <span class="conversation-name">${window.Utils.escapeHtml(conv.title)}</span>
                            <span class="conversation-time">${timeStr}</span>
                        </div>
                        <div class="conversation-message-row">
                            <span class="conversation-snippet" id="conv-snippet-${conv.id}">${window.Utils.escapeHtml(conv.lastMessage || 'Start a conversation')}</span>
                            ${unreadBadge}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function openDirectChat(otherUserId, name, avatarUrl, username) {
        try {
            const conv = await window.ApiClient.post(`/api/conversations/private/${otherUserId}`);
            await openConversation(conv.id, conv.title || name, conv.photoUrl || avatarUrl, false, otherUserId);
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Could not open chat', 'error');
        }
    }

    async function openConversation(conversationId, title, photoUrl, isGroup = false, otherUserId = null) {
        window.state.activeConversationId = conversationId;
        window.state.activeChat = {
            id: otherUserId,
            conversationId: conversationId,
            name: title,
            avatarUrl: photoUrl,
            isGroup: isGroup
        };

        // Abort any ongoing voice recording cleanly
        if (window.Files && typeof window.Files.cancelVoiceRecording === 'function') {
            window.Files.cancelVoiceRecording();
        }
        if (window.UI && typeof window.UI.setSidebarActiveTab === 'function') {
            window.UI.setSidebarActiveTab('chats');
        }

        // Mobile responsiveness
        window.UI && window.UI.toggleMobileChat && window.UI.toggleMobileChat(true);

        // Sidebar active highlight
        document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.getElementById(`conv-item-${conversationId}`);
        if (activeItem) activeItem.classList.add('active');

        // Clear unread badge in DOM
        const badge = document.getElementById(`conv-badge-${conversationId}`);
        if (badge) {
            badge.textContent = '';
            badge.classList.add('hidden');
        }

        // Show chat screen, hide empty placeholder
        const emptyState = document.getElementById('chat-empty-state');
        const activeContainer = document.getElementById('chat-active-container');
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.style.setProperty('display', 'none', 'important');
        }
        if (activeContainer) {
            activeContainer.classList.remove('hidden');
            activeContainer.style.setProperty('display', 'flex', 'important');
        }

        // Header
        const nameEl = document.getElementById('active-chat-name');
        const statusEl = document.getElementById('active-chat-status');
        const avatarContainer = document.getElementById('active-chat-avatar-wrap');

        if (nameEl) nameEl.textContent = title;
        if (statusEl) statusEl.textContent = isGroup ? 'Group Conversation' : 'Online';

        if (avatarContainer) {
            if (photoUrl && photoUrl.trim() !== '') {
                avatarContainer.innerHTML = `<img src="${window.getApiUrl(photoUrl)}" alt="${window.Utils.escapeHtml(title)}" class="avatar" />`;
            } else {
                const initials = window.Utils.getInitials(title);
                const gradient = window.Utils.getAvatarGradient(title);
                avatarContainer.innerHTML = `<div class="avatar" style="background: ${gradient}">${initials}</div>`;
            }
        }

        cancelReply();
        closeReactionPicker();

        // Subscribe to WebSocket STOMP topics for this conversation
        if (window.WebSocketManager) {
            window.WebSocketManager.subscribeToConversation(conversationId);
        }

        // Load conversation messages
        await loadMessages(conversationId);
    }

    async function loadMessages(conversationId) {
        const scrollContainer = document.getElementById('chat-messages-container');
        if (scrollContainer) {
            scrollContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">Loading conversation...</div>`;
        }

        try {
            const messages = await window.ApiClient.get(`/api/conversations/${conversationId}/messages`);
            window.state.messages = messages || [];
            renderMessages(window.state.messages);
            scrollToBottom();
        } catch (err) {
            console.error('Failed to load messages:', err);
            if (scrollContainer) {
                scrollContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--accent-red);">Failed to load messages.</div>`;
            }
        }
    }

    function renderMessages(messages) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    <div style="font-size: 28px; margin-bottom: 8px;">🔒</div>
                    Messages are protected and end-to-end persistent.<br/>Send a message or share media to start talking!
                </div>
            `;
            return;
        }

        let html = '';
        let lastDateStr = '';

        messages.forEach(msg => {
            const isOutgoing = msg.sender && msg.sender.id === window.state.currentUser.id;
            const dateStr = window.Utils.formatDateHeader(msg.createdAt);

            if (dateStr !== lastDateStr) {
                html += `<div class="date-separator">${dateStr}</div>`;
                lastDateStr = dateStr;
            }

            html += renderMessageBubble(msg, isOutgoing);
        });

        container.innerHTML = html;
    }

    function renderMessageBubble(msg, isOutgoing) {
        const timeStr = window.Utils.formatTime(msg.createdAt);
        const isDeleted = msg.deletedForEveryone;

        let contentHtml = '';
        if (isDeleted) {
            contentHtml = `
                <div class="message-bubble deleted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    This message was deleted.
                </div>
            `;
        } else {
            // Quoted Reply Preview
            let quoteHtml = '';
            if (msg.replyTo) {
                quoteHtml = `
                    <div class="replied-quote-card">
                        <div class="quote-snippet">${window.Utils.escapeHtml(msg.replyTo.content || 'Original message')}</div>
                    </div>
                `;
            }

            // Media Preview — Supports both attachments list and top-level mediaUrl
            let mediaHtml = '';
            const mediaList = [];

            if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    mediaList.push({
                        url: att.filePath || att.fileUrl,
                        type: (att.fileType || msg.type || '').toUpperCase(),
                        name: att.originalName || att.fileName || 'Attachment',
                        size: att.fileSize
                    });
                });
            } else if (msg.mediaUrl && msg.mediaUrl.trim() !== '') {
                mediaList.push({
                    url: msg.mediaUrl,
                    type: (msg.type || '').toUpperCase(),
                    name: msg.fileName || 'Attachment',
                    size: msg.fileSize
                });
            }

            mediaList.forEach(item => {
                if (!item.url) return;
                const fullUrl = window.getApiUrl(item.url);
                const fileType = item.type;
                const lower = item.url.toLowerCase();

                if (fileType.includes('IMAGE') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp')) {
                    mediaHtml += `
                        <div class="message-media-card message-image-wrap">
                            <img src="${fullUrl}" alt="${window.Utils.escapeHtml(item.name)}" onclick="window.Chat.openImageLightbox('${fullUrl}')" loading="lazy" />
                            <a href="${fullUrl}" download="${window.Utils.escapeHtml(item.name)}" class="media-download-pill" title="Download image">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                        </div>
                    `;
                } else if (fileType.includes('VIDEO') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
                    mediaHtml += `
                        <div class="message-media-card message-video-wrap">
                            <video src="${fullUrl}" controls playsinline preload="metadata"></video>
                        </div>
                    `;
                } else if (fileType.includes('VOICE') || fileType.includes('AUDIO') || lower.endsWith('.webm') || lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg')) {
                    mediaHtml += `
                        <div class="message-audio-wrap">
                            <audio src="${fullUrl}" controls style="width: 100%; min-width: 220px; height: 38px; border-radius: 20px;"></audio>
                        </div>
                    `;
                } else {
                    const fileName = item.name || 'Document';
                    const fileSize = item.size ? window.Utils.formatFileSize(item.size) : '';
                    let ext = 'FILE';
                    const lastDot = fileName.lastIndexOf('.');
                    if (lastDot > 0) ext = fileName.substring(lastDot + 1).toUpperCase().slice(0, 4);

                    mediaHtml += `
                        <div class="message-document-card">
                            <div class="document-icon">
                                <span class="doc-ext-badge">${ext}</span>
                            </div>
                            <div class="document-info">
                                <div class="document-name" title="${window.Utils.escapeHtml(fileName)}">${window.Utils.escapeHtml(fileName)}</div>
                                <div class="document-meta">${fileSize}</div>
                            </div>
                            <a href="${fullUrl}" target="_blank" download="${window.Utils.escapeHtml(fileName)}" class="document-download-btn" title="Download ${window.Utils.escapeHtml(fileName)}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                        </div>
                    `;
                }
            });

            // Ticks status
            let tickHtml = '';
            if (isOutgoing) {
                const status = (msg.status || 'SENT').toUpperCase();
                let icon = '';
                if (status === 'SENT') {
                    icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
                } else if (status === 'DELIVERED') {
                    icon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
                } else if (status === 'READ') {
                    icon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" stroke-width="2.5"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
                }
                tickHtml = `<span class="status-tick ${status.toLowerCase()}" id="tick-${msg.id}">${icon}</span>`;
            }

            // Action Buttons
            const actionsHtml = `
                <button type="button" class="bubble-dropdown-trigger" onclick="window.Chat.toggleMessageMenu(event, ${msg.id}, ${isOutgoing})" title="Message options">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
            `;

            const senderNameHtml = (!isOutgoing && window.state.activeChat && window.state.activeChat.isGroup && msg.sender)
                ? `<div class="message-sender-name">${window.Utils.escapeHtml(msg.sender.fullName || msg.sender.username)}</div>`
                : '';

            const shouldShowText = msg.content && msg.content !== 'Voice note' && msg.content !== (msg.fileName || '');

            contentHtml = `
                <div class="message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}" id="msg-bubble-${msg.id}">
                    ${actionsHtml}
                    ${senderNameHtml}
                    ${quoteHtml}
                    ${mediaHtml}
                    ${shouldShowText ? `<div class="message-text-content">${window.Utils.escapeHtml(msg.content)}</div>` : ''}
                    <div class="message-meta">
                        <span>${timeStr}</span>
                        ${tickHtml}
                    </div>
                </div>
            `;
        }

        return `
            <div class="message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}" id="bubble-wrap-${msg.id}">
                ${contentHtml}
            </div>
        `;
    }

    function openImageLightbox(url) {
        let lightbox = document.getElementById('image-lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'image-lightbox';
            lightbox.className = 'image-lightbox-backdrop';
            lightbox.innerHTML = `
                <img id="image-lightbox-img" class="image-lightbox-content" src="" alt="Preview"/>
                <button type="button" class="image-lightbox-close" onclick="document.getElementById('image-lightbox').classList.add('hidden')">✕</button>
            `;
            document.body.appendChild(lightbox);
        }
        document.getElementById('image-lightbox-img').src = url;
        lightbox.classList.remove('hidden');
    }

    async function sendMessage(text, type = 'TEXT', mediaUrl = null, fileName = null, fileSize = null) {
        const convId = window.state.activeConversationId;
        if (!convId || !window.state.currentUser) return;

        const content = text ? text.trim() : '';
        if (type === 'TEXT' && content.length === 0) return;

        const replyId = replyingTo ? replyingTo.id : null;
        cancelReply();
        closeReactionPicker();

        const payload = {
            conversationId: convId,
            content: content,
            type: type,
            replyToMessageId: replyId,
            mediaUrl: mediaUrl,
            fileName: fileName,
            fileSize: fileSize
        };

        const sentWs = window.WebSocketManager && window.WebSocketManager.send('/app/chat.send', payload);
        if (!sentWs) {
            try {
                const dto = await window.ApiClient.post('/api/messages', payload);
                handleIncomingMessage(dto);
            } catch (err) {
                window.UI && window.UI.showToast(err.message || 'Could not send message', 'error');
            }
        }

        // Clear input text field
        const input = document.getElementById('chat-input-text');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
            handleInputTyping();
        }

        window.UI && window.UI.playChime && window.UI.playChime('sent');
    }

    function handleIncomingMessage(msg) {
        if (!msg) return;

        const isCurrentConv = window.state.activeConversationId === msg.conversationId;

        if (isCurrentConv) {
            const existingIdx = window.state.messages.findIndex(m => m.id === msg.id);
            const isOutgoing = msg.sender && msg.sender.id === window.state.currentUser.id;

            if (existingIdx !== -1) {
                window.state.messages[existingIdx] = msg;
                const oldWrap = document.getElementById(`bubble-wrap-${msg.id}`);
                if (oldWrap) {
                    oldWrap.outerHTML = renderMessageBubble(msg, isOutgoing);
                }
            } else {
                window.state.messages.push(msg);
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.insertAdjacentHTML('beforeend', renderMessageBubble(msg, isOutgoing));
                    scrollToBottom();
                }

                if (!isOutgoing) {
                    // Mark READ immediately
                    if (window.Messages) {
                        window.Messages.updateMessageStatus(msg.id, msg.conversationId, 'READ');
                    }
                    window.UI && window.UI.playChime && window.UI.playChime('message');
                }
            }
        }

        // Update conversation snippet in sidebar
        const snippetEl = document.getElementById(`conv-snippet-${msg.conversationId}`);
        if (snippetEl) {
            snippetEl.textContent = msg.content || 'Media message';
        }
        if (!isCurrentConv) {
            const badgeEl = document.getElementById(`conv-badge-${msg.conversationId}`);
            if (badgeEl) {
                const currentCount = parseInt(badgeEl.textContent || '0', 10);
                badgeEl.textContent = currentCount + 1;
                badgeEl.classList.remove('hidden');
            }
        }
    }

    function handleTypingSignal(signal) {
        if (!signal || signal.conversationId !== window.state.activeConversationId) return;
        if (signal.userId === window.state.currentUser.id) return;

        const statusEl = document.getElementById('active-chat-status');
        if (!statusEl) return;

        if (signal.typing) {
            statusEl.textContent = `${signal.fullName || signal.username} is typing...`;
            statusEl.style.color = 'var(--primary-color)';
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                statusEl.textContent = 'Online';
                statusEl.style.color = '';
            }, 3000);
        } else {
            statusEl.textContent = 'Online';
            statusEl.style.color = '';
        }
    }

    function handleStatusUpdate(data) {
        if (!data || data.conversationId !== window.state.activeConversationId) return;
        const tickEl = document.getElementById(`tick-${data.messageId}`);
        if (!tickEl) return;

        const status = (data.status || 'SENT').toUpperCase();
        let icon = '';
        if (status === 'SENT') {
            icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (status === 'DELIVERED') {
            icon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
        } else if (status === 'READ') {
            icon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#53bdeb" stroke-width="2.5"><polyline points="18 6 9 17 4 12"/><polyline points="22 10 13 21 8 16"/></svg>`;
        }
        tickEl.className = `status-tick ${status.toLowerCase()}`;
        tickEl.innerHTML = icon;
    }

    function handleMessageDeleted(data) {
        if (!data || data.conversationId !== window.state.activeConversationId) return;
        const bubble = document.getElementById(`msg-bubble-${data.messageId}`);
        if (bubble) {
            bubble.className = 'message-bubble deleted';
            bubble.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                This message was deleted.
            `;
        }
    }

    function handlePresenceChange(data) {
        if (!data || !data.userId) return;
        const ind = document.getElementById(`status-ind-${data.userId}`);
        if (ind) {
            ind.classList.toggle('online', !!data.online);
        }
        if (window.state.activeChat && window.state.activeChat.id === data.userId) {
            const statusEl = document.getElementById('active-chat-status');
            if (statusEl) {
                statusEl.textContent = data.online ? 'Online' : 'Offline';
            }
        }
    }

    function handleInputTyping() {
        const input = document.getElementById('chat-input-text');
        const sendBtn = document.getElementById('btn-send-message');
        const micBtn = document.getElementById('btn-record-voice');

        const hasText = input && input.value.trim().length > 0;
        if (sendBtn && micBtn) {
            sendBtn.classList.toggle('hidden', !hasText);
            micBtn.classList.toggle('hidden', hasText);
        }

        // Send throttled typing STOMP signal
        if (hasText && window.state.activeConversationId && window.WebSocketManager) {
            window.WebSocketManager.send('/app/chat.typing', {
                conversationId: window.state.activeConversationId,
                typing: true,
                fullName: window.state.currentUser.fullName,
                username: window.state.currentUser.username
            });
        }
    }

    function setReplyingTo(msgId, author, snippet) {
        replyingTo = { id: msgId, author: author, snippet: snippet };
        const banner = document.getElementById('chat-reply-banner');
        const userEl = document.getElementById('reply-banner-user');
        const textEl = document.getElementById('reply-banner-text');

        if (banner && userEl && textEl) {
            userEl.textContent = author;
            textEl.textContent = snippet;
            banner.classList.remove('hidden');
        }

        const input = document.getElementById('chat-input-text');
        if (input) input.focus();
    }

    function cancelReply() {
        replyingTo = null;
        const banner = document.getElementById('chat-reply-banner');
        if (banner) banner.classList.add('hidden');
    }

    function toggleMessageMenu(event, messageId, isOutgoing) {
        event.stopPropagation();
        closeReactionPicker();

        const menu = document.getElementById('message-context-menu');
        if (!menu) return;

        menu.dataset.messageId = messageId;
        menu.dataset.isOutgoing = isOutgoing ? 'true' : 'false';

        const deleteEveryoneBtn = document.getElementById('ctx-delete-everyone-btn');
        if (deleteEveryoneBtn) {
            deleteEveryoneBtn.classList.toggle('hidden', !isOutgoing);
        }

        menu.style.top = `${event.clientY + 5}px`;
        menu.style.left = `${Math.min(event.clientX - 60, window.innerWidth - 180)}px`;
        menu.classList.remove('hidden');
    }

    function closeReactionPicker() {
        const picker = document.getElementById('active-reactions-toolbar');
        if (picker) picker.remove();
    }

    async function deleteMessageForMe(messageId) {
        try {
            await window.ApiClient.delete(`/api/messages/${messageId}`);
            const wrap = document.getElementById(`bubble-wrap-${messageId}`);
            if (wrap) wrap.remove();
            window.UI && window.UI.showToast('Message removed from view', 'info');
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to delete message', 'error');
        }
    }

    async function deleteMessageForEveryone(messageId) {
        try {
            await window.ApiClient.post(`/api/messages/${messageId}/delete-for-everyone`);
            handleMessageDeleted({ conversationId: window.state.activeConversationId, messageId: messageId });
            window.UI && window.UI.showToast('Message deleted for everyone', 'info');
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Cannot delete: 24h limit reached', 'error');
        }
    }

    async function clearCurrentChat() {
        const convId = window.state.activeConversationId;
        if (!convId) return;
        if (!confirm('Are you sure you want to clear chat history with this conversation?')) return;

        try {
            await window.ApiClient.delete(`/api/conversations/${convId}`);
            const container = document.getElementById('chat-messages-container');
            if (container) container.innerHTML = '';
            window.UI && window.UI.showToast('Chat history cleared', 'info');
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to clear chat', 'error');
        }
    }

    function scrollToBottom() {
        const container = document.getElementById('chat-messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function closeConversation() {
        const emptyState = document.getElementById('chat-empty-state');
        const activeContainer = document.getElementById('chat-active-container');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.style.removeProperty('display');
        }
        if (activeContainer) {
            activeContainer.classList.add('hidden');
            activeContainer.style.setProperty('display', 'none', 'important');
        }
        window.state.activeChat = null;
    }

    return {
        loadConversations,
        openDirectChat,
        openConversation,
        closeConversation,
        loadMessages,
        sendMessage,
        handleIncomingMessage,
        handleTypingSignal,
        handleStatusUpdate,
        handleMessageDeleted,
        handlePresenceChange,
        handleInputTyping,
        setReplyingTo,
        cancelReply,
        toggleMessageMenu,
        closeReactionPicker,
        deleteMessageForMe,
        deleteMessageForEveryone,
        clearCurrentChat,
        openImageLightbox
    };
})();
