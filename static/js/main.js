document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const messagesDiv = document.getElementById('messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const qrButton = document.getElementById('qr-button');
    const typingStatus = document.getElementById('typing-status');
    const createSessionModal = document.getElementById('create-session-modal');
    const createSessionButton = document.getElementById('create-session-button');
    const sessionNameInput = document.getElementById('session-name');
    const usernameInput = document.getElementById('username');
    const pdfViewer = document.getElementById('pdf-viewer');

    let currentUsername = '';
    let sessionId = '';
    let isCreator = false;

    // Показать модальное окно при загрузке страницы
    createSessionModal.style.display = 'flex';

    // Создание сессии
    createSessionButton.addEventListener('click', () => {
        const sessionName = sessionNameInput.value.trim();
        const username = usernameInput.value.trim();

        if (!sessionName || !username) {
            alert('Пожалуйста, заполните все поля.');
            return;
        }

        // Генерация уникального идентификатора сессии
        sessionId = generateUUID();
        currentUsername = username;
        isCreator = true;

        // Скрыть модальное окно
        createSessionModal.style.display = 'none';

        // Присоединиться к сессии
        socket.emit('join_session', { session_id: sessionId, username: username, is_creator: true });

        // Включить поле ввода сообщений
        chatInput.disabled = false;
        sendButton.disabled = false;
    });

    // Генерация QR-кода
    qrButton.addEventListener('click', () => {
        if (!sessionId) {
            alert('Сессия не создана.');
            return;
        }

        const qrContainer = document.createElement('div');
        document.body.appendChild(qrContainer);
        new QRCode(qrContainer, {
            text: `${window.location.origin}/chat/${sessionId}`,
            width: 256,
            height: 256
        });
    });

    // Обработка сообщений
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            socket.emit('send_message', { session_id: sessionId, message });
            chatInput.value = '';
        }
    }

    // Получение сообщений
    socket.on('receive_message', (data) => {
        addMessageToChat(data.username, data.message);
    });

    // Оповещение о подключении пользователя
    socket.on('user_joined', (data) => {
        addSystemMessage(`${data.username} присоединился к чату.`);
    });

    // Оповещение об отключении пользователя
    socket.on('user_left', (data) => {
        addSystemMessage(`${data.username} покинул чат.`);
    });

    // Отображение статуса печати
    socket.on('user_typing', (data) => {
        showTypingStatus(`${data.username} печатает...`);
    });

    socket.on('user_stop_typing', () => {
        removeTypingStatus();
    });

    // Отображение презентации только для создателя
    socket.on('presentation_status', (data) => {
        if (isCreator && data.file_url) {
            loadPresentation(data.file_url);
        } else {
            pdfViewer.style.display = 'none';
        }
    });

    // Добавление сообщения в чат
    function addMessageToChat(username, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', username === currentUsername ? 'user' : 'other');
        messageElement.innerHTML = `<span class="username">${username}</span> ${message}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Добавление системного сообщения
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        messageElement.textContent = message;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Отображение статуса печати
    function showTypingStatus(message) {
        typingStatus.textContent = message;
    }

    // Скрытие статуса печати
    function removeTypingStatus() {
        typingStatus.textContent = '';
    }

    // Генерация UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});