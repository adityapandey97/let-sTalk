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
    call: {
        peerConnection: null,
        localStream: null,
        remoteStream: null,
        isCaller: false,
        callType: 'video',
        peerId: null,
        peerName: '',
        peerAvatar: '',
        timerInterval: null,
        seconds: 0,
        pendingOffer: null,
        micMuted: false,
        videoMuted: false
    },
    selectedAvatar: 'images/avatar_alex.jpg',
    selectedWallpaper: 'default'
};

let pendingDeleteMessageId = null;

const AVATAR_PRESETS = [
    { type: 'image', src: 'images/avatar_alex.jpg', label: 'Alex' },
    { type: 'image', src: 'images/avatar_sarah.jpg', label: 'Sarah' },
    { type: 'image', src: 'images/avatar_david.jpg', label: 'David' },
    { type: 'image', src: 'images/avatar_maya.jpg', label: 'Maya' },
    { type: 'emoji', value: '👨‍💻' },
    { type: 'emoji', value: '👩‍💻' },
    { type: 'emoji', value: '🚀' },
    { type: 'emoji', value: '🎨' },
    { type: 'emoji', value: '⚡' }
];

// =============================================================================
// 1. INITIALIZATION & AUTHENTICATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initAvatarPresets();
    setupAuthValidation();
    checkExistingSession();
    setupGlobalClickListeners();
});

function initAvatarPresets() {
    const regContainer = document.getElementById('reg-avatar-presets');
    const editContainer = document.getElementById('edit-avatar-presets');
    
    const renderList = (container, ctx) => {
        if (!container) return;
        container.innerHTML = AVATAR_PRESETS.map((p, idx) => {
            if (p.type === 'image') {
                return `
                    <button type="button" class="preset-avatar-btn preset-avatar-img ${idx === 0 ? 'active' : ''}" onclick="selectPresetAvatar('${p.src}', this, '${ctx}')" title="${p.label}">
                        <img src="${p.src}" alt="${p.label}" />
                    </button>
                `;
            }
            return `
                <button type="button" class="preset-avatar-btn" onclick="selectPresetAvatar('${p.value}', this, '${ctx}')">${p.value}</button>
            `;
        }).join('');
    };

    renderList(regContainer, 'reg');
    renderList(editContainer, 'edit');
}

function selectPresetAvatar(val, element, context) {
    state.selectedAvatar = val;
    const container = document.getElementById(`${context}-avatar-presets`);
    if (container) {
        container.querySelectorAll('.preset-avatar-btn').forEach(btn => btn.classList.remove('active'));
        if (element) element.classList.add('active');
    }
    
    const preview = document.getElementById(`${context}-avatar-preview`);
    if (preview) {
        if (val.startsWith('images/') || val.startsWith('/images/') || val.startsWith('http') || val.startsWith('data:image')) {
            preview.innerHTML = `<img src="${val}" alt="Avatar" />`;
        } else {
            preview.innerHTML = `<span>${val}</span>`;
        }
    }
}

// 1-Click Quick Demo Sign-In helper
async function quickLogin(identifier, password) {
    switchAuthTab('login');
    const idInput = document.getElementById('login-identifier');
    const pwdInput = document.getElementById('login-password');
    if (idInput) idInput.value = identifier;
    if (pwdInput) pwdInput.value = password;
    await handleLogin();
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

// Password Visibility Toggle
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');
    if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.classList.add('hidden');
        if (eyeClosed) eyeClosed.classList.remove('hidden');
    } else {
        input.type = 'password';
        if (eyeOpen) eyeOpen.classList.remove('hidden');
        if (eyeClosed) eyeClosed.classList.add('hidden');
    }
}

