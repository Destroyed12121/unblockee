const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const id = urlParams.get('id');
const type = urlParams.get('type');
let season = null;
let episode = null;

if (type === 'tv') {
    season = urlParams.get('season');
    episode = urlParams.get('episode');
}

function setWatchSource(proxied) {
    let baseUrl = "";
    
    // Only use default source (vidsrc.su)
    if (type === 'tv') {
        baseUrl = `https://vidsrc.su/embed/tv/${id}/${season}/${episode}`;
    } else {
        baseUrl = `https://vidsrc.su/embed/movie/${id}`;
    }

    // Apply proxy if checked, using ../active
    const finalUrl = proxied 
        ? `../active?url=${encodeURIComponent(baseUrl)}`
        : baseUrl;

    document.getElementById('movie-iframe').src = finalUrl;
}

document.addEventListener("DOMContentLoaded", function () {
    const checkbox = document.getElementById("watchProxiedCheckbox");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const closeBtn = document.getElementById("close-btn");

    // Load saved proxy setting
    const savedProxied = localStorage.getItem("watchProxied");
    if (savedProxied !== null) {
        checkbox.checked = savedProxied === "true";
    }

    // Set initial source
    setWatchSource(checkbox.checked);

    // Update proxy when checkbox changes
    checkbox.addEventListener("change", function () {
        localStorage.setItem("watchProxied", checkbox.checked);
        setWatchSource(checkbox.checked);
    });

    // Fullscreen button
    fullscreenBtn.addEventListener("click", function () {
        const iframe = document.getElementById("movie-iframe");
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        }
    });

    // Close button
    closeBtn.addEventListener("click", function () {
        window.location.href = "../../index.html"; // Return to home
    });
});