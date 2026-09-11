/**
 * ConnectChat – Real-Time Messaging Application
 * Complete Frontend Logic: Vanilla JS + STOMP over SockJS
 */

// =============================================================================
// Global State
// =============================================================================
let currentUser = null; // { id, fullName, username, bio }
let activeChat = null; // { type: 'PRIVATE' | 'GROUP', id, name, username, memberCount }
let stompClient = null;
let isConnected = false;
let groupSubscription = null;

// Debounce timer for username validation & search
let usernameCheckTimer = null;
let searchDebounceTimer = null;

// =============================================================================
// Lifecycle & Initialization
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const savedUserData = localStorage.getItem('connectchat_user');
    if (savedUserData) {
        try {
            currentUser = JSON.parse(savedUserData);
            showMainApp();
            connectWebSocket();
        } catch (e) {
            console.error('Invalid saved profile:', e);
            localStorage.removeItem('connectchat_user');
            showProfileScreen();
        }
    } else {
        showProfileScreen();
    }
}

function showProfileScreen() {
    document.getElementById('profile-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('profile-fullname').focus();
}

function showMainApp() {
    document.getElementById('profile-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    // Update current user UI in sidebar
    document.getElementById('current-user-name').textContent = currentUser.fullName;
    document.getElementById('current-user-tag').textContent = '@' + currentUser.username;
    document.getElementById('current-user-avatar').textContent = currentUser.fullName.charAt(0).toUpperCase();

    // Reset chat state
    closeActiveChat();

    // Load initial data
    loadChats();
    loadGroups();
    loadPendingRequestsCount();
}

function logoutOrSwitchProfile() {
    disconnectWebSocket();
    localStorage.removeItem('connectchat_user');
    currentUser = null;
    activeChat = null;
    showProfileScreen();
}

// =============================================================================
// Profile Creation & Username Checking
// =============================================================================
function setupEventListeners() {
    const usernameInput = document.getElementById('profile-username');
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            clearTimeout(usernameCheckTimer);
            const val = usernameInput.value.trim().toLowerCase();
            const statusIcon = document.getElementById('username-status-icon');
            const statusMsg = document.getElementById('username-status-msg');

            if (!val || val.length < 3) {
                statusIcon.className = 'status-icon';
                statusIcon.textContent = '';
                statusMsg.className = 'field-feedback';
                statusMsg.textContent = '3-30 chars, letters, numbers, and underscores only.';
                return;
            }

            const pattern = /^[a-zA-Z0-9_]{3,30}$/;
            if (!pattern.test(val)) {
                statusIcon.className = 'status-icon invalid';
                statusIcon.textContent = '✕';
                statusMsg.className = 'field-feedback error';
                statusMsg.textContent = 'Invalid characters. Only letters, numbers, and _ are allowed.';
                return;
            }

            usernameCheckTimer = setTimeout(() => {
                checkUsernameAvailability(val);
            }, 300);
        });
    }

    // Search user input listener
    const searchInput = document.getElementById('search-user-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            const query = searchInput.value.trim();
            searchDebounceTimer = setTimeout(() => {
                searchUsers(query);
            }, 300);
        });
    }

    // Navigation buttons
    document.getElementById('btn-switch-profile').addEventListener('click', logoutOrSwitchProfile);
    document.getElementById('btn-open-search').addEventListener('click', () => openModal('modal-search'));
    document.getElementById('btn-open-requests').addEventListener('click', openRequestsModal);
    document.getElementById('btn-open-create-group').addEventListener('click', openCreateGroupModal);
    document.getElementById('btn-mobile-back').addEventListener('click', closeActiveChat);
    document.getElementById('btn-group-info').addEventListener('click', openGroupInfoModal);
}

