// watchPlay.js
// Controls Play.html player iframe/object and fullscreen behavior
(function () {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const id = urlParams.get('id');
    const type = urlParams.get('type');
    const season = urlParams.get('season') || null;
    const episode = urlParams.get('episode') || null;
    const passedTitle = urlParams.get('title') ? decodeURIComponent(urlParams.get('title')) : null;

    // servers and embed base URLs
    const servers = {
        'vidsrc.su': 'https://vidsrc.su/embed/',
        'vidsrc.net': 'https://vidsrc.me/embed/'
    };

    let currentServer = localStorage.getItem("selectedServer") || 'vidsrc.su';

    const movieObject = document.getElementById('movie-object');
    const container = document.getElementById('iframe-container');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const bottomFullscreenBtn = document.getElementById('bottom-fullscreen-btn');
    const closeBtn = document.getElementById('close-btn');
    const serverSelect = document.getElementById('serverSelect');
    const errorMessage = document.getElementById('fullscreen-error');
    const titleEl = document.getElementById('movie-title');
    const spinner = document.getElementById('play-spinner');

    // Populate server dropdown
    Object.keys(servers).forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        serverSelect.appendChild(option);
    });
    serverSelect.value = currentServer;

    function showSpinner(show = true) {
        if (!spinner) return;
        spinner.className = show ? 'spinner visible' : 'spinner';
    }

    function setTitle(text) {
        if (!titleEl) return;
        titleEl.textContent = text || 'Unknown title';
    }

    // If title was passed from the select page, use it; otherwise show a fallback text.
    if (passedTitle) {
        setTitle(passedTitle);
    } else {
        setTitle('Unknown title');
        /*
        // Attempt to fetch title from TMDB if id exists and API key is present
        setTitle('Loading title...');
        const API_KEY = window.TMDB_API_KEY || localStorage.getItem('TMDB_API_KEY') || null;
        if (API_KEY && id) {
            const fetchUrl = type === 'tv'
                ? `https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=en-US`
                : `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=en-US`;
            fetch(fetchUrl).then(r => r.json()).then(data => {
                if (data && (data.title || data.name)) {
                    setTitle(data.title || data.name);
                } else {
                    setTitle('Unknown title');
                }
            }).catch(() => setTitle('Unknown title'));
        } else {
            setTitle('Unknown title');
        }
        */
    }

    function buildEmbedUrl(selectedServer) {
        const base = servers[selectedServer];
        if (!base) return '';
        if (type === 'tv') {
            return `${base}tv/${id}/${season}/${episode}`;
        } else {
            return `${base}movie/${id}`;
        }
    }

    function setWatchSource() {
        try {
            showSpinner(true);
            const url = buildEmbedUrl(currentServer);
            if (!url) throw new Error('No embed url');
            // set object data src
            movieObject.data = url;
            // some providers may prefer iframe; both approaches preserved
            movieObject.setAttribute('data-src', url);
            showSpinner(false);
        } catch (err) {
            console.error('setWatchSource failed', err);
            showSpinner(false);
            // fallback: call sw() if present
            if (typeof sw === 'function') {
                try { sw(); } catch (e) { console.error('sw fallback failed', e); }
            }
        }
    }

    async function tryFullscreenOn(el) {
        if (!el) {
            console.warn('Fullscreen element is null or undefined');
            return false;
        }
        try {
            // Standard fullscreen API
            if (el.requestFullscreen) {
                await el.requestFullscreen();
                return true;
            }
            // Vendor-prefixed APIs for broader compatibility
            else if (el.webkitRequestFullscreen) { // Safari
                await el.webkitRequestFullscreen();
                return true;
            } else if (el.mozRequestFullScreen) { // Firefox
                await el.mozRequestFullScreen();
                return true;
            } else if (el.msRequestFullscreen) { // IE/Edge
                await el.msRequestFullscreen();
                return true;
            } else {
                console.warn('No fullscreen method available for element:', el);
                return false;
            }
        } catch (err) {
            console.error('Fullscreen attempt failed for element:', el, err);
            return false;
        }
    }

    async function handleFullscreen() {
        try {
            let success = false;

            // Try fullscreen on movieObject (object or iframe)
            if (movieObject) {
                // Check if movieObject is an iframe and try its contentWindow
                if (movieObject.tagName.toLowerCase() === 'iframe' && movieObject.contentWindow) {
                    success = await tryFullscreenOn(movieObject.contentWindow.document.body);
                }
                if (!success) {
                    success = await tryFullscreenOn(movieObject);
                }
            }

            // Fallback to container
            if (!success && container) {
                success = await tryFullscreenOn(container);
            }

            // Final fallback to entire document
            if (!success) {
                success = await tryFullscreenOn(document.documentElement);
            }

            if (!success) {
                throw new Error('Fullscreen not supported or blocked');
            }

            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
            if (errorMessage) {
                errorMessage.textContent = 'Fullscreen failed. Try the player\'s built-in fullscreen button or change servers.';
                errorMessage.style.display = 'block';
            }
        }
    }

    // Reset styles when exiting fullscreen
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            // Restore sizes (object element)
            if (movieObject) {
                movieObject.style.height = '70vh';
            }
            // Hide error message when exiting fullscreen
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        }
    });

    // Add event listeners for both fullscreen buttons
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', handleFullscreen);
    } else {
        console.warn('fullscreenBtn not found in DOM');
    }

    if (bottomFullscreenBtn) {
        bottomFullscreenBtn.addEventListener('click', handleFullscreen);
    } else {
        console.warn('bottomFullscreenBtn not found in DOM');
    }

    serverSelect.addEventListener('change', function () {
        currentServer = this.value;
        localStorage.setItem('selectedServer', currentServer);
        setWatchSource();
    });

    // Initialize
    try {
        setWatchSource();
    } catch (err) {
        console.warn('setWatchSource threw', err);
        if (typeof sw === 'function') {
            try { sw(); } catch (e) { console.error('sw failed', e); }
        }
    }
})();