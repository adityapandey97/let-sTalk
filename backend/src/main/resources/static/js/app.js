/**
 * ConnectChat Master Application Orchestrator
 */

// Global state container
window.state = {
    currentUser: null,
    activeChat: null,
    connected: false,
    connections: [],
    groups: [],
    pendingRequests: [],
    messages: [],
    storiesFeed: [],
    call: {
        pendingOffer: null
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme (Light / Dark)
    if (window.Theme) window.Theme.initTheme();

    // 2. Setup Global Click Listeners (Outside dismissal)
    setupGlobalClickListeners();

    // 3. Setup Auth Form Submissions
    setupAuthForms();

    // 4. Setup Chat Input & Typing Listeners
    setupChatInputs();

    // 5. Setup Search Listeners
    setupSearchListeners();

    // 6. Check existing session / auto-login
    if (window.Auth) {
        window.Auth.checkExistingSession();
    }
});

function setupGlobalClickListeners() {
    document.addEventListener('click', (e) => {
        // Dismiss message context menu if clicked outside
        const ctxMenu = document.getElementById('message-context-menu');
        if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
            if (!ctxMenu.contains(e.target) && !e.target.closest('.bubble-dropdown-trigger')) {
                ctxMenu.classList.add('hidden');
            }
        }

        // Dismiss floating reactions toolbar if clicked outside
        if (window.Chat && window.Chat.closeReactionPicker) {
            if (!e.target.closest('#active-reactions-toolbar') && !e.target.closest('.bubble-reaction-trigger')) {
                window.Chat.closeReactionPicker();
            }
        }

        // Dismiss attachment menu if clicked outside
        const attachMenu = document.getElementById('attachment-popup-menu');
        if (attachMenu && !attachMenu.classList.contains('hidden')) {
            if (!attachMenu.contains(e.target) && !e.target.closest('#btn-attachment-toggle')) {
                attachMenu.classList.add('hidden');
            }
        }

        // Dismiss emoji picker if clicked outside
        const emojiPicker = document.getElementById('emoji-picker-popup');
        if (emojiPicker && !emojiPicker.classList.contains('hidden')) {
            if (!emojiPicker.contains(e.target) && !e.target.closest('#btn-emoji-toggle')) {
                emojiPicker.classList.add('hidden');
            }
        }

        // Dismiss user menu dropdown if clicked outside
        const userMenu = document.getElementById('user-menu-dropdown');
        if (userMenu && !userMenu.classList.contains('hidden')) {
            if (!userMenu.contains(e.target) && !e.target.closest('#btn-user-menu')) {
                userMenu.classList.add('hidden');
            }
        }
    });
}

function setupAuthForms() {
    // Sign In Form
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier')?.value;
            const password = document.getElementById('login-password')?.value;
            if (!identifier || !password) return;

            const btn = loginForm.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

            try {
                await window.Auth.login(identifier, password);
                window.UI.showToast('Welcome back!', 'success');
            } catch (err) {
                window.UI.showToast(err.message || 'Login failed', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            }
        });
    }

    // Avatar File Picker & Preview
    const avatarInput = document.getElementById('reg-avatar-file');
    const avatarPreview = document.getElementById('reg-avatar-preview');
    const avatarPlaceholder = document.getElementById('reg-avatar-placeholder');
    let selectedAvatarFile = null;

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                window.UI.showToast('Please select a valid image file', 'error');
                return;
            }

            selectedAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (avatarPreview) {
                    avatarPreview.src = evt.target.result;
                    avatarPreview.style.display = 'block';
                }
                if (avatarPlaceholder) {
                    avatarPlaceholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Register Form
    const registerForm = document.getElementById('form-register');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('reg-fullname')?.value;
            const username = document.getElementById('reg-username')?.value;
            const email = document.getElementById('reg-email')?.value;
            const password = document.getElementById('reg-password')?.value;
            const bio = document.getElementById('reg-bio')?.value;

            if (!fullName || !username || !email || !password) return;

            const btn = registerForm.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

            try {
                let uploadedAvatarUrl = null;
                if (selectedAvatarFile) {
                    if (btn) btn.textContent = 'Uploading photo...';
                    const uploadRes = await window.Files.uploadFile(selectedAvatarFile);
                    if (uploadRes && uploadRes.url) {
                        uploadedAvatarUrl = uploadRes.url;
                    }
                }

                if (btn) btn.textContent = 'Finalizing account...';
                await window.Auth.register({
                    fullName: fullName.trim(),
                    username: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password: password,
                    bio: bio ? bio.trim() : '',
                    avatarUrl: uploadedAvatarUrl
                });
                window.UI.showToast('Welcome to Let\'s Talk!', 'success');
            } catch (err) {
                window.UI.showToast(err.message || 'Registration failed', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            }
        });
    }

    // Tab Switcher between Sign In & Register
    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            if (registerForm) registerForm.classList.remove('hidden');
            if (loginForm) loginForm.classList.add('hidden');
        });
    }
}