async function checkUsernameAvailability(username) {
    const statusIcon = document.getElementById('username-status-icon');
    const statusMsg = document.getElementById('username-status-msg');

    try {
        const res = await fetch(`/api/users/username-available?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (data.available) {
            statusIcon.className = 'status-icon valid';
            statusIcon.textContent = '✓';
            statusMsg.className = 'field-feedback success';
            statusMsg.textContent = 'Username available!';
        } else {
            statusIcon.className = 'status-icon invalid';
            statusIcon.textContent = '✕';
            statusMsg.className = 'field-feedback error';
            statusMsg.textContent = 'Username already taken.';
        }
    } catch (e) {
        console.error('Error checking username:', e);
    }
}

async function createProfile() {
    const fullName = document.getElementById('profile-fullname').value.trim();
    const username = document.getElementById('profile-username').value.trim().toLowerCase();
    const bio = document.getElementById('profile-bio').value.trim();
    const errorBanner = document.getElementById('profile-error');

    errorBanner.classList.add('hidden');
    errorBanner.textContent = '';

    if (!fullName || !username) {
        errorBanner.textContent = 'Please fill in all required fields.';
        errorBanner.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, bio })
        });

        const data = await response.json();

        if (!response.ok) {
            errorBanner.textContent = data.message || 'Failed to create profile.';
            errorBanner.classList.remove('hidden');
            return;
        }

        currentUser = data;
        localStorage.setItem('connectchat_user', JSON.stringify(currentUser));
        showMainApp();
        connectWebSocket();
    } catch (e) {
        console.error('Profile creation error:', e);
        errorBanner.textContent = 'Connection error. Please try again.';
        errorBanner.classList.remove('hidden');
    }
}

// =============================================================================
// WebSocket STOMP Connection Management
// =============================================================================
function connectWebSocket() {
    if (!currentUser) return;

    updateConnectionStatus('connecting');

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Clean console

    stompClient.connect({}, onWebSocketConnected, onWebSocketError);
}

function onWebSocketConnected() {
    isConnected = true;
    updateConnectionStatus('connected');

    // Subscribe to current user's private message topic
    stompClient.subscribe(`/topic/private/${currentUser.id}`, (payload) => {
        try {
            const message = JSON.parse(payload.body);
            handlePrivateMessage(message);
        } catch (e) {
            console.error('Error parsing private message:', e);
        }
    });

    // Subscribe to current user's notifications topic
    stompClient.subscribe(`/topic/user/${currentUser.id}/notifications`, (payload) => {
        try {
            const notification = JSON.parse(payload.body);
            handleNotification(notification);
        } catch (e) {
            console.error('Error parsing notification:', e);
        }
    });

    // If currently viewing a group chat, subscribe to the group topic
    if (activeChat && activeChat.type === 'GROUP') {
        subscribeToGroup(activeChat.id);
    }
}

function onWebSocketError(error) {
    isConnected = false;
    updateConnectionStatus('disconnected');
    console.error('WebSocket connection error:', error);
}

function disconnectWebSocket() {
    if (stompClient && isConnected) {
        if (groupSubscription) {
            groupSubscription.unsubscribe();
            groupSubscription = null;
        }
        stompClient.disconnect(() => {
            console.log('WebSocket disconnected');
        });
    }
    isConnected = false;
    updateConnectionStatus('disconnected');
}

function updateConnectionStatus(status) {
    const badge = document.getElementById('connection-badge');
    if (!badge) return;

    badge.className = `connection-pill ${status}`;
    const label = badge.querySelector('.status-label');

    if (status === 'connected') {
        label.textContent = 'Connected';
    } else if (status === 'connecting') {
        label.textContent = 'Connecting...';
    } else {
        label.textContent = 'Disconnected';
    }
}

// =============================================================================
// User Search & Connection Requests
// =============================================================================
async function searchUsers(query) {
    const container = document.getElementById('search-results-list');
    if (!query || query.length < 1) {
        container.innerHTML = '<div class="modal-empty-hint">Type a username to find people.</div>';
        return;
    }

    try {
        const res = await fetch(`/api/users/search?username=${encodeURIComponent(query)}&currentUserId=${currentUser.id}`);
        const results = await res.json();

        if (!results || results.length === 0) {
            container.innerHTML = '<div class="modal-empty-hint">No users found matching "' + escapeHtml(query) + '".</div>';
            return;
        }

        container.innerHTML = '';
        results.forEach(user => {
            const item = document.createElement('div');
            item.className = 'modal-user-item';

            let actionButtonHtml = '';
            if (user.relationshipState === 'CONNECTED') {
                actionButtonHtml = '<span class="btn-action-sm btn-connected">Connected ✓</span>';
            } else if (user.relationshipState === 'OUTGOING_PENDING') {
                actionButtonHtml = '<span class="btn-action-sm btn-status-sent">Request Sent</span>';
            } else if (user.relationshipState === 'INCOMING_PENDING') {
                actionButtonHtml = `
                    <button class="btn-action-sm btn-accept" onclick="acceptRequestFromSearch(${user.requestId})">Accept</button>
                    <button class="btn-action-sm btn-reject" onclick="rejectRequestFromSearch(${user.requestId})">Reject</button>
                `;
            } else {
                actionButtonHtml = `<button class="btn-action-sm btn-connect" onclick="sendConnectionRequest(${user.id})">Send Request</button>`;
            }

            item.innerHTML = `
                <div class="user-item-left">
                    <div class="user-avatar" style="width:36px;height:36px;font-size:0.85rem;">${escapeHtml(user.fullName.charAt(0).toUpperCase())}</div>
                    <div class="user-item-meta">
                        <div class="user-item-name">${escapeHtml(user.fullName)}</div>
                        <div class="user-item-username">@${escapeHtml(user.username)}</div>
                    </div>
                </div>
                <div class="user-item-actions">${actionButtonHtml}</div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Search error:', e);
        container.innerHTML = '<div class="modal-empty-hint">Error loading search results.</div>';
    }
}

async function sendConnectionRequest(receiverId) {
    try {
        const res = await fetch('/api/connections/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: currentUser.id, receiverId })
        });

        if (res.ok) {
            const searchInput = document.getElementById('search-user-input');
            searchUsers(searchInput.value.trim());
            loadChats();
        } else {
            const err = await res.json();
            alert(err.message || 'Could not send request');
        }
    } catch (e) {
        console.error('Send request error:', e);
    }
}

