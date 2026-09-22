/**
 * ConnectChat Emoji Module
 */
window.Emoji = (function () {
    const EMOJI_CATEGORIES = {
        'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
        'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🙏', '👏', '🙌', '👐', '🤝'],
        'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
        'Objects': ['🔥', '✨', '🎉', '🎊', '🎈', '🎁', '🏆', '⭐', '🌟', '💡', '📱', '💻', '📷', '📹', '✉️', '📦', '🚀', '⚡', '☕', '🍕', '🍰', '🍻']
    };

    let activeCategory = 'Smileys';

    function init() {
        renderCategories();
        renderEmojis();
    }

    function togglePicker() {
        const picker = document.getElementById('emoji-picker-popup');
        if (!picker) return;
        const isHidden = picker.classList.toggle('hidden');
        if (!isHidden) {
            init();
        }
    }

    function closePicker() {
        const picker = document.getElementById('emoji-picker-popup');
        if (picker) picker.classList.add('hidden');
    }

    function renderCategories() {
        const catBar = document.getElementById('emoji-categories-bar');
        if (!catBar) return;

        catBar.innerHTML = Object.keys(EMOJI_CATEGORIES).map(cat => `
            <button type="button" class="emoji-cat-btn ${cat === activeCategory ? 'active' : ''}" onclick="window.Emoji.selectCategory('${cat}')">
                ${cat}
            </button>
        `).join('');
    }

    function selectCategory(cat) {
        activeCategory = cat;
        renderCategories();
        renderEmojis();
    }

    function renderEmojis() {
        const grid = document.getElementById('emoji-grid');
        if (!grid) return;

        const list = EMOJI_CATEGORIES[activeCategory] || [];
        grid.innerHTML = list.map(emoji => `
            <button type="button" class="emoji-item-btn" onclick="window.Emoji.insertEmoji('${emoji}')">
                ${emoji}
            </button>
        `).join('');
    }

    function insertEmoji(emoji) {
        const input = document.getElementById('chat-input-text');
        if (!input) return;

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const val = input.value;
        input.value = val.substring(0, start) + emoji + val.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();

        // Trigger input event for auto-grow and typing
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return {
        init,
        togglePicker,
        closePicker,
        selectCategory,
        insertEmoji
    };
})();