function setupChatInputs() {
    const input = document.getElementById('chat-input-text');
    const sendBtn = document.getElementById('btn-send-message');

    if (input) {
        // Send on Enter (unless Shift+Enter)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (window.Chat) window.Chat.sendMessage(input.value);
            }
        });

        // Auto-grow textarea height
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (input && window.Chat) {
                window.Chat.sendMessage(input.value);
            }
        });
    }
}

function setupSearchListeners() {
    // Sidebar filter across chats
    const searchInput = document.getElementById('sidebar-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', window.Utils.debounce((e) => {
            const query = (e.target.value || '').toLowerCase().trim();
            document.querySelectorAll('.sidebar-content-list .conversation-item').forEach(item => {
                const name = (item.querySelector('.conversation-name')?.textContent || '').toLowerCase();
                const snippet = (item.querySelector('.conversation-snippet')?.textContent || '').toLowerCase();
                const match = name.includes(query) || snippet.includes(query);
                item.style.display = match ? 'flex' : 'none';
            });
        }, 150));
    }

    // Modal Search for new users
    const modalSearchInput = document.getElementById('user-search-input');
    const modalResultsContainer = document.getElementById('user-search-results');
    if (modalSearchInput && modalResultsContainer) {
        modalSearchInput.addEventListener('input', window.Utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (!query) {
                modalResultsContainer.innerHTML = '';
                return;
            }

            modalResultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">Searching users...</div>`;
            const results = await window.Contacts.searchUsers(query);

            if (results.length === 0) {
                modalResultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">No matching users found</div>`;
                return;
            }

            modalResultsContainer.innerHTML = results.map(user => {
                const initials = window.Utils.getInitials(user.fullName || user.username);
                const gradient = window.Utils.getAvatarGradient(user.username);

                let actionBtn = '';
                if (user.relationshipState === 'CONNECTED') {
                    actionBtn = `<span class="empty-state-badge" style="color: var(--accent-green);">Connected</span>`;
                } else if (user.relationshipState === 'OUTGOING_PENDING') {
                    actionBtn = `<span class="empty-state-badge">Pending</span>`;
                } else {
                    actionBtn = `<button type="button" class="btn-primary" style="padding: 6px 14px; font-size: var(--font-size-xs);" onclick="window.Contacts.sendConnectionRequest(${user.id})">Connect</button>`;
                }

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-light);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar avatar-sm" style="background: ${gradient}">${initials}</div>
                            <div>
                                <strong style="display: block; font-size: var(--font-size-sm);">${window.Utils.escapeHtml(user.fullName || user.username)}</strong>
                                <span style="font-size: var(--font-size-xs); color: var(--text-muted);">@${window.Utils.escapeHtml(user.username)}</span>
                            </div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            }).join('');
        }, 200));
    }
}
