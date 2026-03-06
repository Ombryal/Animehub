/**
 * manga.js - Step-by-Step Robust Version
 */

async function initMangaDiscovery() {
    console.log("Manga discovery starting...");

    try {
        // 1. THE WAIT LOOP: Ensure auth.js has saved the token before we fetch
        let waitAttempts = 0;
        while (!localStorage.getItem('anilist_token') && waitAttempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            waitAttempts++;
        }

        // 2. Optimized Query for Manga & Manhwa
        const query = `query {
            Trending: Page(perPage: 12) { 
                media(sort: TRENDING_DESC, type: MANGA, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            Manhwa: Page(perPage: 12) { 
                media(sort: SCORE_DESC, type: MANGA, countryOfOrigin: "KR", isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            Popular: Page(perPage: 12) { 
                media(sort: POPULARITY_DESC, type: MANGA, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
        }`;

        const data = await apiFetch(query);

        if (data) {
            // 3. Render each section (Ensure IDs match the HTML)
            if (data.Trending?.media) {
                renderScrollerItems('trending-scroll', data.Trending.media, 'MANGA');
            }
            if (data.Manhwa?.media) {
                renderScrollerItems('top-scroll', data.Manhwa.media, 'MANGA');
            }
            if (data.Popular?.media) {
                renderScrollerItems('popular-scroll', data.Popular.media, 'MANGA');
            }
        } else {
            console.error("Manga API returned no data.");
        }

    } catch (error) {
        console.error("Manga initialization failed:", error);
    } finally {
        // 4. ALWAYS hide the loader
        if (typeof hideLoader === 'function') {
            hideLoader();
        } else {
            document.getElementById('loading-overlay').style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', initMangaDiscovery);
