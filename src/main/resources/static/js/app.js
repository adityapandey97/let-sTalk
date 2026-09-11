/**
 * Let's Talk – Real-Time Messaging & Media Client
 */

// Global State
const state = {
    currentUser: null,
    activeChat: null, // { type: 'direct'|'group', id, name, avatarUrl, username, email, bio }
    stompClient: null,
    connected: false,
    connections: [],
    groups: [],
    pendingRequests: [],
    storiesFeed: [], // Grouped or array of stories
    storyViewer: {
        activeGroupIndex: 0,
        activeSlideIndex: 0,
        timer: null,
        progressInterval: null,
        currentProgress: 0,
        groups: []
    },
    voiceRecorder: {
        mediaRecorder: null,
        audioChunks: [],
        timerInterval: null,
        seconds: 0,
        stream: null
    },
    selectedAvatar: '👨‍💻',
    selectedWallpaper: 'default'
};

const AVATAR_PRESETS = ['👨‍💻', '👩‍💻', '🚀', '🌟', '🎨', '🎧', '⚡', '🐱', '🦊'];

// =============================================================================
// 1. INITIALIZATION & AUTHENTICATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initAvatarPresets();
    setupOtpInputHandling();
    checkExistingSession();
    setupGlobalClickListeners();
});

function initAvatarPresets() {
    const regContainer = document.getElementById('reg-avatar-presets');
    const editContainer = document.getElementById('edit-avatar-presets');
    
    if (regContainer) {
        regContainer.innerHTML = AVATAR_PRESETS.map((emoji, idx) => `
            <button type="button" class="preset-avatar-btn ${idx === 0 ? 'active' : ''}" onclick="selectPresetAvatar('${emoji}', this, 'reg')">${emoji}</button>
        `).join('');
    }
    
    if (editContainer) {
        editContainer.innerHTML = AVATAR_PRESETS.map((emoji) => `
            <button type="button" class="preset-avatar-btn" onclick="selectPresetAvatar('${emoji}', this, 'edit')">${emoji}</button>
        `).join('');
    }
}

function selectPresetAvatar(emoji, element, context) {
    state.selectedAvatar = emoji;
    const container = document.getElementById(`${context}-avatar-presets`);
    if (container) {
        container.querySelectorAll('.preset-avatar-btn').forEach(btn => btn.classList.remove('active'));
        if (element) element.classList.add('active');
    }
    
    const preview = document.getElementById(`${context}-avatar-preview`);
    if (preview) {
        preview.innerHTML = `<span>${emoji}</span>`;
    }
}

function handleAvatarFileSelect(input, context) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 2 * 1024 * 1024) {
            alert('Image too large. Please select an image under 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            state.selectedAvatar = e.target.result;
            const preview = document.getElementById(`${context}-avatar-preview`);
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Avatar" />`;
            }
            const container = document.getElementById(`${context}-avatar-presets`);
            if (container) {
                container.querySelectorAll('.preset-avatar-btn').forEach(btn => btn.classList.remove('active'));
            }
        };
        reader.readAsDataURL(file);
    }
}

function switchAuthTab(tab) {
    const regBtn = document.getElementById('tab-btn-register');
    const loginBtn = document.getElementById('tab-btn-login');
    const regForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const otpContainer = document.getElementById('otp-container');

    otpContainer.classList.add('hidden');

    if (tab === 'register') {
        regBtn.classList.add('active');
        loginBtn.classList.remove('active');
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    } else {
        loginBtn.classList.add('active');
        regBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
    }
}

function checkExistingSession() {
    const savedUser = localStorage.getItem('letstalk_user');
    if (savedUser) {
        try {
            state.currentUser = JSON.parse(savedUser);
            launchMainApp();
        } catch (e) {
            localStorage.removeItem('letstalk_user');
        }
    }
}

// Register
async function handleRegister() {
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const bio = document.getElementById('reg-bio').value.trim();
    const errBox = document.getElementById('register-error');
    errBox.classList.add('hidden');

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName,
                username,
                email,
                bio: bio || "Hey there! I am using Let's Talk.",
                avatarUrl: state.selectedAvatar,
                bgWallpaper: state.selectedWallpaper
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create account');
        }

        // Show OTP view
        showOtpVerification(email, username);
    } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
    }
}

// Request OTP & Show OTP screen
async function showOtpVerification(email, username) {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.querySelector('.auth-tabs').classList.add('hidden');
    
    const otpContainer = document.getElementById('otp-container');
    otpContainer.classList.remove('hidden');
    document.getElementById('otp-target-email').textContent = email;

    // Send OTP request to get simulation code for immediate testing
    try {
        const res = await fetch('/api/users/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.otp) {
            document.getElementById('demo-otp-code').textContent = data.otp;
        }
    } catch (e) {
        console.error('Error fetching OTP', e);
    }

    // Clear inputs and focus first box
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach(i => i.value = '');
    if (inputs[0]) inputs[0].focus();
}

function setupOtpInputHandling() {
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim();
            if (pasteData.length === 6) {
                pasteData.split('').forEach((char, i) => {
                    if (inputs[i]) inputs[i].value = char;
                });
                inputs[5].focus();
            }
        });
    });
}

function quickFillOtp() {
    const code = document.getElementById('demo-otp-code').textContent.trim();
    const inputs = document.querySelectorAll('.otp-digit');
    if (code.length === 6) {
        code.split('').forEach((char, i) => {
            if (inputs[i]) inputs[i].value = char;
        });
        submitOtpVerification();
    }
}

async function submitOtpVerification() {
    const email = document.getElementById('otp-target-email').textContent.trim();
    const digits = Array.from(document.querySelectorAll('.otp-digit')).map(i => i.value).join('');
    const errBox = document.getElementById('otp-error');
    errBox.classList.add('hidden');

    if (digits.length !== 6) {
        errBox.textContent = 'Please enter the complete 6-digit code';
        errBox.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/users/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: digits })
        });

        const user = await response.json();
        if (!response.ok) {
            throw new Error(user.message || 'Invalid verification code');
        }

        state.currentUser = user;
        localStorage.setItem('letstalk_user', JSON.stringify(user));
        launchMainApp();
    } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
    }
}

