/**
 * Let's Talk — Groups Module
 * Manages group creation, member management, and integration with conversations.
 */
window.Groups = (function () {
    async function loadGroups() {
        if (!window.state || !window.state.currentUser) return;

        try {
            const groups = await window.ApiClient.get('/api/groups');
            window.state.groups = groups || [];
            renderGroupsList();
        } catch (err) {
            console.error('Failed to load groups:', err);
        }
    }

    function renderGroupsList() {
        const container = document.getElementById('sidebar-groups-list');
        const groups = window.state.groups || [];

        const countBadge = document.getElementById('groups-count-badge');
        if (countBadge) {
            countBadge.textContent = groups.length;
            countBadge.classList.toggle('hidden', groups.length === 0);
        }

        if (!container) return;

        if (groups.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: var(--font-size-sm);">
                    No groups yet.<br/>Click <strong>New Group</strong> above to create one!
                </div>
            `;
            return;
        }

        container.innerHTML = groups.map(g => {
            const initials = window.Utils.getInitials(g.name);
            const gradient = window.Utils.getAvatarGradient(g.name);
            const photoUrl = g.photo;
            const avatarHtml = photoUrl && photoUrl.trim() !== ''
                ? `<img src="${window.getApiUrl(photoUrl)}" class="avatar" alt="${window.Utils.escapeHtml(g.name)}"/>`
                : `<div class="avatar" style="background: ${gradient}">${initials}</div>`;

            const memberCount = (g.members ? g.members.length : 1);

            return `
                <div class="conversation-item" onclick="window.Groups.openGroupChat(${g.id}, '${window.Utils.escapeHtml(g.name)}', ${g.conversationId || 'null'}, '${photoUrl || ''}')">
                    <div class="avatar-wrap">
                        ${avatarHtml}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header-row">
                            <span class="conversation-name">${window.Utils.escapeHtml(g.name)}</span>
                        </div>
                        <div class="conversation-message-row">
                            <span class="conversation-snippet">${memberCount} members</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function openGroupChat(groupId, name, conversationId, photoUrl) {
        if (conversationId && window.Chat) {
            window.Chat.openConversation(conversationId, name, photoUrl, true);
        } else {
            // Fetch group details to get conversationId if not present
            try {
                const g = await window.ApiClient.get(`/api/groups/${groupId}`);
                if (g.conversationId && window.Chat) {
                    window.Chat.openConversation(g.conversationId, g.name, g.photo, true);
                }
            } catch (err) {
                window.UI && window.UI.showToast(err.message || 'Could not open group chat', 'error');
            }
        }
    }

    function openCreateGroupModal() {
        const modal = document.getElementById('create-group-modal');
        if (!modal) return;

        // Populate connected users checklist
        const membersList = document.getElementById('group-members-checklist');
        if (membersList) {
            const connections = window.state.connections || [];
            if (connections.length === 0) {
                membersList.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: var(--font-size-sm);">Connect with users first to add them to your group.</div>`;
            } else {
                membersList.innerHTML = connections.map(c => {
                    const u = c.user || c.otherUser;
                    if (!u) return '';
                    return `
                        <label class="group-member-checkbox-row">
                            <input type="checkbox" name="group-member-id" value="${u.id}" />
                            <span>${window.Utils.escapeHtml(u.fullName || u.username)} (@${window.Utils.escapeHtml(u.username)})</span>
                        </label>
                    `;
                }).join('');
            }
        }

        window.UI && window.UI.openModal('create-group-modal');
    }

    async function submitCreateGroup(event) {
        if (event) event.preventDefault();

        const nameInput = document.getElementById('group-name-input');
        if (!nameInput || !nameInput.value.trim()) {
            window.UI && window.UI.showToast('Please enter a group name.', 'error');
            return;
        }

        const selectedMembers = [];
        document.querySelectorAll('input[name="group-member-id"]:checked').forEach(cb => {
            selectedMembers.push(parseInt(cb.value, 10));
        });

        try {
            const newGroup = await window.ApiClient.post('/api/groups', {
                name: nameInput.value.trim(),
                photo: '',
                memberIds: selectedMembers
            });

            window.UI && window.UI.closeModal('create-group-modal');
            window.UI && window.UI.showToast(`Group "${newGroup.name}" created!`, 'success');
            nameInput.value = '';

            loadGroups();
            if (newGroup.conversationId && window.Chat) {
                window.Chat.openConversation(newGroup.conversationId, newGroup.name, newGroup.photo, true);
            }
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to create group.', 'error');
        }
    }

    return {
        loadGroups,
        openGroupChat,
        openCreateGroupModal,
        submitCreateGroup
    };
})();
