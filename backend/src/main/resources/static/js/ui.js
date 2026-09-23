/**
 * ConnectChat UI & View Management Module
 */
window.UI = (function () {
    let audioContext = null;

    function playChime(type = 'message') {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);

            const now = audioContext.currentTime;
            if (type === 'message') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'sent') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            }
        } catch (e) {
            // Audio context not allowed before user gesture or muted
        }
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen-view').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(screenId);
        if (target) target.classList.remove('hidden');
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    function setSidebarActiveTab(tabName) {
        document.querySelectorAll('.sidebar-nav-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        const slider = document.getElementById('sidebar-tabs-slider');
        if (slider) {
            if (tabName === 'chats') {
                slider.style.transform = 'translateX(0%)';
            } else if (tabName === 'groups') {
                slider.style.transform = 'translateX(100%)';
            } else if (tabName === 'requests') {
                slider.style.transform = 'translateX(200%)';
            }
        }

        const chatsContainer = document.getElementById('sidebar-chats-container');
        const groupsContainer = document.getElementById('sidebar-groups-container');
        const requestsContainer = document.getElementById('sidebar-requests-container');

        if (chatsContainer) chatsContainer.classList.toggle('hidden', tabName !== 'chats');
        if (groupsContainer) groupsContainer.classList.toggle('hidden', tabName !== 'groups');
        if (requestsContainer) requestsContainer.classList.toggle('hidden', tabName !== 'requests');
    }

    function toggleMobileChat(isActive) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.toggle('chat-active', isActive);
        }
    }

    function updateCurrentUserProfileUI(user) {
        if (!user) return;

        const nameEls = document.querySelectorAll('.current-user-fullname');
        nameEls.forEach(el => el.textContent = user.fullName || user.username);

        const usernameEls = document.querySelectorAll('.current-user-username');
        usernameEls.forEach(el => el.textContent = '@' + user.username);

        const avatarContainers = document.querySelectorAll('.current-user-avatar-wrap');
        avatarContainers.forEach(container => {
            if (user.avatarUrl && user.avatarUrl.trim() !== '') {
                container.innerHTML = `<img src="${window.getApiUrl(user.avatarUrl)}" alt="${window.Utils.escapeHtml(user.fullName)}" class="avatar" />`;
            } else {
                const initials = window.Utils.getInitials(user.fullName || user.username);
                const gradient = window.Utils.getAvatarGradient(user.username);
                container.innerHTML = `<div class="avatar" style="background: ${gradient}">${initials}</div>`;
            }
        });
    }

    return {
        playChime,
        showScreen,
        openModal,
        closeModal,
        showToast,
        setSidebarActiveTab,
        toggleMobileChat,
        updateCurrentUserProfileUI
    };
})();
