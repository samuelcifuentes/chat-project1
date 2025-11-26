/**
 * Componente para el panel de chat (mensajes, historial, audio)
 */
export class ChatPanel {
    constructor(chatService, notificationCenter) {
        this.chatService = chatService;
        this.notificationCenter = notificationCenter;
        this.dom = {};
        this.activeTarget = { id: '', type: 'user' };
    }

    /**
     * Renderiza el panel
     */
    async render() {
        const container = document.createElement('div');
        container.className = 'panel';
        container.innerHTML = `
            <h2>Chat en tiempo real</h2>
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
            <div class="audio-controls audio-upload">
                <input id="audioFileInput" type="file" accept="audio/*" />
                <button id="sendAudioFileBtn" disabled>Enviar nota</button>
            </div>
            <div class="audio-controls">
                <button id="startCallBtn">Iniciar llamada</button>
                <button id="endCallBtn" disabled>Finalizar llamada</button>
            </div>
        `;

        this.dom.targetType = container.querySelector('#targetType');
        this.dom.targetId = container.querySelector('#targetId');
        this.dom.loadHistoryBtn = container.querySelector('#loadHistoryBtn');
        this.dom.history = container.querySelector('#history');
        this.dom.messageInput = container.querySelector('#messageInput');
        this.dom.sendTextBtn = container.querySelector('#sendTextBtn');
        this.dom.recordBtn = container.querySelector('#recordBtn');
        this.dom.stopRecordBtn = container.querySelector('#stopRecordBtn');
        this.dom.audioFileInput = container.querySelector('#audioFileInput');
        this.dom.sendAudioFileBtn = container.querySelector('#sendAudioFileBtn');
        this.dom.startCallBtn = container.querySelector('#startCallBtn');
        this.dom.endCallBtn = container.querySelector('#endCallBtn');

        this.bindEvents();
        return container;
    }

    /**
     * Vincula los eventos
     */
    bindEvents() {
        this.dom.loadHistoryBtn.addEventListener('click', () => this.handleLoadHistory());
        this.dom.sendTextBtn.addEventListener('click', () => this.handleSendText());
        this.dom.recordBtn.addEventListener('click', () => this.handleStartRecording());
        this.dom.stopRecordBtn.addEventListener('click', () => this.handleStopRecording());
        this.dom.audioFileInput.addEventListener('change', (evt) => this.handleAudioFileSelected(evt));
        this.dom.sendAudioFileBtn.addEventListener('click', () => this.handleSendAudioFile());
        this.dom.startCallBtn.addEventListener('click', () => this.handleTriggerCall('start'));
        this.dom.endCallBtn.addEventListener('click', () => this.handleTriggerCall('end'));
    }

    /**
     * Establece el objetivo activo
     */
    setActiveTarget(id, type) {
        this.activeTarget = { id, type };
        this.dom.targetId.value = id;
        this.dom.targetType.value = type;
        this.notificationCenter.push(`Objetivo activo: ${id} (${type})`, 'info');
        this.handleLoadHistory();
    }

    /**
     * Verifica que el objetivo esté listo
     */
    ensureTargetReady() {
        const user = this.chatService.getUser();
        if (!user) {
            this.notificationCenter.push('Primero registra un usuario.', 'error');
            return false;
        }
        const id = this.dom.targetId.value.trim();
        const type = this.dom.targetType.value;
        if (!id) {
            this.notificationCenter.push('Selecciona un destino.', 'error');
            return false;
        }
        this.activeTarget = { id, type };
        return true;
    }

    /**
     * Obtiene el objetivo actual
     */
    getTarget() {
        return {
            id: this.dom.targetId.value.trim(),
            type: this.dom.targetType.value
        };
    }

