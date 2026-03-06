const CONFIG = {
    CLIENT_ID: '22649',
    // REPLACE THIS with your actual GitHub Pages URL (keep the trailing slash!)
    REDIRECT_URI: window.location.origin + window.location.pathname, 
    API_URL: 'https://graphql.anilist.co'
};

// 1. Token Check
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
} else {
    // If no token, redirect to login
    if (!localStorage.getItem('anilist_token')) {
        const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=token`;
        window.location.href = authUrl;
    }
}

// 2. The Fetcher (Fixed for No-Data issue)
async function apiFetch(query, variables = {}) {
    // Force a fresh look at localStorage
    const activeToken = localStorage.getItem('anilist_token');
    
    if (!activeToken) {
        console.error("API Fetch blocked: No token found. Try logging in again.");
        return null;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();
        if (json.errors) {
            // If token is expired, clear it and refresh
            if (json.errors[0].status === 401) {
                localStorage.removeItem('anilist_token');
                window.location.reload();
            }
            return null;
        }
        return json.data;
    } catch (err) {
        console.error("Connection failed:", err);
        return null;
    }
}

function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}
