/**
 * ConnectChat Profile & Settings Module
 */
window.Profile = (function () {
    function openProfileModal() {
        if (!window.state.currentUser) return;
        const user = window.state.currentUser;

        const nameInput = document.getElementById('profile-fullname-input');
        const bioInput = document.getElementById('profile-bio-input');
        const avatarPreview = document.getElementById('profile-avatar-preview');

        if (nameInput) nameInput.value = user.fullName || '';
        if (bioInput) bioInput.value = user.bio || '';

        if (avatarPreview) {
            if (user.avatarUrl) {
                avatarPreview.innerHTML = `<img src="${window.getApiUrl(user.avatarUrl)}" class="avatar avatar-xl" alt="Avatar"/>`;
            } else {
                const initials = window.Utils.getInitials(user.fullName || user.username);
                const gradient = window.Utils.getAvatarGradient(user.username);
                avatarPreview.innerHTML = `<div class="avatar avatar-xl" style="background: ${gradient}">${initials}</div>`;
            }
        }

        window.UI.openModal('modal-profile-settings');
    }

    async function handleAvatarUpload(fileInput) {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        const uploadRes = await window.Files.uploadFile(file);
        if (uploadRes && uploadRes.url) {
            window.state.currentUser.avatarUrl = uploadRes.url;
            const preview = document.getElementById('profile-avatar-preview');
            if (preview) {
                preview.innerHTML = `<img src="${window.getApiUrl(uploadRes.url)}" class="avatar avatar-xl" alt="Avatar"/>`;
            }
        }
    }

    async function saveProfile() {
        if (!window.state.currentUser) return;
        const userId = window.state.currentUser.id;

        const fullName = document.getElementById('profile-fullname-input')?.value || '';
        const bio = document.getElementById('profile-bio-input')?.value || '';
        const avatarUrl = window.state.currentUser.avatarUrl || '';

        try {
            const updated = await window.ApiClient.put(`/api/users/${userId}/profile`, {
                fullName: fullName.trim(),
                bio: bio.trim(),
                avatarUrl: avatarUrl
            });

            window.state.currentUser = updated;
            localStorage.setItem('connectchat_user', JSON.stringify(updated));
            window.UI.updateCurrentUserProfileUI(updated);
            window.UI.closeModal('modal-profile-settings');
            window.UI.showToast('Profile updated!', 'success');
        } catch (err) {
            window.UI.showToast(err.message || 'Failed to update profile', 'error');
        }
    }

    return {
        openProfileModal,
        handleAvatarUpload,
        saveProfile
    };
})();
