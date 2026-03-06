/**
 * home.js - Real-Time Dashboard Logic
 * Fetches exact authenticated user data and their active lists.
 */

async function initHome() {
    // STEP 1: Fetch the real logged-in user's identity and stats
    const viewerQuery = `query {
        Viewer { 
            id
            name 
            statistics { 
                anime { episodesWatched } 
                manga { chaptersRead } 
            } 
        }
    }`;

    const viewerData = await apiFetch(viewerQuery);

    if (viewerData && viewerData.Viewer) {
        const user = viewerData.Viewer;

        // Populate User Stats
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.innerText = user.name;
        
        const epEl = document.getElementById('ep-count');
        if (epEl) epEl.innerText = user.statistics.anime.episodesWatched;
        
        const chEl = document.getElementById('ch-count');
        if (chEl) chEl.innerText = user.statistics.manga.chaptersRead;

        // STEP 2: Use the real User ID to fetch their real-time active lists
        const listsQuery = `query ($userId: Int) {
            Watching: MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
                lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
            }
            Reading: MediaListCollection(userId: $userId, type: MANGA, status: CURRENT) {
                lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
            }
        }`;

        const listData = await apiFetch(listsQuery, { userId: user.id });

        if (listData) {
            // Safely extract the arrays (AniList puts them inside 'lists[0].entries')
            const watchingList = listData.Watching.lists[0]?.entries || [];
            const readingList = listData.Reading.lists[0]?.entries || [];

            // Render Real-Time Anime
            const animeScroll = document.getElementById('anime-scroll');
            if (watchingList.length > 0) {
                renderScrollerItems('anime-scroll', watchingList, 'ANIME');
            } else if (animeScroll) {
                animeScroll.innerHTML = `<p style="color: var(--text-dim); padding: 10px; font-size: 0.85rem;">You aren't currently watching anything.</p>`;
            }

            // Render Real-Time Manga
            const mangaScroll = document.getElementById('manga-scroll');
            if (readingList.length > 0) {
                renderScrollerItems('manga-scroll', readingList, 'MANGA');
            } else if (mangaScroll) {
                mangaScroll.innerHTML = `<p style="color: var(--text-dim); padding: 10px; font-size: 0.85rem;">You aren't currently reading anything.</p>`;
            }
        }
    } else {
        console.error("Failed to fetch Viewer data. Token might be invalid.");
    }

    // STEP 3: Sync Profile Picture & Reveal UI
    await updateHeaderPFP();
    hideLoader();
}

// Start the sequence when the page loads
document.addEventListener('DOMContentLoaded', initHome);
