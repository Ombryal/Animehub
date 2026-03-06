/**
  auth.js - The Production Engine (Final Multi-Search & Parallel Sync)
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
            headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        return json.data;
    } catch (err) { return null; }
}

// --- PARALLEL SYNC ENGINE ---
async function initGlobalUI() {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch) openSearch.onclick = () => searchSheet.classList.add('active');
    if (closeSearch) closeSearch.onclick = () => searchSheet.classList.remove('active');

    if (document.getElementById('username-display')) {
        const userQuery = `query { Viewer { id name avatar { large } statistics { anime { episodesWatched } manga { chaptersRead } } } }`;
        const userData = await apiFetch(userQuery);
        
        if (userData && userData.Viewer) {
            const v = userData.Viewer;
            document.getElementById('username-display').innerText = v.name;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
            document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched;
            document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead;

            hideLoader();

            // --- NEW: Unified Background Fetch (Lists + Recommendations) ---
            const homeDataQuery = `query ($userId: Int) {
                watching: MediaListCollection(userId: $userId, status: CURRENT, type: ANIME) {
                    lists { entries { progress media { id title { romaji } coverImage { large } meanScore episodes } } }
                }
                reading: MediaListCollection(userId: $userId, status: CURRENT, type: MANGA) {
                    lists { entries { progress media { id title { romaji } coverImage { large } meanScore chapters } } }
                }
                recAnime: Page(perPage: 10) {
                    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                        id title { romaji } coverImage { large } meanScore
                    }
                }
                recManga: Page(perPage: 10) {
                    media(sort: TRENDING_DESC, type: MANGA, isAdult: false) {
                        id title { romaji } coverImage { large } meanScore
                    }
                }
            }`;

            apiFetch(homeDataQuery, { userId: v.id }).then(data => {
                if (data) {
                    // Extract Lists
                    const wArr = data.watching.lists.flatMap(l => l.entries);
                    const rArr = data.reading.lists.flatMap(l => l.entries);
                    
                    // Render user lists (true = show progress badge)
                    renderScrollerItems('anime-scroll', wArr, 'ANIME', true);
                    renderScrollerItems('manga-scroll', rArr, 'MANGA', true);
                    
                    // Render recommendations (false = no progress badge)
                    renderScrollerItems('rec-anime-scroll', data.recAnime.media, 'ANIME', false);
                    renderScrollerItems('rec-manga-scroll', data.recManga.media, 'MANGA', false);
                }
            });
        }
    }
}

// --- UNIVERSAL SEARCH ENGINE ---
let activeSearchType = 'ANIME';

async function handleSearch(input, containerId, forcedType = null) {
    const queryStr = input.value.trim();
    const container = document.getElementById(containerId);
    if (queryStr.length < 3) { container.innerHTML = ''; return; }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent);"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    const mode = forcedType || activeSearchType;
    let query = '';
    let variables = { search: queryStr };

    if (mode === 'CHARACTER') {
        query = `query ($search: String) { Page(perPage: 15) { characters(search: $search) { id name { full } image { large } } } }`;
    } else if (mode === 'USER') {
        query = `query ($search: String) { Page(perPage: 15) { users(search: $search) { id name avatar { large } } } }`;
    } else {
        query = `query ($search: String, $type: MediaType) { Page(perPage: 15) { media(search: $search, type: $type) { id title { romaji } coverImage { large } meanScore format } } }`;
        variables.type = mode;
    }

    const data = await apiFetch(query, variables);
    if (!data || !data.Page) return;
    const items = data.Page.media || data.Page.characters || data.Page.users || [];
    
    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || item.name?.full || item.name;
        const img = item.coverImage?.large || item.image?.large || item.avatar?.large;
        const sub = item.format || mode;
        return `
            <div class="search-item-row" onclick="window.location.href='details.html?id=${item.id}&type=${mode}'" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                <img src="${img}" style="width:45px; height:60px; border-radius:8px; object-fit:cover; flex-shrink:0;">
                <div style="flex:1; overflow:hidden;">
                    <h4 style="font-size:0.85rem; margin:0; color:white; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${title}</h4>
                    <p style="font-size:0.7rem; margin:4px 0 0; color:var(--accent); font-weight:600;">${sub}</p>
                </div>
            </div>`;
    }).join('');
}

// --- UPDATED RENDER ENGINE ---
function renderScrollerItems(id, entries, type, isUserList = false) {
    const container = document.getElementById(id);
    if (!container) return;
    if (!entries || entries.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">No entries found.</p>`;
        return;
    }
    
    container.innerHTML = entries.map(e => {
        const m = e.media || e;
        const score = m.meanScore ? (m.meanScore/10).toFixed(1) : "??";
        
        // Build the progress badge if it's a user list
        let progressBadge = '';
        if (isUserList) {
            const currentProgress = e.progress || 0;
            const total = (type === 'ANIME' ? m.episodes : m.chapters) || '~';
            
            progressBadge = `
                <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; color: white; border: 1px solid rgba(255,255,255,0.15); z-index: 2;">
                    ${currentProgress} <span style="color: var(--accent); margin: 0 2px;">|</span> ${total}
                </div>`;
        }

        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${m.id}&type=${type}'">
                <div class="img-box">
                    ${progressBadge}
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

document.addEventListener('DOMContentLoaded', () => {
    initGlobalUI();
    const gIn = document.getElementById('global-search-input');
    const aIn = document.getElementById('anime-search-input');
    const mIn = document.getElementById('manga-search-input');
    const chips = document.querySelectorAll('.chip');

    if (gIn) gIn.addEventListener('input', () => handleSearch(gIn, 'search-results'));
    if (aIn) aIn.addEventListener('input', () => handleSearch(aIn, 'anime-search-results', 'ANIME'));
    if (mIn) mIn.addEventListener('input', () => handleSearch(mIn, 'manga-search-results', 'MANGA'));

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            let t = chip.innerText.toUpperCase();
            activeSearchType = t === 'USERS' ? 'USER' : t === 'CHARACTERS' ? 'CHARACTER' : t;
            if(gIn.value.length >= 3) handleSearch(gIn, 'search-results');
        });
    });
});
