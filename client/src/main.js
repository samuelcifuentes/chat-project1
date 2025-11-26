import './style.css';

const state = {
    communicator: null,
    adapter: null,
    chatPrx: null,
    pushProxy: null,
    user: null,
    activeTarget: { id: '', type: 'user' },
    groups: new Map(),
    history: [],
    recorder: null,
    audioChunks: [],
    notifications: []
};

const dom = {};

document.addEventListener('DOMContentLoaded', async () => {
    buildLayout();
    bindEvents();
    await bootstrapIce();
});

function buildLayout() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="layout">
            <div class="panel" id="sessionPanel">
                <h2>Sesión</h2>
                <span id="statusChip" class="status-chip">Desconectado</span>
                <input id="displayName" type="text" placeholder="Nombre visible" />
                <button id="registerBtn">Registrar usuario</button>
                <hr />
                <h2>Grupo</h2>
                <input id="groupName" type="text" placeholder="Nombre del grupo" />
                <input id="groupMembers" type="text" placeholder="Miembros (IDs separados por coma)" />
                <button id="createGroupBtn">Crear grupo</button>
                <div id="groupList"></div>
            </div>
            <div class="panel">
                <h2>Chat en tiempo real</h2>
                <div id="notifications"></div>
                <div class="target-selector">
                    <select id="targetType">
                        <option value="user">Usuario</option>
                        <option value="group">Grupo</option>
                    </select>
                    <input id="targetId" type="text" placeholder="ID de destino" />
                </div>
                <button id="loadHistoryBtn">Ver historial</button>
                <div class="history" id="history"></div>
                <textarea id="messageInput" rows="3" placeholder="Escribe un mensaje..."></textarea>
                <button id="sendTextBtn">Enviar texto</button>
                <div class="audio-controls">
                    <button id="recordBtn">🎙 Grabar</button>
                    <button id="stopRecordBtn" disabled>Detener</button>
                </div>
                <div class="audio-controls">
                    <button id="startCallBtn">Iniciar llamada</button>
                    <button id="endCallBtn" disabled>Finalizar llamada</button>
                </div>
            </div>
        </div>
    `;

    dom.displayName = document.getElementById('displayName');
    dom.registerBtn = document.getElementById('registerBtn');
    dom.statusChip = document.getElementById('statusChip');
    dom.groupName = document.getElementById('groupName');
    dom.groupMembers = document.getElementById('groupMembers');
    dom.createGroupBtn = document.getElementById('createGroupBtn');
    dom.groupList = document.getElementById('groupList');
    dom.targetType = document.getElementById('targetType');
    dom.targetId = document.getElementById('targetId');
    dom.loadHistoryBtn = document.getElementById('loadHistoryBtn');
    dom.history = document.getElementById('history');
    dom.messageInput = document.getElementById('messageInput');
    dom.sendTextBtn = document.getElementById('sendTextBtn');
    dom.recordBtn = document.getElementById('recordBtn');
    dom.stopRecordBtn = document.getElementById('stopRecordBtn');
    dom.startCallBtn = document.getElementById('startCallBtn');
    dom.endCallBtn = document.getElementById('endCallBtn');
    dom.notifications = document.getElementById('notifications');
}

function bindEvents() {
    dom.registerBtn.addEventListener('click', registerUser);
    dom.createGroupBtn.addEventListener('click', createGroup);
    dom.groupList.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-group]');
        if (btn) {
            setActiveTarget(btn.dataset.group, 'group');
        }
    });
    dom.loadHistoryBtn.addEventListener('click', loadHistory);
    dom.sendTextBtn.addEventListener('click', sendTextMessage);
    dom.recordBtn.addEventListener('click', startRecording);
    dom.stopRecordBtn.addEventListener('click', stopRecording);
    dom.startCallBtn.addEventListener('click', () => triggerCall('start'));
    dom.endCallBtn.addEventListener('click', () => triggerCall('end'));
}

async function bootstrapIce() {
    if (!window.Ice) {
        pushNotification('No se pudo cargar Ice.js desde la CDN.', 'error');
        return;
    }
    if (!window.Chat) {
        pushNotification('Genera el archivo ice/Chat.js con slice2js antes de continuar.', 'error');
        return;
    }

    state.communicator = Ice.initialize([
        'Ice.ACM.Client=0',
        'Ice.Trace.Network=0',
        'Ice.RetryIntervals=-1',
        'Ice.Default.Protocol=ws'
    ]);

    const base = state.communicator.stringToProxy('ChatSession:ws -h localhost -p 10000');
    state.chatPrx = await Chat.ChatSessionPrx.checkedCast(base);
    state.adapter = state.communicator.createObjectAdapter('');
    await state.adapter.activate();
    dom.statusChip.textContent = 'Ice listo';
}

async function registerUser() {
    if (!state.chatPrx) {
        pushNotification('La conexión con Ice no está lista todavía.', 'error');
        return;
    }
    const desiredName = dom.displayName.value.trim();
    try {
        const user = await state.chatPrx.registerUser(desiredName);
        state.user = user;
        dom.statusChip.textContent = `Conectado como ${user.displayName}`;
        await subscribePush();
        pushNotification(`Bienvenido ${user.displayName}. Tu ID es ${user.id}`, 'info');
    } catch (error) {
        pushNotification(`No se pudo registrar: ${error.message}`, 'error');
    }
}

async function subscribePush() {
    if (!state.user) return;

    class PushListener extends Chat.RealtimePush {
        async onIncomingMessage(payload) {
            handleIncomingMessage(payload);
        }
        async onGroupCreated(group) {
            handleGroupCreated(group);
        }
        async onCallEvent(event) {
            handleCallEvent(event);
        }
    }

    const randomFromBrowser =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client-${Date.now()}`;
    const uuid = Ice.generateUUID ? Ice.generateUUID() : randomFromBrowser;
    const identity = Ice.stringToIdentity(uuid);
    const servant = new PushListener();
    state.adapter.add(servant, identity);
    const prx = Chat.RealtimePushPrx.uncheckedCast(state.adapter.createProxy(identity));
    await state.chatPrx.subscribePush(state.user.id, prx);
    state.pushProxy = prx;
}