async function resendOtp() {
    const email = document.getElementById('otp-target-email').textContent.trim();
    try {
        const res = await fetch('/api/users/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.otp) {
            document.getElementById('demo-otp-code').textContent = data.otp;
        }
        alert('A new 6-digit verification code has been generated.');
    } catch (e) {
        alert('Could not resend OTP');
    }
}

function cancelOtp() {
    document.getElementById('otp-container').classList.add('hidden');
    document.querySelector('.auth-tabs').classList.remove('hidden');
    switchAuthTab('login');
}

// Sign In
async function handleLogin() {
    const identifier = document.getElementById('login-identifier').value.trim();
    const errBox = document.getElementById('login-error');
    errBox.classList.add('hidden');

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });

        const user = await response.json();
        if (!response.ok) {
            throw new Error(user.message || 'Account not found');
        }

        state.currentUser = user;
        localStorage.setItem('letstalk_user', JSON.stringify(user));
        launchMainApp();
    } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('letstalk_user');
    if (state.stompClient) {
        state.stompClient.disconnect();
    }
    state.currentUser = null;
    state.activeChat = null;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.querySelector('.auth-tabs').classList.remove('hidden');
    switchAuthTab('login');
}

// =========================================================================
// 2. DASHBOARD & WEBSOCKET SETUP
// =========================================================================
function launchMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    updateCurrentUserUI();
    applyChatWallpaper(state.currentUser.bgWallpaper || 'default');
    
    // Connect WebSocket
    connectWebSocket();

    // Initial Data Load
    loadConnections();
    loadGroups();
    loadPendingRequests();
    loadStoriesFeed();

    // Setup sidebar button handlers
    document.getElementById('btn-switch-profile').onclick = logout;
    document.getElementById('btn-open-search').onclick = () => openModal('modal-search');
    document.getElementById('btn-open-requests').onclick = () => openModal('modal-requests');
    document.getElementById('btn-open-create-group').onclick = openCreateGroupModal;
    document.getElementById('btn-mobile-back').onclick = closeMobileChat;

    // Search input debounce
    const searchInput = document.getElementById('search-user-input');
    let searchTimeout = null;
    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchUsers(searchInput.value), 300);
    };
}

function updateCurrentUserUI() {
    const user = state.currentUser;
    if (!user) return;

    document.getElementById('current-user-name').textContent = user.fullName;
    document.getElementById('current-user-tag').textContent = `@${user.username}`;
    
    renderAvatarInto(user.avatarUrl, user.fullName, document.getElementById('current-user-avatar'));
    renderAvatarInto(user.avatarUrl, user.fullName, document.getElementById('my-story-avatar'));

    const verifiedBadge = document.getElementById('user-verified-badge');
    if (verifiedBadge) {
        verifiedBadge.style.display = user.emailVerified ? 'inline-flex' : 'none';
    }
}

function renderAvatarInto(avatarData, name, element) {
    if (!element) return;
    if (avatarData && avatarData.startsWith('data:image')) {
        element.innerHTML = `<img src="${avatarData}" alt="${name}" />`;
    } else if (avatarData && avatarData.length <= 4) {
        element.innerHTML = `<span>${avatarData}</span>`;
    } else if (avatarData && avatarData.startsWith('http')) {
        element.innerHTML = `<img src="${avatarData}" alt="${name}" />`;
    } else {
        const initial = (name && name.length > 0) ? name.charAt(0).toUpperCase() : '?';
        element.innerHTML = `<span>${initial}</span>`;
    }
}

function connectWebSocket() {
    const socket = new SockJS('/ws');
    state.stompClient = Stomp.over(socket);
    state.stompClient.debug = () => {}; // quiet in production

    state.stompClient.connect({}, () => {
        state.connected = true;
        updateConnectionBadge(true);

        // 1. Private messages
        state.stompClient.subscribe(`/topic/private/${state.currentUser.id}`, (msg) => {
            const privateMsg = JSON.parse(msg.body);
            handleIncomingPrivateMessage(privateMsg);
        });

        // 2. User notifications (read receipts, group adds, etc.)
        state.stompClient.subscribe(`/topic/user/${state.currentUser.id}/notifications`, (notif) => {
            const data = JSON.parse(notif.body);
            handleIncomingNotification(data);
        });

        // 3. Real-time Stories feed notifications
        state.stompClient.subscribe(`/topic/user/${state.currentUser.id}/stories`, (storyMsg) => {
            const newStory = JSON.parse(storyMsg.body);
            loadStoriesFeed();
        });

        // 4. Subscribe to existing group channels
        subscribeToJoinedGroups();

    }, (error) => {
        state.connected = false;
        updateConnectionBadge(false);
        setTimeout(connectWebSocket, 5000);
    });
}

function updateConnectionBadge(connected) {
    const badge = document.getElementById('connection-badge');
    if (!badge) return;
    if (connected) {
        badge.className = 'connection-pill connected';
        badge.querySelector('.status-label').textContent = 'Online';
    } else {
        badge.className = 'connection-pill disconnected';
        badge.querySelector('.status-label').textContent = 'Offline';
    }
}

function subscribeToJoinedGroups() {
    if (!state.stompClient || !state.connected) return;
    state.groups.forEach(g => {
        state.stompClient.subscribe(`/topic/group/${g.id}`, (msg) => {
            const groupMsg = JSON.parse(msg.body);
            handleIncomingGroupMessage(groupMsg);
        });
    });
}

// =========================================================================
// 3. STORIES / 24-HOUR STATUS LOGIC
// =========================================================================
async function loadStoriesFeed() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`/api/stories/feed/${state.currentUser.id}`);
        if (!res.ok) return;
        const stories = await res.json();
        state.storiesFeed = stories;
        renderStoriesTray(stories);
    } catch (e) {
        console.error('Error loading stories feed:', e);
    }
}

