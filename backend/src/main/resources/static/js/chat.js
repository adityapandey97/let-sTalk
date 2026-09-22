/**
 * Let's Talk Direct Messaging Module
 * Complete real-time chat with 50MB media transfer, emoji reactions, quoted replies,
 * and message/chat deletion ("Delete for Me" and "Delete for Everyone").
 */
window.Chat = (function () {
    const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    let replyingTo = null;
    let typingTimeout = null;

    function openDirectChat(otherUserId, name, avatarUrl, username) {
        window.state.activeChat = {
            type: 'direct',
            id: otherUserId,
            name: name,
            avatarUrl: avatarUrl,
            username: username
        };

        // Update mobile active state
        window.UI.toggleMobileChat(true);

        // Update sidebar active highlights
        document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
        const item = document.getElementById(`conv-item-${otherUserId}`);
        if (item) item.classList.add('active');

        // Show active chat container, hide empty state
        const emptyState = document.getElementById('chat-empty-state');
        const activeContainer = document.getElementById('chat-active-container');
        if (emptyState) emptyState.classList.add('hidden');
        if (activeContainer) activeContainer.classList.remove('hidden');

        // Update chat header
        const nameEl = document.getElementById('active-chat-name');
        const statusEl = document.getElementById('active-chat-status');
        const avatarContainer = document.getElementById('active-chat-avatar-wrap');

        if (nameEl) nameEl.textContent = name;
        if (statusEl) statusEl.textContent = 'Active now';

        if (avatarContainer) {
            if (avatarUrl && avatarUrl.trim() !== '') {
                avatarContainer.innerHTML = `<img src="${window.getApiUrl(avatarUrl)}" alt="${window.Utils.escapeHtml(name)}" class="avatar" />`;
            } else {
                const initials = window.Utils.getInitials(name || username);
                const gradient = window.Utils.getAvatarGradient(username || name);
                avatarContainer.innerHTML = `<div class="avatar" style="background: ${gradient}">${initials}</div>`;
            }
        }

        cancelReply();
        closeReactionPicker();
        loadChatHistory(otherUserId);
    }

    async function loadChatHistory(otherUserId) {
        if (!window.state.currentUser) return;
        const currentUserId = window.state.currentUser.id;

        const scrollContainer = document.getElementById('chat-messages-container');
        if (scrollContainer) {
            scrollContainer.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    Loading messages...
                </div>
            `;
        }

        try {
            const messages = await window.ApiClient.get(`/api/messages/private?userId=${currentUserId}&otherUserId=${otherUserId}`);
            window.state.messages = messages || [];
            renderMessages(window.state.messages);
            scrollToBottom();
        } catch (err) {
            console.error('Failed to load chat history:', err);
            if (scrollContainer) {
                scrollContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--accent-red);">Failed to load chat history</div>`;
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
                    Messages are end-to-end persistent and secure.<br/>Send a message or photo to start talking!
                </div>
            `;
            return;
        }

        let html = '';
        let lastDateStr = '';

        messages.forEach(msg => {
            const isOutgoing = msg.senderId === window.state.currentUser.id;
            const dateStr = window.Utils.formatDateHeader(msg.sentAt);

            if (dateStr !== lastDateStr) {
                html += `<div class="date-separator">${dateStr}</div>`;
                lastDateStr = dateStr;
            }

            html += renderMessageBubble(msg, isOutgoing);
        });

        container.innerHTML = html;
    }

    function renderReactionsRow(msg) {
        if (!msg.reactions || msg.reactions.trim() === '' || msg.reactions === '{}') {
            return '';
        }

        let parsed = {};
        try {
            parsed = JSON.parse(msg.reactions);
        } catch {
            return '';
        }

        const counts = {};
        const currentUsername = window.state.currentUser ? window.state.currentUser.username : '';

        for (const [user, emoji] of Object.entries(parsed)) {
            if (!counts[emoji]) {
                counts[emoji] = { count: 0, users: [], userReacted: false };
            }
            counts[emoji].count += 1;
            counts[emoji].users.push(user);
            if (user === currentUsername) {
                counts[emoji].userReacted = true;
            }
        }

        const chips = Object.entries(counts).map(([emoji, data]) => {
            const activeClass = data.userReacted ? 'user-reacted' : '';
            const tooltip = window.Utils.escapeHtml(data.users.join(', '));
            return `
                <span class="message-reaction-chip ${activeClass}" 
                      onclick="window.Chat.reactToMessage(${msg.id}, '${emoji}')" 
                      title="${tooltip}">
                    <span>${emoji}</span>
                    <span class="chip-count">${data.count}</span>
                </span>
            `;
        }).join('');

        return `<div class="message-reactions-row" id="reactions-row-${msg.id}">${chips}</div>`;
    }

    function renderMessageBubble(msg, isOutgoing) {
        const timeStr = window.Utils.formatTime(msg.sentAt);
        const isDeleted = msg.deletedForEveryone;

        let contentHtml = '';
        if (isDeleted) {
            contentHtml = `
                <div class="message-bubble deleted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    This message was deleted
                </div>
            `;
        } else {
            // Quoted Reply Preview
            let quoteHtml = '';
            if (msg.repliedMessageContent) {
                quoteHtml = `
                    <div class="replied-quote-card">
                        <div class="quote-snippet">${window.Utils.escapeHtml(msg.repliedMessageContent)}</div>
                    </div>
                `;
            }

            // Media Preview (Image, Video, Audio, Document)
            let mediaHtml = '';
            if (msg.mediaUrl) {
                const fullUrl = window.getApiUrl(msg.mediaUrl);
                if (msg.messageType === 'IMAGE') {
                    mediaHtml = `
                        <div class="message-media-card message-image-wrap">
                            <img src="${fullUrl}" alt="Photo" onclick="window.open('${fullUrl}', '_blank')" />
                        </div>
                    `;
                } else if (msg.messageType === 'VIDEO') {
                    mediaHtml = `
                        <div class="message-media-card message-video-wrap">
                            <video src="${fullUrl}" controls playsinline preload="metadata"></video>
                        </div>
                    `;
                } else if (msg.messageType === 'AUDIO') {
                    mediaHtml = `
                        <div class="message-audio-wrap">
                            <audio src="${fullUrl}" controls style="width: 100%; height: 36px;"></audio>
                        </div>
                    `;
                } else if (msg.messageType === 'DOCUMENT' || msg.messageType === 'FILE') {
                    let meta = {};
                    try { meta = JSON.parse(msg.mediaMetadata || '{}'); } catch {}
                    const fileName = meta.fileName || msg.content || 'Document';
                    const fileSize = meta.fileSize ? window.Utils.formatFileSize(meta.fileSize) : '';

                    mediaHtml = `
                        <div class="message-document-card">
                            <div class="document-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div class="document-info">
                                <div class="document-name">${window.Utils.escapeHtml(fileName)}</div>
                                <div class="document-meta">${fileSize}</div>
                            </div>
                            <a href="${fullUrl}" target="_blank" download="${fileName}" class="document-download-btn" title="Download Document">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                        </div>
                    `;
                }
            }

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

            // Action Buttons (Reaction smile & Dropdown options)
            const actionsHtml = `
                <button type="button" class="bubble-reaction-trigger" onclick="window.Chat.toggleReactionPicker(event, ${msg.id})" title="React to message">
                    😊
                </button>
                <button type="button" class="bubble-dropdown-trigger" onclick="window.Chat.toggleMessageMenu(event, ${msg.id}, ${isOutgoing})" title="Message options">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
            `;

            const reactionsHtml = renderReactionsRow(msg);

            contentHtml = `
                <div class="message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}" id="msg-bubble-${msg.id}">
                    ${actionsHtml}
                    ${quoteHtml}
                    ${mediaHtml}
                    ${msg.content && msg.messageType === 'TEXT' ? `<span>${window.Utils.escapeHtml(msg.content)}</span>` : ''}
                    <div class="message-meta">
                        <span>${timeStr}</span>
                        ${tickHtml}
                    </div>
                    ${reactionsHtml}
                </div>
            `;
        }

        return `
            <div class="message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}" id="bubble-wrap-${msg.id}">
                ${contentHtml}
            </div>
        `;
    }

    function toggleReactionPicker(event, messageId) {
        event.stopPropagation();
        closeReactionPicker();

        const bubbleWrap = document.getElementById(`bubble-wrap-${messageId}`);
        if (!bubbleWrap) return;

        const picker = document.createElement('div');
        picker.className = 'reactions-picker-toolbar';
        picker.id = 'active-reactions-toolbar';

        REACTION_EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'reaction-pick-btn';
            btn.textContent = emoji;
            btn.title = `React with ${emoji}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                reactToMessage(messageId, emoji);
                closeReactionPicker();
            };
            picker.appendChild(btn);
        });

        bubbleWrap.appendChild(picker);
    }

    function closeReactionPicker() {
        const picker = document.getElementById('active-reactions-toolbar');
        if (picker) picker.remove();
    }

    async function reactToMessage(messageId, emoji) {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        try {
            const updatedMsg = await window.ApiClient.post(
                `/api/messages/${messageId}/react?userId=${userId}&emoji=${encodeURIComponent(emoji)}`,
                {}
            );
            handleIncomingMessage(updatedMsg);
        } catch (err) {
            console.error('Failed to react to message:', err);
            window.UI.showToast('Could not save reaction', 'error');
        }
    }

    function sendMessage(text, type = 'TEXT', mediaUrl = null, mediaMetadata = null) {
        if (!window.state.activeChat || !window.state.currentUser) return;

        const content = text ? text.trim() : '';
        if (type === 'TEXT' && content.length === 0) return;

        const payload = {
            senderId: window.state.currentUser.id,
            receiverId: window.state.activeChat.id,
            content: content,
            messageType: type,
            mediaUrl: mediaUrl,
            mediaMetadata: mediaMetadata,
            repliedMessageId: replyingTo ? replyingTo.id : null
        };

        cancelReply();
        closeReactionPicker();

        // Send via WebSocket STOMP
        const sentWs = window.WebSocketManager && window.WebSocketManager.send('/app/chat.private', payload);
        if (!sentWs) {
            // Fallback REST if WebSocket temporarily disconnected
            window.ApiClient.post('/api/messages/private', payload).then(dto => {
                handleIncomingMessage(dto);
            });
        }

        // Clear input text field
        const input = document.getElementById('chat-input-text');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        window.UI.playChime('sent');
    }

    function handleIncomingMessage(msg) {
        if (!msg) return;

        const isCurrentChat = window.state.activeChat &&
            window.state.activeChat.type === 'direct' &&
            (window.state.activeChat.id === msg.senderId || window.state.activeChat.id === msg.receiverId);

        if (isCurrentChat) {
            const existingIdx = window.state.messages.findIndex(m => m.id === msg.id);
            const isOutgoing = msg.senderId === window.state.currentUser.id;

            if (existingIdx !== -1) {
                // Update existing message in state and replace DOM node
                window.state.messages[existingIdx] = msg;
                const oldWrap = document.getElementById(`bubble-wrap-${msg.id}`);
                if (oldWrap) {
                    oldWrap.outerHTML = renderMessageBubble(msg, isOutgoing);
                }
            } else {
                // Brand new message
                window.state.messages.push(msg);
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    container.insertAdjacentHTML('beforeend', renderMessageBubble(msg, isOutgoing));
                    scrollToBottom();
                }

                // Acknowledge read if recipient
                if (!isOutgoing) {
                    window.WebSocketManager.send('/app/chat.status', {
                        userId: window.state.currentUser.id,
                        messageId: msg.id,
                        status: 'READ'
                    });
                    window.UI.playChime('message');
                }
            }
        } else {
            // Update snippet & unread badge in sidebar
            const senderId = msg.senderId;
            const snippetEl = document.getElementById(`conv-snippet-${senderId}`);
            if (snippetEl) snippetEl.textContent = msg.content || 'Media message';
            const badgeEl = document.getElementById(`conv-badge-${senderId}`);
            if (badgeEl) {
                badgeEl.textContent = '1';
                badgeEl.classList.remove('hidden');
            }
            window.UI.playChime('message');
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

        // Toggle "Delete for everyone" button visibility
        const deleteEveryoneBtn = document.getElementById('ctx-delete-everyone-btn');
        if (deleteEveryoneBtn) {
            deleteEveryoneBtn.classList.toggle('hidden', !isOutgoing);
        }

        // Position menu near click
        menu.style.top = `${event.clientY + 5}px`;
        menu.style.left = `${Math.min(event.clientX - 60, window.innerWidth - 180)}px`;
        menu.classList.remove('hidden');
    }

    async function deleteMessageForMe(messageId) {
        if (!window.state.currentUser) return;
        try {
            await window.ApiClient.delete(`/api/messages/${messageId}?userId=${window.state.currentUser.id}`);
            const wrap = document.getElementById(`bubble-wrap-${messageId}`);
            if (wrap) wrap.remove();
            window.UI.showToast('Message deleted for you', 'info');
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to delete message', 'error');
        }
    }

    async function deleteMessageForEveryone(messageId) {
        if (!window.state.currentUser) return;
        try {
            await window.ApiClient.post(`/api/messages/${messageId}/delete-for-everyone?userId=${window.state.currentUser.id}`, {});
            window.Notifications.markMessageDeletedForEveryoneInDOM(messageId);
            window.UI.showToast('Message deleted for everyone', 'info');
        } catch (err) {
            window.UI.showToast(err.message || 'Cannot delete: 24h limit reached', 'error');
        }
    }

    async function clearCurrentChat() {
        if (!window.state.activeChat || !window.state.currentUser) return;
        if (!confirm('Are you sure you want to clear chat history with this contact?')) return;

        try {
            await window.ApiClient.delete(`/api/messages/private?userId=${window.state.currentUser.id}&otherUserId=${window.state.activeChat.id}`);
            const container = document.getElementById('chat-messages-container');
            if (container) container.innerHTML = '';
            window.UI.showToast('Chat history cleared', 'info');
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to clear chat', 'error');
        }
    }

    function scrollToBottom() {
        const container = document.getElementById('chat-messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    return {
        openDirectChat,
        loadChatHistory,
        sendMessage,
        handleIncomingMessage,
        setReplyingTo,
        cancelReply,
        toggleReactionPicker,
        closeReactionPicker,
        reactToMessage,
        toggleMessageMenu,
        deleteMessageForMe,
        deleteMessageForEveryone,
        clearCurrentChat
    };
})();