async function openRequestsModal() {
    openModal('modal-requests');
    const container = document.getElementById('pending-requests-list');
    container.innerHTML = '<div class="modal-empty-hint">Loading requests...</div>';

    try {
        const res = await fetch(`/api/connections/requests/${currentUser.id}`);
        const requests = await res.json();

        if (!requests || requests.length === 0) {
            container.innerHTML = '<div class="modal-empty-hint">No pending connection requests.</div>';
            updateRequestsBadge(0);
            return;
        }

        updateRequestsBadge(requests.length);
        container.innerHTML = '';

        requests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'modal-user-item';
            item.innerHTML = `
                <div class="user-item-left">
                    <div class="user-avatar" style="width:36px;height:36px;font-size:0.85rem;">${escapeHtml(req.user.fullName.charAt(0).toUpperCase())}</div>
                    <div class="user-item-meta">
                        <div class="user-item-name">${escapeHtml(req.user.fullName)}</div>
                        <div class="user-item-username">@${escapeHtml(req.user.username)}</div>
                    </div>
                </div>
                <div class="user-item-actions">
                    <button class="btn-action-sm btn-accept" onclick="acceptConnectionRequest(${req.requestId})">Accept</button>
                    <button class="btn-action-sm btn-reject" onclick="rejectConnectionRequest(${req.requestId})">Reject</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Error loading requests:', e);
        container.innerHTML = '<div class="modal-empty-hint">Error loading requests.</div>';
    }
}

async function acceptConnectionRequest(requestId) {
    try {
        const res = await fetch(`/api/connections/${requestId}/accept?userId=${currentUser.id}`, { method: 'POST' });
        if (res.ok) {
            openRequestsModal();
            loadChats();
        }
    } catch (e) {
        console.error('Accept error:', e);
    }
}

async function rejectConnectionRequest(requestId) {
    try {
        const res = await fetch(`/api/connections/${requestId}/reject?userId=${currentUser.id}`, { method: 'POST' });
        if (res.ok) {
            openRequestsModal();
            loadChats();
        }
    } catch (e) {
        console.error('Reject error:', e);
    }
}

async function acceptRequestFromSearch(requestId) {
    await acceptConnectionRequest(requestId);
    const searchInput = document.getElementById('search-user-input');
    searchUsers(searchInput.value.trim());
}

async function rejectRequestFromSearch(requestId) {
    await rejectConnectionRequest(requestId);
    const searchInput = document.getElementById('search-user-input');
    searchUsers(searchInput.value.trim());
}

async function loadPendingRequestsCount() {
    try {
        const res = await fetch(`/api/connections/requests/${currentUser.id}`);
        const requests = await res.json();
        updateRequestsBadge(requests ? requests.length : 0);
    } catch (e) {
        console.error('Error loading requests count:', e);
    }
}

function updateRequestsBadge(count) {
    const badge = document.getElementById('requests-badge');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// =============================================================================
// Chats List (Accepted Connections)
// =============================================================================
async function loadChats() {
    const container = document.getElementById('chats-list');
    const counter = document.getElementById('chats-count');

    try {
        const res = await fetch(`/api/connections/${currentUser.id}`);
        const connections = await res.json();

        counter.textContent = connections ? connections.length : 0;

        if (!connections || connections.length === 0) {
            container.innerHTML = '<div class="list-empty-hint">No connections yet. Search users to start chatting!</div>';
            return;
        }

        container.innerHTML = '';
        connections.forEach(conn => {
            const user = conn.user;
            const item = document.createElement('div');
            item.className = 'conv-item' + (activeChat && activeChat.type === 'PRIVATE' && activeChat.id === user.id ? ' active' : '');
            item.id = `chat-item-user-${user.id}`;
            item.onclick = () => selectPrivateChat(user);

            let previewText = conn.lastMessage ? escapeHtml(conn.lastMessage) : 'Start a conversation';
            if (conn.lastMessage && conn.lastMessageSenderId === currentUser.id) {
                previewText = 'You: ' + previewText;
            }

            const timeText = conn.lastMessageTime ? formatTimestamp(conn.lastMessageTime) : '';
            const unreadBadge = conn.unreadCount > 0 ? `<span class="conv-unread-pill">${conn.unreadCount}</span>` : '';

            item.innerHTML = `
                <div class="conv-avatar">${escapeHtml(user.fullName.charAt(0).toUpperCase())}</div>
                <div class="conv-info">
                    <div class="conv-top-row">
                        <span class="conv-name">${escapeHtml(user.fullName)}</span>
                        <span class="conv-time">${timeText}</span>
                    </div>
                    <div class="conv-bottom-row">
                        <span class="conv-preview">${previewText}</span>
                        ${unreadBadge}
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Error loading chats:', e);
    }
}

