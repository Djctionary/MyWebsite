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
        songArtist.textContent = song.getAttribute('data-artist');
        albumCover.src = `../static/images/${song.text}.jpg`;
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
    const scrollContainer = document.querySelector('.scroll-container');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    // 改进的鼠标滚轮水平滚动
    scrollContainer.addEventListener('wheel', function(e) {
        e.preventDefault(); // 阻止默认的垂直滚动

        // 根据滚轮事件的类型来决定滚动方向和距离
        let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

        // 使用 deltaX 如果可用，否则使用 deltaY
        let scrollAmount = e.deltaX || e.deltaY;

        // 如果 deltaX 和 deltaY 都是 0，使用之前计算的 delta
        if (scrollAmount === 0) {
            scrollAmount = delta * 40; // 40 是一个可以调整的值，用来控制滚动速度
        }

        // 调整 scrollLeft 来实现水平滚动
        scrollContainer.scrollLeft -= scrollAmount*-10;

    }, { passive: false }); // 添加 passive: false 来确保 preventDefault() 生效


    // 处理滚动指示器
    scrollContainer.addEventListener('scroll', function() {
        if (scrollContainer.scrollLeft > 100) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    });

    // 启用触摸设备的水平滚动
    let isDown = false;
    let startX;
    let scrollLeft;

    scrollContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - scrollContainer.offsetLeft;
        scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener('mouseleave', () => {
        isDown = false;
    });

    scrollContainer.addEventListener('mouseup', () => {
        isDown = false;
    });

    scrollContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollContainer.offsetLeft;
        const walk = (x - startX) * 2; // 调整滚动速度
        scrollContainer.scrollLeft = scrollLeft - walk;
    });

    // 添加触摸板双指滑动的水平滚动功能
    scrollContainer.addEventListener('touchstart', handleTouchStart, false);
    scrollContainer.addEventListener('touchmove', handleTouchMove, false);

    let touchStartY = 0;
    let touchStartX = 0;

    function handleTouchStart(e) {
        console.log("handleTouchStart")
      if (e.touches.length === 2) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length === 2) {
        e.preventDefault(); // 阻止默认的滚动行为

        const touchEndY = e.touches[0].clientY;
        const touchEndX = e.touches[0].clientX;

        const deltaY = touchStartY - touchEndY;
        const deltaX = touchStartX - touchEndX;

        // 如果垂直移动大于水平移动，我们认为这是一个垂直滑动手势
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          // 调整滚动速度，可以根据需要修改这个乘数
          scrollContainer.scrollLeft += deltaY * 2;
        }

        // 更新起始位置
        touchStartY = touchEndY;
        touchStartX = touchEndX;
      }
    }

    // 更新滚动指示器的逻辑
    function updateScrollIndicator() {
      if (scrollContainer.scrollLeft > 100) {
        scrollIndicator.style.opacity = '0';
      } else {
        scrollIndicator.style.opacity = '1';
      }
    }

    // 在触摸移动和滚动事件中调用更新函数
    scrollContainer.addEventListener('scroll', updateScrollIndicator);
    scrollContainer.addEventListener('touchmove', updateScrollIndicator);

    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('.section');


    // 选择导航链接和节
    scrollContainer.addEventListener('scroll', () => {
        let current = '';

        // 找到当前滚动到的节
        sections.forEach(section => {
            const sectionLeft = section.offsetLeft; // 获取节的左边距离
            const sectionWidth = section.clientWidth; // 获取节的宽度

            // 判断当前节是否在可视区域内
            if (scrollContainer.scrollLeft >= sectionLeft - sectionWidth / 3 &&
                scrollContainer.scrollLeft < sectionLeft + sectionWidth) {
                current = section.getAttribute('id');
            }
        });

        // 更新导航链接的活动类
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    const items = document.querySelectorAll('.project-item');
    const hoverImage = document.getElementById('hover-image');

    items.forEach(item => {
        item.addEventListener('mouseenter', function(e) {
            const imageSrc = this.getAttribute('data-image');
            hoverImage.innerHTML = `<img src="${imageSrc}" alt="Project Image">`;
            hoverImage.style.opacity = '1';
        });

        item.addEventListener('mouseleave', function() {
            hoverImage.style.opacity = '0';
        });

        item.addEventListener('mousemove', function(e) {
            hoverImage.style.left = e.pageX + 20 + 'px';
            hoverImage.style.top = e.pageY + 20 + 'px';
        });
    });

    // 创建落下的白点
    function createFallingDot() {
        const dot = document.createElement('div');
        dot.classList.add('falling-dot');
        dot.style.left = `${Math.random() * 100}vw`;
        dot.style.animationDuration = `${Math.random() * 3 + 2}s`;
        document.body.appendChild(dot);

        dot.addEventListener('animationend', () => {
            dot.remove();
        });
    }

    function initializeFallingDots(count) {
        for (let i = 0; i < count; i++) {
            createFallingDot();
        }
    }

    // 页面加载时创建白点
    window.onload = function() {
        initializeFallingDots(22); // 这里设置为初始创建的白点数量
    };

    // 获取所有项目元素
    const projectItems = document.querySelectorAll('.project-item');

    // 为每个项目元素添加点击事件监听器
    projectItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault(); // 阻止默认的链接跳转行为

            // 获取点击项目的内容ID
            const contentId = this.getAttribute('data-content');

            // 隐藏所有项目
            projectItems.forEach(item => {
                item.classList.add('hide-item');
            });

            // 隐藏其他所有的新内容
            const allNewContent = document.querySelectorAll('.new-content');
            allNewContent.forEach(content => {
                content.style.display = 'none';
            });

            // 显示新内容
            setTimeout(() => {
                document.getElementById(contentId).style.display = 'block';
            }, 1000); // 等待1秒，动画结束后显示
        });
    });


});
