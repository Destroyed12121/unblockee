const API_KEY = "2713804610e1e236b1cf44bfac3a7776";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RATE_LIMIT = 100; // Max 40 requests
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds in milliseconds

const mediaLimit = 200;
const customMovies = [
    { title: "The Dark Knight", id: 155 },
    { title: "The Avengers", id: 24428 },
    { title: "Interstellar", id: 157336 },
    { title: "Spider-man Homecoming", id: 315635 },
    { title: "Spiderman into the Spider-verse", id: 324857 },
    { title: "Aquaman and the Lost Kingdom", id: 572802 },
    { title: "Dune: Part Two", id: 693134 },
    { title: "Gladiator II", id: 776735 },
    { title: "Avatar: The Way of Water", id: 76600 },
    { title: "Percy Jackson and the Olympians: The Lightning Thief", id: 32657 },
    { title: "Creed II", id: 480530 }
];
const restrictedRatings = ["NC-17", "NR"];
let displayedMovies = 0;
let displayedTVShows = 0; // New counter for TV shows

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

// Rate limiter
const requestQueue = [];
let requestCount = 0;
let windowStart = Date.now();

async function rateLimitedFetch(endpoint) {
    if (requestCount >= RATE_LIMIT) {
        const elapsed = Date.now() - windowStart;
        if (elapsed < RATE_LIMIT_WINDOW) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW - elapsed));
            requestCount = 0;
            windowStart = Date.now();
        }
    }
    requestCount++;
    try {
        const response = await fetch(endpoint);
        if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Backoff for 1s
            return rateLimitedFetch(endpoint); // Retry
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error(`Fetch error for ${endpoint}:`, error);
        throw error;
    }
}

// Cache utility
function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) return data;
    }
    return null;
}

