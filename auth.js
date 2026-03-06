/**
 * auth.js - Final Robust Version
 */
const CONFIG = {
    CLIENT_ID: '22649',
    API_URL: 'https://graphql.anilist.co'
};

// 1. Unified Token Management
// We check URL first, then LocalStorage.
let token = new URLSearchParams(window.location.hash.substring(1)).get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    // Save token to stay logged in on all pages
    localStorage.setItem('anilist_token', token);
    
    // Clean the URL hash only if it's present (keeps ?id= parameters safe)
    if (window.location.hash) {
        const cleanUrl = window.location.pathname + window.location.search;
        history.replaceState(null, "", cleanUrl);
    }
} else {
    // Redirect only if there is absolutely no token found in storage
    if (!localStorage.getItem('anilist_token')) {
        window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
    }
}

// 2. Global API Fetcher
// Handles both simple queries and complex ones with variables (like details)
async function apiFetch(query, variables = {}) {
    // Always pull the freshest token from storage at the moment of the call
    const activeToken = localStorage.getItem('anilist_token');
    
    if (!activeToken) {
        console.error("Auth: No token available for API call.");
        return null;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + activeToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();

        if (json.errors) {
            console.error("AniList API Error:", json.errors);
            return null;
        }

        return json.data;
    } catch (err) {
        console.error("Network/Fetch Error:", err);
        return null;
    }
}

// 3. Global UI Utilities (Loader & Scrollers)
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}

function renderScrollerItems(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        const media = m.media || m; 
        const score = media.meanScore ? (media.meanScore / 10).toFixed(1) : "??";
        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${media.id}&type=${type}'">
                <div class="img-box">
                    <img src="${media.coverImage.large}" loading="lazy" alt="${media.title.romaji}">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${media.title.romaji}</div>
            </div>
        `;
    }).join('');
}
