/**
 * Let's Talk — Master Application Orchestrator
 */

window.state = {
    currentUser: null,
    activeConversationId: null,
    activeChat: null,
    connected: false,
    conversations: [],
    connections: [],
    groups: [],
    pendingRequests: [],
    messages: [],
    call: {
        pendingOffer: null
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme (Light / Dark / Royal / Purple)
    if (window.Theme) window.Theme.initTheme();

    // 2. Setup Global Click Listeners (Outside click dismissal)
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
                window.UI && window.UI.showToast('Welcome back!', 'success');
            } catch (err) {
                window.UI && window.UI.showToast(err.message || 'Login failed', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            }
        });
    }

    const avatarInput = document.getElementById('reg-avatar-file');
    const avatarPreview = document.getElementById('reg-avatar-preview');
    const avatarPlaceholder = document.getElementById('reg-avatar-placeholder');
    let selectedAvatarFile = null;

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                window.UI && window.UI.showToast('Please select a valid image file', 'error');
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
                let uploadedAvatarUrl = '';
                if (selectedAvatarFile) {
                    if (btn) btn.textContent = 'Uploading photo...';
                    const uploadRes = await window.Files.uploadFile(selectedAvatarFile, 'profile');
                    if (uploadRes && uploadRes.fileUrl) {
                        uploadedAvatarUrl = uploadRes.fileUrl;
                    }
                }

                if (btn) btn.textContent = 'Finalizing account...';
                await window.Auth.register({
                    fullName: fullName.trim(),
                    username: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password: password,
                    confirmPassword: password,
                    bio: bio ? bio.trim() : '',
                    profilePhoto: uploadedAvatarUrl
                });
                window.UI && window.UI.showToast("Welcome to Let's Talk!", 'success');
            } catch (err) {
                window.UI && window.UI.showToast(err.message || 'Registration failed', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            }
        });
    }

    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const tabsRow = document.getElementById('auth-tabs-row');
    const carouselTrack = document.getElementById('auth-carousel-track');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            if (tabsRow) tabsRow.classList.remove('slide-register');
            if (carouselTrack) carouselTrack.classList.remove('slide-register');
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            if (tabsRow) tabsRow.classList.add('slide-register');
            if (carouselTrack) carouselTrack.classList.add('slide-register');
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

        // Auto-grow textarea height & toggle microphone/send icon
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            if (window.Chat) window.Chat.handleInputTyping();
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

    const modalSearchInput = document.getElementById('user-search-input');
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', window.Utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (window.Connections) {
                window.Connections.searchUsers(query);
            }
        }, 200));
    }
}
