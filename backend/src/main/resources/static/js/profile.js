/**
 * Let's Talk — Profile & Settings Module
 */
window.Profile = (function () {
    let pendingProfilePhotoUrl = null;

    function openProfileModal() {
        if (!window.state || !window.state.currentUser) return;
        const user = window.state.currentUser;

        const nameInput = document.getElementById('profile-fullname-input');
        const bioInput = document.getElementById('profile-bio-input');
        const avatarPreview = document.getElementById('profile-avatar-preview');

        if (nameInput) nameInput.value = user.fullName || '';
        if (bioInput) bioInput.value = user.bio || '';
        pendingProfilePhotoUrl = user.profilePhoto || user.avatarUrl || null;

        if (avatarPreview) {
            if (pendingProfilePhotoUrl) {
                avatarPreview.innerHTML = `<img src="${window.getApiUrl(pendingProfilePhotoUrl)}" class="avatar avatar-xl" alt="Avatar"/>`;
            } else {
                const initials = window.Utils.getInitials(user.fullName || user.username);
                const gradient = window.Utils.getAvatarGradient(user.username);
                avatarPreview.innerHTML = `<div class="avatar avatar-xl" style="background: ${gradient}">${initials}</div>`;
            }
        }

        window.UI && window.UI.openModal('modal-profile-settings');
    }

    async function handleAvatarUpload(fileInput) {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'profile');

            const uploadRes = await window.ApiClient.post('/api/files/upload', formData);
            if (uploadRes && uploadRes.fileUrl) {
                pendingProfilePhotoUrl = uploadRes.fileUrl;
                const preview = document.getElementById('profile-avatar-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${window.getApiUrl(uploadRes.fileUrl)}" class="avatar avatar-xl" alt="Avatar"/>`;
                }
            }
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to upload photo', 'error');
        }
    }

    async function saveProfile() {
        if (!window.state || !window.state.currentUser) return;

        const fullName = document.getElementById('profile-fullname-input')?.value || '';
        const bio = document.getElementById('profile-bio-input')?.value || '';

        try {
            const updated = await window.ApiClient.put('/api/users/profile', {
                fullName: fullName.trim(),
                bio: bio.trim(),
                profilePhoto: pendingProfilePhotoUrl || ''
            });

            window.state.currentUser = updated;
            localStorage.setItem('connectchat_user', JSON.stringify(updated));
            window.UI && window.UI.updateCurrentUserProfileUI(updated);
            window.UI && window.UI.closeModal('modal-profile-settings');
            window.UI && window.UI.showToast('Profile updated!', 'success');
        } catch (err) {
            window.UI && window.UI.showToast(err.message || 'Failed to update profile', 'error');
        }
    }

    return {
        openProfileModal,
        handleAvatarUpload,
        saveProfile
    };
})();