async function createGroup() {
    if (!state.user) {
        pushNotification('Registra un usuario antes de crear grupos.', 'error');
        return;
    }
    const name = dom.groupName.value.trim() || 'Grupo sin nombre';
    const membersRaw = dom.groupMembers.value
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    try {
        const group = await state.chatPrx.createGroup(state.user.id, name, membersRaw);
        state.groups.set(group.id, group);
        renderGroups();
        pushNotification(`Grupo ${group.name} creado (${group.id})`, 'info');
    } catch (error) {
        pushNotification(`No se pudo crear el grupo: ${error.message}`, 'error');
    }
}

function renderGroups() {
    const entries = Array.from(state.groups.values());
    if (!entries.length) {
        dom.groupList.innerHTML = '<p>No hay grupos aún.</p>';
        return;
    }
    dom.groupList.innerHTML = entries
        .map(
            (group) => `
            <div class="message">
                <header>
                    <strong>${group.name}</strong>
                    <small>${group.id}</small>
                </header>
                <p>${group.members.length} miembros</p>
                <button data-group="${group.id}">Abrir chat</button>
            </div>
        `
        )
        .join('');
}

function setActiveTarget(id, type) {
    state.activeTarget = { id, type };
    dom.targetId.value = id;
    dom.targetType.value = type;
    pushNotification(`Objetivo activo: ${id} (${type})`, 'info');
    loadHistory();
}

async function loadHistory() {
    if (!ensureTargetReady()) return;
    try {
        const { id, type } = getTarget();
        const messages = await state.chatPrx.getHistory(state.user.id, id, type);
        state.history = messages;
        renderHistory();
    } catch (error) {
        pushNotification(`Error al recuperar historial: ${error.message}`, 'error');
    }
}

function renderHistory() {
    if (!state.history.length) {
        dom.history.innerHTML = '<p>No hay mensajes todavía.</p>';
        return;
    }
    dom.history.innerHTML = state.history
        .map((msg) => renderMessage(msg))
        .join('');
    dom.history.scrollTop = dom.history.scrollHeight;
}

