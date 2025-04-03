const API_KEY = "2713804610e1e236b1cf44bfac3a7776";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

let moviePage = 1;
let tvPage = 1;
let isLoading = false;
let searchQuery = "";
const maxPages = 5;

const moviesContainer = document.getElementById("movies");
const tvShowsContainer = document.getElementById("tv-shows");
const searchInput = document.getElementById("search-input");
const overlay = document.getElementById("overlay");
const movieIframe = document.getElementById("movie-iframe");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const closeBtn = document.getElementById("close-btn");
const tvShowsTab = document.getElementById("tv-shows-tab");
const moviesTab = document.getElementById("movies-tab");
const seasonEpisodeExplorer = document.getElementById("season-episode-explorer");
const closeSeasonEpisodeBtn = document.getElementById("close-season-episode");
const seasonsContainer = document.getElementById("seasons-container");
const episodesContainer = document.getElementById("episodes-container");

tvShowsTab.addEventListener("click", () => switchTab("tv-shows"));
moviesTab.addEventListener("click", () => switchTab("movies"));
searchInput.addEventListener("input", debounce(handleSearch, 300)); // Debounce added
fullscreenBtn.addEventListener("click", toggleFullscreen);
closeBtn.addEventListener("click", closeIframe);
closeSeasonEpisodeBtn.addEventListener("click", () => seasonEpisodeExplorer.style.display = "none");

const updateHeight = () => {
    const fullPageHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
    );
    seasonEpisodeExplorer.style.height = `${fullPageHeight}px`;
};

setInterval(updateHeight, 500);

// Debounce function to limit how often handleSearch runs
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Fetch Movies or TV Shows
async function fetchContent(page = 1, query = "", type = "movie") {
    if (isLoading || page > maxPages) return;
    isLoading = true;
    let endpoint = "";

    if (type === "movie") {
        endpoint = query
            ? `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${query}&page=${page}`
            : `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
    } else if (type === "tv") {
        endpoint = query
            ? `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=en-US&query=${query}&page=${page}`
            : `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
    }

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (type === "movie" && data.results) {
            displayMovies(data.results, page === 1);
            if (data.total_pages > page) fetchContent(page + 1, query, "movie");
        } else if (type === "tv" && data.results) {
            displayTVShows(data.results, page === 1);
            if (data.total_pages > page) fetchContent(page + 1, query, "tv");
        }
    } catch (error) {
        console.error("Error fetching content:", error);
    } finally {
        isLoading = false;
    }
}

// Display Movies
function displayMovies(movies, clear = false) {
    if (clear) moviesContainer.innerHTML = "";
    movies.forEach((movie) => {
        if (!movie.poster_path) return;

        const movieCard = document.createElement("div");
        movieCard.classList.add("media-item");

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
        poster.alt = `${movie.title} Poster`;

        const title = document.createElement("p");
        title.textContent = movie.title;

        movieCard.appendChild(poster);
        movieCard.appendChild(title);
        movieCard.addEventListener("click", () => openIframe(movie.id, "movie"));
        moviesContainer.appendChild(movieCard);
    });
}

// Display TV Shows
function displayTVShows(tvShows, clear = false) {
    if (clear) tvShowsContainer.innerHTML = "";
    tvShows.forEach((show) => {
        if (!show.poster_path) return;

        const tvShowCard = document.createElement("div");
        tvShowCard.classList.add("media-item");

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${show.poster_path}`;
        poster.alt = `${show.name} Poster`;

        const title = document.createElement("p");
        title.textContent = show.name;

        tvShowCard.appendChild(poster);
        tvShowCard.appendChild(title);
        tvShowCard.addEventListener("click", () => openSeasonExplorer(show.id));
        tvShowsContainer.appendChild(tvShowCard);
    });
}

// Open Season Explorer
async function openSeasonExplorer(tvShowId) {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    seasonEpisodeExplorer.style.display = "flex";
    episodesContainer.innerHTML = "";
    seasonsContainer.innerHTML = "";

    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvShowId}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        if (data.seasons) displaySeasons(data.seasons, tvShowId);
    } catch (error) {
        console.error("Error fetching seasons:", error);
    }
}

// Display Seasons
function displaySeasons(seasons, tvShowId) {
    seasons.forEach((season) => {
        const seasonCard = document.createElement("div");
        seasonCard.classList.add("season-card");
        seasonCard.innerHTML = `Season ${season.season_number}`;
        seasonCard.addEventListener("click", () => fetchEpisodes(tvShowId, season.season_number));
        seasonsContainer.appendChild(seasonCard);
    });
}

// Fetch Episodes for a Season
async function fetchEpisodes(tvShowId, seasonNumber) {
    episodesContainer.style.display = "flex";
    episodesContainer.innerHTML = "";

    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvShowId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        if (data?.episodes) {
            displayEpisodes(data.episodes);
        } else {
            episodesContainer.innerHTML = "<p>No episodes found.</p>";
        }
    } catch (error) {
        console.error("Error fetching episodes:", error);
        episodesContainer.innerHTML = "<p>Error loading episodes.</p>";
    }
}

// Display Episodes
function displayEpisodes(episodes) {
    episodes.forEach((episode) => {
        const episodeCard = document.createElement("div");
        episodeCard.classList.add("episode-card");

        const title = document.createElement("h3");
        title.textContent = `S${episode.season_number}E${episode.episode_number} - ${episode.name}`;

        episodeCard.appendChild(title);
        episodeCard.addEventListener("click", () => openIframe(episode.id, "tv", episode.season_number, episode.episode_number));
        episodesContainer.appendChild(episodeCard);
    });
}

// Open Iframe
function openIframe(id, type, season = null, episode = null) {
    document.location.href = `play.html?id=${id}&type=${type}${season !== null ? `&season=${season}` : ''}${episode !== null ? `&episode=${episode}` : ''}`;
}

// Close Iframe
function closeIframe() {
    movieIframe.src = "";
    overlay.style.display = "none";
}

// Toggle Fullscreen
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        overlay.requestFullscreen();
    }
}

// Handle Tab Switching
function switchTab(type) {
    if (type === "tv-shows") {
        moviesTab.classList.remove("active");
        tvShowsTab.classList.add("active");
        moviesContainer.style.display = "none";
        tvShowsContainer.style.display = "flex";
        if (tvShowsContainer.innerHTML === "") { // Only fetch if empty
            tvPage = 1;
            fetchContent(tvPage, searchQuery, "tv");
        }
    } else {
        tvShowsTab.classList.remove("active");
        moviesTab.classList.add("active");
        tvShowsContainer.style.display = "none";
        moviesContainer.style.display = "flex";
        if (moviesContainer.innerHTML === "") { // Only fetch if empty
            moviePage = 1;
            fetchContent(moviePage, searchQuery, "movie");
        }
    }
}

// Handle Search
function handleSearch(event) {
    searchQuery = event.target.value.trim();
    const activeTab = tvShowsTab.classList.contains("active") ? "tv" : "movie";

    if (activeTab === "tv") {
        tvPage = 1;
        tvShowsContainer.innerHTML = ""; // Clear only the active container
        fetchContent(tvPage, searchQuery, "tv");
    } else {
        moviePage = 1;
        moviesContainer.innerHTML = ""; // Clear only the active container
        fetchContent(moviePage, searchQuery, "movie");
    }
}

// Initial load
fetchContent(moviePage, "", "movie");