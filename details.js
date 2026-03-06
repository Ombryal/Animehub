/**
 * details.js - Fetches and displays full media information
 */

async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'ANIME';

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    // 1. Detailed Query for AniList
    const query = `
    query ($id: Int, $type: MediaType) {
      Media (id: $id, type: $type) {
        id
        title { romaji english }
        coverImage { extraLarge }
        bannerImage
        description
        format
        status
        episodes
        chapters
        volumes
        genres
        averageScore
        season
        seasonYear
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }`;

    const data = await apiFetch(query, { id: parseInt(id), type: type });

    if (!data || !data.Media) {
        console.error("Could not fetch details.");
        return;
    }

    renderDetails(data.Media);
}

function renderDetails(media) {
    // 1. Set Background & Images
    const banner = media.bannerImage || media.coverImage.extraLarge;
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = media.coverImage.extraLarge;

    // 2. Set Titles
    document.getElementById('det-title').innerText = media.title.english || media.title.romaji;

    // 3. Set Meta (Score, Year, Format)
    const score = media.averageScore ? (media.averageScore / 10).toFixed(1) : "??";
    const year = media.seasonYear || "";
    const metaHTML = `
        <span><i class="fas fa-star" style="color:var(--accent)"></i> ${score}</span>
        <span>•</span>
        <span>${media.format}</span>
        <span>•</span>
        <span>${year}</span>
        <span class="pill-btn" style="padding: 2px 10px; font-size: 0.6rem; margin-left:10px;">${media.status}</span>
    `;
    document.getElementById('det-meta').innerHTML = metaHTML;

    // 4. Set Description (Clean up HTML tags from AniList)
    document.getElementById('det-desc').innerHTML = media.description || "No description available.";

    // 5. Build Stats Grid
    const statsGrid = document.getElementById('det-stats-grid');
    const isAnime = media.episodes !== null;
    
    const stats = [
        { label: 'Genres', value: media.genres.slice(0, 3).join(', ') },
        { label: isAnime ? 'Episodes' : 'Chapters', value: isAnime ? media.episodes : (media.chapters || '??') },
        { label: 'Season', value: media.season ? `${media.season} ${media.seasonYear}` : 'N/A' }
    ];

    statsGrid.innerHTML = stats.map(s => `
        <div class="glass-card" style="padding: 15px; text-align: center; border: 1px solid var(--glass-border);">
            <div style="font-size: 0.7rem; color: var(--accent); font-weight: 800; text-transform: uppercase; margin-bottom: 5px;">${s.label}</div>
            <div style="font-size: 0.9rem; font-weight: 700;">${s.value || 'N/A'}</div>
        </div>
    `).join('');

    hideLoader();
}

// Initialize
document.addEventListener('DOMContentLoaded', initDetails);