function renderStoriesTray(stories) {
    const tray = document.getElementById('stories-tray');
    if (!tray) return;

    // Group stories by User
    const grouped = {};
    stories.forEach(story => {
        if (!grouped[story.userId]) {
            grouped[story.userId] = {
                userId: story.userId,
                username: story.username,
                fullName: story.userFullName,
                avatarUrl: story.userAvatarUrl,
                isMyStory: story.userId === state.currentUser.id,
                items: []
            };
        }
        grouped[story.userId].items.push(story);
    });

    // Save for viewer
    state.storyViewer.groups = Object.values(grouped);

    // Keep My Story slot
    const myGroup = grouped[state.currentUser.id];
    let html = `
        <div class="story-item" onclick="${myGroup && myGroup.items.length > 0 ? `openStoryViewerByUserId(${state.currentUser.id})` : 'openStoryCreatorModal()'}">
            <div class="story-ring-wrap ${myGroup && myGroup.items.length > 0 ? '' : 'my-story'}">
                <div class="story-avatar" id="my-story-avatar"></div>
                ${(!myGroup || myGroup.items.length === 0) ? '<div class="story-plus-badge">+</div>' : ''}
            </div>
            <span class="story-username">${myGroup && myGroup.items.length > 0 ? 'Your Story' : 'Add Story'}</span>
        </div>
    `;

    // Render Contact stories
    Object.values(grouped).forEach(group => {
        if (group.userId === state.currentUser.id) return;
        html += `
            <div class="story-item" onclick="openStoryViewerByUserId(${group.userId})">
                <div class="story-ring-wrap">
                    <div class="story-avatar">
                        ${getAvatarHtml(group.avatarUrl, group.fullName)}
                    </div>
                </div>
                <span class="story-username">${escapeHtml(group.fullName.split(' ')[0])}</span>
            </div>
        `;
    });

    tray.innerHTML = html;
    renderAvatarInto(state.currentUser.avatarUrl, state.currentUser.fullName, document.getElementById('my-story-avatar'));
}

function getAvatarHtml(avatarData, name) {
    if (avatarData && avatarData.startsWith('data:image')) {
        return `<img src="${avatarData}" alt="${escapeHtml(name)}" />`;
    } else if (avatarData && avatarData.length <= 4) {
        return `<span>${avatarData}</span>`;
    } else if (avatarData && avatarData.startsWith('http')) {
        return `<img src="${avatarData}" alt="${escapeHtml(name)}" />`;
    }
    const initial = (name && name.length > 0) ? name.charAt(0).toUpperCase() : '?';
    return `<span>${initial}</span>`;
}

function openStoryCreatorModal() {
    openModal('modal-story-creator');
    switchStoryTab('media');
}

function switchStoryTab(tab) {
    const mediaBtn = document.getElementById('tab-story-media');
    const textBtn = document.getElementById('tab-story-text');
    const mediaForm = document.getElementById('form-media-story');
    const textForm = document.getElementById('form-text-story');

    if (tab === 'media') {
        mediaBtn.classList.add('active');
        textBtn.classList.remove('active');
        mediaForm.classList.remove('hidden');
        textForm.classList.add('hidden');
    } else {
        textBtn.classList.add('active');
        mediaBtn.classList.remove('active');
        textForm.classList.remove('hidden');
        mediaForm.classList.add('hidden');
    }
}

let currentStoryMediaData = null;
let currentStoryPalette = 'linear-gradient(135deg, #6366f1, #a855f7)';

function handleStoryFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            currentStoryMediaData = e.target.result;
            const preview = document.getElementById('story-upload-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Story Preview" />`;
        };
        reader.readAsDataURL(file);
    }
}

function updateStoryTextPreview(text) {
    const input = document.getElementById('story-text-input');
    input.value = text;
}

function setStoryPalette(gradient, element) {
    currentStoryPalette = gradient;
    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
    if (element) element.classList.add('active');
    document.getElementById('story-text-preview').style.background = gradient;
}

