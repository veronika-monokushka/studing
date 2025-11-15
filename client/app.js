// Базовый URL API (будет работать с вашим сервером)
const API_URL = '/api/comments';

// Текущий пользователь (никнейм)
let currentUser = '';
// Кэш комментариев
let commentsCache = [];

// Функция для получения комментариев с сервера
async function getComments() {
    try {
        console.log('Загрузка комментариев с сервера...');
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const comments = await response.json();
        commentsCache = comments;
        console.log('Загружено комментариев:', commentsCache.length);
        return commentsCache;
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
        showError('Не удалось загрузить комментарии. Проверьте подключение к интернету.');
        return [];
    }
}

// Функция для отправки комментария на сервер
async function addCommentToServer(commentData) {
    console.log('Отправляемые данные:', commentData);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(commentData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ответ сервера:', errorText);
            throw new Error(`HTTP error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Успешный ответ сервера:', result);
        return result;
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        throw error;
    }
}

// Функция для создания DOM-элемента комментария
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.dataset.id = comment.id;
    commentDiv.dataset.author = comment.author;
    commentDiv.dataset.timestamp = comment.timestamp;
    
    // Определяем класс для специальных авторов
    let authorClass = '';
    if (comment.author === 'Настя') {
        authorClass = 'nastya-comment';
    } else if (comment.author === 'Вероника') {
        authorClass = 'veronika-comment';
    }
    
    // Проверяем, может ли текущий пользователь удалить этот комментарий
    const canDelete = currentUser && comment.author === currentUser;
    
    commentDiv.innerHTML = `
        <div class="comment-header ${authorClass}">
            <strong>${comment.author}</strong>
            <span class="comment-date">${comment.date}</span>
            <button class="delete-btn ${canDelete ? '' : 'hidden'}" 
                    onclick="deleteComment(${comment.id})" 
                    title="${canDelete ? 'Удалить комментарий' : 'Вы можете удалять только свои комментарии'}">
                ×
            </button>
        </div>
        <div class="comment-text">${comment.text}</div>
    `;
    
    return commentDiv;
}

// Функция для отображения всех комментариев
function displayComments(comments = commentsCache) {
    const commentsList = document.getElementById('comments-list');
    
    if (!commentsList) {
        console.error('Элемент comments-list не найден!');
        return;
    }
    
    commentsList.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="loading">Пока нет комментариев. Будьте первым!</div>';
        console.log('Отображено сообщение: нет комментариев');
        return;
    }
    
    console.log('Отображаем комментарии:', comments.length, comments);
    
    // Сортируем комментарии по дате (новые сверху)
    const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedComments.forEach(comment => {
        console.log('Добавляем комментарий:', comment);
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
    
    // Обновляем кнопки удаления после отображения
    updateDeleteButtons();
}

// Функция для обновления кнопок удаления (без перезагрузки комментариев)
function updateDeleteButtons() {
    const comments = document.querySelectorAll('.comment');
    console.log('Обновление кнопок удаления для', comments.length, 'комментариев');
    
    comments.forEach(comment => {
        const commentAuthor = comment.dataset.author;
        const deleteBtn = comment.querySelector('.delete-btn');
        const canDelete = currentUser && commentAuthor === currentUser;
        
        if (deleteBtn) {
            if (canDelete) {
                deleteBtn.classList.remove('hidden');
                deleteBtn.title = 'Удалить комментарий';
            } else {
                deleteBtn.classList.add('hidden');
                deleteBtn.title = 'Вы можете удалять только свои комментарии';
            }
        }
    });
}

// Функция для добавления нового комментария через манипуляцию DOM
async function addComment(author, text) {
    // Обрезаем никнейм если слишком длинный
    const trimmedAuthor = author.trim().substring(0, 50);
    
    // Если никнейм пустой, используем "Аноним"
    const finalAuthor = trimmedAuthor || 'Аноним';
    
    const newComment = {
        author: finalAuthor,
        text: text.trim()
    };
    
    try {
        const result = await addCommentToServer(newComment);
        
        // ДОБАВЛЯЕМ КОММЕНТАРИЙ ЧЕРЕЗ МАНИПУЛЯЦИЮ DOM
        addCommentToDOM(result.comment);
        
    } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        showError('Не удалось отправить комментарий. Проверьте данные и попробуйте снова.');
    }
}

// Функция: Добавление комментария в DOM без перезагрузки с правильной сортировкой
function addCommentToDOM(newComment) {
    const commentsList = document.getElementById('comments-list');
    
    if (!commentsList) {
        console.error('Элемент comments-list не найден!');
        return;
    }
    
    // Убираем сообщение "Пока нет комментариев"
    if (commentsList.querySelector('.loading')) {
        commentsList.innerHTML = '';
    }
    
    // Создаем элемент комментария
    const commentElement = createCommentElement(newComment);
    
    // Находим правильную позицию для вставки (сортировка от новых к старым)
    const existingComments = Array.from(commentsList.children);
    let insertBeforeElement = null;
    
    for (let i = 0; i < existingComments.length; i++) {
        const existingComment = existingComments[i];
        const existingTimestamp = new Date(existingComment.dataset.timestamp).getTime();
        const newTimestamp = new Date(newComment.timestamp).getTime();
        
        // Сравниваем timestamp нового комментария с существующими
        if (newTimestamp > existingTimestamp) {
            insertBeforeElement = existingComment;
            break;
        }
    }
    
    // Вставляем комментарий в правильную позицию
    if (insertBeforeElement) {
        commentsList.insertBefore(commentElement, insertBeforeElement);
    } else {
        // Если не нашли подходящую позицию, добавляем в конец
        commentsList.appendChild(commentElement);
    }
    
    // Обновляем кэш
    commentsCache.unshift(newComment);
    
    // Обновляем кнопки удаления
    updateDeleteButtons();
    
    console.log('Комментарий добавлен в DOM через манипуляцию');
}

// Функция для удаления комментария через манипуляцию DOM
async function deleteComment(commentId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }
    
    try {
        // Проверяем, что пользователь может удалить этот комментарий
        const commentToDelete = commentsCache.find(comment => comment.id === commentId);
        if (!commentToDelete) {
            showError('Комментарий не найден.');
            return;
        }
        
        if (commentToDelete.author !== currentUser) {
            showError('Вы можете удалять только свои комментарии.');
            return;
        }
        
        // УДАЛЯЕМ ИЗ DOM через манипуляцию
        const commentElement = document.querySelector(`.comment[data-id="${commentId}"]`);
        if (commentElement) {
            commentElement.remove();
        }
        
        // Отправляем запрос на удаление на сервер
        const response = await fetch(`${API_URL}/${commentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Обновляем кэш
            commentsCache = commentsCache.filter(comment => comment.id !== commentId);
            console.log('Комментарий удален, обновлен кэш:', commentsCache.length);
            
            // Если комментариев не осталось, показываем сообщение
            if (commentsCache.length === 0) {
                const commentsList = document.getElementById('comments-list');
                commentsList.innerHTML = '<div class="loading">Пока нет комментариев. Будьте первым!</div>';
            }
        } else {
            const errorText = await response.text();
            console.error('Ошибка сервера при удалении:', errorText);
            throw new Error(`Ошибка при удалении комментария: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка удаления комментария:', error);
        showError('Не удалось удалить комментарий.');
    }
}

// Функция для показа ошибок
function showError(message) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) {
        console.error('Не могу показать ошибку: comments-list не найден');
        return;
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    commentsList.appendChild(errorDiv);
    
    // Автоматически скрываем ошибку через 5 секунд
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Инициализация при загрузке страницы
async function init() {
    console.log('Инициализация приложения...');
    
    // Загружаем комментарии при старте
    await getComments();
    console.log('Комментарии загружены в кэш:', commentsCache);
    
    // Отображаем комментарии
    displayComments();
    console.log('Комментарии отображены');
    
    // Восстанавливаем никнейм из sessionStorage (вместо localStorage)
    const savedUser = sessionStorage.getItem('commentUser');
    if (savedUser) {
        currentUser = savedUser;
        const authorInput = document.getElementById('author');
        if (authorInput) {
            authorInput.value = savedUser;
        }
        updateDeleteButtons();
    }
}

// Обработчик отправки формы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запускаем инициализацию...');
    
    // Инициализируем приложение
    init();
    
    const authorInput = document.getElementById('author');
    const commentForm = document.getElementById('new-comment-form');
    
    if (!authorInput || !commentForm) {
        console.error('Не найдены необходимые элементы формы!');
        return;
    }
    
    // Обновляем текущего пользователя при уходе с поля ввода
    authorInput.addEventListener('blur', function() {
        const newUser = this.value.trim();
        if (newUser !== currentUser) {
            currentUser = newUser;
            // Сохраняем в sessionStorage (в рамках одной сессии)
            sessionStorage.setItem('commentUser', newUser);
            // Обновляем только кнопки удаления, без перезагрузки комментариев
            updateDeleteButtons();
        }
    });
    
    // Также обновляем при нажатии Enter в поле имени
    authorInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // Эмулируем уход с поля
        }
    });
    
    commentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const author = authorInput.value;
        const text = document.getElementById('comment-text').value;
        
        if (author.trim() && text.trim()) {
            // Блокируем кнопку на время отправки
            const submitButton = commentForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
            
            try {
                await addComment(author, text);
            } finally {
                // Разблокируем кнопку и очищаем поле комментария (ник сохраняем)
                submitButton.disabled = false;
                submitButton.textContent = originalText;
                document.getElementById('comment-text').value = '';
            }
        } else {
            alert('Пожалуйста, заполните все поля');
        }
    });
});