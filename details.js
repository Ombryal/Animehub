/**
 * simplified details.js 
 * Focuses only on Header and Synopsis
 */
async function initDetails() {
    // 1. Wait for auth.js to save the token
    let attempts = 0;
    while (!localStorage.getItem('anilist_token') && attempts < 20) {
        await new Promise(r => setTimeout(r, 100)); 
        attempts++;
    }

    const params = new URLSearchParams(window.location.search);
    const mediaId = parseInt(params.get('id'));
    const mediaType = params.get('type') || 'ANIME';

    if (isNaN(mediaId)) {
        hideLoader();
        return;
    }

    // 2. Simplified Query (Only asking for Title, Images, and Description)
    const query = `query ($id: Int, $type: MediaType) {
        Media(id: $id, type: $type) {
            title { romaji }
            bannerImage
            coverImage { extraLarge }
            description
        }
    }`;

    try {
        const data = await apiFetch(query, { id: mediaId, type: mediaType });
        if (!data || !data.Media) return;

        const m = data.Media;

        // 3. Populate Header Visuals
        document.getElementById('det-title').innerText = m.title.romaji;
        document.getElementById('det-cover').src = m.coverImage.extraLarge;
        
        if (m.bannerImage) {
            document.getElementById('det-banner').style.backgroundImage = `url(${m.bannerImage})`;
        }

        // 4. Populate ONLY Synopsis
        document.getElementById('det-desc').innerHTML = m.description || "No description available.";

    } catch (err) {
        console.error("Failed to load details:", err);
    } finally {
        // Always hide the loader when done
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', initDetails);
