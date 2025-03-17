//tf7 is dumdum and made this all in chatgpt and forced me to fix it :(
//tf7 used chatgpt because he was tired and it was 3am and his friend wanted to watch moana 2 bc hes probably gay

const API_KEY = "2713804610e1e236b1cf44bfac3a7776";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

let currentPage = 1;
let isLoading = false;
let searchQuery = "";

const moviesContainer = document.getElementById("movies");
const tvShowsContainer = document.getElementById("tv-shows");
const episodesContainer = document.getElementById("episodes-container");
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
const episodesContainerExplorer = document.getElementById("episodes-container");

tvShowsTab.addEventListener("click", () => switchTab("tv-shows"));
moviesTab.addEventListener("click", () => switchTab("movies"));
searchInput.addEventListener("input", handleSearch);
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

// Lazy loading event listener for scroll
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 && !isLoading) {
        currentPage++;
        fetchContent(currentPage, searchQuery, moviesTab.classList.contains("active") ? "movie" : "tv");
    }
});

// Fetch Movies or TV Shows
async function fetchContent(page = 1, query = "", type = "movie") {
    isLoading = true;
    let endpoint = "";

    if (type === "movie") {
        if (query) {
            endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${query}&page=${page}`;
        } else {
            endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
        }
    } else if (type === "tv") {
        if (query) {
            endpoint = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=en-US&query=${query}&page=${page}`;
        } else {
            endpoint = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
        }
    }

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (type === "movie" && data.results) {
            displayMovies(data.results, page === 1);
        } else if (type === "tv" && data.results) {
            displayTVShows(data.results, page === 1);
        }
    } catch (error) {
        console.error("Error fetching content:", error);
    } finally {
        isLoading = false;
    }
}


// Display Movies
function displayMovies(movies, reset = false) {
    if (reset) moviesContainer.innerHTML = "";

    movies.forEach((movie) => {
        if (!movie.poster_path) return;

        const movieCard = document.createElement("div");
        movieCard.classList.add("content-card");

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
        poster.alt = `${movie.title} Poster`;
        poster.style.width = "34%";  // Reduce to 34% of original size
        poster.style.height = "auto"; // Maintain aspect ratio

        const title = document.createElement("h3");
        title.textContent = movie.title;

        movieCard.appendChild(poster);
        movieCard.appendChild(title);

        movieCard.addEventListener("click", () => openIframe(movie.id, "movie"));
        moviesContainer.appendChild(movieCard);
    });
}

// Display TV Shows
function displayTVShows(tvShows, reset = false) {
    if (reset) tvShowsContainer.innerHTML = "";

    tvShows.forEach((show) => {
        if (!show.poster_path) return;

        const tvShowCard = document.createElement("div");
        tvShowCard.classList.add("content-card");

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${show.poster_path}`;
        poster.alt = `${show.name} Poster`;
        poster.style.width = "34%";  // Reduce to 34% of original size
        poster.style.height = "auto"; // Maintain aspect ratio

        const title = document.createElement("h3");
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
    episodesContainerExplorer.innerHTML = ""; // Reset episodes container
    seasonsContainer.innerHTML = ""; // Reset seasons container

    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvShowId}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();

        if (data.seasons) {
            displaySeasons(data.seasons, tvShowId);
        }
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
    episodesContainer.style.display = "flex" // Show the episodes container
    episodesContainer.innerHTML = ""; // Clear existing episodes before appending new ones

    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvShowId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();

        if (data && data.episodes) {
            displayEpisodes(data.episodes); // Pass episodes to display function
        } else {
            episodesContainer.innerHTML = "<p>No episodes found.</p>"; // Handle no episodes scenario
        }
    } catch (error) {
        console.error("Error fetching episodes:", error);
        episodesContainer.innerHTML = "<p>Error loading episodes.</p>"; // Handle error scenario
    }
}

// Display Episodes under Season
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
    if (type === "movie") {
        document.location.href = `play.html?id=${id}&type=${type}`;
    } else if (type === "tv") {
        document.location.href = `play.html?id=${id}&type=${type}&season=${season}&episode=${episode}`;
    }
    /*let url = "";
    if (type === "movie") {
        url = `https://vidsrc.icu/embed/movie/${id}`;
    } else if (type === "tv" && season !== null && episode !== null) {
        url = `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`;
    }

    movieIframe.src = url;
    overlay.style.display = "flex";*/
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
        
        // Fetch TV shows when switching to the TV tab
        fetchContent(currentPage, searchQuery, "tv");  
    } else {
        tvShowsTab.classList.remove("active");
        moviesTab.classList.add("active");
        tvShowsContainer.style.display = "none";
        moviesContainer.style.display = "flex";
        
        // Fetch Movies when switching to the Movies tab
        fetchContent(currentPage, searchQuery, "movie");
    }
}

// Handle Search
function handleSearch(event) {
    searchQuery = event.target.value;
    currentPage = 1; // Reset page on new search
    fetchContent(currentPage, searchQuery, "movie");
    fetchContent(currentPage, searchQuery, "tv");
}

// Initialize with Movies and TV shows
fetchContent(currentPage, searchQuery, "movie");
fetchContent(currentPage, searchQuery, "tv");
