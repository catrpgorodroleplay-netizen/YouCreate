// CREATE Video Hosting - ОСНОВНАЯ ЛОГИКА
let currentUser = JSON.parse(localStorage.getItem('current_user')) || null;
let currentVideo = null;
let isLoginMode = true;

// Защита от накрутки просмотров
let viewedVideos = JSON.parse(localStorage.getItem('viewed_videos')) || {};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    updateUI();
    loadVideos();
    
    // Назначаем обработчики
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    
    // Обновляем аватар в форме комментария
    updateCommentAvatar();
    
    console.log('🚀 CREATE Video Hosting инициализирован!');
    console.log('📊 Статистика:', getGlobalStats());
}

// ==================== ВИДЕО СИСТЕМА ====================

function loadVideos() {
    const videos = globalDB.getVideos();
    displayVideos(videos, document.getElementById('videoGrid'));
}

function displayVideos(videos, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <h3>🎬 Пока нет видео</h3>
                <p>Будьте первым - загрузите видео и поделитесь им со всем миром!</p>
                <button onclick="showUploadForm()" style="background: #ff0000; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 15px;">
                    📹 Загрузить первое видео
                </button>
            </div>
        `;
        return;
    }
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.onclick = () => playVideo(video);
        
        videoCard.innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" 
                     onerror="this.src='https://via.placeholder.com/350x200/333333/FFFFFF?text=CREATE'">
            </div>
            <div class="video-info">
                <img src="${video.channelAvatar || 'https://ui-avatars.com/api/?name=' + video.channelName + '&background=666'}" 
                     alt="${video.channelName}" class="channel-avatar-small">
                <div class="video-details">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <div class="channel-name">${video.channelName}</div>
                        <div>${formatViews(video.views)} просмотров • ${formatDate(video.uploadDate)}</div>
                        <div style="font-size: 12px; color: #ff4444; margin-top: 2px;">${video.location}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(videoCard);
    });
}

function playVideo(video) {
    currentVideo = video;
    
    const viewKey = `${currentUser ? currentUser.id : 'anonymous'}_${video.id}`;
    
    // Увеличиваем просмотры только если пользователь еще не смотрел
    if (!viewedVideos[viewKey]) {
        globalDB.updateVideoViews(video.id);
        viewedVideos[viewKey] = true;
        localStorage.setItem('viewed_videos', JSON.stringify(viewedVideos));
    }
    
    showSection('videoPage');
    
    // Настраиваем видеоплеер
    const videoPlayer = document.getElementById('mainVideoPlayer');
    const videoTitle = document.getElementById('videoTitle');
    const videoViews = document.getElementById('videoViews');
    const videoDate = document.getElementById('videoDate');
    const videoDescription = document.getElementById('videoDescription');
    const channelName = document.getElementById('channelName');
    const channelAvatar = document.getElementById('channelAvatar');
    const subscribersCount = document.getElementById('subscribersCount');
    const likeCount = document.getElementById('likeCount');
    const dislikeCount = document.getElementById('dislikeCount');
    const videoLocation = document.getElementById('videoLocation');
    
    if (videoPlayer) {
        videoPlayer.src = video.videoUrl;
        videoPlayer.load();
    }
    if (videoTitle) videoTitle.textContent = video.title;
    if (videoViews) videoViews.textContent = formatViews(video.views) + ' просмотров';
    if (videoDate) videoDate.textContent = formatDate(video.uploadDate);
    if (videoDescription) videoDescription.textContent = video.description || 'Нет описания';
    if (channelName) channelName.textContent = video.channelName;
    if (channelAvatar) channelAvatar.src = video.channelAvatar || `https://ui-avatars.com/api/?name=${video.channelName}&background=666&color=fff`;
    if (subscribersCount) subscribersCount.textContent = formatViews(video.subscribers || 0) + ' подписчиков';
    if (likeCount) likeCount.textContent = video.likes || 0;
    if (dislikeCount) dislikeCount.textContent = video.dislikes || 0;
    if (videoLocation) videoLocation.textContent = video.location || '🌍 Global';
    
    updateReactionButtons();
    loadComments(video.id);
}

// ==================== КОММЕНТАРИИ ====================

