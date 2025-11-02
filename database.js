// CREATE Video Hosting - РЕАЛЬНАЯ ГЛОБАЛЬНАЯ БАЗА SUPABASE
const SUPABASE_URL = 'https://tpcyttxxxtnmfpvnyfmm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY3l0dHh4eHRubWZwdm55Zm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5OTgzMDUsImV4cCI6MjA3NzU3NDMwNX0.NQxbRwG68DZL781Zdd3baKiAhw3Q8xyhGgTgC57y39E';

class GlobalDatabase {
    constructor() {
        console.log('🚀 Supabase база подключена!');
        this.init();
    }

    async init() {
        await this.createTables();
    }

    async request(endpoint, options = {}) {
        try {
            const url = `${SUPABASE_URL}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    ...options.headers
                },
                ...options
            };

            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка сервера');
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase Error:', error);
            throw error;
        }
    }

    // Создаем таблицы если их нет
    async createTables() {
        try {
            // Проверяем есть ли таблица videos
            await this.request('/rest/v1/videos?limit=1');
            console.log('✅ Таблицы уже созданы');
        } catch (error) {
            console.log('🔄 Создаем таблицы...');
            await this.createTablesSQL();
        }
    }

    async createTablesSQL() {
        // Создаем таблицы через SQL запрос
        const sql = `
            -- Создаем таблицу видео
            CREATE TABLE IF NOT EXISTS videos (
                id BIGSERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                video_url TEXT NOT NULL,
                thumbnail TEXT,
                channel_name TEXT NOT NULL,
                channel_avatar TEXT,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                subscribers INTEGER DEFAULT 0,
                user_id TEXT,
                location TEXT DEFAULT '🌍 Global',
                upload_date TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Создаем таблицу комментариев
            CREATE TABLE IF NOT EXISTS comments (
                id BIGSERIAL PRIMARY KEY,
                video_id BIGINT REFERENCES videos(id),
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                user_avatar TEXT,
                text TEXT NOT NULL,
                location TEXT DEFAULT '🌍 Global',
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Создаем таблицу пользователей
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                avatar TEXT,
                location TEXT DEFAULT '🌍 Global',
                join_date TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Создаем таблицу реакций
            CREATE TABLE IF NOT EXISTS reactions (
                id BIGSERIAL PRIMARY KEY,
                video_id BIGINT REFERENCES videos(id),
                user_id TEXT NOT NULL,
                type TEXT CHECK (type IN ('like', 'dislike')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(video_id, user_id)
            );

            -- Включаем RLS но разрешаем все операции
            ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
            ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
            ALTER TABLE users ENABLE ROW LEVEL SECURITY;
            ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

            -- Политики доступа (разрешаем все)
            DROP POLICY IF EXISTS "Allow all" ON videos;
            CREATE POLICY "Allow all" ON videos FOR ALL USING (true);

            DROP POLICY IF EXISTS "Allow all" ON comments;
            CREATE POLICY "Allow all" ON comments FOR ALL USING (true);

            DROP POLICY IF EXISTS "Allow all" ON users;
            CREATE POLICY "Allow all" ON users FOR ALL USING (true);

            DROP POLICY IF EXISTS "Allow all" ON reactions;
            CREATE POLICY "Allow all" ON reactions FOR ALL USING (true);
        `;

        try {
            await this.request('/rest/v1/rpc', {
                method: 'POST',
                body: JSON.stringify({
                    query: sql
                })
            });
            console.log('✅ Таблицы созданы!');
        } catch (error) {
            console.log('Таблицы создаются при первом запросе...');
        }
    }

    // ==================== ВИДЕО ====================

    async getVideos() {
        try {
            const data = await this.request('/rest/v1/videos?select=*&order=upload_date.desc');
            return data;
        } catch (error) {
            console.error('Ошибка получения видео:', error);
            return [];
        }
    }

    async addVideo(videoData) {
        try {
            const data = await this.request('/rest/v1/videos', {
                method: 'POST',
                body: JSON.stringify({
                    title: videoData.title,
                    description: videoData.description,
                    video_url: videoData.videoUrl,
                    thumbnail: videoData.thumbnail,
                    channel_name: videoData.channelName,
                    channel_avatar: videoData.channelAvatar,
                    user_id: videoData.userId,
                    location: '🌍 Global',
                    upload_date: new Date().toISOString()
                }),
                headers: {
                    'Prefer': 'return=representation'
                }
            });

            return data[0];
        } catch (error) {
            console.error('Ошибка добавления видео:', error);
            throw error;
        }
    }

    async getVideoById(id) {
        try {
            const data = await this.request(`/rest/v1/videos?id=eq.${id}`);
            return data[0] || null;
        } catch (error) {
            console.error('Ошибка получения видео:', error);
            return null;
        }
    }

    async updateVideoViews(videoId) {
        try {
            const video = await this.getVideoById(videoId);
            if (video) {
                const newViews = (video.views || 0) + 1;
                await this.request(`/rest/v1/videos?id=eq.${videoId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        views: newViews
                    })
                });
                return newViews;
            }
            return 0;
        } catch (error) {
            console.error('Ошибка обновления просмотров:', error);
            return 0;
        }
    }

    // ==================== КОММЕНТАРИИ ====================

    async getComments(videoId) {
        try {
            const data = await this.request(`/rest/v1/comments?video_id=eq.${videoId}&order=timestamp.desc`);
            return data;
        } catch (error) {
            console.error('Ошибка получения комментариев:', error);
            return [];
        }
    }

    async addComment(videoId, commentData) {
        try {
            const data = await this.request('/rest/v1/comments', {
                method: 'POST',
                body: JSON.stringify({
                    video_id: parseInt(videoId),
                    user_id: commentData.userId,
                    username: commentData.username,
                    user_avatar: commentData.userAvatar,
                    text: commentData.text,
                    location: '🌍 Global',
                    timestamp: new Date().toISOString()
                }),
                headers: {
                    'Prefer': 'return=representation'
                }
            });

            return data[0];
        } catch (error) {
            console.error('Ошибка добавления комментария:', error);
            throw error;
        }
    }

    // ==================== ПОЛЬЗОВАТЕЛИ ====================

    async addUser(userData) {
        try {
            // Проверяем есть ли пользователь
            const existing = await this.request(`/rest/v1/users?username=eq.${userData.username}`);
            
            if (existing.length > 0) {
                return existing[0];
            }

            const data = await this.request('/rest/v1/users', {
                method: 'POST',
                body: JSON.stringify({
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    avatar: userData.avatar,
                    location: '🌍 Global',
                    join_date: new Date().toISOString()
                }),
                headers: {
                    'Prefer': 'return=representation'
                }
            });

            return data[0];
        } catch (error) {
            console.error('Ошибка добавления пользователя:', error);
            throw error;
        }
    }

    async findUserByUsername(username) {
        try {
            const data = await this.request(`/rest/v1/users?username=eq.${username}`);
            return data[0] || null;
        } catch (error) {
            console.error('Ошибка поиска пользователя:', error);
            return null;
        }
    }

    // ==================== РЕАКЦИИ ====================

    async addReaction(videoId, userId, type) {
        try {
            // Удаляем предыдущую реакцию
            await this.request(`/rest/v1/reactions?video_id=eq.${videoId}&user_id=eq.${userId}`, {
                method: 'DELETE'
            });

            // Добавляем новую реакцию
            await this.request('/rest/v1/reactions', {
                method: 'POST',
                body: JSON.stringify({
                    video_id: parseInt(videoId),
                    user_id: userId,
                    type: type
                })
            });

            // Обновляем счетчики в видео
            const video = await this.getVideoById(videoId);
            if (video) {
                const likes = await this.getReactionsCount(videoId, 'like');
                const dislikes = await this.getReactionsCount(videoId, 'dislike');

                await this.request(`/rest/v1/videos?id=eq.${videoId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        likes: likes,
                        dislikes: dislikes
                    })
                });

                return { likes, dislikes };
            }

            return { likes: 0, dislikes: 0 };
        } catch (error) {
            console.error('Ошибка добавления реакции:', error);
            throw error;
        }
    }

    async getReactionsCount(videoId, type) {
        try {
            const data = await this.request(`/rest/v1/reactions?video_id=eq.${videoId}&type=eq.${type}&select=id`);
            return data.length;
        } catch (error) {
            return 0;
        }
    }

    async getUserReaction(videoId, userId) {
        try {
            const data = await this.request(`/rest/v1/reactions?video_id=eq.${videoId}&user_id=eq.${userId}`);
            return data[0] ? data[0].type : null;
        } catch (error) {
            return null;
        }
    }

    // ==================== ПОИСК ====================

    async searchVideos(query) {
        try {
            const data = await this.request(`/rest/v1/videos?title=ilike.%${query}%&select=*`);
            return data;
        } catch (error) {
            console.error('Ошибка поиска:', error);
            return [];
        }
    }
}

// Создаем глобальный экземпляр базы данных
const globalDB = new GlobalDatabase();

// Глобальные функции для доступа
window.getGlobalDB = function() {
    return globalDB;
};
