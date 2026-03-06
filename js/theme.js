// Theme toggle – shared across index, help, privacy
function getEffectiveTheme() {
    const manual = document.documentElement.dataset.theme;
    if (manual) return manual;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = theme;
}

function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function() {
        const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
        setTheme(next);
    });
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