// =============================================================================
// Groups List & Group Creation
// =============================================================================
async function loadGroups() {
    const container = document.getElementById('groups-list');

    try {
        const res = await fetch(`/api/groups/user/${currentUser.id}`);
        const groups = await res.json();

        if (!groups || groups.length === 0) {
            container.innerHTML = '<div class="list-empty-hint">No groups yet. Create one with your friends!</div>';
            return;
        }

        container.innerHTML = '';
        groups.forEach(grp => {
            const item = document.createElement('div');
            item.className = 'conv-item' + (activeChat && activeChat.type === 'GROUP' && activeChat.id === grp.id ? ' active' : '');
            item.id = `chat-item-group-${grp.id}`;
            item.onclick = () => selectGroupChat(grp);

            let previewText = grp.lastMessage ? `${escapeHtml(grp.lastMessageSenderName)}: ${escapeHtml(grp.lastMessage)}` : `${grp.memberCount} members`;
            const timeText = grp.lastMessageTime ? formatTimestamp(grp.lastMessageTime) : '';

            item.innerHTML = `
                <div class="conv-avatar group">👥</div>
                <div class="conv-info">
                    <div class="conv-top-row">
                        <span class="conv-name">${escapeHtml(grp.name)}</span>
                        <span class="conv-time">${timeText}</span>
                    </div>
                    <div class="conv-bottom-row">
                        <span class="conv-preview">${previewText}</span>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Error loading groups:', e);
    }
}

async function openCreateGroupModal() {
    openModal('modal-create-group');
    const checklist = document.getElementById('group-members-checklist');
    const errorBanner = document.getElementById('create-group-error');
    document.getElementById('group-name-input').value = '';
    errorBanner.classList.add('hidden');
    checklist.innerHTML = '<div class="modal-empty-hint">Loading connections...</div>';

    try {
        const res = await fetch(`/api/connections/${currentUser.id}`);
        const connections = await res.json();

        if (!connections || connections.length === 0) {
            checklist.innerHTML = '<div class="modal-empty-hint">You need accepted connections to create a group.</div>';
            return;
        }

        checklist.innerHTML = '';
        connections.forEach(conn => {
            const u = conn.user;
            const label = document.createElement('label');
            label.className = 'member-check-item';
            label.innerHTML = `
                <input type="checkbox" value="${u.id}" name="group-member" />
                <div class="user-avatar" style="width:28px;height:28px;font-size:0.75rem;">${escapeHtml(u.fullName.charAt(0).toUpperCase())}</div>
                <span style="font-size:0.88rem;font-weight:600;">${escapeHtml(u.fullName)} (@${escapeHtml(u.username)})</span>
            `;
            checklist.appendChild(label);
        });
    } catch (e) {
        console.error('Error loading connections for group:', e);
        checklist.innerHTML = '<div class="modal-empty-hint">Error loading connections.</div>';
    }
}

async function submitCreateGroup() {
    const name = document.getElementById('group-name-input').value.trim();
    const errorBanner = document.getElementById('create-group-error');
    errorBanner.classList.add('hidden');

    if (!name) {
        errorBanner.textContent = 'Group name is required';
        errorBanner.classList.remove('hidden');
        return;
    }

    const checkboxes = document.querySelectorAll('input[name="group-member"]:checked');
    const memberIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatorId: currentUser.id,
                name,
                memberIds
            })
        });

        const data = await res.json();

        if (!res.ok) {
            errorBanner.textContent = data.message || 'Failed to create group';
            errorBanner.classList.remove('hidden');
            return;
        }

        closeModal('modal-create-group');
        loadGroups();
        selectGroupChat(data);
    } catch (e) {
        console.error('Error creating group:', e);
        errorBanner.textContent = 'Connection error. Please try again.';
        errorBanner.classList.remove('hidden');
    }
}

async function openGroupInfoModal() {
    if (!activeChat || activeChat.type !== 'GROUP') return;

    openModal('modal-group-info');
    document.getElementById('group-info-title').textContent = activeChat.name;

    try {
        const detailsRes = await fetch(`/api/groups/${activeChat.id}?userId=${currentUser.id}`);
        const details = await detailsRes.json();
        document.getElementById('group-info-creator').textContent = '@' + details.createdByUsername;
        document.getElementById('group-info-count').textContent = details.memberCount;

        const membersRes = await fetch(`/api/groups/${activeChat.id}/members?userId=${currentUser.id}`);
        const members = await membersRes.json();
        const container = document.getElementById('group-info-members-list');
        container.innerHTML = '';

        members.forEach(m => {
            const row = document.createElement('div');
            row.className = 'modal-user-item';
            row.innerHTML = `
                <div class="user-item-left">
                    <div class="user-avatar" style="width:32px;height:32px;font-size:0.8rem;">${escapeHtml(m.fullName.charAt(0).toUpperCase())}</div>
                    <div class="user-item-meta">
                        <div class="user-item-name">${escapeHtml(m.fullName)} ${m.userId === currentUser.id ? '(You)' : ''}</div>
                        <div class="user-item-username">@${escapeHtml(m.username)}</div>
                    </div>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (e) {
        console.error('Error loading group info:', e);
    }
}

// =============================================================================
// Active Conversation Handling (Private & Group)
// =============================================================================
async function selectPrivateChat(otherUser) {
    // Unsubscribe from any active group subscription
    if (groupSubscription) {
        groupSubscription.unsubscribe();
        groupSubscription = null;
    }

    activeChat = {
        type: 'PRIVATE',
        id: otherUser.id,
        name: otherUser.fullName,
        username: otherUser.username
    };

    updateActiveChatUI();

    // Mark active in sidebar
    highlightActiveConversation(`chat-item-user-${otherUser.id}`);

    // Load message history from REST API
    try {
        const res = await fetch(`/api/messages/private?userId=${currentUser.id}&otherUserId=${otherUser.id}`);
        const messages = await res.json();
        renderMessageHistory(messages);

        // Acknowledge READ status for any unread messages from this user
        if (stompClient && isConnected) {
            stompClient.send('/app/chat.status', {}, JSON.stringify({
                userId: currentUser.id,
                senderId: otherUser.id,
                status: 'READ'
            }));
        }

        // Refresh sidebar chats list to update unread badge
        loadChats();
    } catch (e) {
        console.error('Error loading chat history:', e);
    }
}

async function selectGroupChat(group) {
    if (groupSubscription) {
        groupSubscription.unsubscribe();
        groupSubscription = null;
    }

    activeChat = {
        type: 'GROUP',
        id: group.id,
        name: group.name,
        memberCount: group.memberCount
    };

    updateActiveChatUI();
    highlightActiveConversation(`chat-item-group-${group.id}`);

    // Subscribe to group topic over WebSocket
    subscribeToGroup(group.id);

    // Load group message history
    try {
        const res = await fetch(`/api/groups/${group.id}/messages?userId=${currentUser.id}`);
        const messages = await res.json();
        renderGroupMessageHistory(messages);
    } catch (e) {
        console.error('Error loading group messages:', e);
    }
}

function subscribeToGroup(groupId) {
    if (stompClient && isConnected) {
        if (groupSubscription) {
            groupSubscription.unsubscribe();
        }
        groupSubscription = stompClient.subscribe(`/topic/group/${groupId}`, (payload) => {
            try {
                const message = JSON.parse(payload.body);
                handleGroupMessage(message);
            } catch (e) {
                console.error('Error parsing group message:', e);
            }
        });
    }
}

function updateActiveChatUI() {
    document.getElementById('chat-empty-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');

    const avatarEl = document.getElementById('chat-header-avatar');
    const titleEl = document.getElementById('chat-header-title');
    const subtitleEl = document.getElementById('chat-header-subtitle');
    const groupInfoBtn = document.getElementById('btn-group-info');

    if (activeChat.type === 'PRIVATE') {
        avatarEl.className = 'chat-avatar';
        avatarEl.textContent = activeChat.name.charAt(0).toUpperCase();
        titleEl.textContent = activeChat.name;
        subtitleEl.textContent = '@' + activeChat.username;
        groupInfoBtn.classList.add('hidden');
    } else {
        avatarEl.className = 'chat-avatar group';
        avatarEl.textContent = '👥';
        titleEl.textContent = activeChat.name;
        subtitleEl.textContent = `${activeChat.memberCount || ''} members`;
        groupInfoBtn.classList.remove('hidden');
    }

    // Responsive Mobile layout toggle
    const sidebar = document.getElementById('app-sidebar');
    const chatMain = document.getElementById('chat-main');
    if (window.innerWidth <= 768) {
        sidebar.classList.add('mobile-hidden');
        chatMain.classList.remove('mobile-hidden');
    }

    // Focus input
    document.getElementById('message-input').focus();
}

function closeActiveChat() {
    if (groupSubscription) {
        groupSubscription.unsubscribe();
        groupSubscription = null;
    }
    activeChat = null;

    document.getElementById('chat-empty-state').classList.remove('hidden');
    document.getElementById('active-chat-container').classList.add('hidden');

    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));

    const sidebar = document.getElementById('app-sidebar');
    const chatMain = document.getElementById('chat-main');
    sidebar.classList.remove('mobile-hidden');
    chatMain.classList.add('mobile-hidden');
}

function highlightActiveConversation(elementId) {
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(elementId);
    if (target) {
        target.classList.add('active');
    }
}

// =============================================================================
// Message Sending & Real-Time Rendering
// =============================================================================
function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content || !activeChat || !stompClient || !isConnected) {
        return;
    }

    if (activeChat.type === 'PRIVATE') {
        const payload = {
            senderId: currentUser.id,
            receiverId: activeChat.id,
            content
        };
        stompClient.send('/app/chat.private', {}, JSON.stringify(payload));
    } else if (activeChat.type === 'GROUP') {
        const payload = {
            groupId: activeChat.id,
            senderId: currentUser.id,
            content
        };
        stompClient.send('/app/chat.group', {}, JSON.stringify(payload));
    }

    input.value = '';
    input.focus();
}

