const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const id = urlParams.get('id');
const type = urlParams.get('type');
var season = null;
var episode = null;

if (type == 'tv') {
    season = urlParams.get('season');
    episode = urlParams.get('episode');
}

function checkSource() {
    if (type == 'tv') {
        setWatchSource((localStorage.getItem('watchSource') || "1"), id, type, (localStorage.getItem('watchProxied') || false), season, episode);
    } else {
        setWatchSource(localStorage.getItem('watchSource'), id, type, (localStorage.getItem('watchProxied') || false));
    }
}


function setWatchSource(number, id, type, proxied, season = null, episode = null) {
    if (number == "1") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://vidsrc.su/embed/tv/${id}/${season}/${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://vidsrc.su/embed/movie/${id}`;
        }
    } else if (number == "2") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://vidify.top/embed/tv/${id}/${season}/${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://vidify.top/embed/movie/${id}`;
        }
    } else if (number == "3") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://vidsrc.icu/embed/tv/${id}/${season}/${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://vidsrc.icu/embed/movie/${id}`;
        }
    } else if (number == "4") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://vidsrc.me/embed/tv/${id}/${season}/${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://vidsrc.me/embed/movie/${id}`;
        }
    } else if (number == "5") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://vidsrc.xyz/embed/tv/${id}/${season}/${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://vidsrc.xyz/embed/movie/${id}`;
        }
    } else if (number == "6") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://www.2embed.cc/embed/${id}`;
        }
    } else if (number == "7") {
        if (type == 'tv') {
            document.getElementById('movieIframe').src = `https://www.2embed.skin/embedtv/${id}&s=${season}&e=${number}`;
        } else {
            document.getElementById('movieIframe').src = `https://www.2embed.skin/embed/${id}`;
        }
    }
    if (proxied === 'true') {
        document.getElementById('movieIframe').src = '/active/embed.html?url=' + document.getElementById('movieIframe').src;
    }
}


document.addEventListener("DOMContentLoaded", function () {
    checkSource();

    const dropdown = document.getElementById("watchSourceDropdown");
    const checkbox = document.getElementById("watchProxiedCheckbox");

    const savedSource = localStorage.getItem("watchSource");
    if (savedSource) {
        dropdown.value = savedSource;
    }

    const savedProxied = localStorage.getItem("watchProxied");
    if (savedProxied !== null) {
        checkbox.checked = savedProxied === "true";
    }

    dropdown.addEventListener("change", function () {
        localStorage.setItem("watchSource", dropdown.value);
        checkSource();
    });

    checkbox.addEventListener("change", function () {
        localStorage.setItem("watchProxied", checkbox.checked);
        checkSource();
    });
});
