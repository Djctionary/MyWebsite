document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const albumCover = document.getElementById('album-cover');
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const visualizer = document.getElementById('visualizer');
    const playlist = document.getElementById('playlist');
    const musicPlayer = document.getElementById('music-player');
    const musicPlayerToggle = document.querySelector('.music-player-toggle');

    // 音频上下文和分析器初始化函数
    let audioContext;
    let analyser;

    function loadSong(song) {
        audioPlayer.src = song.value;
        songTitle.textContent = song.text;
        songArtist.textContent = song.getAttribute('data-artist'); // 获取艺术家信息
        albumCover.src = `../static/images/${song.text}.jpg`; // 假设你有匹配的专辑封面
    }

    function playSong() {
        audioPlayer.play().catch((error) => {
            console.error("Playback failed:", error);
        });
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    function pauseSong() {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function nextSong() {
        let nextIndex = (playlist.selectedIndex + 1) % playlist.options.length;
        playlist.selectedIndex = nextIndex;
        loadSong(playlist.options[nextIndex]);
        playSong();
    }

    playPauseBtn.addEventListener('click', function() {
        if (audioPlayer.paused) {
            // 用户交互后初始化音频上下文和分析器
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaElementSource(audioPlayer);
                source.connect(analyser);
                analyser.connect(audioContext.destination);

                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                const ctx = visualizer.getContext('2d');

                function drawVisualizer() {
                    requestAnimationFrame(drawVisualizer);
                    analyser.getByteFrequencyData(dataArray);

                    ctx.fillStyle = 'rgb(0, 0, 0)';
                    ctx.fillRect(0, 0, visualizer.width, visualizer.height);

                    const barWidth = (visualizer.width / bufferLength) * 2.5;
                    let x = 0;

                    for (let i = 0; i < bufferLength; i++) {
                        const barHeight = dataArray[i] / 2;
                        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                        ctx.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
                        x += barWidth + 1;
                    }
                }

                // 启动可视化
                drawVisualizer();
            }
            playSong();
        } else {
            pauseSong();
        }
    });

    nextBtn.addEventListener('click', nextSong);

    volumeSlider.addEventListener('input', function() {
        audioPlayer.volume = this.value;
    });

    audioPlayer.addEventListener('ended', nextSong);

    playlist.addEventListener('change', function() {
        loadSong(this.options[this.selectedIndex]);
        playSong(); // 确保在用户交互后播放
    });

    musicPlayerToggle.addEventListener('click', function() {
        musicPlayer.classList.toggle('expanded');
        musicPlayer.classList.toggle('collapsed');
    });

    // 加载并播放第一首歌曲
    loadSong(playlist.options[0]);
    // playSong();  // 移除这个调用，确保在用户交互后播放

    // 滚动指示器
    const scrollIndicator = document.querySelector('.scroll-indicator');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    });
});