function loadComments(videoId) {
    const comments = globalDB.getComments(videoId);
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    
    if (!commentsList) return;
    
    if (commentsCount) commentsCount.textContent = comments.length;
    commentsList.innerHTML = '';
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="loading">Пока нет комментариев</div>';
        return;
    }
    
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <img src="${comment.userAvatar || 'https://ui-avatars.com/api/?name=' + comment.username + '&background=666'}" 
                 alt="${comment.username}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.username}</span>
                    <span class="comment-time">${formatDate(comment.timestamp)}</span>
                    <span class="location" style="background: #444; padding: 2px 6px; border-radius: 8px; font-size: 10px;">${comment.location}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `;
        commentsList.appendChild(commentElement);
    });
}

function addComment() {
    if (!currentUser) {
        alert('Войдите в аккаунт чтобы комментировать');
        toggleAuth();
        return;
    }
    
    const commentText = document.getElementById('commentText');
    const text = commentText.value.trim();
    
    if (!text) {
        alert('Введите текст комментария');
        return;
    }
    
    if (!currentVideo) return;
    
    globalDB.addComment(currentVideo.id, {
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        text: text
    });
    
    commentText.value = '';
    loadComments(currentVideo.id);
    alert('💬 Комментарий добавлен! Теперь его увидят все пользователи по всему миру!');
}

function clearComment() {
    const commentText = document.getElementById('commentText');
    if (commentText) commentText.value = '';
}

function updateCommentAvatar() {
    const avatarInput = document.getElementById('userAvatarInput');
    if (avatarInput && currentUser) {
        avatarInput.src = currentUser.avatar;
    }
}

// ==================== ЛАЙКИ И РЕАКЦИИ ====================

function likeVideo() {
    if (!currentUser) {
        toggleAuth();
        return;
    }
    
    if (!currentVideo) return;
    
    const result = globalDB.addReaction(currentVideo.id, currentUser.id, 'like');
    
    if (result) {
        const likeCount = document.getElementById('likeCount');
        const dislikeCount = document.getElementById('dislikeCount');
        if (likeCount) likeCount.textContent = result.likes;
        if (dislikeCount) dislikeCount.textContent = result.dislikes;
        
        updateReactionButtons();
        alert('👍 Лайк добавлен!');
    }
}

function dislikeVideo() {
    if (!currentUser) {
        toggleAuth();
        return;
    }
    
    if (!currentVideo) return;
    
    const result = globalDB.addReaction(currentVideo.id, currentUser.id, 'dislike');
    
    if (result) {
        const likeCount = document.getElementById('likeCount');
        const dislikeCount = document.getElementById('dislikeCount');
        if (likeCount) likeCount.textContent = result.likes;
        if (dislikeCount) dislikeCount.textContent = result.dislikes;
        
        updateReactionButtons();
        alert('👎 Дизлайк добавлен!');
    }
}

function updateReactionButtons() {
    if (!currentUser || !currentVideo) return;
    
    const reaction = globalDB.getUserReaction(currentVideo.id, currentUser.id);
    
    const likeBtn = document.querySelector('.like-btn');
    const dislikeBtn = document.querySelector('.dislike-btn');
    
    if (likeBtn) likeBtn.classList.remove('active');
    if (dislikeBtn) dislikeBtn.classList.remove('active');
    
    if (reaction === 'like' && likeBtn) {
        likeBtn.classList.add('active');
    } else if (reaction === 'dislike' && dislikeBtn) {
        dislikeBtn.classList.add('active');
    }
}

function subscribeToChannel() {
    if (!currentUser) {
        toggleAuth();
        return;
    }
    
    const btn = document.getElementById('subscribeBtn');
    if (!btn) return;
    
    if (btn.textContent.includes('Подписаться')) {
        btn.textContent = '✅ Подписан';
        btn.style.background = '#3ea6ff';
        if (currentVideo) {
            currentVideo.subscribers = (currentVideo.subscribers || 0) + 1;
            globalDB.saveData();
        }
        alert('📋 Подписка оформлена!');
    } else {
        btn.textContent = 'Подписаться';
        btn.style.background = '#ff0000';
        if (currentVideo && currentVideo.subscribers > 0) {
            currentVideo.subscribers--;
            globalDB.saveData();
        }
        alert('❌ Подписка отменена!');
    }
}

// ==================== ЗАГРУЗКА ВИДЕО ====================

function showUploadForm() {
    if (!currentUser) {
        toggleAuth();
        return;
    }
    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) uploadModal.style.display = 'block';
}

function handleUpload(e) {
    if (e) e.preventDefault();
    
    if (!currentUser) {
        alert('Войдите в аккаунт чтобы загружать видео');
        return;
    }
    
    const titleInput = document.getElementById('videoTitleInput');
    const descriptionInput = document.getElementById('videoDescriptionInput');
    const videoFileInput = document.getElementById('videoFile');
    const thumbnailFileInput = document.getElementById('thumbnailFile');
    
    if (!titleInput || !titleInput.value) {
        alert('Введите название видео');
        return;
    }
    
    if (!videoFileInput || !videoFileInput.files[0]) {
        alert('Выберите видео файл');
        return;
    }
    
    const title = titleInput.value;
    const description = descriptionInput ? descriptionInput.value : '';
    const videoFile = videoFileInput.files[0];
    const thumbnailFile = thumbnailFileInput ? thumbnailFileInput.files[0] : null;
    
    if (videoFile.size > 500 * 1024 * 1024) {
        alert('Размер видео не должен превышать 500MB');
        return;
    }
    
    const videoUrl = URL.createObjectURL(videoFile);
    let thumbnailUrl = `https://via.placeholder.com/1280x720/ff0000/FFFFFF?text=${encodeURIComponent(title)}`;
    
    if (thumbnailFile) {
        thumbnailUrl = URL.createObjectURL(thumbnailFile);
    }
    
    const newVideo = globalDB.addVideo({
        title: title,
        description: description,
        videoUrl: videoUrl,
        thumbnail: thumbnailUrl,
        channelName: currentUser.username,
        channelAvatar: currentUser.avatar,
        userId: currentUser.id
    });
    
    closeModal('uploadModal');
    if (titleInput) titleInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (videoFileInput) videoFileInput.value = '';
    if (thumbnailFileInput) thumbnailFileInput.value = '';
    
    loadVideos();
    
    alert(`✅ ВИДЕО ЗАГРУЖЕНО!\n\n"${title}"\n\nТеперь его увидят все пользователи по всему миру!\n\n🌎 Россия, США, Европа, Азия - все смогут смотреть ваше видео!`);
}

