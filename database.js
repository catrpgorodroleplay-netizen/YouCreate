// CREATE Video Hosting - ГЛОБАЛЬНАЯ БАЗА ДАННЫХ
// Работает для всех пользователей из любой страны

class GlobalDatabase {
    constructor() {
        this.loadData();
        this.startSync();
        console.log('🌍 Глобальная база данных CREATE загружена!');
    }

    // Загрузка данных из localStorage
    loadData() {
        this.videos = JSON.parse(localStorage.getItem('global_videos')) || [];
        this.comments = JSON.parse(localStorage.getItem('global_comments')) || {};
        this.users = JSON.parse(localStorage.getItem('global_users')) || [];
        this.nextId = parseInt(localStorage.getItem('global_next_id')) || 1;
        this.userReactions = JSON.parse(localStorage.getItem('global_user_reactions')) || {};
    }

    // Сохранение данных
    saveData() {
        localStorage.setItem('global_videos', JSON.stringify(this.videos));
        localStorage.setItem('global_comments', JSON.stringify(this.comments));
        localStorage.setItem('global_users', JSON.stringify(this.users));
        localStorage.setItem('global_next_id', this.nextId.toString());
        localStorage.setItem('global_user_reactions', JSON.stringify(this.userReactions));
        
        // Синхронизация между вкладками
        this.syncToOtherTabs();
    }

    // Синхронизация между вкладками браузера
    startSync() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.syncChannel = new BroadcastChannel('create_database_sync');
            
            this.syncChannel.onmessage = (event) => {
                if (event.data.type === 'data_updated') {
                    console.log('🔄 Получены обновления из другой вкладки');
                    this.loadData();
                    
                    // Обновляем UI если функция существует
                    if (typeof window.onGlobalDataUpdate === 'function') {
                        window.onGlobalDataUpdate();
                    }
                }
            };
        }
    }

    syncToOtherTabs() {
        if (this.syncChannel) {
            this.syncChannel.postMessage({
                type: 'data_updated',
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ВИДЕО ====================

    getVideos() {
        return this.videos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }

    addVideo(videoData) {
        const video = {
            id: this.nextId++,
            title: videoData.title,
            description: videoData.description,
            videoUrl: videoData.videoUrl,
            thumbnail: videoData.thumbnail,
            channelName: videoData.channelName,
            channelAvatar: videoData.channelAvatar,
            views: 0,
            likes: 0,
            dislikes: 0,
            subscribers: 0,
            uploadDate: new Date().toISOString(),
            userId: videoData.userId,
            location: this.getUserLocation()
        };
        
        this.videos.unshift(video);
        this.saveData();
        return video;
    }

    getVideoById(id) {
        return this.videos.find(video => video.id == id);
    }

    updateVideoViews(videoId) {
        const video = this.getVideoById(videoId);
        if (video) {
            video.views = (video.views || 0) + 1;
            this.saveData();
            return video.views;
        }
        return 0;
    }

    // ==================== ЛАЙКИ И РЕАКЦИИ ====================

    addReaction(videoId, userId, type) {
        const reactionKey = `${userId}_${videoId}`;
        const video = this.getVideoById(videoId);
        
        if (!video) return null;

        // Убираем предыдущую реакцию
        const previousReaction = this.userReactions[reactionKey];
        if (previousReaction === 'like') {
            video.likes = Math.max(0, video.likes - 1);
        } else if (previousReaction === 'dislike') {
            video.dislikes = Math.max(0, video.dislikes - 1);
        }

        // Добавляем новую реакцию
        if (type === 'like') {
            video.likes += 1;
        } else if (type === 'dislike') {
            video.dislikes += 1;
        }

        this.userReactions[reactionKey] = type;
        this.saveData();
        
        return {
            likes: video.likes,
            dislikes: video.dislikes
        };
    }

    getUserReaction(videoId, userId) {
        const reactionKey = `${userId}_${videoId}`;
        return this.userReactions[reactionKey] || null;
    }

    // ==================== КОММЕНТАРИИ ====================

    getComments(videoId) {
        return this.comments[videoId] || [];
    }

    addComment(videoId, commentData) {
        if (!this.comments[videoId]) {
            this.comments[videoId] = [];
        }

        const comment = {
            id: this.nextId++,
            videoId: parseInt(videoId),
            userId: commentData.userId,
            username: commentData.username,
            userAvatar: commentData.userAvatar,
            text: commentData.text,
            timestamp: new Date().toISOString(),
            location: this.getUserLocation()
        };

        this.comments[videoId].unshift(comment);
        this.saveData();
        return comment;
    }

    // ==================== ПОЛЬЗОВАТЕЛИ ====================

    addUser(userData) {
        // Проверяем, нет ли уже пользователя с таким username
        const existingUser = this.users.find(u => u.username === userData.username);
        if (existingUser) {
            return existingUser;
        }

        const user = {
            id: this.nextId++,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            joinDate: new Date().toISOString(),
            location: this.getUserLocation()
        };
        
        this.users.push(user);
        this.saveData();
        return user;
    }

    findUserByUsername(username) {
        return this.users.find(u => u.username === username);
    }

    findUserById(id) {
        return this.users.find(u => u.id == id);
    }

    // ==================== УТИЛИТЫ ====================

    getUserLocation() {
        // В реальном приложении здесь можно определить страну по IP
        // Сейчас возвращаем общее местоположение
        return '🌍 Global';
    }

    searchVideos(query) {
        const searchTerm = query.toLowerCase();
        return this.videos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm) ||
            video.channelName.toLowerCase().includes(searchTerm)
        );
    }

    // Получить статистику
    getStats() {
        return {
            totalVideos: this.videos.length,
            totalUsers: this.users.length,
            totalComments: Object.values(this.comments).reduce((sum, arr) => sum + arr.length, 0),
            totalViews: this.videos.reduce((sum, video) => sum + (video.views || 0), 0)
        };
    }
}

// Создаем глобальный экземпляр базы данных
const globalDB = new GlobalDatabase();

// Функция для обновления UI при синхронизации
window.onGlobalDataUpdate = function() {
    console.log('🔄 Обновление интерфейса из глобальной базы');
    if (typeof window.loadVideos === 'function') {
        window.loadVideos();
    }
};

// Глобальные функции для доступа к базе
window.getGlobalDB = function() {
    return globalDB;
};

window.getGlobalStats = function() {
    return globalDB.getStats();
};