async function submitStory(type) {
    if (!state.currentUser) return;
    
    let mediaUrl = null;
    let caption = null;
    let backgroundColor = null;

    if (type === 'IMAGE') {
        if (!currentStoryMediaData) {
            alert('Please select an image for your story');
            return;
        }
        mediaUrl = currentStoryMediaData;
        caption = document.getElementById('story-media-caption').value.trim();
    } else {
        const text = document.getElementById('story-text-input').value.trim();
        if (!text) {
            alert('Please enter your status update');
            return;
        }
        caption = text;
        backgroundColor = currentStoryPalette;
    }

    try {
        const res = await fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.currentUser.id,
                mediaType: type,
                mediaUrl,
                caption,
                backgroundColor
            })
        });

        if (!res.ok) throw new Error('Failed to post story');

        closeModal('modal-story-creator');
        currentStoryMediaData = null;
        document.getElementById('story-upload-preview').innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Click to upload image</span>
        `;
        document.getElementById('story-text-input').value = '';
        loadStoriesFeed();
    } catch (err) {
        alert(err.message);
    }
}

// Story Viewer Carousel
function openStoryViewerByUserId(userId) {
    const groupIdx = state.storyViewer.groups.findIndex(g => g.userId === userId);
    if (groupIdx === -1) return;
    state.storyViewer.activeGroupIndex = groupIdx;
    state.storyViewer.activeSlideIndex = 0;
    
    document.getElementById('overlay-story-viewer').classList.remove('hidden');
    renderCurrentStorySlide();
}

function closeStoryViewer() {
    clearTimeout(state.storyViewer.timer);
    clearInterval(state.storyViewer.progressInterval);
    document.getElementById('overlay-story-viewer').classList.add('hidden');
}

function renderCurrentStorySlide() {
    clearTimeout(state.storyViewer.timer);
    clearInterval(state.storyViewer.progressInterval);

    const group = state.storyViewer.groups[state.storyViewer.activeGroupIndex];
    if (!group || !group.items || group.items.length === 0) {
        closeStoryViewer();
        return;
    }

    const story = group.items[state.storyViewer.activeSlideIndex];
    if (!story) {
        closeStoryViewer();
        return;
    }

    // Header Details
    document.getElementById('story-viewer-name').textContent = group.fullName;
    document.getElementById('story-viewer-time').textContent = formatRelativeTime(story.createdAt);
    renderAvatarInto(group.avatarUrl, group.fullName, document.getElementById('story-viewer-avatar'));

    // Show delete button if user owns this story
    const deleteBtn = document.getElementById('btn-delete-current-story');
    if (group.userId === state.currentUser.id) {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }

    // Progress Bar Segments
    const progressRow = document.getElementById('story-progress-row');
    progressRow.innerHTML = group.items.map((item, idx) => `
        <div class="story-bar-segment">
            <div class="story-bar-fill ${idx < state.storyViewer.activeSlideIndex ? 'done' : ''}" id="story-bar-${idx}"></div>
        </div>
    `).join('');

    // Story Body Content
    const body = document.getElementById('story-content-body');
    if (story.mediaType === 'IMAGE') {
        body.innerHTML = `
            <img src="${story.mediaUrl}" alt="Story" />
            ${story.caption ? `<div class="story-caption-bar">${escapeHtml(story.caption)}</div>` : ''}
        `;
    } else {
        body.innerHTML = `
            <div class="story-text-slide" style="background: ${story.backgroundColor || 'linear-gradient(135deg, #6366f1, #a855f7)'}">
                ${escapeHtml(story.caption)}
            </div>
        `;
    }

    // Start 5s Progress Bar Animation
    let progress = 0;
    const activeBar = document.getElementById(`story-bar-${state.storyViewer.activeSlideIndex}`);
    state.storyViewer.progressInterval = setInterval(() => {
        progress += 2;
        if (activeBar) activeBar.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(state.storyViewer.progressInterval);
            storyNextSlide();
        }
    }, 100);
}

function storyNextSlide() {
    const group = state.storyViewer.groups[state.storyViewer.activeGroupIndex];
    if (!group) return;
    if (state.storyViewer.activeSlideIndex < group.items.length - 1) {
        state.storyViewer.activeSlideIndex++;
        renderCurrentStorySlide();
    } else if (state.storyViewer.activeGroupIndex < state.storyViewer.groups.length - 1) {
        state.storyViewer.activeGroupIndex++;
        state.storyViewer.activeSlideIndex = 0;
        renderCurrentStorySlide();
    } else {
        closeStoryViewer();
    }
}

function storyPrevSlide() {
    if (state.storyViewer.activeSlideIndex > 0) {
        state.storyViewer.activeSlideIndex--;
        renderCurrentStorySlide();
    } else if (state.storyViewer.activeGroupIndex > 0) {
        state.storyViewer.activeGroupIndex--;
        const prevGroup = state.storyViewer.groups[state.storyViewer.activeGroupIndex];
        state.storyViewer.activeSlideIndex = prevGroup.items.length - 1;
        renderCurrentStorySlide();
    }
}

async function deleteCurrentStory() {
    const group = state.storyViewer.groups[state.storyViewer.activeGroupIndex];
    const story = group.items[state.storyViewer.activeSlideIndex];
    if (!story) return;

    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
        await fetch(`/api/stories/${story.id}?userId=${state.currentUser.id}`, { method: 'DELETE' });
        closeStoryViewer();
        loadStoriesFeed();
    } catch (e) {
        alert('Could not delete story');
    }
}

function sendStoryReply() {
    const input = document.getElementById('story-reply-input');
    const text = input.value.trim();
    if (!text) return;

    const group = state.storyViewer.groups[state.storyViewer.activeGroupIndex];
    if (!group || group.userId === state.currentUser.id) return;

    // Send direct message
    const msg = {
        senderId: state.currentUser.id,
        receiverId: group.userId,
        content: `Replied to your story: "${text}"`,
        messageType: 'TEXT'
    };

    if (state.stompClient && state.connected) {
        state.stompClient.send('/app/chat.private', {}, JSON.stringify(msg));
    }

    input.value = '';
    alert(`Reply sent to ${group.fullName}!`);
}

// =========================================================================
// 4. CONVERSATIONS, MESSAGING & MEDIA SHARING
// =========================================================================
async function loadConnections() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`/api/connections/${state.currentUser.id}`);
        if (!res.ok) return;
        state.connections = await res.json();
        renderChatsList();
    } catch (e) {
        console.error('Error loading connections:', e);
    }
}

function renderChatsList() {
    const list = document.getElementById('chats-list');
    const count = document.getElementById('chats-count');
    if (!list) return;

    count.textContent = state.connections.length;

    if (state.connections.length === 0) {
        list.innerHTML = `<div class="list-empty-hint">No connections yet. Search users to start talking!</div>`;
        return;
    }

    list.innerHTML = state.connections.map(c => {
        const otherUser = c.user;
        const isActive = state.activeChat && state.activeChat.type === 'direct' && state.activeChat.id === otherUser.id;
        
        let lastMsgDisplay = c.lastMessage || 'No messages yet';
        if (c.lastMessageStatus === 'MEDIA') lastMsgDisplay = '📷 Shared media';

        return `
            <div class="conv-item ${isActive ? 'active' : ''}" onclick="selectDirectChat(${otherUser.id})">
                <div class="conv-avatar">
                    ${getAvatarHtml(otherUser.avatarUrl, otherUser.fullName)}
                </div>
                <div class="conv-info">
                    <div class="conv-top-row">
                        <span class="conv-name">${escapeHtml(otherUser.fullName)}</span>
                        <span class="conv-time">${c.lastMessageTime ? formatRelativeTime(c.lastMessageTime) : ''}</span>
                    </div>
                    <div class="conv-bottom-row">
                        <span class="conv-last-msg">${escapeHtml(lastMsgDisplay)}</span>
                        ${c.unreadCount > 0 ? `<span class="conv-unread-badge">${c.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function selectDirectChat(otherUserId) {
    const conn = state.connections.find(c => c.user.id === otherUserId);
    if (!conn) return;

    state.activeChat = {
        type: 'direct',
        id: conn.user.id,
        name: conn.user.fullName,
        username: conn.user.username,
        email: conn.user.email,
        bio: conn.user.bio,
        avatarUrl: conn.user.avatarUrl
    };

    // UI Updates
    document.getElementById('chat-empty-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');
    document.getElementById('chat-header-title').textContent = conn.user.fullName;
    document.getElementById('chat-header-subtitle').textContent = `@${conn.user.username}`;
    renderAvatarInto(conn.user.avatarUrl, conn.user.fullName, document.getElementById('chat-header-avatar'));

    document.getElementById('btn-view-chat-profile').classList.remove('hidden');
    document.getElementById('btn-group-info').classList.add('hidden');

    // On mobile view
    if (window.innerWidth <= 768) {
        document.getElementById('chat-main').classList.add('mobile-active');
    }

    renderChatsList();
    loadDirectMessages(otherUserId);
}

async function loadDirectMessages(otherUserId) {
    try {
        const res = await fetch(`/api/messages/private?userId=${state.currentUser.id}&otherUserId=${otherUserId}`);
        if (!res.ok) return;
        const messages = await res.json();
        renderMessages(messages);
    } catch (e) {
        console.error('Error loading messages:', e);
    }
}

// Groups
async function loadGroups() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`/api/groups/user/${state.currentUser.id}`);
        if (!res.ok) return;
        state.groups = await res.json();
        renderGroupsList();
        subscribeToJoinedGroups();
    } catch (e) {
        console.error('Error loading groups:', e);
    }
}

function renderGroupsList() {
    const list = document.getElementById('groups-list');
    if (!list) return;

    if (state.groups.length === 0) {
        list.innerHTML = `<div class="list-empty-hint">No groups yet. Create one with your friends!</div>`;
        return;
    }

    list.innerHTML = state.groups.map(g => {
        const isActive = state.activeChat && state.activeChat.type === 'group' && state.activeChat.id === g.id;
        return `
            <div class="conv-item ${isActive ? 'active' : ''}" onclick="selectGroupChat(${g.id})">
                <div class="conv-avatar">👥</div>
                <div class="conv-info">
                    <div class="conv-top-row">
                        <span class="conv-name">${escapeHtml(g.name)}</span>
                        <span class="conv-time">${g.lastMessageTime ? formatRelativeTime(g.lastMessageTime) : ''}</span>
                    </div>
                    <div class="conv-bottom-row">
                        <span class="conv-last-msg">${g.lastMessage ? `${escapeHtml(g.lastMessageSenderName || '')}: ${escapeHtml(g.lastMessage)}` : 'No messages yet'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function selectGroupChat(groupId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;

    state.activeChat = {
        type: 'group',
        id: group.id,
        name: group.name,
        memberCount: group.memberCount,
        creatorId: group.creatorId
    };

    document.getElementById('chat-empty-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');
    document.getElementById('chat-header-title').textContent = group.name;
    document.getElementById('chat-header-subtitle').textContent = `${group.memberCount} members`;
    document.getElementById('chat-header-avatar').innerHTML = `👥`;

    document.getElementById('btn-view-chat-profile').classList.add('hidden');
    document.getElementById('btn-group-info').classList.remove('hidden');
    document.getElementById('btn-group-info').onclick = () => openGroupInfoModal(group.id);

    if (window.innerWidth <= 768) {
        document.getElementById('chat-main').classList.add('mobile-active');
    }

    renderGroupsList();
    loadGroupMessages(groupId);
}

async function loadGroupMessages(groupId) {
    try {
        const res = await fetch(`/api/groups/${groupId}/messages?userId=${state.currentUser.id}`);
        if (!res.ok) return;
        const messages = await res.json();
        renderMessages(messages);
    } catch (e) {
        console.error('Error loading group messages:', e);
    }
}

// Render Messages Viewport
function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    container.innerHTML = messages.map(msg => renderMessageBubble(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

function renderMessageBubble(msg) {
    const isSentByMe = msg.senderId === state.currentUser.id;
    const timeStr = formatTimeOnly(msg.sentAt);

    let contentHtml = '';
    const type = msg.messageType || 'TEXT';

    if (type === 'IMAGE') {
        contentHtml = `
            <div class="msg-image-wrap" onclick="openLightbox('${msg.mediaUrl}')">
                <img src="${msg.mediaUrl}" alt="Photo" />
            </div>
            ${msg.content ? `<div>${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (type === 'VIDEO') {
        contentHtml = `
            <div class="msg-video-wrap">
                <video src="${msg.mediaUrl}" controls playsinline preload="metadata"></video>
            </div>
            ${msg.content ? `<div>${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (type === 'AUDIO') {
        contentHtml = `
            <div class="voice-note-bubble">
                <button type="button" class="btn-play-voice" onclick="toggleAudioPlayback('${msg.mediaUrl}', this)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <div class="voice-waveform-track">
                    <input type="range" class="waveform-scrubber" min="0" max="100" value="0" />
                    <span class="voice-duration">${msg.mediaMetadata || 'Voice Note'}</span>
                </div>
            </div>
        `;
    } else if (type === 'CONTACT') {
        let cardData = { name: 'Contact', username: '', email: '', avatarUrl: '' };
        try { cardData = JSON.parse(msg.mediaMetadata); } catch(e) {}
        contentHtml = `
            <div class="contact-card-bubble">
                <div class="contact-card-avatar">${getAvatarHtml(cardData.avatarUrl, cardData.name)}</div>
                <div class="contact-card-info">
                    <div class="contact-card-name">${escapeHtml(cardData.name)}</div>
                    <div class="contact-card-tag">@${escapeHtml(cardData.username)}</div>
                </div>
                <button type="button" class="btn-contact-action" onclick="searchAndConnect('${escapeHtml(cardData.username)}')">Connect</button>
            </div>
        `;
    } else {
        contentHtml = `<div>${escapeHtml(msg.content)}</div>`;
    }

    const showSender = state.activeChat && state.activeChat.type === 'group' && !isSentByMe;

    return `
        <div class="msg-row ${isSentByMe ? 'sent' : 'received'}">
            <div class="msg-bubble">
                ${showSender ? `<div class="msg-sender-name">${escapeHtml(msg.senderFullName || msg.senderUsername)}</div>` : ''}
                ${contentHtml}
                <div class="msg-meta">
                    <span>${timeStr}</span>
                    ${isSentByMe ? renderStatusTicks(msg.status) : ''}
                </div>
            </div>
        </div>
    `;
}

function renderStatusTicks(status) {
    if (status === 'READ') {
        return `<span class="status-ticks" style="color: #38bdf8;">✓✓</span>`;
    } else if (status === 'DELIVERED') {
        return `<span class="status-ticks">✓✓</span>`;
    }
    return `<span class="status-ticks">✓</span>`;
}

// Send Message
function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !state.activeChat) return;

    if (state.activeChat.type === 'direct') {
        const req = {
            senderId: state.currentUser.id,
            receiverId: state.activeChat.id,
            content,
            messageType: 'TEXT'
        };
        state.stompClient.send('/app/chat.private', {}, JSON.stringify(req));
    } else {
        const req = {
            groupId: state.activeChat.id,
            senderId: state.currentUser.id,
            content,
            messageType: 'TEXT'
        };
        state.stompClient.send('/app/chat.group', {}, JSON.stringify(req));
    }

    input.value = '';
}

// Incoming Message Handlers
function handleIncomingPrivateMessage(msg) {
    if (state.activeChat && state.activeChat.type === 'direct' &&
        (state.activeChat.id === msg.senderId || state.activeChat.id === msg.receiverId)) {
        
        const container = document.getElementById('messages-container');
        container.insertAdjacentHTML('beforeend', renderMessageBubble(msg));
        container.scrollTop = container.scrollHeight;

        if (msg.receiverId === state.currentUser.id) {
            // Acknowledge read
            state.stompClient.send('/app/chat.status', {}, JSON.stringify({
                userId: state.currentUser.id,
                messageId: msg.id,
                status: 'READ'
            }));
        }
    }
    loadConnections();
}

function handleIncomingGroupMessage(msg) {
    if (state.activeChat && state.activeChat.type === 'group' && state.activeChat.id === msg.groupId) {
        const container = document.getElementById('messages-container');
        container.insertAdjacentHTML('beforeend', renderMessageBubble(msg));
        container.scrollTop = container.scrollHeight;
    }
    loadGroups();
}

function handleIncomingNotification(notif) {
    if (notif.type === 'CONNECTION_REQUEST' || notif.type === 'CONNECTION_ACCEPTED') {
        loadConnections();
        loadPendingRequests();
    } else if (notif.type === 'GROUP_CREATED') {
        loadGroups();
    }
}

// =========================================================================
// 5. ATTACHMENT & RICH MEDIA HANDLERS
// =========================================================================
function toggleAttachmentMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('attachment-menu');
    menu.classList.toggle('hidden');
}

function triggerImageUpload() {
    document.getElementById('attachment-menu').classList.add('hidden');
    document.getElementById('media-image-file').click();
}

function triggerVideoUpload() {
    document.getElementById('attachment-menu').classList.add('hidden');
    document.getElementById('media-video-file').click();
}

function handleImageMediaUpload(input) {
    if (input.files && input.files[0] && state.activeChat) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            sendRichMediaMessage('IMAGE', dataUrl, '');
        };
        reader.readAsDataURL(file);
    }
}

function handleVideoMediaUpload(input) {
    if (input.files && input.files[0] && state.activeChat) {
        const file = input.files[0];
        if (file.size > 15 * 1024 * 1024) {
            alert('Video must be under 15MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            sendRichMediaMessage('VIDEO', dataUrl, '');
        };
        reader.readAsDataURL(file);
    }
}

function sendRichMediaMessage(type, mediaUrl, metadata, caption = '') {
    if (!state.activeChat) return;

    if (state.activeChat.type === 'direct') {
        const req = {
            senderId: state.currentUser.id,
            receiverId: state.activeChat.id,
            content: caption,
            messageType: type,
            mediaUrl,
            mediaMetadata: metadata
        };
        state.stompClient.send('/app/chat.private', {}, JSON.stringify(req));
    } else {
        const req = {
            groupId: state.activeChat.id,
            senderId: state.currentUser.id,
            content: caption,
            messageType: type,
            mediaUrl,
            mediaMetadata: metadata
        };
        state.stompClient.send('/app/chat.group', {}, JSON.stringify(req));
    }
}

// Voice Note Recording
async function toggleVoiceRecording() {
    if (!state.activeChat) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.voiceRecorder.stream = stream;
        state.voiceRecorder.audioChunks = [];
        state.voiceRecorder.seconds = 0;

        const mediaRecorder = new MediaRecorder(stream);
        state.voiceRecorder.mediaRecorder = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.voiceRecorder.audioChunks.push(e.data);
        };

        mediaRecorder.start();

        // Show recording bar
        document.getElementById('message-form').classList.add('hidden');
        document.getElementById('voice-recording-bar').classList.remove('hidden');

        // Timer
        document.getElementById('recording-timer-text').textContent = '0:00';
        state.voiceRecorder.timerInterval = setInterval(() => {
            state.voiceRecorder.seconds++;
            const mins = Math.floor(state.voiceRecorder.seconds / 60);
            const secs = state.voiceRecorder.seconds % 60;
            document.getElementById('recording-timer-text').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }, 1000);

    } catch (err) {
        alert('Microphone access denied or unavailable: ' + err.message);
    }
}

function cancelVoiceRecording() {
    if (state.voiceRecorder.mediaRecorder) {
        state.voiceRecorder.mediaRecorder.stop();
    }
    stopRecordingTracks();
    cleanupVoiceBar();
}

function finishAndSendVoiceRecording() {
    if (!state.voiceRecorder.mediaRecorder) return;

    const seconds = state.voiceRecorder.seconds;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    state.voiceRecorder.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.voiceRecorder.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            sendRichMediaMessage('AUDIO', dataUrl, durationFormatted, '[Voice Note]');
        };
        reader.readAsDataURL(audioBlob);
        stopRecordingTracks();
    };

    state.voiceRecorder.mediaRecorder.stop();
    cleanupVoiceBar();
}