/**
 * Handle incoming private message from WebSocket
 */
function handlePrivateMessage(message) {
    // 1. Acknowledge DELIVERED status if current user is the receiver
    if (message.receiverId === currentUser.id && stompClient && isConnected) {
        stompClient.send('/app/chat.status', {}, JSON.stringify({
            userId: currentUser.id,
            messageId: message.id,
            status: 'DELIVERED'
        }));
    }

    // 2. If the active conversation matches this private chat
    const isCurrentChat = activeChat && activeChat.type === 'PRIVATE' &&
        (activeChat.id === message.senderId || activeChat.id === message.receiverId);

    if (isCurrentChat) {
        appendPrivateMessageBubble(message);

        // If current user is viewing this message, acknowledge READ status
        if (message.receiverId === currentUser.id && stompClient && isConnected) {
            stompClient.send('/app/chat.status', {}, JSON.stringify({
                userId: currentUser.id,
                messageId: message.id,
                status: 'READ'
            }));
        }
    }

    // Refresh chats list to update preview and unread counters
    loadChats();
}

/**
 * Handle incoming group message from WebSocket
 */
function handleGroupMessage(message) {
    if (activeChat && activeChat.type === 'GROUP' && activeChat.id === message.groupId) {
        appendGroupMessageBubble(message);
    }
    loadGroups();
}

