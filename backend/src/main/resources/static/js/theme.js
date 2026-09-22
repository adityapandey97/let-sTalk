/**
 * Let's Talk Theme Manager
 * Supports 4 Distinct Themes: Day (Light), Night (Dark), Royal Blue, and Midnight Violet
 */
window.Theme = (function () {
    const STORAGE_KEY = 'letstalk_theme';
    const THEMES = ['light', 'dark', 'royal', 'purple'];
    const THEME_NAMES = {
        'light': 'Day Mode (Light)',
        'dark': 'Night Mode (Dark)',
        'royal': 'Royal Blue',
        'purple': 'Midnight Violet'
    };

    function initTheme() {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('connectchat_theme');
        if (saved && THEMES.includes(saved)) {
            setTheme(saved);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }

    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    function toggleTheme() {
        const current = getTheme();
        const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
        setTheme(THEMES[nextIndex]);
        if (window.UI && window.UI.showToast) {
            window.UI.showToast(`Switched theme to ${THEME_NAMES[THEMES[nextIndex]]}`, 'info');
        }
    }

    function setTheme(theme) {
        if (!THEMES.includes(theme)) theme = 'light';

        // Clear all theme classes
        document.body.classList.remove('dark-theme', 'theme-royal', 'theme-purple');

        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (theme === 'royal') {
            document.body.classList.add('theme-royal');
        } else if (theme === 'purple') {
            document.body.classList.add('theme-purple');
        }

        localStorage.setItem(STORAGE_KEY, theme);
        updateThemeUI(theme);
    }

    function updateThemeUI(theme) {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            let iconSvg = '';
            if (theme === 'light') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`;
            } else if (theme === 'dark') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            } else if (theme === 'royal') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
            } else if (theme === 'purple') {
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m12 6 4 6h-8z"/></svg>`;
            }
            themeBtn.innerHTML = iconSvg;
            themeBtn.title = `Active: ${THEME_NAMES[theme]} (Click to switch Day/Night/Royal/Violet)`;
        }

        // Update active class on theme picker chips if present
        document.querySelectorAll('.theme-option-btn').forEach(btn => {
            if (btn.getAttribute('data-theme') === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    return {
        initTheme,
        toggleTheme,
        setTheme,
        getTheme,
        THEMES,
        THEME_NAMES
    };
})();