function stopRecordingTracks() {
    if (state.voiceRecorder.stream) {
        state.voiceRecorder.stream.getTracks().forEach(t => t.stop());
    }
}

function cleanupVoiceBar() {
    clearInterval(state.voiceRecorder.timerInterval);
    document.getElementById('voice-recording-bar').classList.add('hidden');
    document.getElementById('message-form').classList.remove('hidden');
}

// Audio Message Playback
let currentPlayingAudio = null;
let currentPlayingBtn = null;

function toggleAudioPlayback(url, button) {
    if (currentPlayingAudio && !currentPlayingAudio.paused) {
        currentPlayingAudio.pause();
        if (currentPlayingBtn) {
            currentPlayingBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
        if (currentPlayingBtn === button) return;
    }

    const audio = new Audio(url);
    currentPlayingAudio = audio;
    currentPlayingBtn = button;

    button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

    audio.play();
    audio.onended = () => {
        button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    };
}

// Share Contact
function openShareContactModal() {
    document.getElementById('attachment-menu').classList.add('hidden');
    openModal('modal-share-contact');
    const list = document.getElementById('share-contact-list');
    
    if (state.connections.length === 0) {
        list.innerHTML = `<div class="modal-empty-hint">No contacts available to share.</div>`;
        return;
    }

    list.innerHTML = state.connections.map(c => `
        <div class="conv-item" onclick="sendSelectedContact(${c.user.id})">
            <div class="conv-avatar">${getAvatarHtml(c.user.avatarUrl, c.user.fullName)}</div>
            <div class="conv-info">
                <div class="conv-name">${escapeHtml(c.user.fullName)}</div>
                <div class="conv-last-msg">@${escapeHtml(c.user.username)}</div>
            </div>
            <button type="button" class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">Share</button>
        </div>
    `).join('');
}

function sendSelectedContact(userId) {
    const conn = state.connections.find(c => c.user.id === userId);
    if (!conn) return;

    const contactMeta = JSON.stringify({
        id: conn.user.id,
        name: conn.user.fullName,
        username: conn.user.username,
        email: conn.user.email,
        avatarUrl: conn.user.avatarUrl
    });

    sendRichMediaMessage('CONTACT', null, contactMeta, `[Contact: ${conn.user.fullName}]`);
    closeModal('modal-share-contact');
}

function searchAndConnect(username) {
    openModal('modal-search');
    const input = document.getElementById('search-user-input');
    input.value = username;
    searchUsers(username);
}

// Lightbox
function openLightbox(imgUrl) {
    document.getElementById('lightbox-img').src = imgUrl;
    document.getElementById('lightbox-modal').classList.remove('hidden');
}

function closeLightbox() {
    document.getElementById('lightbox-modal').classList.add('hidden');
}

// =========================================================================
// 6. PROFILE, WALLPAPER & SEARCH USERS
// =========================================================================
function openProfileModal() {
    const user = state.currentUser;
    if (!user) return;
    document.getElementById('edit-fullname').value = user.fullName;
    document.getElementById('edit-bio').value = user.bio || '';
    renderAvatarInto(user.avatarUrl, user.fullName, document.getElementById('edit-avatar-preview'));
    openModal('modal-profile');
}

function selectChatWallpaper(theme, element) {
    state.selectedWallpaper = theme;
    document.querySelectorAll('.wallpaper-option').forEach(w => w.classList.remove('active'));
    if (element) element.classList.add('active');
    applyChatWallpaper(theme);
}

function applyChatWallpaper(theme) {
    const chatMain = document.getElementById('chat-main');
    if (!chatMain) return;
    chatMain.className = `chat-main wp-${theme}`;
}

async function saveProfileSettings() {
    const fullName = document.getElementById('edit-fullname').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    try {
        const res = await fetch(`/api/users/${state.currentUser.id}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName,
                bio,
                avatarUrl: state.selectedAvatar || state.currentUser.avatarUrl,
                bgWallpaper: state.selectedWallpaper
            })
        });

        if (!res.ok) throw new Error('Failed to update profile');
        const updated = await res.json();
        state.currentUser = updated;
        localStorage.setItem('letstalk_user', JSON.stringify(updated));
        updateCurrentUserUI();
        closeModal('modal-profile');
        alert('Profile and appearance updated!');
    } catch (e) {
        alert(e.message);
    }
}

function viewCurrentChatContactProfile() {
    if (!state.activeChat || state.activeChat.type !== 'direct') return;
    const chat = state.activeChat;
    document.getElementById('view-contact-name').textContent = chat.name;
    document.getElementById('view-contact-username').textContent = `@${chat.username}`;
    document.getElementById('view-contact-email').textContent = chat.email || '';
    document.getElementById('view-contact-bio').textContent = chat.bio || 'No bio provided.';
    renderAvatarInto(chat.avatarUrl, chat.name, document.getElementById('view-contact-avatar'));
    openModal('modal-view-contact');
}

// User Search & Connections
async function searchUsers(query) {
    const list = document.getElementById('search-results-list');
    if (!query || query.trim().length === 0) {
        list.innerHTML = `<div class="modal-empty-hint">Type a name, @username, or email to find people.</div>`;
        return;
    }

    try {
        const res = await fetch(`/api/users/search?username=${encodeURIComponent(query)}&currentUserId=${state.currentUser.id}`);
        const users = await res.json();

        if (users.length === 0) {
            list.innerHTML = `<div class="modal-empty-hint">No users found matching "${escapeHtml(query)}".</div>`;
            return;
        }

        list.innerHTML = users.map(u => {
            let actionBtn = '';
            if (u.relationshipState === 'CONNECTED') {
                actionBtn = `<button class="btn-secondary" style="font-size: 0.78rem;" onclick="closeModal('modal-search'); selectDirectChat(${u.id})">Message</button>`;
            } else if (u.relationshipState === 'OUTGOING_PENDING') {
                actionBtn = `<span class="badge" style="background: rgba(255,255,255,0.1); color: var(--text-muted);">Pending</span>`;
            } else if (u.relationshipState === 'INCOMING_PENDING') {
                actionBtn = `<button class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="acceptConnectionRequest(${u.requestId})">Accept</button>`;
            } else {
                actionBtn = `<button class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="sendConnectionRequest(${u.id})">Connect</button>`;
            }

            return `
                <div class="conv-item">
                    <div class="conv-avatar">${getAvatarHtml(u.avatarUrl, u.fullName)}</div>
                    <div class="conv-info">
                        <div class="conv-name">${escapeHtml(u.fullName)}</div>
                        <div class="conv-last-msg">@${escapeHtml(u.username)}</div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Search error:', e);
    }
}

async function sendConnectionRequest(targetUserId) {
    try {
        const res = await fetch('/api/connections/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: state.currentUser.id,
                receiverId: targetUserId
            })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.message);
            return;
        }

        alert('Connection request sent!');
        searchUsers(document.getElementById('search-user-input').value);
    } catch (e) {
        alert('Could not send request');
    }
}

