from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import html
import os
import random
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
socketio = SocketIO(app, cors_allowed_origins="*")

# Словарь для хранения сессий
sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat/<session_id>')
def chat(session_id):
    return render_template('chat.html', session_id=session_id)

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'Нет файла в запросе'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Файл не выбран для загрузки'}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Разрешены только PDF-файлы'}), 400

    # Сохранение файла
    upload_folder = os.path.join('static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, file.filename)
    file.save(file_path)

    return jsonify({'success': 'Файл успешно загружен', 'file_url': f"/{file_path}"}), 200

@socketio.on('upload_presentation')
def handle_upload_presentation(data):
    session_id = data.get('session_id')
    file_url = data.get('file_url')

    if session_id in sessions:
        sessions[session_id]['presentation'] = file_url
        emit('presentation_status', {'file_url': file_url}, room=session_id)

@socketio.on('connect')
def handle_connect():
    print(f"Новое подключение: {request.sid}")

@socketio.on('join_session')
def handle_join_session(data):
    session_id = data.get('session_id')
    username = data.get('username')
    is_creator = data.get('is_creator', False)

    if not session_id or not username:
        emit('error', {'error': 'Не указан идентификатор сессии или имя пользователя.'})
        return

    if session_id not in sessions:
        sessions[session_id] = {
            'users': {},
            'messages': [],
            'presentation': None,
            'creator': request.sid if is_creator else None
        }

    join_room(session_id)
    sessions[session_id]['users'][request.sid] = username

    emit('your_username', {'username': username})
    emit('user_joined', {'username': username}, room=session_id, include_self=False)
    emit('load_messages', {'messages': sessions[session_id]['messages']})

    # Отправляем статус презентации только создателю
    if is_creator:
        emit('presentation_status', {'file_url': sessions[session_id]['presentation']})

@socketio.on('disconnect')
def handle_disconnect():
    for session_id, session_data in sessions.items():
        if request.sid in session_data['users']:
            username = session_data['users'][request.sid]
            del session_data['users'][request.sid]
            emit('user_left', {'username': username}, room=session_id)
            print(f"{username} покинул сессию {session_id}.")

            if not session_data['users']:
                del sessions[session_id]
                print(f"Сессия {session_id} закрыта.")
            break

@socketio.on('send_message')
def handle_message(data):
    session_id = data.get('session_id')
    message = data.get('message', '').strip()

    print(f"Получено сообщение от сессии {session_id}: {message}")  # Логирование

    if session_id and message:
        safe_message = html.escape(message)
        username = sessions[session_id]['users'].get(request.sid, "Unknown")
        sessions[session_id]['messages'].append({'username': username, 'message': safe_message})
        emit('receive_message', {'username': username, 'message': safe_message}, room=session_id)
    else:
        print("Ошибка: session_id или message отсутствуют.")  # Логирование

@socketio.on('typing')
def handle_typing(data):
    session_id = data.get('session_id')
    if session_id:
        username = sessions[session_id]['users'].get(request.sid, "Unknown")
        emit('user_typing', {'username': username}, room=session_id, include_self=False)

@socketio.on('stop_typing')
def handle_stop_typing(data):
    session_id = data.get('session_id')
    if session_id:
        username = sessions[session_id]['users'].get(request.sid, "Unknown")
        emit('user_stop_typing', {'username': username}, room=session_id, include_self=False)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)