function renderMessage(msg) {
    const mine = state.user && msg.from === state.user.id;
    const date = new Date(Number(msg.timestamp)).toLocaleTimeString();
    let body = '';
    if (msg.kind === 'text') {
        body = `<p>${msg.text}</p>`;
    } else if (msg.kind === 'audio') {
        body = `<audio controls src="${msg.mediaPath}"></audio>`;
    }
    return `
        <div class="message ${mine ? 'me' : ''}">
            <header>
                <span>${msg.fromName}</span>
                <span>${date}</span>
            </header>
            ${body}
        </div>
    `;
}

async function sendTextMessage() {
    if (!ensureTargetReady()) return;
    const text = dom.messageInput.value.trim();
    if (!text) return;
    try {
        const { id, type } = getTarget();
        await state.chatPrx.sendText(state.user.id, id, type, text);
        dom.messageInput.value = '';
    } catch (error) {
        pushNotification(`No se pudo enviar: ${error.message}`, 'error');
    }
}

function ensureTargetReady() {
    if (!state.user) {
        pushNotification('Primero registra un usuario.', 'error');
        return false;
    }
    const id = dom.targetId.value.trim();
    const type = dom.targetType.value;
    if (!id) {
        pushNotification('Selecciona un destino.', 'error');
        return false;
    }
    state.activeTarget = { id, type };
    return true;
}

function getTarget() {
    return {
        id: dom.targetId.value.trim(),
        type: dom.targetType.value
    };
}

async function startRecording() {
    if (!ensureTargetReady()) return;
    if (!navigator.mediaDevices) {
        pushNotification('El navegador no soporta MediaRecorder.', 'error');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.recorder = new MediaRecorder(stream);
        state.audioChunks = [];
        state.recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                state.audioChunks.push(event.data);
            }
        };
        state.recorder.onstop = uploadAudio;
        state.recorder.start();
        dom.recordBtn.disabled = true;
        dom.stopRecordBtn.disabled = false;
        pushNotification('Grabando audio...', 'info');
    } catch (error) {
        pushNotification(`No se pudo acceder al micrófono: ${error.message}`, 'error');
    }
}

function stopRecording() {
    if (!state.recorder) return;
    state.recorder.stop();
    dom.recordBtn.disabled = false;
    dom.stopRecordBtn.disabled = true;
    pushNotification('Grabación detenida, enviando...', 'info');
}

async function uploadAudio() {
    const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
    const buffer = await blob.arrayBuffer();
    const { id, type } = getTarget();
    try {
        await state.chatPrx.sendAudio(
            state.user.id,
            id,
            type,
            new Uint8Array(buffer),
            blob.type || 'audio/webm'
        );
    } catch (error) {
        pushNotification(`Error enviando audio: ${error.message}`, 'error');
    }
}

async function triggerCall(action) {
    if (!ensureTargetReady()) return;
    const { id, type } = getTarget();
    try {
        if (action === 'start') {
            await state.chatPrx.startCall(state.user.id, id, type);
            dom.startCallBtn.disabled = true;
            dom.endCallBtn.disabled = false;
        } else {
            await state.chatPrx.endCall(state.user.id, id, type);
            dom.startCallBtn.disabled = false;
            dom.endCallBtn.disabled = true;
        }
    } catch (error) {
        pushNotification(`Error con la llamada: ${error.message}`, 'error');
    }
}

function handleIncomingMessage(payload) {
    const currentTarget = getTarget();
    const matchesCurrent =
        (payload.to === currentTarget.id && payload.toType === currentTarget.type) ||
        (payload.toType === 'user' && payload.from === currentTarget.id && currentTarget.type === 'user');

    if (matchesCurrent) {
        state.history.push(payload);
        renderHistory();
    } else {
        pushNotification(`Nuevo mensaje de ${payload.fromName}`, 'info');
    }
}

function handleGroupCreated(group) {
    state.groups.set(group.id, group);
    renderGroups();
    pushNotification(`Se creó el grupo ${group.name}`, 'info');
}

function handleCallEvent(event) {
    const text =
        event.type === 'start'
            ? `${event.fromName} inició una llamada`
            : `${event.fromName} finalizó la llamada`;
    pushNotification(text, 'info');
}

function pushNotification(message, level) {
    const box = document.createElement('div');
    box.className = 'notification';
    box.textContent = message;
    dom.notifications.prepend(box);
    setTimeout(() => box.remove(), 6000);
}