async function loadPendingRequests() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`/api/connections/requests/${state.currentUser.id}`);
        if (!res.ok) return;
        state.pendingRequests = await res.json();
        
        const badge = document.getElementById('requests-badge');
        if (state.pendingRequests.length > 0) {
            badge.textContent = state.pendingRequests.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        renderPendingRequestsList();
    } catch (e) {
        console.error('Error loading requests:', e);
    }
}

function renderPendingRequestsList() {
    const list = document.getElementById('pending-requests-list');
    if (!list) return;

    if (state.pendingRequests.length === 0) {
        list.innerHTML = `<div class="modal-empty-hint">No pending connection requests.</div>`;
        return;
    }

    list.innerHTML = state.pendingRequests.map(r => `
        <div class="conv-item">
            <div class="conv-avatar">${getAvatarHtml(r.user.avatarUrl, r.user.fullName)}</div>
            <div class="conv-info">
                <div class="conv-name">${escapeHtml(r.user.fullName)}</div>
                <div class="conv-last-msg">@${escapeHtml(r.user.username)}</div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
                <button class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="acceptConnectionRequest(${r.requestId})">Accept</button>
                <button class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="rejectConnectionRequest(${r.requestId})">Decline</button>
            </div>
        </div>
    `).join('');
}

async function acceptConnectionRequest(requestId) {
    try {
        await fetch(`/api/connections/${requestId}/accept?userId=${state.currentUser.id}`, { method: 'POST' });
        loadConnections();
        loadPendingRequests();
    } catch (e) {
        alert('Error accepting request');
    }
}

