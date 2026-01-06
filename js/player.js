// Player and Movie Detail Functions

// Open movie detail modal
async function openMovieDetail(slug) {
    const modal = document.getElementById('movieModal');
    const modalBody = document.getElementById('modalBody');

    // Show modal with loading
    modal.classList.add('active');
    modalBody.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 400px;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const data = await getMovieDetail(slug);
        const movie = data.movie;

        if (!movie) {
            throw new Error('Không tìm thấy thông tin phim');
        }

        renderMovieDetail(movie);
    } catch (error) {
        console.error('Error loading movie detail:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <p style="font-size: 1.25rem; margin-bottom: 1rem;">❌ Không thể tải thông tin phim</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Render movie detail
function renderMovieDetail(movie) {
    const modalBody = document.getElementById('modalBody');

    const posterUrl = movie.thumb_url || movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const title = movie.name || 'Không có tiêu đề';
    const originName = movie.origin_name || movie.original_name || '';
    const year = movie.year || 'N/A';
    const quality = movie.quality || 'HD';
    const lang = movie.lang || movie.language || '';
    const episodeCurrent = movie.episode_current || movie.current_episode || '';
    const episodeTotal = movie.episode_total || movie.total_episodes || '';
    const time = movie.time || '';
    const content = movie.content || movie.description || 'Chưa có mô tả';
    const director = movie.director ? (Array.isArray(movie.director) ? movie.director.join(', ') : movie.director) : 'N/A';
    const actor = movie.actor || movie.casts || 'N/A';

    // Handle category - API returns nested object with groups
    // Group "2" contains genres (Thể loại)
    let category = 'N/A';
    if (movie.category && typeof movie.category === 'object') {
        if (movie.category['2'] && movie.category['2'].list && Array.isArray(movie.category['2'].list)) {
            category = movie.category['2'].list.map(c => c.name).join(', ');
        }
    }

    // Handle country - API returns nested object with groups
    // Group "4" contains countries (Quốc gia)
    let country = 'N/A';
    if (movie.category && typeof movie.category === 'object') {
        if (movie.category['4'] && movie.category['4'].list && Array.isArray(movie.category['4'].list)) {
            country = movie.category['4'].list.map(c => c.name).join(', ');
        }
    }

    // Get episodes - API returns episodes[0].items
    const episodes = movie.episodes || [];
    const hasEpisodes = episodes.length > 0 && episodes[0].items && episodes[0].items.length > 0;

    modalBody.innerHTML = `
        <div class="movie-detail">
            <div class="movie-detail-header">
                <div class="movie-detail-poster">
                    <img src="${posterUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                </div>
                <div class="movie-detail-info">
                    <h2 class="movie-detail-title">${title}</h2>
                    ${originName ? `<p class="movie-detail-origin">${originName}</p>` : ''}
                    
                    <div class="movie-detail-meta">
                        <span class="badge">${quality}</span>
                        ${lang ? `<span class="badge">${lang}</span>` : ''}
                        <span class="badge">${year}</span>
                        ${time ? `<span class="badge">${time}</span>` : ''}
                    </div>
                    
                    <div class="movie-detail-stats">
                        ${episodeCurrent ? `<p><strong>Tập hiện tại:</strong> ${episodeCurrent}</p>` : ''}
                        ${episodeTotal ? `<p><strong>Tổng số tập:</strong> ${episodeTotal}</p>` : ''}
                        <p><strong>Thể loại:</strong> ${category}</p>
                        <p><strong>Quốc gia:</strong> ${country}</p>
                        <p><strong>Đạo diễn:</strong> ${director}</p>
                        <p><strong>Diễn viên:</strong> ${actor}</p>
                    </div>
                    
                    ${hasEpisodes ? `<button class="watch-btn" onclick="scrollToEpisodes()">Xem Phim</button>` : ''}
                </div>
            </div>
            
            <div class="movie-detail-content">
                <h3>Nội dung phim</h3>
                <p>${content}</p>
            </div>
            
            ${hasEpisodes ? renderEpisodesList(episodes) : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Chưa có tập phim</p>'}
        </div>
    `;

    // Add CSS for movie detail
    addMovieDetailStyles();
}

// Render episodes list
function renderEpisodesList(episodes) {
    let html = '<div class="player-container" id="playerContainer" style="display: none;"></div>';
    html += '<div class="episodes-section">';

    let firstEpisodeLink = null;
    let firstEpisodeName = null;
    let firstEpisodeFallback = null;

    episodes.forEach((server, serverIndex) => {
        const serverName = server.server_name || `Server ${serverIndex + 1}`;
        const serverData = server.items || server.server_data || [];

        if (serverData.length > 0) {
            // Store first episode for auto-play - prioritize m3u8 over embed
            if (!firstEpisodeLink && serverData[0]) {
                firstEpisodeLink = serverData[0].m3u8 || serverData[0].embed || '';
                firstEpisodeFallback = serverData[0].embed || '';
                firstEpisodeName = serverData[0].name || 'Tập 1';
            }

            html += `
                <div class="episodes-server">
                    <h3 class="episodes-server-name">${serverName}</h3>
                    <div class="episodes-list">
                        ${serverData.map((episode, index) => `
                            <button class="episode-btn ${serverIndex === 0 && index === 0 ? 'active' : ''}" 
                                data-link="${episode.m3u8 || episode.embed || ''}" 
                                data-fallback="${episode.embed || ''}"
                                data-name="${episode.name}">
                                ${episode.name || `Tập ${index + 1}`}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';

    // Add event listeners after rendering
    setTimeout(() => {
        const episodeBtns = document.querySelectorAll('.episode-btn');
        episodeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const link = btn.dataset.link;
                const fallback = btn.dataset.fallback;
                const name = btn.dataset.name;

                // Open video link in new tab (prioritize embed over m3u8)
                const videoUrl = fallback || link;
                if (videoUrl) {
                    window.open(videoUrl, '_blank');
                    showToast(`Đang mở: ${name}`, 'success');
                } else {
                    showToast('Không tìm thấy link phim', 'error');
                }

                // Update active state
                episodeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Auto-open first episode is removed - user clicks to open
    }, 100);

    return html;
}

// Play episode
let currentPlayer = null;
let currentHls = null;

function playEpisode(link, episodeName, embedFallback = null) {
    const playerContainer = document.getElementById('playerContainer');

    if (!link) {
        showToast('Không tìm thấy link phim', 'error');
        return;
    }

    // Destroy previous player if exists
    if (currentPlayer) {
        currentPlayer.destroy();
        currentPlayer = null;
    }

    // Destroy previous HLS instance
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }

    // Show player immediately
    playerContainer.style.display = 'block';

    // Check if link is m3u8 (HLS stream)
    if (link.includes('.m3u8')) {
        // Use HLS player for m3u8 links
        playerContainer.innerHTML = `
            <div class="player-header">
                <h3>Đang phát: ${episodeName}</h3>
                <button class="player-close" onclick="closePlayer()">✕</button>
            </div>
            <div class="player-wrapper">
                <video id="hlsPlayer" controls playsinline></video>
            </div>
        `;

        const video = document.getElementById('hlsPlayer');
        let hasError = false;

        // Initialize HLS
        if (Hls.isSupported()) {
            currentHls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 2
            });

            currentHls.loadSource(link);
            currentHls.attachMedia(video);

            currentHls.on(Hls.Events.MANIFEST_PARSED, function () {
                // Initialize Plyr after HLS is ready
                currentPlayer = new Plyr(video, {
                    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                    settings: ['quality', 'speed'],
                    quality: {
                        default: 720,
                        options: [1080, 720, 480, 360]
                    }
                });

                video.play().catch(e => console.log('Auto-play prevented:', e));
            });

            currentHls.on(Hls.Events.ERROR, function (event, data) {
                console.error('HLS Error:', data);

                // If fatal error and we have embed fallback, use it
                if (data.fatal && !hasError) {
                    hasError = true;

                    if (embedFallback) {
                        console.log('HLS failed, falling back to embed:', embedFallback);
                        showToast('Đang chuyển sang nguồn phát dự phòng...', 'info');

                        // Destroy HLS and switch to iframe
                        currentHls.destroy();
                        currentHls = null;

                        setTimeout(() => {
                            playerContainer.innerHTML = `
                                <div class="player-header">
                                    <h3>🎬 Đang phát: ${episodeName}</h3>
                                    <button class="player-close" onclick="closePlayer()">✕</button>
                                </div>
                                <div class="player-wrapper">
                                    <iframe 
                                        src="${embedFallback}" 
                                        frameborder="0" 
                                        allowfullscreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    ></iframe>
                                </div>
                            `;
                        }, 500);
                    } else {
                        showToast('Lỗi tải video, vui lòng thử lại', 'error');
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = link;
            currentPlayer = new Plyr(video);
            video.play().catch(e => console.log('Auto-play prevented:', e));
        } else {
            showToast('Trình duyệt không hỗ trợ phát video này', 'error');
        }
    } else {
        // Use iframe for embed links
        playerContainer.innerHTML = `
            <div class="player-header">
                <h3>🎬 Đang phát: ${episodeName}</h3>
                <button class="player-close" onclick="closePlayer()">✕</button>
            </div>
            <div class="player-wrapper">
                <iframe 
                    src="${link}" 
                    frameborder="0" 
                    allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
            </div>
        `;
    }

    // Scroll to player with smooth animation
    setTimeout(() => {
        const modalBody = document.getElementById('modalBody');
        modalBody.scrollTo({
            top: playerContainer.offsetTop - 20,
            behavior: 'smooth'
        });
    }, 100);
}

// Close player
function closePlayer() {
    const playerContainer = document.getElementById('playerContainer');

    // Destroy Plyr instance if exists
    if (currentPlayer) {
        currentPlayer.destroy();
        currentPlayer = null;
    }

    // Destroy HLS instance if exists
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }

    playerContainer.style.display = 'none';
    playerContainer.innerHTML = '';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.classList.remove('active');
    closePlayer();
}

// Add movie detail styles
function addMovieDetailStyles() {
    if (document.getElementById('movie-detail-styles')) return;

    const style = document.createElement('style');
    style.id = 'movie-detail-styles';
    style.textContent = `
        .movie-detail-header {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .movie-detail-poster img {
            width: 100%;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
        }
        
        .movie-detail-title {
            font-family: var(--font-heading);
            font-size: var(--font-size-3xl);
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        
        .movie-detail-origin {
            font-size: var(--font-size-lg);
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        
        .movie-detail-meta {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }
        
        .badge {
            background: var(--accent-gradient);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-weight: 600;
        }
        
        .movie-detail-stats p {
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
            line-height: 1.6;
        }
        
        .movie-detail-stats strong {
            color: var(--text-primary);
        }
        
        .watch-btn {
            margin-top: 1.5rem;
            padding: 1rem 2rem;
            background: var(--accent-gradient);
            color: white;
            font-size: var(--font-size-lg);
            font-weight: 600;
            border: none;
            border-radius: var(--radius-lg);
            cursor: pointer;
            transition: all var(--transition-base);
            box-shadow: var(--shadow-md);
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .watch-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg), var(--shadow-glow);
        }
        
        .watch-btn:active {
            transform: translateY(0);
        }

        
        .movie-detail-content {
            margin-bottom: 2rem;
        }
        
        .movie-detail-content h3 {
            font-family: var(--font-heading);
            font-size: var(--font-size-xl);
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        .movie-detail-content p {
            color: var(--text-secondary);
            line-height: 1.8;
        }
        
        .episodes-section {
            margin-top: 2rem;
        }
        
        .episodes-server {
            margin-bottom: 2rem;
        }
        
        .episodes-server-name {
            font-family: var(--font-heading);
            font-size: var(--font-size-xl);
            margin-bottom: 1rem;
            color: var(--accent-primary);
        }
        
        .episodes-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.5rem;
        }
        
        .episode-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.75rem;
            font-size: var(--font-size-sm);
            font-weight: 500;
            cursor: pointer;
            transition: all var(--transition-base);
        }
        
        .episode-btn:hover,
        .episode-btn.active {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            box-shadow: var(--shadow-glow);
        }
        
        .player-container {
            margin-bottom: 2rem;
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 2px solid var(--accent-primary);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        
        .player-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
        }
        
        .player-header h3 {
            font-size: var(--font-size-lg);
            color: var(--text-primary);
        }
        
        .player-close {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: 50%;
            color: var(--text-primary);
            font-size: 1.25rem;
            cursor: pointer;
            transition: all var(--transition-base);
        }
        
        .player-close:hover {
            background: var(--accent-primary);
            transform: rotate(90deg);
        }
        
        .player-wrapper {
            position: relative;
            padding-top: 56.25%;
            background: #000;
        }
        
        .player-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        @media (max-width: 768px) {
            .movie-detail-header {
                grid-template-columns: 1fr;
            }
            
            .episodes-list {
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            }
        }
    `;
    document.head.appendChild(style);
}

// Scroll to episodes section
function scrollToEpisodes() {
    const episodesSection = document.querySelector('.episodes-section');
    if (episodesSection) {
        episodesSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}
