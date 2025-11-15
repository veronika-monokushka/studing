const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Хранилище комментариев
const COMMENTS_FILE = path.join(__dirname, 'comments.json');

// Инициализация файла комментариев
async function initializeCommentsFile() {
    try {
        await fs.access(COMMENTS_FILE);
    } catch (error) {
        // Файл не существует, создаем пустой массив
        await fs.writeFile(COMMENTS_FILE, JSON.stringify([], null, 2));
        console.log('Файл комментариев создан');
    }
}

// Получить все комментарии
app.get('/api/comments', async (req, res) => {
    try {
        const data = await fs.readFile(COMMENTS_FILE, 'utf8');
        const comments = JSON.parse(data);
        res.json(comments);
    } catch (error) {
        console.error('Ошибка чтения файла:', error);
        res.json([]);
    }
});

// Добавить комментарий
app.post('/api/comments', async (req, res) => {
    try {
        const { author, text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Текст комментария обязателен' });
        }

        const newComment = {
            id: Date.now(),
            author: author?.trim() || 'Аноним',
            text: text.trim(),
            date: new Date().toLocaleString('ru-RU'),
            timestamp: new Date().toISOString()
        };

        // Читаем существующие комментарии
        let comments = [];
        try {
            const data = await fs.readFile(COMMENTS_FILE, 'utf8');
            comments = JSON.parse(data);
        } catch (error) {
            comments = [];
        }

        // Добавляем новый комментарий
        comments.push(newComment);
        
        // Сохраняем обратно
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2));
        
        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить комментарий
app.delete('/api/comments/:id', async (req, res) => {
    try {
        const commentId = parseInt(req.params.id);
        
        if (isNaN(commentId)) {
            return res.status(400).json({ error: 'Неверный ID комментария' });
        }

        // Читаем существующие комментарии
        let comments = [];
        try {
            const data = await fs.readFile(COMMENTS_FILE, 'utf8');
            comments = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({ error: 'Комментарии не найдены' });
        }

        // Фильтруем комментарии
        const updatedComments = comments.filter(comment => comment.id !== commentId);
        
        // Если количество не изменилось - комментарий не найден
        if (comments.length === updatedComments.length) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }

        // Сохраняем обновленный список
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(updatedComments, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка удаления комментария:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обслуживание статических файлов
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Инициализация и запуск сервера
async function startServer() {
    await initializeCommentsFile();
    
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`📝 API доступно по адресу: http://localhost:${PORT}/api/comments`);
        console.log(`🌐 Веб-приложение: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