async function rejectConnectionRequest(requestId) {
    try {
        await fetch(`/api/connections/${requestId}/reject?userId=${state.currentUser.id}`, { method: 'POST' });
        loadPendingRequests();
    } catch (e) {
        alert('Error declining request');
    }
}

// Group Creation Modal
function openCreateGroupModal() {
    openModal('modal-create-group');
    const list = document.getElementById('group-members-checklist');
    if (state.connections.length === 0) {
        list.innerHTML = `<div class="modal-empty-hint">Connect with users first before creating a group.</div>`;
        return;
    }

    list.innerHTML = state.connections.map(c => `
        <label class="conv-item" style="cursor: pointer;">
            <input type="checkbox" name="group-members" value="${c.user.id}" style="margin-right: 0.6rem;" />
            <div class="conv-avatar">${getAvatarHtml(c.user.avatarUrl, c.user.fullName)}</div>
            <div class="conv-info">
                <div class="conv-name">${escapeHtml(c.user.fullName)}</div>
                <div class="conv-last-msg">@${escapeHtml(c.user.username)}</div>
            </div>
        </label>
    `).join('');
}

async function submitCreateGroup() {
    const name = document.getElementById('group-name-input').value.trim();
    const checked = Array.from(document.querySelectorAll('input[name="group-members"]:checked')).map(i => parseInt(i.value));

    if (!name) return;

    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                creatorId: state.currentUser.id,
                memberIds: checked
            })
        });

        if (!res.ok) throw new Error('Failed to create group');
        const group = await res.json();
        closeModal('modal-create-group');
        loadGroups();
        selectGroupChat(group.id);
    } catch (e) {
        alert(e.message);
    }
}

