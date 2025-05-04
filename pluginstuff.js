document.addEventListener('DOMContentLoaded', function() {
    function getCurrentScriptPath() {
        const script = document.currentScript || document.querySelector('script[src*="pluginstuff.js"]');
        if (script?.src) {
            return script.src;
        }
        return null;
    }

    function loadResources() {
        const scriptPath = getCurrentScriptPath();
        if (!scriptPath) return;
        const baseDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
        const isActivePage = window.location.pathname.startsWith('/active');
        const resources = [
            { element: 'link', props: { rel: 'stylesheet', type: 'text/css', href: `${baseDir}/style.css` } },
            ...(isActivePage ? [] : [{ element: 'script', props: { type: 'text/javascript', src: `${baseDir}/effects.js` } }])
        ];
        resources.forEach(({ element, props }) => {
            const el = document.createElement(element);
            Object.assign(el, props);
            document.head.appendChild(el);
        });
    }

    function inFrame() {
        try {
            return window.self !== window.top;
        } catch {
            return true;
        }
    }

    function applyAntiClose() {
        const targetWindow = inFrame() ? window.top : window;
        const handler = function(e) {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave?';
            return 'Are you sure you want to leave?';
        };
        const antiCloseEnabled = localStorage.getItem('antiClose') === 'true';

        try {
            targetWindow.removeEventListener('beforeunload', handler);
            if (antiCloseEnabled) {
                targetWindow.addEventListener('beforeunload', handler);
            }
        } catch {}
    }

    function initializeAntiClose() {
        applyAntiClose();
        window.addEventListener('storage', (e) => {
            if (e.key === 'antiClose') applyAntiClose();
        });
        window.addEventListener('pageshow', applyAntiClose);
        window.addEventListener('load', applyAntiClose);
    }

    function initializePanicKey() {
        let panicKey = localStorage.getItem('panicKey') || 'Escape';
        let panicAction = localStorage.getItem('panicAction') || 'https://edpuzzle.com/notifications';
        const panicKeyInput = document.getElementById('panic-key');
        const panicKeyLabel = document.querySelector('label[for="panic-key"] small');
        const settingsOverlay = document.querySelector('.settings-overlay--scoped');

        if (!panicKeyInput || !panicKeyLabel) return;

        function updatePanicKeyDisplay() {
            const displayKey = panicKey.replace('Key', '').replace('Digit', '');
            panicKeyInput.value = displayKey;
            panicKeyInput.title = `Current panic key: ${displayKey}`;
            panicKeyLabel.textContent = `Current: ${displayKey}`;
        }

        function triggerPanicAction() {
            try {
                window.location.replace(panicAction);
                setTimeout(() => {
                    if (window.location.href !== panicAction) {
                        window.location.href = panicAction;
                    }
                }, 100);
            } catch {
                window.location.href = panicAction;
            }
        }

        updatePanicKeyDisplay();
        panicKeyInput.readOnly = false;
        panicKeyInput.style.cursor = 'text';
        panicKeyInput.title = 'Type a single key or press a key to set';

        panicKeyInput.addEventListener('keydown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const newKey = e.key === ' ' ? 'Space' : e.key;
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(newKey)) {
                alert('Please use a non-modifier key.');
                return;
            }
            panicKey = newKey;
            localStorage.setItem('panicKey', panicKey);
            updatePanicKeyDisplay();
            this.classList.remove('active');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('panic-key-active');
            }
        });

        panicKeyInput.addEventListener('focus', function() {
            this.classList.add('active');
            if (settingsOverlay) {
                settingsOverlay.classList.add('panic-key-active');
            }
        });

        panicKeyInput.addEventListener('blur', function() {
            this.classList.remove('active');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('panic-key-active');
            }
            updatePanicKeyDisplay();
        });

        panicKeyInput.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            panicKey = 'Escape';
            localStorage.setItem('panicKey', panicKey);
            updatePanicKeyDisplay();
        });

        document.addEventListener('keydown', function(e) {
            const keyPressed = e.key === ' ' ? 'Space' : e.key;
            if (keyPressed === panicKey) {
                const activeElement = document.activeElement;
                const isTyping = activeElement.tagName === 'INPUT' || 
                               activeElement.tagName === 'TEXTAREA' || 
                               activeElement.isContentEditable ||
                               (activeElement.tagName === 'DIV' && activeElement.getAttribute('role') === 'searchbox');
                if (isTyping) return;
                e.preventDefault();
                e.stopPropagation();
                triggerPanicAction();
            }
        }, { capture: true, passive: false });

        window.addEventListener('storage', function(e) {
            if (e.key === 'panicKey') {
                panicKey = e.newValue || 'Escape';
                updatePanicKeyDisplay();
            }
            if (e.key === 'panicAction') {
                panicAction = e.newValue || 'https://edpuzzle.com/notifications';
            }
        });
    }

    const cloaks = [
        { name: "default", icon: "https://en.wikipedia.org/favicon.ico", title: "World War II - Wikipedia" },
        { name: "Google", icon: "https://www.google.com/chrome/static/images/chrome-logo-m100.svg", title: "New Tab" },
        { name: "Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png", title: "Home" },
        { name: "Canva", icon: "https://static.canva.com/static/images/android-192x192-2.png", title: "Home - Canva" },
        { name: "Quiz", icon: "https://ssl.gstatic.com/docs/spreadsheets/forms/forms_icon_2023q4.ico", title: "You've already responded" },
        { name: "powerschool", icon: "https://waverlyk12.powerschool.com/favicon.ico", title: "Grades and Attendance" },
        { name: "Edpuzzle", icon: "https://edpuzzle.imgix.net/favicons/favicon-32.png", title: "Edpuzzle" },
    ];

    function applyCloak(cloakName) {
        const cloak = cloaks.find(c => c.name === cloakName) || cloaks[0];
        document.title = cloak.title;

        let existingFavicon = document.querySelector("link[rel*='icon']");
        if (existingFavicon) existingFavicon.remove();

        if (cloak.icon) {
            const link = document.createElement('link');
            link.rel = 'icon';
            const ext = cloak.icon.split('.').pop().toLowerCase();
            link.type = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/x-icon';
            link.href = cloak.icon + (cloak.icon.includes('?') ? '&' : '?') + 'v=' + Date.now();
            document.head.appendChild(link);
            localStorage.setItem('cloak', JSON.stringify({ title: cloak.title, icon: cloak.icon }));
        }
    }

    const container = document.createElement('div');
    container.className = 'effects-container';
    document.body.appendChild(container);

    window.openURLInAboutBlank = function(url) {
        const win = window.open('about:blank', '_blank');
        if (win) {
            win.location.href = url;
        }
    };

    loadResources();
    initializeAntiClose();
    initializePanicKey();

    const savedCloak = localStorage.getItem('selectedCloak') || 'default';
    applyCloak(savedCloak);

    window.addEventListener('storage', (e) => {
        if (e.key === 'selectedCloak') applyCloak(e.newValue || 'default');
    });

    window.addEventListener('load', () => applyCloak(localStorage.getItem('selectedCloak') || 'default'));
    window.addEventListener('pageshow', () => applyCloak(localStorage.getItem('selectedCloak') || 'default'));

    const cloakSelect = document.querySelector('[data-cloak-select]');
    if (cloakSelect) {
        cloakSelect.addEventListener('change', () => {
            const selectedCloak = cloakSelect.value;
            localStorage.setItem('selectedCloak', selectedCloak);
            applyCloak(selectedCloak);
        });
        cloakSelect.value = savedCloak;
    }
});