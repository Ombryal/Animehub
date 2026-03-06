/**
 * anime.js - Enhanced Discovery Logic
 * Features horizontal scrollers and a vertical landscape list.
 */

async function initAnimeDiscovery() {
    // 1. Unified Query for all sections
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

    try {
        const data = await apiFetch(query);

        if (data) {
            // 2. Render standard horizontal scrollers
            renderScrollerItems('trending-scroll', data.Trending?.media, 'ANIME');
            renderScrollerItems('top-scroll', data.TopRated?.media, 'ANIME');
            renderScrollerItems('popular-scroll', data.Movies?.media, 'ANIME');
            
            // 3. Render the vertical landscape list
            renderVerticalPopularList('popular-vertical-list', data.AllTimePopular?.media);
        }
    } catch (error) {
        console.error("Initialization failed:", error);
    } finally {
        // 4. Always sync profile and hide loader, even if fetch fails
        await updateHeaderPFP();
        hideLoader();
    }
}

/**
 * Robust renderer for the Landscape Vertical Cards
 */
function renderVerticalPopularList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        // Fallbacks for missing data to prevent crashes
        const title = m.title?.romaji || "Unknown Title";
        const banner = m.bannerImage || m.coverImage?.large;
        const poster = m.coverImage?.large || "";
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";
        const eps = m.episodes ? `${m.episodes} Episodes` : "Format: TV";

        return `
            <div class="landscape-card" onclick="window.open('details.html?id=${m.id}&type=ANIME', '_blank')">
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

document.addEventListener('DOMContentLoaded', initAnimeDiscovery);
