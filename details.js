async function initDetails() {
    try {
        const params = new URLSearchParams(window.location.search);
        const mediaId = parseInt(params.get('id'));
        const mediaType = params.get('type') || 'ANIME';

        if (!mediaId) {
            console.error("No ID found");
            return; // Finally block will still run
        }

        const query = `query ($id: Int, $type: MediaType) {
            Media(id: $id, type: $type) {
                title { romaji }
                bannerImage
                coverImage { extraLarge }
                description
            }
        }`;

        const data = await apiFetch(query, { id: mediaId, type: mediaType });
        
        if (data && data.Media) {
            const m = data.Media;
            document.getElementById('det-title').innerText = m.title.romaji;
            document.getElementById('det-cover').src = m.coverImage.extraLarge;
            document.getElementById('det-desc').innerHTML = m.description || "No description.";
            if (m.bannerImage) {
                document.getElementById('det-banner').style.backgroundImage = `url(${m.bannerImage})`;
            }
        }
    } catch (err) {
        console.error("Init Error:", err);
    } finally {
        // THIS IS THE MOST IMPORTANT LINE
        hideLoader(); 
    }
}

document.addEventListener('DOMContentLoaded', initDetails);
