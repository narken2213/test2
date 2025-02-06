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
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const joinButton = document.getElementById('join-button');
    const usernameInputChat = document.getElementById('username-input');
    const qrModal = document.getElementById('qr-modal');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const closeQrModal = document.getElementById('close-qr-modal');


    let currentUsername = '';
    let sessionId = '';
    let isCreator = false;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;

    // Показать модальное окно при загрузке страницы (только на index.html)
    if (window.location.pathname === '/') {
        const modal = document.getElementById('create-session-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('Элемент с id="create-session-modal" не найден.');
        }
    }

    // Создание сессии (только на index.html)
    if (createSessionButton) {
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
            if (createSessionModal) {
                createSessionModal.style.display = 'none';
            }

            // Присоединиться к сессии
            socket.emit('join_session', { session_id: sessionId, username: username, is_creator: true });

            // Включить поле ввода сообщений
            if (chatInput && sendButton) {
                chatInput.disabled = false;
                sendButton.disabled = false;
            }

            // Включить загрузку файлов для создателя
            if (fileInput) {
                fileInput.disabled = false;
            }

            // Показать кнопку "QR-код" только у создателя
            if (qrButton) {
                qrButton.style.display = 'block';
            }
        });
    }

    // Обработчик для кнопки "Присоединиться" (только на chat.html)
    if (joinButton) {
        joinButton.addEventListener('click', joinSession);
    } else {
        console.error('Элемент с id="join-button" не найден.');
    }

    function joinSession() {
        const username = usernameInputChat.value.trim();
        sessionId = window.location.pathname.split('/').pop(); // Сохраняем sessionId

        if (!username) {
            alert('Пожалуйста, введите ваше имя.');
            return;
        }

        console.log('Присоединение к сессии:', sessionId); // Логирование

        // Отправляем данные на сервер
        socket.emit('join_session', { session_id: sessionId, username: username });

        // Блокируем поле ввода имени и кнопку "Присоединиться"
        usernameInputChat.disabled = true;
        joinButton.disabled = true;

        // Разблокируем поле ввода сообщений
        chatInput.disabled = false;
        sendButton.disabled = false;

        // Скрыть кнопку "QR-код" у пользователей, которые не являются создателями
        if (qrButton) {
            qrButton.style.display = 'none';
        }
    }

    // Обработчики для кнопок "Назад" и "Вперёд"
    if (prevPageButton && nextPageButton) {
        prevPageButton.addEventListener('click', prevPage);
        nextPageButton.addEventListener('click', nextPage);
    }

    function prevPage() {
        if (currentPage <= 1) return;
        currentPage--;
        renderPage(currentPage);
    }

    function nextPage() {
        if (currentPage >= totalPages) return;
        currentPage++;
        renderPage(currentPage);
    }

    // Обработчик для кнопки "QR-код"
    if (qrButton) {
        qrButton.addEventListener('click', () => {
            if (!sessionId) {
                alert('Сессия не создана.');
                return;
            }

            // Очищаем контейнер QR-кода
            qrCodeContainer.innerHTML = '';

            // Создаем QR-код
            new QRCode(qrCodeContainer, {
                text: `https://95.163.229.6/chat/${sessionId}`,
                width: 256,
                height: 256
            });

            // Показываем модальное окно
            qrModal.style.display = 'flex';
        });
    }

    // Закрытие модального окна QR-кода
    if (closeQrModal) {
        closeQrModal.addEventListener('click', () => {
            qrModal.style.display = 'none';
        });
    }

    // Закрытие модального окна при клике вне его области
    window.addEventListener('click', (event) => {
        if (event.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });

    // Обработка отправки сообщения
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            console.log('Отправка сообщения:', { session_id: sessionId, message }); // Логирование
            socket.emit('send_message', { session_id: sessionId, message });
            chatInput.value = '';
        } else {
            console.error('Сообщение пустое.'); // Логирование
        }
    }

    // Получение сообщений
    socket.on('receive_message', (data) => {
        console.log('Получено сообщение:', data); // Логирование
        addMessageToChat(data.username, data.message);
    });

    // Добавление сообщения в чат
    function addMessageToChat(username, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', username === currentUsername ? 'user' : 'other');
        messageElement.innerHTML = `<span class="username">${username}</span> ${message}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

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

    // Обработка загрузки файла
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                uploadFile(file);
            }
        });
    }

    function uploadFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Разрешены только PDF-файлы.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        uploadStatus.textContent = 'Загрузка...';
        uploadStatus.style.color = 'black';

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                uploadStatus.style.color = 'red';
                uploadStatus.textContent = data.error;
            } else {
                uploadStatus.style.color = 'green';
                uploadStatus.textContent = data.success;

                // Отправить URL презентации на сервер
                socket.emit('upload_presentation', { session_id: sessionId, file_url: data.file_url });

                // Загрузить презентацию для создателя
                loadPresentation(data.file_url);
            }
        })
        .catch(err => {
            uploadStatus.style.color = 'red';
            uploadStatus.textContent = 'Ошибка при загрузке файла.';
            console.error(err);
        });
    }

    // Загрузка и отображение PDF-файла
    function loadPresentation(fileURL) {
        const loadingTask = pdfjsLib.getDocument(fileURL);
        loadingTask.promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            totalPagesElement.textContent = totalPages;
            currentPage = 1;
            renderPage(currentPage);
        }, function(reason) {
            console.error(reason);
            alert('Ошибка при загрузке PDF: ' + reason);
        });
    }

    // Отрисовка страницы PDF
    function renderPage(pageNum) {
        if (!pdfDoc || !pdfViewer) return;
        pdfDoc.getPage(pageNum).then(function(page) {
            const viewport = page.getViewport({ scale: getScaleToFit(page) });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext).promise.then(function() {
                pdfViewer.innerHTML = '';
                pdfViewer.appendChild(canvas);
                currentPageElement.textContent = pageNum;
                updateNavigationButtons();
            });
        });
    }

    // Масштабирование страницы PDF
    function getScaleToFit(page) {
        const viewerWidth = pdfViewer.clientWidth;
        const viewerHeight = pdfViewer.clientHeight;
        const viewport = page.getViewport({ scale: 1 });
        return Math.min(viewerWidth / viewport.width, viewerHeight / viewport.height);
    }

    // Обновление состояния кнопок навигации
    function updateNavigationButtons() {
        if (prevPageButton && nextPageButton) {
            prevPageButton.disabled = currentPage <= 1;
            nextPageButton.disabled = currentPage >= totalPages;
        }
    }
});