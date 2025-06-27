document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    mobileMenuBtn.addEventListener('click', function() {
        const isOpen = mobileMenu.classList.contains('translate-y-0');
        
        if (isOpen) {
            // Close menu
            mobileMenu.classList.remove('translate-y-0', 'opacity-100');
            mobileMenu.classList.add('-translate-y-full', 'opacity-0');
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            // Open menu
            mobileMenu.classList.remove('-translate-y-full', 'opacity-0');
            mobileMenu.classList.add('translate-y-0', 'opacity-100');
            mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    });
    
    // Close mobile menu when clicking on a link
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('translate-y-0', 'opacity-100');
            mobileMenu.classList.add('-translate-y-full', 'opacity-0');
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });

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
        albumCover.src = `images/${song.text}.jpg`;
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
        const content = musicPlayer.querySelector('.music-player-content');
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            content.classList.add('block');
        } else {
            content.classList.remove('block');
            content.classList.add('hidden');
        }
    });

    // 加载并播放第一首歌曲
    loadSong(playlist.options[0]);
    // playSong();  // 移除这个调用，确保在用户交互后播放

    // 滚动指示器
    const scrollContainer = document.querySelector('.scroll-container');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    // 页面滚动逻辑优化 - 实现页面堆叠滑动效果
    let currentPageIndex = 0;
    let isScrolling = false;
    const sections = document.querySelectorAll('.section');
    const totalPages = sections.length;

    // 初始化页面位置 - 使用遮罩效果
    function initializePages() {
        sections.forEach((section, index) => {
            section.style.position = 'fixed';
            section.style.top = '0';
            section.style.left = '0';
            section.style.width = '100vw';
            section.style.height = '100vh';
            section.style.transform = 'translateX(0%)';
            section.style.transition = 'clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            if (index === 0) {
                // 第一页：完全显示
                section.style.zIndex = totalPages;
                section.style.clipPath = 'inset(0 0 0 0)';
            } else {
                // 其他页面：隐藏在右侧（准备从左到右显示）
                section.style.zIndex = totalPages - index;
                section.style.clipPath = 'inset(0 0 0 100%)';
            }
        });
    }

    // 切换到指定页面 - 渐进式遮罩效果（修复残留问题）
    function goToPage(targetIndex, direction) {
        if (isScrolling || targetIndex < 0 || targetIndex >= totalPages) {
            return;
        }

        isScrolling = true;
        const currentSection = sections[currentPageIndex];
        const targetSection = sections[targetIndex];

        // 首先清理所有页面的过渡动画，防止残留
        sections.forEach(section => {
            section.style.transition = 'none';
        });

        if (direction === 'next') {
            // 向下滚动：当前页面从右到左被遮罩，显示下方页面
            targetSection.style.zIndex = totalPages - 1; // 下方页面
            currentSection.style.zIndex = totalPages; // 当前页面在上方
            
            // 确保目标页面完全显示并准备好
            targetSection.style.transform = 'translateX(0%)';
            targetSection.style.clipPath = 'inset(0 0 0 0)';
            
            // 强制重绘
            currentSection.offsetHeight;
            
            // 添加过渡动画并开始遮罩
            currentSection.style.transition = 'clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            setTimeout(() => {
                currentSection.style.clipPath = 'inset(0 100% 0 0)'; // 从右到左遮罩
            }, 16); // 使用requestAnimationFrame的时间
            
        } else if (direction === 'prev') {
            // 向上滚动：上一页面从左到右显示，覆盖当前页面
            // 立即设置z-index，防止闪烁
            targetSection.style.zIndex = totalPages; // 上一页面在上方
            currentSection.style.zIndex = totalPages - 1; // 当前页面在下方
            
            // 确保当前页面完全显示
            currentSection.style.transform = 'translateX(0%)';
            currentSection.style.clipPath = 'inset(0 0 0 0)';
            
            // 目标页面初始设置为完全隐藏在左侧
            targetSection.style.transform = 'translateX(0%)';
            targetSection.style.clipPath = 'inset(0 0 0 100%)';
            
            // 强制重绘
            targetSection.offsetHeight;
            
            // 添加过渡动画
            targetSection.style.transition = 'clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            setTimeout(() => {
                targetSection.style.clipPath = 'inset(0 0 0 0)'; // 从左到右显示
            }, 16);
        }

        // 更新当前页面索引
        currentPageIndex = targetIndex;

        // 完成动画后重置状态
        setTimeout(() => {
            // 先移除所有过渡动画
            sections.forEach((section, index) => {
                section.style.transition = 'none';
                
                // 重置所有页面状态
                if (index === currentPageIndex) {
                    section.style.zIndex = totalPages;
                    section.style.transform = 'translateX(0%)';
                    section.style.clipPath = 'inset(0 0 0 0)';
                } else {
                    section.style.zIndex = totalPages - Math.abs(index - currentPageIndex);
                    section.style.transform = 'translateX(0%)';
                    if (index < currentPageIndex) {
                        section.style.clipPath = 'inset(0 100% 0 0)'; // 已遮罩的页面
                    } else {
                        section.style.clipPath = 'inset(0 0 0 100%)'; // 未显示的页面
                    }
                }
            });
            
            // 强制重绘所有元素
            sections.forEach(section => section.offsetHeight);
            
            // 恢复过渡动画并允许下一次滚动
            setTimeout(() => {
                sections.forEach(section => {
                    section.style.transition = 'clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                });
                isScrolling = false;
            }, 100); // 增加延迟确保状态完全重置
        }, 650); // 稍微增加延迟确保动画完成

        // 更新滚动指示器
        updateScrollIndicator();
        updateNavigation();
    }

    // 鼠标滚轮事件处理
    document.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        if (isScrolling) return;

        const delta = e.deltaY || e.deltaX;
        
        if (delta > 0) {
            // 向下滚动 - 上一页
            goToPage(currentPageIndex - 1, 'prev');
        } else if (delta < 0) {
            // 向上滚动 - 下一页（从左往右显示）
            goToPage(currentPageIndex + 1, 'next');
        }
    }, { passive: false });



    // 触摸手势支持 - 单指滑动切换页面
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 50; // 最小滑动距离

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (isScrolling) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;

        // 只有水平滑动距离大于垂直滑动距离时才触发页面切换
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // 向左滑动 - 上一页
                goToPage(currentPageIndex - 1, 'prev');
            } else {
                // 向右滑动 - 下一页（从左往右显示）
                goToPage(currentPageIndex + 1, 'next');
            }
        }
    }, { passive: true });


    const navLinks = document.querySelectorAll('nav ul li a');

    // 更新导航链接活动状态
    function updateNavigation() {
        const currentSectionId = sections[currentPageIndex].getAttribute('id');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    }

    // 更新滚动指示器
    function updateScrollIndicator() {
        if (currentPageIndex > 0) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    }

    // 导航链接点击处理
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetIndex = Array.from(sections).findIndex(section => section.id === targetId);
            
            if (targetIndex !== -1 && targetIndex !== currentPageIndex) {
                const direction = targetIndex > currentPageIndex ? 'next' : 'prev';
                goToPage(targetIndex, direction);
            }
        });
    });

    // 初始化页面和导航
    initializePages();
    updateNavigation();
    updateScrollIndicator();

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
    const dividers = document.querySelectorAll('.divider');
    // 为每个项目元素添加点击事件监听器
    projectItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior

            // Get the content ID of the clicked item
            const contentId = this.getAttribute('data-content');

            // Hide all project items
            projectItems.forEach(item => {
                item.classList.add('hide-item');
            });

            dividers.forEach(item => {
                item.classList.add('hide-item');
            });

            // Display new content after 1 second delay
            setTimeout(() => {
                document.getElementById(contentId).style.display = 'block';
            }, 1000);
        });
    });

});
