/**
 * home.js - Robust Home Page Logic
 */
async function initHome() {
    console.log("Home script initialized...");

    try {
        // 1. Wait for auth.js to save the token (max 3 seconds)
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 30) {
            await new Promise(r => setTimeout(r, 100)); 
            attempts++;
        }

        // 2. Query for User Profile + Lists
        const query = `
        query {
            Viewer {
                name
                avatar { large }
                statistics {
                    anime { episodesWatched }
                    manga { chaptersRead }
                }
            }
            animeList: Page(perPage: 10) {
                mediaList(status: CURRENT, type: ANIME) {
                    media { id title { romaji } coverImage { large } meanScore }
                }
            }
            mangaList: Page(perPage: 10) {
                mediaList(status: CURRENT, type: MANGA) {
                    media { id title { romaji } coverImage { large } meanScore }
                }
            }
        }`;

        const data = await apiFetch(query);

        if (!data || !data.Viewer) {
            console.error("No user data returned. Check token/Redirect URI.");
            return;
        }

        // 3. Populate Header & Stats
        document.getElementById('user-name').innerText = data.Viewer.name;
        document.getElementById('user-pfp').src = data.Viewer.avatar.large;
        document.getElementById('ep-count').innerText = data.Viewer.statistics.anime.episodesWatched.toLocaleString();
        document.getElementById('ch-count').innerText = data.Viewer.statistics.manga.chaptersRead.toLocaleString();

        // 4. Render Horizontal Scrollers
        renderScrollerItems('anime-scroll', data.animeList.mediaList, 'ANIME');
        renderScrollerItems('manga-scroll', data.mangaList.mediaList, 'MANGA');

    } catch (err) {
        console.error("Home Page Error:", err);
    } finally {
        // 5. THE FIX: Hide loader even if there is an error
        if (typeof hideLoader === 'function') {
            hideLoader();
        } else {
            // Fallback if auth.js failed to load hideLoader
            document.getElementById('loading-overlay').style.display = 'none';
        }
    }
}

// Start when the page is ready
document.addEventListener('DOMContentLoaded', initHome);