// ==================== АВТОРИЗАЦИЯ ====================

function toggleAuth() {
    isLoginMode = true;
    updateAuthModal();
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'block';
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthModal();
}

function updateAuthModal() {
    const authTitle = document.querySelector('#authModal h2');
    const authSubmitBtn = document.querySelector('#authModal .submit-btn');
    const authSwitch = document.querySelector('.auth-switch');
    
    if (authTitle) {
        authTitle.textContent = isLoginMode ? 'Вход в CREATE' : 'Регистрация';
    }
    if (authSubmitBtn) {
        authSubmitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
    }
    if (authSwitch) {
        authSwitch.innerHTML = isLoginMode ? 
            'Нет аккаунта? <a href="#" onclick="toggleAuthMode()">Зарегистрироваться</a>' :
            'Уже есть аккаунт? <a href="#" onclick="toggleAuthMode()">Войти</a>';
    }
}

function handleAuth(e) {
    if (e) e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput || !usernameInput.value) {
        alert('Введите имя пользователя');
        return;
    }
    
    const username = usernameInput.value;
    const email = emailInput ? emailInput.value : `${username}@create.com`;
    const password = passwordInput ? passwordInput.value : 'default123';
    
    const userData = {
        username: username,
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=ff0000&color=fff&size=128`
    };
    
    currentUser = globalDB.addUser(userData);
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
    closeModal('authModal');
    updateUI();
    updateCommentAvatar();
    
    alert(`🎉 Добро пожаловать, ${username}!\n\nТеперь вы можете загружать видео и комментировать!`);
}

// ==================== УТИЛИТЫ ====================

function updateUI() {
    const authBtn = document.getElementById('authBtn');
    const uploadBtn = document.querySelector('.upload-btn');
    
    if (currentUser) {
        if (authBtn) {
            authBtn.innerHTML = `<img src="${currentUser.avatar}" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid #ff0000;" alt="${currentUser.username}">`;
        }
        if (uploadBtn) uploadBtn.style.display = 'block';
    } else {
        if (authBtn) authBtn.innerHTML = '👤';
        if (uploadBtn) uploadBtn.style.display = 'none';
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    
    if (sectionId === 'home') {
        loadVideos();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function searchVideos() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (query.length === 0) {
        loadVideos();
        return;
    }
    
    const results = globalDB.searchVideos(query);
    displayVideos(results, document.getElementById('videoGrid'));
}

function shareVideo() {
    if (!currentVideo) return;
    
    const videoUrl = window.location.href.split('?')[0] + `?video=${currentVideo.id}`;
    navigator.clipboard.writeText(videoUrl).then(() => {
        alert('🔗 Ссылка на видео скопирована! Отправьте другу в любой стране!');
    });
}

function formatViews(views) {
    views = parseInt(views) || 0;
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
}

function formatDate(dateString) {
    if (!dateString) return 'недавно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дней назад`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} недель${weeks === 1 ? 'у' : 'и'} назад`;
    }
    return date.toLocaleDateString('ru-RU');
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

window.showSection = showSection;
window.toggleAuth = toggleAuth;
window.toggleAuthMode = toggleAuthMode;
window.closeModal = closeModal;
window.searchVideos = searchVideos;
window.showUploadForm = showUploadForm;
window.playVideo = playVideo;
window.addComment = addComment;
window.clearComment = clearComment;
window.likeVideo = likeVideo;
window.dislikeVideo = dislikeVideo;
window.subscribeToChannel = subscribeToChannel;
window.shareVideo = shareVideo;