async function openGroupInfoModal(groupId) {
    try {
        const res = await fetch(`/api/groups/${groupId}/members?userId=${state.currentUser.id}`);
        const members = await res.json();
        const list = document.getElementById('group-info-members-list');
        document.getElementById('group-info-count').textContent = members.length;

        list.innerHTML = members.map(m => `
            <div class="conv-item">
                <div class="conv-avatar">${getAvatarHtml(m.avatarUrl, m.fullName)}</div>
                <div class="conv-info">
                    <div class="conv-name">${escapeHtml(m.fullName)}</div>
                    <div class="conv-last-msg">@${escapeHtml(m.username)}</div>
                </div>
            </div>
        `).join('');

        openModal('modal-group-info');
    } catch (e) {
        alert('Could not fetch group info');
    }
}

// =========================================================================
// 7. UTILITY HELPERS
// =========================================================================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function closeMobileChat() {
    document.getElementById('chat-main').classList.remove('mobile-active');
}

function setupGlobalClickListeners() {
    window.addEventListener('click', (e) => {
        const attachMenu = document.getElementById('attachment-menu');
        const attachBtn = document.getElementById('btn-toggle-attach');
        if (attachMenu && !attachMenu.contains(e.target) && e.target !== attachBtn && !attachBtn.contains(e.target)) {
            attachMenu.classList.add('hidden');
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
            closeStoryViewer();
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
        }
    });
}

function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTimeOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}
