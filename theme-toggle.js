(function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var stored = localStorage.getItem('theme');

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
        localStorage.setItem('theme', next);
    });
})();
