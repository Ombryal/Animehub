/**
  auth.js - Optimized Sync & Global Engine
 */

const CONFIG = {
    CLIENT_ID: '22649',
    REDIRECT_URI: window.location.origin + window.location.pathname, 
    API_URL: 'https://graphql.anilist.co'
};

const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
} else if (!localStorage.getItem('anilist_token')) {
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
}

async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    if (!activeToken) return null;
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        return json.data;
    } catch (err) { return null; }
}

// --- INSTANT SYNC LOGIC ---
async function initGlobalUI() {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch) openSearch.onclick = () => searchSheet.classList.add('active');
    if (closeSearch) closeSearch.onclick = () => searchSheet.classList.remove('active');

    if (document.getElementById('username-display')) {
        // Step 1: Quick Profile Fetch
        const userQuery = `query { Viewer { id name avatar { large } statistics { anime { episodesWatched } manga { chaptersRead } } } }`;
        const userData = await apiFetch(userQuery);
        
        if (userData && userData.Viewer) {
            const v = userData.Viewer;
            document.getElementById('username-display').innerText = v.name;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
            document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched;
            document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead;

            // HIDE LOADER NOW - Profile is synced!
            hideLoader();

            // Step 2: Background List Fetch (Parallel)
            const listQuery = `query ($userId: Int) {
                watching: MediaListCollection(userId: $userId, status: CURRENT, type: ANIME) {
                    lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
                }
                reading: MediaListCollection(userId: $userId, status: CURRENT, type: MANGA) {
                    lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
                }
            }`;

            apiFetch(listQuery, { userId: v.id }).then(listData => {
                if (listData) {
                    const watchArr = listData.watching.lists.flatMap(l => l.entries);
                    const readArr = listData.reading.lists.flatMap(l => l.entries);
                    renderScrollerItems('anime-scroll', watchArr, 'ANIME');
                    renderScrollerItems('manga-scroll', readArr, 'MANGA');
                }
            });
        }
    }
}

// --- REUSABLE COMPONENTS ---
function renderScrollerItems(containerId, entries, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!entries || entries.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">No items found.</p>`;
        return;
    }
    container.innerHTML = entries.map(e => {
        const m = e.media || e;
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";
        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${m.id}&type=${type}'">
                <div class="img-box">
                    <img src="${m.coverImage.large}" loading="lazy">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${m.title.romaji}</div>
            </div>`;
    }).join('');
}

function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// --- SEARCH TYPE SWITCHER ---
let searchType = 'ANIME';

async function handleSearch(input, resultId) {
    const queryStr = input.value.trim();
    const container = document.getElementById(resultId);
    if (queryStr.length < 3) { container.innerHTML = ''; return; }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent); font-size:0.8rem;"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    let query = '';
    let variables = { search: queryStr };

    if (searchType === 'CHARACTER') {
        query = `query ($search: String) { Page(perPage: 15) { characters(search: $search) { id name { full } image { large } } } }`;
    } else if (searchType === 'USER') {
        query = `query ($search: String) { Page(perPage: 15) { users(search: $search) { id name avatar { large } } } }`;
    } else {
        query = `query ($search: String, $type: MediaType) { Page(perPage: 15) { media(search: $search, type: $type) { id title { romaji } coverImage { large } meanScore format } } }`;
        variables.type = searchType;
    }

    const data = await apiFetch(query, variables);
    if (!data) return;
    const items = data.Page.media || data.Page.characters || data.Page.users || [];
    
    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || item.name?.full || item.name;
        const img = item.coverImage?.large || item.image?.large || item.avatar?.large;
        const sub = item.format || searchType;
        return `
            <div class="search-item-row" onclick="window.location.href='details.html?id=${item.id}&type=${searchType}'" style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                <img src="${img}" style="width:40px; height:55px; border-radius:6px; object-fit:cover;">
                <div><h4 style="font-size:0.85rem; margin:0; color:white;">${title}</h4><p style="font-size:0.7rem; margin:4px 0 0; color:var(--accent); font-weight:600;">${sub}</p></div>
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalUI();
    const gInput = document.getElementById('global-search-input');
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            let t = chip.innerText.toUpperCase();
            searchType = t === 'USERS' ? 'USER' : t === 'CHARACTERS' ? 'CHARACTER' : t;
            if(gInput.value.length >= 3) handleSearch(gInput, 'search-results');
        });
    });
    if (gInput) gInput.addEventListener('input', () => handleSearch(gInput, 'search-results'));
});
