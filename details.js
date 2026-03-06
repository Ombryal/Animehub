async function initDetails() {
    // 1. Wait for token to be saved by auth.js
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

    const query = `query ($id: Int, $type: MediaType) {
        Media(id: $id, type: $type) {
            title { romaji english native }
            bannerImage
            coverImage { extraLarge }
            description
            status
            format
            episodes
            chapters
            averageScore
            popularity
            favorites
            source
            season
            seasonYear
            genres
            trailer { id site }
            studios(isMain: true) { nodes { name } }
            characters(perPage: 6, sort: [ROLE, RELEVANCE]) {
                edges { role node { name { full } image { large } } }
            }
            relations {
                edges { relationType node { id title { romaji } coverImage { large } type } }
            }
        }
    }`;

    try {
        const data = await apiFetch(query, { id: mediaId, type: mediaType });
        if (!data || !data.Media) return;

        const m = data.Media;

        // Populate UI
        document.getElementById('det-title').innerText = m.title.romaji;
        document.getElementById('det-title-sub').innerText = m.title.english || m.title.native || '';
        document.getElementById('det-cover').src = m.coverImage.extraLarge;
        if (m.bannerImage) document.getElementById('det-banner').style.backgroundImage = `url(${m.bannerImage})`;
        document.getElementById('det-desc').innerHTML = m.description || "No description.";

        // Populate Stats
        const setStat = (id, val) => { document.getElementById(id).innerText = val || '-'; };
        setStat('det-format', m.format);
        setStat('det-status', m.status?.replace(/_/g, ' '));
        setStat('det-episodes', (mediaType === 'ANIME' ? m.episodes : m.chapters));
        setStat('det-season', m.season ? `${m.season} ${m.seasonYear}` : m.seasonYear);
        setStat('det-avg-score', m.averageScore ? `${m.averageScore}%` : '-');
        setStat('det-popularity', m.popularity?.toLocaleString());
        setStat('det-favorites', m.favorites?.toLocaleString());
        setStat('det-studio', m.studios.nodes[0]?.name);
        setStat('det-source', m.source?.replace(/_/g, ' '));

        // Genres
        document.getElementById('det-genres').innerHTML = m.genres.map(g => 
            `<span class="genre-badge">${g}</span>`
        ).join('');

        // Characters
        document.getElementById('det-characters').innerHTML = m.characters.edges.map(e => `
            <div class="char-card">
                <img src="${e.node.image.large}">
                <p><b>${e.node.name.full}</b></p>
                <span>${e.role}</span>
            </div>
        `).join('');

        // Relations
        document.getElementById('det-relations').innerHTML = m.relations.edges.map(e => `
            <div class="media-item" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                <div class="img-box">
                    <img src="${e.node.coverImage.large}">
                    <div class="purple-badge">${e.relationType.replace(/_/g, ' ')}</div>
                </div>
                <div class="media-title">${e.node.title.romaji}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', initDetails);