function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// Function to fetch movie details and certification in one go
async function fetchMovieDetailsAndCert(movieId) {
    const cacheKey = `movie_${movieId}_details_cert`;
    let cachedData = getCachedData(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    try {
        const data = await rateLimitedFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=en-US&append_to_response=release_dates`);
        const usRelease = data.release_dates?.results?.find(r => r.iso_3166_1 === "US");
        const certification = usRelease?.release_dates?.[0]?.certification || "NR";

        if (restrictedRatings.includes(certification)) {
            return null; // Return null if it's a restricted movie
        }
        
        const result = { ...data, certification };
        setCachedData(cacheKey, result);
        return result;

    } catch (error) {
        console.error(`Error fetching movie details and certification for ID ${movieId}:`, error);
        return null;
    }
}

// Debug: Confirm script loaded
console.log("watchSelect.js loaded, customMovies:", customMovies);

// Force grid layout for both movie and TV show containers
const mediaContainers = [moviesContainer, tvShowsContainer];
mediaContainers.forEach(container => {
    if (container) {
        container.classList.add("media-grid");
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fill, minmax(150px, 1fr))";
        container.style.gap = "10px";
        container.style.width = "100%";
    }
});
console.log("Media container grid styling applied to both movie and TV show containers.");


// Event Listeners
if (tvShowsTab) tvShowsTab.addEventListener("click", () => switchTab("tv-shows"));
if (moviesTab) moviesTab.addEventListener("click", () => switchTab("movies"));
if (searchInput) searchInput.addEventListener("input", debounce(handleSearch, 500));
if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);
if (closeBtn) closeBtn.addEventListener("click", closeIframe);
if (closeSeasonEpisodeBtn) closeSeasonEpisodeBtn.addEventListener("click", () => seasonEpisodeExplorer.style.display = "none");
// Removed window.addEventListener("scroll", handleScroll);

if (seasonEpisodeExplorer) {
    seasonEpisodeExplorer.addEventListener("click", (event) => {
        if (event.target === seasonEpisodeExplorer) {
            seasonEpisodeExplorer.style.display = "none";
        }
    });
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Fetch and Display Movies
async function loadMovies(query = "") {
    console.log("loadMovies started, query:", query);
    moviesContainer.innerHTML = "";
    moviesContainer.style.display = "grid";
    displayedMovies = 0;

    if (query.length > 0) {
        console.log("loadMovies: Search query present, fetching search results.");
        await fetchContent(query, "movie");
        return;
    }

    console.log("loadMovies: No search query, loading custom and popular movies.");

    // Fetch custom movies
    const customCacheKey = "customMovies";
    let customMoviesData = getCachedData(customCacheKey);
    if (!customMoviesData) {
        const customPromises = customMovies.map(movie => fetchMovieDetailsAndCert(movie.id));
        customMoviesData = (await Promise.all(customPromises)).filter(Boolean); // Filter out nulls
        setCachedData(customCacheKey, customMoviesData);
    }
    customMoviesData.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    console.log("Custom movies fetched, filtered, and sorted:", customMoviesData.map(m => ({ title: m.title, vote_average: m.vote_average, certification: m.certification })));
    displayMovies(customMoviesData.filter(movie => movie.poster_path));
    
    // Fetch popular movies
    let popularMoviesData = [];
    for (let page = 1; displayedMovies < mediaLimit; page++) {
        console.log(`Fetching popular movies page ${page}...`);
        const popularEndpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
        const data = await rateLimitedFetch(popularEndpoint);
        const movieIds = data.results.map(movie => movie.id);
        
        const popularPromises = movieIds.map(id => fetchMovieDetailsAndCert(id));
        let filteredPopularMovies = (await Promise.all(popularPromises)).filter(Boolean);
        
        // Sort the current batch of movies by vote_average before displaying
        filteredPopularMovies.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        
        // Add only enough movies to reach the limit
        const remainingSlots = mediaLimit - displayedMovies;
        const moviesToAdd = filteredPopularMovies.slice(0, remainingSlots);
        popularMoviesData = [...popularMoviesData, ...moviesToAdd];
        
        if (moviesToAdd.length === 0) {
            console.log("No more popular movies found to add.");
            break;
        }

        displayMovies(moviesToAdd.filter(movie => movie.poster_path));

        if (displayedMovies >= mediaLimit) {
            break;
        }
    }
    
    console.log(`Finished loading popular movies. Total displayed: ${displayedMovies}`);
}

// Fetch and Display TV Shows
async function loadTVShows(query = "") {
    console.log("loadTVShows started, query:", query);
    tvShowsContainer.innerHTML = "";
    tvShowsContainer.style.display = "grid";
    displayedTVShows = 0; // Reset counter

    if (query.length > 0) {
        console.log("loadTVShows: Search query present, fetching search results.");
        await fetchContent(query, "tv");
        return;
    }

    console.log("loadTVShows: No search query, loading popular TV shows.");
    let popularTVData = [];
    for (let page = 1; displayedTVShows < mediaLimit; page++) {
        console.log(`Fetching popular TV shows page ${page}...`);
        const popularEndpoint = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
        const data = await rateLimitedFetch(popularEndpoint);
        const tvShowsToAdd = data.results.slice(0, mediaLimit - displayedTVShows);

        if (tvShowsToAdd.length === 0) {
            console.log("No more popular TV shows found to add.");
            break;
        }

        popularTVData = [...popularTVData, ...tvShowsToAdd];
        
        if (displayedTVShows >= mediaLimit) {
            break;
        }

        tvShowsToAdd.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        displayTVShows(tvShowsToAdd.filter(show => show.poster_path));
    }
    console.log(`Finished loading popular TV shows. Total displayed: ${displayedTVShows}`);
}


async function fetchContent(query, type) {
    console.log(`fetchContent called with query: '${query}', type: '${type}'`);
    let endpoint = "";

    if (type === "movie") {
        endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
        console.log(`fetchContent: Movie search endpoint:`, endpoint);
        
        const data = await rateLimitedFetch(endpoint);
        if (data.results && data.results.length > 0) {
            const moviePromises = data.results.map(movie => fetchMovieDetailsAndCert(movie.id));
            const filteredMovies = (await Promise.all(moviePromises)).filter(Boolean);
            
            filteredMovies.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            console.log(`Fetched ${filteredMovies.length} search results, filtered, and sorted.`);
            displayMovies(filteredMovies.filter(movie => movie.poster_path));
        } else {
            console.warn(`No movie results found for query: '${query}'`);
            moviesContainer.innerHTML = "<p>No movies found matching your search.</p>";
        }

    } else { // type === "tv"
        endpoint = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
        console.log(`fetchContent: TV search endpoint:`, endpoint);

        const data = await rateLimitedFetch(endpoint);
        if (data.results && data.results.length > 0) {
            const results = data.results.filter(show => show.poster_path);
            results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            console.log(`Fetched ${results.length} TV search results, filtered, and sorted.`);
            displayTVShows(results);
        } else {
            console.warn(`No TV show results found for query: '${query}'`);
            tvShowsContainer.innerHTML = "<p>No TV shows found matching your search.</p>";
        }
    }
}

function displayMovies(movies) {
    movies.forEach((movie) => {
        if (displayedMovies >= mediaLimit) {
            return;
        }

        const movieCard = document.createElement("div");
        movieCard.classList.add("media-item");
        movieCard.style.cssText = "display: flex; flex-direction: column; align-items: center;";

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
        poster.alt = `${movie.title} Poster`;
        poster.style.cssText = "max-width: 100%; height: auto;";
        poster.loading = "normal";

        const title = document.createElement("p");
        title.textContent = movie.title;
        title.style.cssText = "margin: 5px 0 0; font-size: 14px; text-align: center;";

        const rating = document.createElement("p");
        const ratingValue = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
        rating.textContent = `Rating: ${ratingValue}/10`;
        rating.style.cssText = "margin: 2px 0 0; font-size: 12px; text-align: center; color: #666;";

        movieCard.appendChild(poster);
        movieCard.appendChild(title);
        movieCard.appendChild(rating);
        movieCard.addEventListener("click", () => openIframe(movie.id, "movie", null, null, movie.title));
        moviesContainer.appendChild(movieCard);
        displayedMovies++;
        console.log(`Displayed: ${movie.title}, rating: ${ratingValue}, certification: ${movie.certification || "N/A"}, total: ${displayedMovies}`);
    });
}

function displayTVShows(tvShows) {
    tvShows.forEach((show) => {
        if (displayedTVShows >= mediaLimit) {
            return;
        }

        const tvShowCard = document.createElement("div");
        tvShowCard.classList.add("media-item");
        tvShowCard.style.cssText = "display: flex; flex-direction: column; align-items: center;";

        const poster = document.createElement("img");
        poster.src = `${IMAGE_BASE_URL}${show.poster_path}`;
        poster.alt = `${show.name} Poster`;
        poster.style.cssText = "max-width: 100%; height: auto;";
        poster.loading = "lazy";

        const title = document.createElement("p");
        title.textContent = show.name;
        title.style.cssText = "margin: 5px 0 0; font-size: 14px; text-align: center;";

        const rating = document.createElement("p");
        const ratingValue = show.vote_average ? show.vote_average.toFixed(1) : "N/A";
        rating.textContent = `Rating: ${ratingValue}/10`;
        rating.style.cssText = "margin: 2px 0 0; font-size: 12px; text-align: center; color: #666;";

        tvShowCard.appendChild(poster);
        tvShowCard.appendChild(title);
        tvShowCard.appendChild(rating);
        tvShowCard.addEventListener("click", () => openSeasonExplorer(show.id));
        tvShowsContainer.appendChild(tvShowCard);
        displayedTVShows++;
        console.log(`Displayed TV show: ${show.name}, rating: ${ratingValue}, total: ${displayedTVShows}`);
    });
}

async function openSeasonExplorer(tvShowId) {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    seasonEpisodeExplorer.style.display = "flex";
    episodesContainer.innerHTML = "";
    seasonsContainer.innerHTML = "";

    const cacheKey = `seasons_${tvShowId}`;
    let seasonsData = getCachedData(cacheKey);

    if (!seasonsData) {
        try {
            const data = await rateLimitedFetch(`https://api.themoviedb.org/3/tv/${tvShowId}?api_key=${API_KEY}&language=en-US`);
            seasonsData = data.seasons || [];
            setCachedData(cacheKey, seasonsData);
        } catch (error) {
            console.error("Error fetching seasons:", error);
            seasonsContainer.innerHTML = "<p>Error loading seasons.</p>";
            return;
        }
    }
    displaySeasons(seasonsData, tvShowId);
}