// Live Username and Email Validation
function setupAuthValidation() {
    const usernameInput = document.getElementById('reg-username');
    const usernameStatus = document.getElementById('username-status-icon');
    const usernameHint = document.getElementById('username-hint');
    let usernameTimer = null;

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            clearTimeout(usernameTimer);
            const val = usernameInput.value.trim().toLowerCase();
            if (!val) {
                if (usernameStatus) usernameStatus.textContent = '';
                if (usernameHint) { usernameHint.textContent = ''; usernameHint.className = 'field-feedback'; }
                return;
            }

            const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
            if (!usernameRegex.test(val)) {
                if (usernameStatus) usernameStatus.textContent = '⚠️';
                if (usernameHint) {
                    usernameHint.textContent = '3-30 characters (letters, numbers, underscores only)';
                    usernameHint.className = 'field-feedback error';
                }
                return;
            }

            usernameTimer = setTimeout(async () => {
                try {
                    const res = await fetch(window.getApiUrl(`/api/users/username-available?username=${encodeURIComponent(val)}`));
                    const data = await res.json();
                    if (data.available) {
                        if (usernameStatus) usernameStatus.textContent = '✅';
                        if (usernameHint) {
                            usernameHint.textContent = `@${val} is available`;
                            usernameHint.className = 'field-feedback success';
                        }
                    } else {
                        if (usernameStatus) usernameStatus.textContent = '❌';
                        if (usernameHint) {
                            usernameHint.textContent = `@${val} is already taken`;
                            usernameHint.className = 'field-feedback error';
                        }
                    }
                } catch (e) {
                    // Ignore transient network errors during live validation
                }
            }, 300);
        });
    }

    const emailInput = document.getElementById('reg-email');
    const emailStatus = document.getElementById('email-status-icon');
    const emailHint = document.getElementById('email-hint');
    let emailTimer = null;

    if (emailInput) {
        emailInput.addEventListener('input', () => {
            clearTimeout(emailTimer);
            const val = emailInput.value.trim().toLowerCase();
            if (!val || !val.includes('@')) {
                if (emailStatus) emailStatus.textContent = '';
                if (emailHint) { emailHint.textContent = ''; emailHint.className = 'field-feedback'; }
                return;
            }

            emailTimer = setTimeout(async () => {
                try {
                    const res = await fetch(window.getApiUrl(`/api/users/email-available?email=${encodeURIComponent(val)}`));
                    const data = await res.json();
                    if (data.available) {
                        if (emailStatus) emailStatus.textContent = '✅';
                        if (emailHint) {
                            emailHint.textContent = 'Email is available';
                            emailHint.className = 'field-feedback success';
                        }
                    } else {
                        if (emailStatus) emailStatus.textContent = '❌';
                        if (emailHint) {
                            emailHint.textContent = 'Email already registered';
                            emailHint.className = 'field-feedback error';
                        }
                    }
                } catch (e) {
                    // Ignore transient errors
                }
            }, 300);
        });
    }
}

// Register User (Direct creation and login without OTP)
async function handleRegister() {
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const bio = document.getElementById('reg-bio') ? document.getElementById('reg-bio').value.trim() : '';
    const errBox = document.getElementById('register-error');
    errBox.classList.add('hidden');

    if (!fullName) {
        errBox.textContent = 'Please enter your full name';
        errBox.classList.remove('hidden');
        return;
    }

    if (!username) {
        errBox.textContent = 'Please enter a username';
        errBox.classList.remove('hidden');
        return;
    }

    if (!email) {
        errBox.textContent = 'Please enter your email address';
        errBox.classList.remove('hidden');
        return;
    }

    if (!password || password.trim().length < 4) {
        errBox.textContent = 'Password must be at least 4 characters long';
        errBox.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(window.getApiUrl('/api/users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName,
                username,
                email,
                password: password.trim(),
                bio: bio || "Hey there! I am using Let's Talk.",
                avatarUrl: state.selectedAvatar,
                bgWallpaper: state.selectedWallpaper
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create account');
        }

        // Account successfully created! Log in immediately
        state.currentUser = data;
        localStorage.setItem('letstalk_user', JSON.stringify(data));
        launchMainApp();
    } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
    }
}

// Sign In with Email or Username and Password
async function handleLogin() {
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.add('hidden');

    if (!identifier) {
        errBox.textContent = 'Please enter your email or username';
        errBox.classList.remove('hidden');
        return;
    }

    if (!password) {
        errBox.textContent = 'Please enter your password';
        errBox.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(window.getApiUrl('/api/users/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier,
                password: password.trim()
            })
        });

        const user = await response.json();
        if (!response.ok) {
            throw new Error(user.message || 'Invalid email/username or password');
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
    if (avatarData && (avatarData.startsWith('data:image') || avatarData.startsWith('http') || avatarData.startsWith('images/') || avatarData.startsWith('/images/'))) {
        element.innerHTML = `<img src="${avatarData}" alt="${escapeHtml(name || '')}" />`;
    } else if (avatarData && avatarData.length <= 4) {
        element.innerHTML = `<span>${avatarData}</span>`;
    } else {
        const initial = (name && name.length > 0) ? name.charAt(0).toUpperCase() : '?';
        element.innerHTML = `<span>${initial}</span>`;
    }
}

