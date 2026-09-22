/**
 * ConnectChat Ephemeral Stories Module
 */
window.Stories = (function () {
    let storiesList = [];
    let currentStoryIdx = 0;
    let storyTimer = null;

    async function loadStoriesFeed() {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        try {
            const feed = await window.ApiClient.get(`/api/stories/feed/${userId}`);
            storiesList = feed || [];
            renderStoriesTray();
        } catch (err) {
            console.error('Failed to load stories feed:', err);
        }
    }

    function renderStoriesTray() {
        const tray = document.getElementById('stories-tray');
        if (!tray) return;

        let html = `
            <div class="story-avatar-wrap" onclick="window.UI.openModal('modal-create-story')" title="Post a story">
                <div class="avatar avatar-md" style="background: var(--bg-hover); color: var(--primary-color); border: 2px dashed var(--primary-color);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
            </div>
        `;

        storiesList.forEach((story, idx) => {
            const user = story.user || {};
            const initials = window.Utils.getInitials(user.fullName || user.username);
            const gradient = window.Utils.getAvatarGradient(user.username || 'story');

            html += `
                <div class="story-avatar-wrap has-story" onclick="window.Stories.openStoryViewer(${idx})" title="${window.Utils.escapeHtml(user.fullName || user.username)}'s story">
                    <div class="avatar avatar-md" style="background: ${gradient}">${initials}</div>
                </div>
            `;
        });

        tray.innerHTML = html;
    }

    function openStoryViewer(idx) {
        if (!storiesList[idx]) return;
        currentStoryIdx = idx;

        const modal = document.getElementById('modal-story-viewer');
        if (!modal) return;

        modal.classList.remove('hidden');
        renderCurrentStory();
    }

    function renderCurrentStory() {
        const story = storiesList[currentStoryIdx];
        if (!story) {
            closeStoryViewer();
            return;
        }

        const user = story.user || {};
        const titleEl = document.getElementById('story-author-name');
        const timeEl = document.getElementById('story-time-stamp');
        const textEl = document.getElementById('story-caption-text');
        const mediaEl = document.getElementById('story-media-view');

        if (titleEl) titleEl.textContent = user.fullName || user.username;
        if (timeEl) timeEl.textContent = window.Utils.formatTime(story.createdAt);
        if (textEl) textEl.textContent = story.caption || '';

        if (mediaEl) {
            if (story.mediaUrl) {
                mediaEl.innerHTML = `<img src="${window.getApiUrl(story.mediaUrl)}" style="max-height: 480px; max-width: 100%; border-radius: var(--radius-sm);" alt="Story photo"/>`;
            } else {
                mediaEl.innerHTML = '';
            }
        }

        if (storyTimer) clearTimeout(storyTimer);
        storyTimer = setTimeout(() => {
            if (currentStoryIdx < storiesList.length - 1) {
                currentStoryIdx++;
                renderCurrentStory();
            } else {
                closeStoryViewer();
            }
        }, 5000);
    }

    function closeStoryViewer() {
        if (storyTimer) clearTimeout(storyTimer);
        const modal = document.getElementById('modal-story-viewer');
        if (modal) modal.classList.add('hidden');
    }

    async function createStory(caption, file) {
        if (!window.state.currentUser) return;
        let mediaUrl = null;

        if (file) {
            const uploadRes = await window.Files.uploadFile(file);
            if (uploadRes) mediaUrl = uploadRes.url;
        }

        try {
            await window.ApiClient.post('/api/stories', {
                userId: window.state.currentUser.id,
                caption: caption,
                mediaUrl: mediaUrl
            });
            window.UI.showToast('Story posted!', 'success');
            window.UI.closeModal('modal-create-story');
            loadStoriesFeed();
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to post story', 'error');
        }
    }

    return {
        loadStoriesFeed,
        openStoryViewer,
        closeStoryViewer,
        createStory
    };
})();