/**
 * Handle real-time notifications (status updates, new requests, accepted connections)
 */
function handleNotification(notif) {
    if (notif.type === 'MESSAGE_STATUS_UPDATE') {
        // Update specific message tick in UI
        updateMessageTick(notif.messageId, notif.messageStatus);
    } else if (notif.type === 'MESSAGE_READ') {
        // Mark all sent messages as READ (blue double ticks)
        if (activeChat && activeChat.type === 'PRIVATE' && activeChat.id === notif.senderId) {
            document.querySelectorAll('.message-row.mine .message-tick').forEach(tick => {
                tick.className = 'message-tick status-read';
                tick.textContent = '✓✓';
            });
        }
    } else if (notif.type === 'NEW_CONNECTION_REQUEST') {
        loadPendingRequestsCount();
    } else if (notif.type === 'CONNECTION_ACCEPTED') {
        loadChats();
        loadPendingRequestsCount();
    } else if (notif.type === 'GROUP_CREATED') {
        loadGroups();
    }
}

function updateMessageTick(messageId, status) {
    const tickEl = document.getElementById(`tick-${messageId}`);
    if (tickEl) {
        if (status === 'READ') {
            tickEl.className = 'message-tick status-read';
            tickEl.textContent = '✓✓';
        } else if (status === 'DELIVERED') {
            tickEl.className = 'message-tick status-delivered';
            tickEl.textContent = '✓✓';
        } else {
            tickEl.className = 'message-tick status-sent';
            tickEl.textContent = '✓';
        }
    }
}