    /**
     * Maneja la carga del historial
     */
    async handleLoadHistory() {
        if (!this.ensureTargetReady()) return;
        try {
            const { id, type } = this.getTarget();
            const user = this.chatService.getUser();
            console.log('=== CARGANDO HISTORIAL ===');
            console.log('Usuario actual:', user?.id, user?.displayName);
            console.log('Target ID:', id);
            console.log('Target Type:', type);
            const messages = await this.chatService.getHistory(id, type);
            console.log('Mensajes recibidos:', messages);
            console.log('Cantidad:', messages?.length || 0);
            if (messages && messages.length > 0) {
                console.log('Primer mensaje:', messages[0]);
                console.log('Campos del primer mensaje:', Object.keys(messages[0] || {}));
            }
            this.renderHistory();
        } catch (error) {
            console.error('Error al cargar historial:', error);
            console.error('Stack:', error.stack);
            this.notificationCenter.showError('Error al recuperar historial', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Renderiza el historial
     */
    renderHistory() {
        const history = this.chatService.getHistory();
        const user = this.chatService.getUser();
        console.log('=== RENDERIZANDO HISTORIAL ===');
        console.log('Historial obtenido:', history);
        console.log('Es array?', Array.isArray(history));
        console.log('Total mensajes:', history ? (Array.isArray(history) ? history.length : 'No es array') : 'null/undefined');
        console.log('Usuario actual:', user);
        
        if (!history) {
            console.warn('Historial es null/undefined');
            this.dom.history.innerHTML = '<p>No hay mensajes todavía.</p>';
            return;
        }
        
        // Asegurar que es un array
        const historyArray = Array.isArray(history) ? history : (history.length !== undefined ? Array.from(history) : []);
        console.log('Historial como array:', historyArray);
        console.log('Cantidad en array:', historyArray.length);
        
        if (historyArray.length === 0) {
            console.warn('Array de historial está vacío');
            this.dom.history.innerHTML = '<p>No hay mensajes todavía.</p>';
            return;
        }
        
        try {
            const html = history
                .map((msg, index) => {
                    console.log(`Renderizando mensaje ${index}:`, msg);
                    console.log(`  - Tipo:`, typeof msg);
                    console.log(`  - Campos:`, Object.keys(msg || {}));
                    console.log(`  - from:`, msg?.from);
                    console.log(`  - text:`, msg?.text);
                    console.log(`  - kind:`, msg?.kind);
                    console.log(`  - timestamp:`, msg?.timestamp, typeof msg?.timestamp);
                    return this.renderMessage(msg, user);
                })
                .join('');
            this.dom.history.innerHTML = html;
            this.dom.history.scrollTop = this.dom.history.scrollHeight;
        } catch (error) {
            console.error('Error al renderizar mensajes:', error);
            console.error('Stack:', error.stack);
            this.dom.history.innerHTML = `<p>Error al mostrar mensajes: ${error.message}</p>`;
        }
    }

    /**
     * Renderiza un mensaje
     */
    renderMessage(msg, user) {
        if (!msg) {
            console.warn('renderMessage: mensaje es null/undefined');
            return '';
        }
        
        try {
            const mine = user && msg.from === user.id;
            // Manejar timestamp que puede ser Ice.Long o número
            let timestampValue = msg.timestamp;
            if (timestampValue && typeof timestampValue === 'object') {
                if (timestampValue.toNumber) {
                    timestampValue = timestampValue.toNumber();
                } else if (timestampValue.high !== undefined && timestampValue.low !== undefined) {
                    // Ice.Long tiene high y low
                    timestampValue = timestampValue.high * 0x100000000 + (timestampValue.low >>> 0);
                }
            }
            const date = new Date(Number(timestampValue || 0)).toLocaleTimeString();
            let body = '';
            const kind = msg.kind || '';
            if (kind === 'text') {
                body = `<p>${msg.text || ''}</p>`;
            } else if (kind === 'audio') {
                const audioSrc = msg.mediaPath || '';
                body = `<audio controls src="${audioSrc}"></audio>`;
            } else {
                // Fallback para mensajes sin kind definido
                body = `<p>${msg.text || 'Mensaje sin contenido'}</p>`;
            }
            return `
                <div class="message ${mine ? 'me' : ''}">
                    <header>
                        <span>${msg.fromName || 'Desconocido'}</span>
                        <span>${date}</span>
                    </header>
                    ${body}
                </div>
            `;
        } catch (error) {
            console.error('Error al renderizar mensaje individual:', error, msg);
            return `<div class="message"><p>Error al mostrar mensaje: ${error.message}</p></div>`;
        }
    }

    /**
     * Maneja el envío de texto
     */
    async handleSendText() {
        if (!this.ensureTargetReady()) return;
        const text = this.dom.messageInput.value.trim();
        if (!text) return;
        try {
            const { id, type } = this.getTarget();
            await this.chatService.sendText(id, type, text);
            this.dom.messageInput.value = '';
            // Recargar historial después de enviar
            await this.handleLoadHistory();
        } catch (error) {
            this.notificationCenter.showError('No se pudo enviar', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja el inicio de grabación
     */
    async handleStartRecording() {
        if (!this.ensureTargetReady()) return;
        try {
            await this.chatService.startRecording();
            this.dom.recordBtn.disabled = true;
            this.dom.stopRecordBtn.disabled = false;
            this.notificationCenter.push('Grabando audio...', 'info');
        } catch (error) {
            this.notificationCenter.showError('No se pudo acceder al micrófono', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja la detención de grabación
     */
    async handleStopRecording() {
        this.chatService.stopRecording();
        this.dom.recordBtn.disabled = false;
        this.dom.stopRecordBtn.disabled = true;
        this.notificationCenter.push('Grabación detenida, enviando...', 'info');
        try {
            const { id, type } = this.getTarget();
            await this.chatService.uploadRecordedAudio(id, type);
            this.notificationCenter.push('Nota de voz enviada.', 'info');
        } catch (error) {
            this.notificationCenter.showError('Error enviando audio', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja la selección de archivo de audio
     */
    handleAudioFileSelected(event) {
        const [file] = event.target.files;
        this.chatService.setPendingAudioFile(file || null);
        this.dom.sendAudioFileBtn.disabled = !file;
        if (file) {
            this.notificationCenter.push(`Nota seleccionada: ${file.name}`, 'info');
        }
    }

    /**
     * Maneja el envío de archivo de audio
     */
    async handleSendAudioFile() {
        if (!this.ensureTargetReady()) return;
        try {
            const { id, type } = this.getTarget();
            await this.chatService.sendPendingAudioFile(id, type);
            this.notificationCenter.push('Nota de voz enviada.', 'info');
            this.chatService.clearPendingAudioFile();
            this.dom.audioFileInput.value = '';
            this.dom.sendAudioFileBtn.disabled = true;
        } catch (error) {
            this.notificationCenter.showError('Error enviando audio', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja el trigger de llamada
     */
    async handleTriggerCall(action) {
        if (!this.ensureTargetReady()) return;
        const { id, type } = this.getTarget();
        try {
            if (action === 'start') {
                await this.chatService.startCall(id, type);
                this.dom.startCallBtn.disabled = true;
                this.dom.endCallBtn.disabled = false;
            } else {
                await this.chatService.endCall(id, type);
                this.dom.startCallBtn.disabled = false;
                this.dom.endCallBtn.disabled = true;
            }
        } catch (error) {
            this.notificationCenter.showError('Error con la llamada', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja un mensaje entrante
     */
    handleIncomingMessage(payload) {
        const currentTarget = this.getTarget();
        const matchesCurrent =
            (payload.to === currentTarget.id && payload.toType === currentTarget.type) ||
            (payload.toType === 'user' && payload.from === currentTarget.id && currentTarget.type === 'user');

        if (matchesCurrent) {
            this.chatService.addToHistory(payload);
            this.renderHistory();
        } else {
            this.notificationCenter.push(`Nuevo mensaje de ${payload.fromName}`, 'info');
        }
    }

    /**
     * Maneja un evento de llamada
     */
    handleCallEvent(event) {
        const text =
            event.type === 'start'
                ? `${event.fromName} inició una llamada`
                : `${event.fromName} finalizó la llamada`;
        this.notificationCenter.push(text, 'info');
    }
}
