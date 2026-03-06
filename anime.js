/**
 * anime.js - Enhanced Discovery Logic
 * Handles horizontal scrollers and the vertical landscape list.
 */

async function initAnimeDiscovery() {
    console.log("Anime discovery initializing...");

    try {
        // 1. Safety Wait: Wait for auth.js to confirm the token is saved
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 25) {
            await new Promise(r => setTimeout(r, 150)); 
            attempts++;
        }

        // 2. Optimized Multi-Section Query
        const query = `query {
            Trending: Page(perPage: 12) { 
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            TopRated: Page(perPage: 12) { 
                media(sort: SCORE_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            Movies: Page(perPage: 12) { 
                media(sort: POPULARITY_DESC, type: ANIME, format: MOVIE, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            AllTimePopular: Page(perPage: 10) { 
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } bannerImage coverImage { large } meanScore episodes 
                } 
            }
        }`;

        const data = await apiFetch(query);

        if (data) {
            // 3. Render horizontal sections using the helper in auth.js
            renderScrollerItems('trending-scroll', data.Trending?.media, 'ANIME');
            renderScrollerItems('top-scroll', data.TopRated?.media, 'ANIME');
            renderScrollerItems('movies-scroll', data.Movies?.media, 'ANIME');
            
            // 4. Render the special landscape cards
            renderVerticalPopularList('popular-vertical-list', data.AllTimePopular?.media);
        } else {
            console.error("No discovery data received.");
        }

    } catch (error) {
        console.error("Discovery Page Error:", error);
    } finally {
        // 5. Always hide the loader, even if things go wrong
        hideLoader();
    }
}

/**
 * Custom renderer for Landscape Cards (Not in auth.js because it's unique to this page)
 */
function renderVerticalPopularList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        const title = m.title?.romaji || "Unknown Title";
        const banner = m.bannerImage || m.coverImage?.large;
        const poster = m.coverImage?.large || "";
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";
        const eps = m.episodes ? `${m.episodes} Episodes` : "TV Series";

        return `
            <div class="landscape-card" onclick="window.location.href='details.html?id=${m.id}&type=ANIME'">
                <div class="card-banner" style="background-image: url('${banner}')"></div>
                <div class="card-overlay"></div>
                <div class="card-content">
                    <img src="${poster}" class="mini-poster" alt="${title}" loading="lazy">
                    <div class="card-info">
                        <h4>${title}</h4>
                        <p>${eps}</p>
                        <div class="purple-badge" style="position:static; display:inline-block; margin-top:8px;">
                            ${score} ★
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Kick off initialization
document.addEventListener('DOMContentLoaded', initAnimeDiscovery);