function displaySeasons(seasons, tvShowId) {
    seasons.forEach((season) => {
        const seasonCard = document.createElement("div");
        seasonCard.classList.add("season-card");
        seasonCard.innerHTML = `Season ${season.season_number}`;
        seasonCard.addEventListener("click", () => fetchEpisodes(tvShowId, season.season_number));
        seasonsContainer.appendChild(seasonCard);
    });
}

async function fetchEpisodes(tvShowId, seasonNumber) {
    episodesContainer.style.display = "flex";
    episodesContainer.innerHTML = "";

    const cacheKey = `episodes_${tvShowId}_${seasonNumber}`;
    let episodesData = getCachedData(cacheKey);

    if (!episodesData) {
        try {
            const data = await rateLimitedFetch(`https://api.themoviedb.org/3/tv/${tvShowId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
            episodesData = data.episodes || [];
            setCachedData(cacheKey, episodesData);
        } catch (error) {
            console.error("Error fetching episodes:", error);
            episodesContainer.innerHTML = "<p>Error loading episodes.</p>";
            return;
        }
    }
    // Sort episodes by vote_average (descending)
    episodesData.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    console.log(`Episodes sorted for season ${seasonNumber}:`, episodesData.map(e => ({ name: e.name, vote_average: e.vote_average })));
    displayEpisodes(episodesData, tvShowId, seasonNumber);
}

function displayEpisodes(episodes, tvShowId, seasonNumber) {
    episodes.forEach((episode) => {
        const episodeCard = document.createElement("div");
        episodeCard.classList.add("episode-card");

        const title = document.createElement("h3");
        const rating = episode.vote_average ? episode.vote_average.toFixed(1) : "N/A";
        title.textContent = `S${episode.season_number}E${episode.episode_number} - ${episode.name} (${rating}/10)`;

        episodeCard.appendChild(title);
        episodeCard.addEventListener("click", () => openIframe(tvShowId, "tv", seasonNumber, episode.episode_number, episode.name));
        episodesContainer.appendChild(episodeCard);
        console.log(`Displayed episode: ${episode.name}, rating: ${rating}`);
    });
}

function openIframe(id, type, season = null, episode = null, title = null) {
    let url = `play.html?id=${id}&type=${type}`;
    if (season !== null) url += `&season=${season}`;
    if (episode !== null) url += `&episode=${episode}`;
    if (title !== null) url += `&title=${encodeURIComponent(title)}`;
    document.location.href = url;
}

function closeIframe() {
    movieIframe.src = "";
    overlay.style.display = "none";
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        overlay.requestFullscreen();
    }
}

function switchTab(type) {
    searchInput.value = "";
    if (type === "tv-shows") {
        moviesTab.classList.remove("active");
        tvShowsTab.classList.add("active");
        moviesContainer.style.display = "none";
        tvShowsContainer.style.display = "grid";
        tvShowsContainer.innerHTML = "";
        loadTVShows();
    } else {
        tvShowsTab.classList.remove("active");
        moviesTab.classList.add("active");
        tvShowsContainer.style.display = "none";
        moviesContainer.style.display = "grid";
        moviesContainer.innerHTML = "";
        loadMovies();
    }
}

function handleSearch(event) {
    const query = event.target.value.trim();
    console.log("handleSearch: Input value (trimmed):", `"${query}"`);

    const activeTab = tvShowsTab.classList.contains("active") ? "tv" : "movie";
    console.log("handleSearch: Active tab:", activeTab);

    if (activeTab === "tv") {
        tvShowsContainer.innerHTML = "";
        loadTVShows(query);
    } else {
        moviesContainer.innerHTML = "";
        loadMovies(query);
    }
}

// Initial load
loadMovies();