function renderMessageHistory(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="list-empty-hint" style="margin:auto;">No messages yet. Say hello! 👋</div>';
        return;
    }

    messages.forEach(msg => appendPrivateMessageBubble(msg, false));
    scrollToBottom();
}

function appendPrivateMessageBubble(message, shouldScroll = true) {
    const container = document.getElementById('messages-container');

    // Prevent duplicate bubbles if already rendered by server echo
    if (document.getElementById(`msg-bubble-${message.id}`)) {
        return;
    }

    // Remove empty placeholder if present
    const emptyHint = container.querySelector('.list-empty-hint');
    if (emptyHint) emptyHint.remove();

    const isMine = message.senderId === currentUser.id;
    const row = document.createElement('div');
    row.className = `message-row ${isMine ? 'mine' : 'other'}`;
    row.id = `msg-bubble-${message.id}`;

    let tickHtml = '';
    if (isMine) {
        let tickClass = 'status-sent';
        let tickChar = '✓';
        if (message.status === 'READ') {
            tickClass = 'status-read';
            tickChar = '✓✓';
        } else if (message.status === 'DELIVERED') {
            tickClass = 'status-delivered';
            tickChar = '✓✓';
        }
        tickHtml = `<span id="tick-${message.id}" class="message-tick ${tickClass}">${tickChar}</span>`;
    }

    const timeStr = formatTimestamp(message.sentAt);

    row.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-meta">
                <span class="message-time">${timeStr}</span>
                ${tickHtml}
            </div>
        </div>
    `;

    container.appendChild(row);
    if (shouldScroll) scrollToBottom();
}

function renderGroupMessageHistory(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="list-empty-hint" style="margin:auto;">No messages yet in this group. Start the conversation!</div>';
        return;
    }

    messages.forEach(msg => appendGroupMessageBubble(msg, false));
    scrollToBottom();
}

function appendGroupMessageBubble(message, shouldScroll = true) {
    const container = document.getElementById('messages-container');

    if (document.getElementById(`grp-msg-${message.id}`)) {
        return;
    }

    const emptyHint = container.querySelector('.list-empty-hint');
    if (emptyHint) emptyHint.remove();

    const isMine = message.senderId === currentUser.id;
    const row = document.createElement('div');
    row.className = `message-row ${isMine ? 'mine' : 'other'}`;
    row.id = `grp-msg-${message.id}`;

    const senderHeader = !isMine ? `<div class="message-sender">${escapeHtml(message.senderFullName || message.senderUsername)}</div>` : '';
    const timeStr = formatTimestamp(message.sentAt);

    row.innerHTML = `
        <div class="message-bubble">
            ${senderHeader}
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-meta">
                <span class="message-time">${timeStr}</span>
            </div>
        </div>
    `;

    container.appendChild(row);
    if (shouldScroll) scrollToBottom();
}

// =============================================================================
// UI Utility Functions
// =============================================================================
function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function formatTimestamp(timestampStr) {
    if (!timestampStr) return '';
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
        return timeString;
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeString;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
