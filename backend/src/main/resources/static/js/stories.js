/**
 * Let's Talk — 24-Hour Stories Module
 * Manages story uploading, story tray, and full-screen story viewer.
 */
window.Stories = (function () {
    let storyGroups = [];
    let currentGroupIdx = 0;
    let currentStoryIdx = 0;
    let storyTimer = null;
    let progressTimer = null;
    let progressStartTime = 0;
    const STORY_DURATION_MS = 5000;

    async function loadStoriesFeed() {
        if (!window.state || !window.state.currentUser) return;

        try {
            const feed = await window.ApiClient.get('/api/stories');
            storyGroups = feed || [];
            renderStoriesTray();
        } catch (err) {
            console.error('Failed to load stories feed:', err);
        }
    }

    function renderStoriesTray() {
        const tray = document.getElementById('stories-tray');
        if (!tray) return;

        let html = `
            <div class="story-item" onclick="window.Stories.openCreateStoryModal()" title="Add your story">
                <div class="story-avatar-ring">
                    <div class="story-avatar-img" style="background: var(--bg-hover); display: flex; align-items: center; justify-content: center;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                    <div class="story-add-badge">+</div>
                </div>
                <span class="story-item-name">Your Story</span>
            </div>
        `;

        storyGroups.forEach((group, gIdx) => {
            const initials = window.Utils.getInitials(group.fullName || group.username);
            const gradient = window.Utils.getAvatarGradient(group.username || 'story');
            const photoUrl = group.profilePhoto;
            const avatarHtml = photoUrl && photoUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(photoUrl)}" class="story-avatar-img" alt="${window.Utils.escapeHtml(group.fullName)}"/>`
                : `<div class="story-avatar-img" style="background:${gradient}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold;">${initials}</div>`;

            const unviewedClass = group.hasUnviewed ? 'unviewed' : '';
            const displayName = group.isOwnStory ? 'Your Story' : (group.fullName || group.username);

            html += `
                <div class="story-item ${unviewedClass}" onclick="window.Stories.openStoryViewer(${gIdx})" title="${window.Utils.escapeHtml(displayName)}">
                    <div class="story-avatar-ring">
                        ${avatarHtml}
                    </div>
                    <span class="story-item-name">${window.Utils.escapeHtml(displayName)}</span>
                </div>
            `;
        });

        tray.innerHTML = html;
    }

    function openCreateStoryModal() {
        let input = document.getElementById('story-file-input');
        if (!input) {
            input = document.createElement('input');
            input.id = 'story-file-input';
            input.type = 'file';
            input.accept = 'image/*,video/*';
            input.style.display = 'none';
            input.onchange = handleStoryFileUpload;
            document.body.appendChild(input);
        }
        input.click();
    }

    async function handleStoryFileUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        window.UI && window.UI.showToast('Uploading story...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'stories');

            const uploadRes = await window.ApiClient.post('/api/files/upload', formData);
            if (!uploadRes || !uploadRes.fileUrl) {
                throw new Error('Upload failed');
            }

            const mediaType = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';
            await window.ApiClient.post('/api/stories', {
                mediaPath: uploadRes.fileUrl,
                mediaType: mediaType
            });

            window.UI && window.UI.showToast('Story posted successfully!', 'success');
            loadStoriesFeed();
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to upload story.', 'error');
        } finally {
            event.target.value = '';
        }
    }

    function openStoryViewer(groupIdx) {
        if (!storyGroups[groupIdx] || !storyGroups[groupIdx].stories || storyGroups[groupIdx].stories.length === 0) return;

        currentGroupIdx = groupIdx;
        currentStoryIdx = 0;

        let viewer = document.getElementById('modal-story-viewer');
        if (!viewer) return;

        viewer.classList.remove('hidden');
        renderCurrentStory();
    }

    function renderCurrentStory() {
        const group = storyGroups[currentGroupIdx];
        if (!group || !group.stories || !group.stories[currentStoryIdx]) {
            closeStoryViewer();
            return;
        }

        const story = group.stories[currentStoryIdx];

        // Mark viewed
        if (!story.viewed) {
            story.viewed = true;
            window.ApiClient.post(`/api/stories/${story.id}/view`).catch(() => {});
        }

        const titleEl = document.getElementById('story-author-name');
        const timeEl = document.getElementById('story-time-stamp');
        const mediaEl = document.getElementById('story-media-view');

        if (titleEl) titleEl.textContent = group.fullName || group.username;
        if (timeEl) timeEl.textContent = window.Utils.formatTime(story.createdAt);

        if (mediaEl) {
            const fullUrl = window.getApiUrl(story.mediaPath);
            if (story.mediaType === 'VIDEO') {
                mediaEl.innerHTML = `<video src="${fullUrl}" autoplay playsinline style="max-height: 100%; max-width: 100%; border-radius: var(--radius-sm);"></video>`;
            } else {
                mediaEl.innerHTML = `<img src="${fullUrl}" style="max-height: 100%; max-width: 100%; object-fit: contain; border-radius: var(--radius-sm);" alt="Story photo"/>`;
            }
        }

        // Setup progress bar
        setupProgressBar(group.stories.length, currentStoryIdx);

        // Schedule next story
        if (storyTimer) clearTimeout(storyTimer);
        storyTimer = setTimeout(() => {
            nextStory();
        }, STORY_DURATION_MS);
    }

    function setupProgressBar(totalStories, activeIdx) {
        const progressWrap = document.getElementById('story-progress-bar-wrap');
        if (!progressWrap) return;

        let html = '';
        for (let i = 0; i < totalStories; i++) {
            let width = i < activeIdx ? '100%' : (i === activeIdx ? '0%' : '0%');
            html += `<div class="story-progress-segment"><div class="story-progress-fill" id="story-prog-${i}" style="width: ${width};"></div></div>`;
        }
        progressWrap.innerHTML = html;

        progressStartTime = Date.now();
        if (progressTimer) clearInterval(progressTimer);

        progressTimer = setInterval(() => {
            const elapsed = Date.now() - progressStartTime;
            const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
            const fill = document.getElementById(`story-prog-${activeIdx}`);
            if (fill) fill.style.width = pct + '%';
        }, 50);
    }

    function nextStory() {
        if (progressTimer) clearInterval(progressTimer);
        const group = storyGroups[currentGroupIdx];
        if (group && currentStoryIdx < group.stories.length - 1) {
            currentStoryIdx++;
            renderCurrentStory();
        } else if (currentGroupIdx < storyGroups.length - 1) {
            currentGroupIdx++;
            currentStoryIdx = 0;
            renderCurrentStory();
        } else {
            closeStoryViewer();
        }
    }

    function prevStory() {
        if (progressTimer) clearInterval(progressTimer);
        if (currentStoryIdx > 0) {
            currentStoryIdx--;
            renderCurrentStory();
        } else if (currentGroupIdx > 0) {
            currentGroupIdx--;
            const prevGroup = storyGroups[currentGroupIdx];
            currentStoryIdx = prevGroup ? prevGroup.stories.length - 1 : 0;
            renderCurrentStory();
        }
    }

    function closeStoryViewer() {
        if (storyTimer) clearTimeout(storyTimer);
        if (progressTimer) clearInterval(progressTimer);
        const viewer = document.getElementById('modal-story-viewer');
        if (viewer) viewer.classList.add('hidden');
        renderStoriesTray();
    }

    return {
        loadStoriesFeed,
        openCreateStoryModal,
        openStoryViewer,
        nextStory,
        prevStory,
        closeStoryViewer
    };
})();
