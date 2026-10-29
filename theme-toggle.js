(function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var stored;
    try {
        stored = localStorage.getItem('theme');
    } catch (error) {
        // Theme switching remains available when browser storage is blocked.
    }

    function apply(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    apply(stored || 'dark');
    btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === 'light' ? 'dark' : 'light';
        apply(next);
        try {
            localStorage.setItem('theme', next);
        } catch (error) {
            // Keep the selected theme for this page even without persistence.
        }
    });
})();