function connectWebSocket() {
    const wsUrl = window.getWsUrl ? window.getWsUrl() : '/ws';
    const socket = new SockJS(wsUrl);
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

        // 4. WebRTC Audio & Video Calling signaling channel
        state.stompClient.subscribe(`/topic/user/${state.currentUser.id}/call`, (callMsg) => {
            try {
                const signal = JSON.parse(callMsg.body);
                handleIncomingCallSignal(signal);
            } catch(e) {
                console.error('Error handling call signal:', e);
            }
        });

        // 5. Subscribe to existing group channels
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
        const res = await fetch(window.getApiUrl(`/api/stories/feed/${state.currentUser.id}`));
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
    if (avatarData && (avatarData.startsWith('data:image') || avatarData.startsWith('http') || avatarData.startsWith('images/') || avatarData.startsWith('/images/'))) {
        return `<img src="${avatarData}" alt="${escapeHtml(name || '')}" />`;
    } else if (avatarData && avatarData.length <= 4) {
        return `<span>${avatarData}</span>`;
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
        const res = await fetch(window.getApiUrl('/api/stories'), {
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
        await fetch(window.getApiUrl(`/api/stories/${story.id}?userId=${state.currentUser.id}`), { method: 'DELETE' });
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
        const res = await fetch(window.getApiUrl(`/api/connections/${state.currentUser.id}`));
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

    // Show Voice & Video Call buttons in direct 1-to-1 chats
    const btnAudioCall = document.getElementById('btn-audio-call');
    const btnVideoCall = document.getElementById('btn-video-call');
    if (btnAudioCall) btnAudioCall.classList.remove('hidden');
    if (btnVideoCall) btnVideoCall.classList.remove('hidden');

    // On mobile view
    if (window.innerWidth <= 768) {
        document.getElementById('chat-main').classList.add('mobile-active');
    }

    renderChatsList();
    loadDirectMessages(otherUserId);
}

async function loadDirectMessages(otherUserId) {
    try {
        const res = await fetch(window.getApiUrl(`/api/messages/private?userId=${state.currentUser.id}&otherUserId=${otherUserId}`));
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
        const res = await fetch(window.getApiUrl(`/api/groups/user/${state.currentUser.id}`));
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

    // Group chats do not have direct 1-to-1 call buttons
    const btnAudioCall = document.getElementById('btn-audio-call');
    const btnVideoCall = document.getElementById('btn-video-call');
    if (btnAudioCall) btnAudioCall.classList.add('hidden');
    if (btnVideoCall) btnVideoCall.classList.add('hidden');

    if (window.innerWidth <= 768) {
        document.getElementById('chat-main').classList.add('mobile-active');
    }

    renderGroupsList();
    loadGroupMessages(groupId);
}

async function loadGroupMessages(groupId) {
    try {
        const res = await fetch(window.getApiUrl(`/api/groups/${groupId}/messages?userId=${state.currentUser.id}`));
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
        const imgSrc = (msg.mediaUrl && msg.mediaUrl.startsWith('http')) 
            ? msg.mediaUrl 
            : window.getApiUrl(msg.mediaUrl || '');
        contentHtml = `
            <div class="msg-image-wrap" onclick="openLightbox('${imgSrc}')">
                <img src="${imgSrc}" alt="Photo" />
            </div>
            ${msg.content ? `<div>${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (type === 'VIDEO') {
        const videoSrc = (msg.mediaUrl && msg.mediaUrl.startsWith('http')) 
            ? msg.mediaUrl 
            : window.getApiUrl(msg.mediaUrl || '');
        contentHtml = `
            <div class="msg-video-wrap">
                <video src="${videoSrc}" controls playsinline preload="metadata"></video>
                <div class="video-meta-bar">
                    <a href="${videoSrc}" download="video_${msg.id || Date.now()}.mp4" class="btn-video-download" title="Download Video" target="_blank" onclick="event.stopPropagation()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Download</span>
                    </a>
                </div>
            </div>
            ${msg.content ? `<div>${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (type === 'FILE') {
        let meta = { fileName: 'Document', fileSize: 0 };
        try {
            if (msg.mediaMetadata) meta = JSON.parse(msg.mediaMetadata);
        } catch(e) {
            meta.fileName = msg.mediaMetadata || 'Document';
        }
        const ext = (meta.fileName && meta.fileName.includes('.')) 
            ? meta.fileName.split('.').pop().toUpperCase().slice(0, 4) 
            : 'FILE';
        const extClass = ext.toLowerCase();
        const sizeFormatted = meta.fileSize ? formatBytes(meta.fileSize) : '';
        const downloadUrl = (msg.mediaUrl && msg.mediaUrl.startsWith('http')) 
            ? msg.mediaUrl 
            : window.getApiUrl(msg.mediaUrl || '');

        contentHtml = `
            <div class="file-bubble-wrap">
                <div class="file-badge-icon ${extClass}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>${ext}</span>
                </div>
                <div class="file-info-col">
                    <span class="file-name-text" title="${escapeHtml(meta.fileName)}">${escapeHtml(meta.fileName)}</span>
                    <span class="file-size-text">${sizeFormatted}</span>
                </div>
                <a href="${downloadUrl}" download="${escapeHtml(meta.fileName)}" class="btn-file-download" title="Download File" target="_blank" onclick="event.stopPropagation()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
            </div>
            ${msg.content ? `<div style="margin-top: 0.35rem;">${escapeHtml(msg.content)}</div>` : ''}
        `;
    } else if (type === 'AUDIO') {
        const audioSrc = (msg.mediaUrl && msg.mediaUrl.startsWith('http')) 
            ? msg.mediaUrl 
            : window.getApiUrl(msg.mediaUrl || '');
        contentHtml = `
            <div class="voice-note-bubble">
                <button type="button" class="btn-play-voice" onclick="toggleAudioPlayback('${audioSrc}', this)">
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
    const canDelete = isSentByMe || (state.activeChat && state.activeChat.type === 'group' && state.activeChat.creatorId === state.currentUser.id);

    return `
        <div class="msg-row ${isSentByMe ? 'sent' : 'received'}" id="msg-bubble-${msg.id}">
            ${!isSentByMe && canDelete ? `
                <button type="button" class="btn-delete-msg" onclick="promptDeleteSingleMessage(${msg.id}, event)" title="Delete Message">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            ` : ''}
            <div class="msg-bubble">
                ${showSender ? `<div class="msg-sender-name">${escapeHtml(msg.senderFullName || msg.senderUsername)}</div>` : ''}
                ${contentHtml}
                <div class="msg-meta">
                    <span>${timeStr}</span>
                    ${isSentByMe ? renderStatusTicks(msg.status) : ''}
                </div>
            </div>
            ${isSentByMe ? `
                <button type="button" class="btn-delete-msg" onclick="promptDeleteSingleMessage(${msg.id}, event)" title="Delete Message">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            ` : ''}
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

// Delete / Clear Entire Chat History
function confirmDeleteChat() {
    if (!state.activeChat) return;
    openModal('modal-confirm-delete');
}

async function executeDeleteCurrentChat() {
    if (!state.activeChat || !state.currentUser) return;
    closeModal('modal-confirm-delete');

    try {
        if (state.activeChat.type === 'direct') {
            const url = window.getApiUrl(`/api/messages/private?userId=${state.currentUser.id}&otherUserId=${state.activeChat.id}`);
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                const container = document.getElementById('messages-container');
                if (container) container.innerHTML = '<div class="list-empty-hint">Chat history cleared</div>';
                loadConnections();
            }
        } else if (state.activeChat.type === 'group') {
            const url = window.getApiUrl(`/api/groups/${state.activeChat.id}/messages?userId=${state.currentUser.id}`);
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                const container = document.getElementById('messages-container');
                if (container) container.innerHTML = '<div class="list-empty-hint">Group chat history cleared</div>';
                loadGroups();
            }
        }
    } catch (e) {
        console.error('Error clearing chat:', e);
    }
}

// Prompt and Execute Single Message Deletion
function promptDeleteSingleMessage(messageId, event) {
    if (event) event.stopPropagation();
    pendingDeleteMessageId = messageId;
    openModal('modal-confirm-delete-msg');
}

async function executeDeleteSingleMessage() {
    if (!pendingDeleteMessageId || !state.currentUser) return;
    const messageId = pendingDeleteMessageId;
    closeModal('modal-confirm-delete-msg');
    pendingDeleteMessageId = null;

    try {
        if (state.activeChat && state.activeChat.type === 'direct') {
            const url = window.getApiUrl(`/api/messages/${messageId}?userId=${state.currentUser.id}`);
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                const bubble = document.getElementById(`msg-bubble-${messageId}`);
                if (bubble) {
                    bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                    bubble.style.opacity = '0';
                    bubble.style.transform = 'scale(0.9)';
                    setTimeout(() => bubble.remove(), 250);
                }
                loadConnections();
            }
        } else if (state.activeChat && state.activeChat.type === 'group') {
            const url = window.getApiUrl(`/api/groups/${state.activeChat.id}/messages/${messageId}?userId=${state.currentUser.id}`);
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                const bubble = document.getElementById(`msg-bubble-${messageId}`);
                if (bubble) {
                    bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                    bubble.style.opacity = '0';
                    bubble.style.transform = 'scale(0.9)';
                    setTimeout(() => bubble.remove(), 250);
                }
                loadGroups();
            }
        }
    } catch (e) {
        console.error('Error deleting message:', e);
    }
}

// Incoming Message Handlers
function handleIncomingPrivateMessage(msg) {
    if (state.activeChat && state.activeChat.type === 'direct' &&
        (state.activeChat.id === msg.senderId || state.activeChat.id === msg.receiverId)) {
        
        const container = document.getElementById('messages-container');
        // Remove empty hint if present
        const emptyHint = container.querySelector('.list-empty-hint');
        if (emptyHint) emptyHint.remove();

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
        const emptyHint = container.querySelector('.list-empty-hint');
        if (emptyHint) emptyHint.remove();

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
    } else if (notif.type === 'CONVERSATION_CLEARED') {
        if (state.activeChat && state.activeChat.type === 'direct') {
            const isMatch = (state.activeChat.id === notif.senderId && state.currentUser.id === notif.receiverId) ||
                            (state.activeChat.id === notif.receiverId && state.currentUser.id === notif.senderId) ||
                            (!notif.receiverId && (state.activeChat.id === notif.senderId || state.currentUser.id === notif.senderId));
            if (isMatch) {
                const container = document.getElementById('messages-container');
                if (container) container.innerHTML = '<div class="list-empty-hint">Chat history cleared</div>';
            }
        }
        loadConnections();
    } else if (notif.type === 'MESSAGE_DELETED') {
        if (notif.messageId) {
            const bubble = document.getElementById(`msg-bubble-${notif.messageId}`);
            if (bubble) {
                bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                bubble.style.opacity = '0';
                bubble.style.transform = 'scale(0.9)';
                setTimeout(() => bubble.remove(), 250);
            }
        }
        loadConnections();
    } else if (notif.type === 'GROUP_MESSAGES_CLEARED') {
        if (state.activeChat && state.activeChat.type === 'group' && state.activeChat.id === notif.groupId) {
            const container = document.getElementById('messages-container');
            if (container) container.innerHTML = '<div class="list-empty-hint">Group chat history cleared</div>';
        }
        loadGroups();
    } else if (notif.type === 'GROUP_MESSAGE_DELETED') {
        if (notif.messageId) {
            const bubble = document.getElementById(`msg-bubble-${notif.messageId}`);
            if (bubble) {
                bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                bubble.style.opacity = '0';
                bubble.style.transform = 'scale(0.9)';
                setTimeout(() => bubble.remove(), 250);
            }
        }
        loadGroups();
    } else if (notif.type === 'MESSAGE_READ' || notif.type === 'MESSAGE_STATUS_UPDATE') {
        if (state.activeChat && state.activeChat.type === 'direct' && state.activeChat.id === notif.senderId) {
            // Update all sent ticks to read (blue ticks)
            const ticks = document.querySelectorAll('.msg-row.sent .status-ticks');
            ticks.forEach(t => {
                t.textContent = '✓✓';
                t.style.color = '#38bdf8';
            });
        }
        loadConnections();
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

function triggerDocumentUpload() {
    document.getElementById('attachment-menu').classList.add('hidden');
    document.getElementById('media-document-file').click();
}

function showUploadProgress(text) {
    const banner = document.getElementById('upload-progress-bar');
    const label = document.getElementById('upload-progress-text');
    if (label) label.textContent = text;
    if (banner) banner.classList.remove('hidden');
}

function hideUploadProgress() {
    const banner = document.getElementById('upload-progress-bar');
    if (banner) banner.classList.add('hidden');
}

function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

async function handleImageMediaUpload(input) {
    if (!input.files || !input.files[0] || !state.activeChat) return;
    const file = input.files[0];
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
        alert('Image must be under 25MB');
        input.value = '';
        return;
    }

    showUploadProgress(`Uploading image (${formatBytes(file.size)})...`);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(window.getApiUrl('/api/media/upload'), {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        sendRichMediaMessage('IMAGE', data.url, file.name);
    } catch (err) {
        console.error('Image upload failed:', err);
        alert('Image upload failed: ' + err.message);
    } finally {
        hideUploadProgress();
        input.value = '';
    }
}

async function handleVideoMediaUpload(input) {
    if (!input.files || !input.files[0] || !state.activeChat) return;
    const file = input.files[0];
    const maxBytes = (window.APP_CONFIG.MAX_VIDEO_SIZE_MB || 50) * 1024 * 1024;
    if (file.size > maxBytes) {
        alert(`Video must be under ${window.APP_CONFIG.MAX_VIDEO_SIZE_MB}MB`);
        input.value = '';
        return;
    }

    showUploadProgress(`Uploading video (${formatBytes(file.size)})...`);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(window.getApiUrl('/api/media/upload'), {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        sendRichMediaMessage('VIDEO', data.url, file.name);
    } catch (err) {
        console.error('Video upload failed:', err);
        alert('Video upload failed: ' + err.message);
    } finally {
        hideUploadProgress();
        input.value = '';
    }
}

async function handleDocumentMediaUpload(input) {
    if (!input.files || !input.files[0] || !state.activeChat) return;
    const file = input.files[0];
    const maxBytes = (window.APP_CONFIG.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;
    if (file.size > maxBytes) {
        alert(`Document must be under ${window.APP_CONFIG.MAX_FILE_SIZE_MB}MB`);
        input.value = '';
        return;
    }

    showUploadProgress(`Uploading document (${file.name})...`);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(window.getApiUrl('/api/media/upload'), {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        const metadata = JSON.stringify({
            fileName: data.fileName || file.name,
            fileSize: data.fileSize || file.size,
            contentType: data.contentType || file.type
        });

        sendRichMediaMessage('FILE', data.url, metadata);
    } catch (err) {
        console.error('Document upload failed:', err);
        alert('Document upload failed: ' + err.message);
    } finally {
        hideUploadProgress();
        input.value = '';
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
        const res = await fetch(window.getApiUrl(`/api/users/${state.currentUser.id}/profile`), {
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
        const res = await fetch(window.getApiUrl(`/api/users/search?username=${encodeURIComponent(query)}&currentUserId=${state.currentUser.id}`));
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
        const res = await fetch(window.getApiUrl('/api/connections/request'), {
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
        const res = await fetch(window.getApiUrl(`/api/connections/requests/${state.currentUser.id}`));
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
        await fetch(window.getApiUrl(`/api/connections/${requestId}/accept?userId=${state.currentUser.id}`), { method: 'POST' });
        loadConnections();
        loadPendingRequests();
    } catch (e) {
        alert('Error accepting request');
    }
}

async function rejectConnectionRequest(requestId) {
    try {
        await fetch(window.getApiUrl(`/api/connections/${requestId}/reject?userId=${state.currentUser.id}`), { method: 'POST' });
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
        const res = await fetch(window.getApiUrl('/api/groups'), {
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
        const res = await fetch(window.getApiUrl(`/api/groups/${groupId}/members?userId=${state.currentUser.id}`));
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

// =========================================================================
// 8. WEBRTC AUDIO & VIDEO CALLING ENGINE
// =========================================================================

/**
 * Initiates an Audio-only voice call to the active contact
 */
async function startAudioCall() {
    if (!state.activeChat || state.activeChat.type !== 'direct') {
        alert('Calls are available for direct 1-to-1 chats.');
        return;
    }
    await initiateCall('audio');
}

/**
 * Initiates a Video call to the active contact
 */
async function startVideoCall() {
    if (!state.activeChat || state.activeChat.type !== 'direct') {
        alert('Calls are available for direct 1-to-1 chats.');
        return;
    }
    await initiateCall('video');
}

/**
 * Core call initiator: accesses media, constructs RTCPeerConnection, and sends SDP offer
 */
async function initiateCall(callType) {
    const targetUserId = state.activeChat.id;
    const targetUserName = state.activeChat.name;
    const targetUserAvatar = state.activeChat.avatarUrl;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
        });

        state.call.localStream = stream;
        state.call.callType = callType;
        state.call.isCaller = true;
        state.call.peerId = targetUserId;
        state.call.peerName = targetUserName;
        state.call.peerAvatar = targetUserAvatar;
        state.call.seconds = 0;
        state.call.micMuted = false;
        state.call.videoMuted = false;

        // Render local preview
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.style.display = callType === 'video' ? 'block' : 'none';
        }

        // Initialize RTCPeerConnection with STUN configuration
        const iceServers = (window.APP_CONFIG && window.APP_CONFIG.ICE_SERVERS) || [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];
        const pc = new RTCPeerConnection({ iceServers });
        state.call.peerConnection = pc;

        // Add local tracks to WebRTC peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Transmit ICE candidates to remote peer via WebSocket
        pc.onicecandidate = (event) => {
            if (event.candidate && state.stompClient && state.connected) {
                sendCallSignal('ICE_CANDIDATE', targetUserId, callType, event.candidate);
            }
        };

        // Attach incoming remote stream tracks
        pc.ontrack = (event) => {
            state.call.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.style.display = callType === 'video' ? 'block' : 'none';
            }
            document.getElementById('call-status-label').textContent = 'Connected';
            startCallTimer();
        };

        // Show Call Overlay with "Calling..." status
        openActiveCallOverlay(targetUserName, targetUserAvatar, callType, 'Calling...');

        // Create and set local SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send Offer packet over STOMP WebSocket
        sendCallSignal('OFFER', targetUserId, callType, offer);

    } catch (err) {
        console.error('Error initiating call:', err);
        alert('Could not access microphone/camera: ' + err.message);
        cleanupCallSession();
    }
}

/**
 * Sends a WebRTC signal DTO over STOMP to /app/call.signal
 */
function sendCallSignal(type, receiverId, callType, payload) {
    if (!state.stompClient || !state.connected) return;
    const signal = {
        type,
        senderId: state.currentUser.id,
        senderName: state.currentUser.fullName,
        senderAvatar: state.currentUser.avatarUrl,
        receiverId,
        callType,
        payload
    };
    state.stompClient.send('/app/call.signal', {}, JSON.stringify(signal));
}

/**
 * Handles incoming call signaling packets received on /topic/user/{id}/call
 */
function handleIncomingCallSignal(signal) {
    if (!signal || !signal.type) return;

    if (signal.type === 'OFFER') {
        // If already in a call, reject as busy
        if (state.call.peerConnection) {
            sendCallSignal('CALL_BUSY', signal.senderId, signal.callType, null);
            return;
        }

        state.call.pendingOffer = signal;
        state.call.callType = signal.callType || 'video';
        state.call.peerId = signal.senderId;
        state.call.peerName = signal.senderName;
        state.call.peerAvatar = signal.senderAvatar;

        // Display incoming call ringing dialog
        document.getElementById('incoming-call-name').textContent = signal.senderName;
        document.getElementById('incoming-call-type').textContent = signal.callType === 'audio' 
            ? 'Incoming Voice Call...' 
            : 'Incoming Video Call...';
        renderAvatarInto(signal.senderAvatar, signal.senderName, document.getElementById('incoming-call-avatar'));
        openModal('modal-incoming-call');

    } else if (signal.type === 'ANSWER') {
        if (state.call.peerConnection && state.call.isCaller) {
            state.call.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload))
                .then(() => {
                    document.getElementById('call-status-label').textContent = 'Connected';
                    startCallTimer();
                })
                .catch(err => console.error('Error setting remote description from answer:', err));
        }

    } else if (signal.type === 'ICE_CANDIDATE') {
        if (state.call.peerConnection && signal.payload) {
            state.call.peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload))
                .catch(err => console.error('Error adding ICE candidate:', err));
        }

    } else if (signal.type === 'CALL_REJECT') {
        alert(`${state.call.peerName || 'Contact'} declined the call.`);
        cleanupCallSession();

    } else if (signal.type === 'CALL_BUSY') {
        alert(`${state.call.peerName || 'Contact'} is currently on another call.`);
        cleanupCallSession();

    } else if (signal.type === 'CALL_END') {
        cleanupCallSession();
    }
}

/**
 * Callee accepts an incoming voice or video call
 */
async function acceptIncomingCall() {
    closeModal('modal-incoming-call');
    const offerSignal = state.call.pendingOffer;
    if (!offerSignal) return;

    const callType = offerSignal.callType || 'video';
    const callerId = offerSignal.senderId;
    const callerName = offerSignal.senderName;
    const callerAvatar = offerSignal.senderAvatar;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
        });

        state.call.localStream = stream;
        state.call.isCaller = false;
        state.call.callType = callType;
        state.call.peerId = callerId;
        state.call.peerName = callerName;
        state.call.peerAvatar = callerAvatar;
        state.call.micMuted = false;
        state.call.videoMuted = false;

        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.style.display = callType === 'video' ? 'block' : 'none';
        }

        const iceServers = (window.APP_CONFIG && window.APP_CONFIG.ICE_SERVERS) || [
            { urls: 'stun:stun.l.google.com:19302' }
        ];
        const pc = new RTCPeerConnection({ iceServers });
        state.call.peerConnection = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
            if (event.candidate && state.stompClient && state.connected) {
                sendCallSignal('ICE_CANDIDATE', callerId, callType, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            state.call.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.style.display = callType === 'video' ? 'block' : 'none';
            }
            document.getElementById('call-status-label').textContent = 'Connected';
            startCallTimer();
        };

        openActiveCallOverlay(callerName, callerAvatar, callType, 'Connecting...');

        // Set remote offer and build answer
        await pc.setRemoteDescription(new RTCSessionDescription(offerSignal.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Transmit Answer packet back to caller
        sendCallSignal('ANSWER', callerId, callType, answer);

    } catch (err) {
        console.error('Error accepting call:', err);
        alert('Could not access microphone/camera: ' + err.message);
        sendCallSignal('CALL_REJECT', callerId, callType, null);
        cleanupCallSession();
    }
}

/**
 * Callee declines an incoming call
 */
function declineIncomingCall() {
    closeModal('modal-incoming-call');
    if (state.call.pendingOffer) {
        sendCallSignal('CALL_REJECT', state.call.pendingOffer.senderId, state.call.callType, null);
    }
    cleanupCallSession();
}

/**
 * Ends active call and notifies peer
 */
function endCurrentCall() {
    if (state.call.peerId) {
        sendCallSignal('CALL_END', state.call.peerId, state.call.callType, null);
    }
    cleanupCallSession();
}

/**
 * Cleans up media streams, timers, WebRTC connections, and UI overlays
 */
function cleanupCallSession() {
    closeModal('modal-incoming-call');
    const overlay = document.getElementById('overlay-active-call');
    if (overlay) overlay.classList.add('hidden');

    if (state.call.timerInterval) {
        clearInterval(state.call.timerInterval);
        state.call.timerInterval = null;
    }

    if (state.call.localStream) {
        state.call.localStream.getTracks().forEach(track => track.stop());
        state.call.localStream = null;
    }

    if (state.call.peerConnection) {
        state.call.peerConnection.close();
        state.call.peerConnection = null;
    }

    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = null;
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) remoteVideo.srcObject = null;

    state.call.remoteStream = null;
    state.call.pendingOffer = null;
    state.call.peerId = null;
    state.call.isCaller = false;
    state.call.seconds = 0;
}

/**
 * Renders and presents the Active Call Overlay
 */
function openActiveCallOverlay(name, avatar, type, statusText) {
    const overlay = document.getElementById('overlay-active-call');
    overlay.classList.remove('hidden');

    document.getElementById('call-status-label').textContent = statusText;
    document.getElementById('call-duration-timer').textContent = '00:00';
    document.getElementById('call-active-name').textContent = name;
    renderAvatarInto(avatar, name, document.getElementById('call-active-avatar'));

    const visualizer = document.getElementById('call-audio-visualizer');
    const remoteVideo = document.getElementById('remote-video');

    if (type === 'audio') {
        visualizer.classList.remove('hidden');
        remoteVideo.classList.add('hidden');
    } else {
        visualizer.classList.add('hidden');
        remoteVideo.classList.remove('hidden');
    }
}

/**
 * Starts the MM:SS call duration timer
 */
function startCallTimer() {
    if (state.call.timerInterval) return;
    state.call.seconds = 0;
    state.call.timerInterval = setInterval(() => {
        state.call.seconds++;
        const mins = Math.floor(state.call.seconds / 60);
        const secs = state.call.seconds % 60;
        const formatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const timerEl = document.getElementById('call-duration-timer');
        if (timerEl) timerEl.textContent = formatted;
    }, 1000);
}

/**
 * Mute / Unmute microphone during active call
 */
function toggleCallMic() {
    if (!state.call.localStream) return;
    const audioTrack = state.call.localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        state.call.micMuted = !audioTrack.enabled;

        const micOnIcon = document.getElementById('icon-mic-on');
        const micOffIcon = document.getElementById('icon-mic-off');
        const btn = document.getElementById('btn-toggle-call-mic');

        if (state.call.micMuted) {
            micOnIcon.classList.add('hidden');
            micOffIcon.classList.remove('hidden');
            btn.classList.add('active-muted');
        } else {
            micOffIcon.classList.add('hidden');
            micOnIcon.classList.remove('hidden');
            btn.classList.remove('active-muted');
        }
    }
}

/**
 * Turn camera video on or off during active call
 */
function toggleCallVideo() {
    if (!state.call.localStream) return;
    const videoTrack = state.call.localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        state.call.videoMuted = !videoTrack.enabled;

        const camOnIcon = document.getElementById('icon-cam-on');
        const camOffIcon = document.getElementById('icon-cam-off');
        const btn = document.getElementById('btn-toggle-call-video');
        const visualizer = document.getElementById('call-audio-visualizer');

        if (state.call.videoMuted) {
            camOnIcon.classList.add('hidden');
            camOffIcon.classList.remove('hidden');
            btn.classList.add('active-muted');
            if (visualizer) visualizer.classList.remove('hidden');
        } else {
            camOffIcon.classList.add('hidden');
            camOnIcon.classList.remove('hidden');
            btn.classList.remove('active-muted');
            if (visualizer && state.call.callType === 'video') visualizer.classList.add('hidden');
        }
    }
}

