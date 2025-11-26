/**
 * Servicio que maneja toda la conexión Ice y las llamadas RPC
 */
export class ChatService {
    constructor() {
        this.communicator = null;
        this.adapter = null;
        this.chatPrx = null;
        this.pushProxy = null;
        this.user = null;
        this.groups = new Map();
        this.history = [];
        this.recorder = null;
        this.audioChunks = [];
        this.pendingAudioFile = null;
        this.pushListeners = [];
    }

    /**
     * Inicializa la conexión Ice
     */
    async bootstrapIce() {
        if (!window.Ice) {
            throw new Error('No se pudo cargar Ice.js desde la CDN.');
        }
        if (!window.Chat) {
            throw new Error('Genera el archivo ice/chat.js con slice2js antes de continuar.');
        }

        this.communicator = Ice.initialize([
            'Ice.ACM.Client=0',
            'Ice.Trace.Network=0',
            'Ice.RetryIntervals=-1',
            'Ice.Default.Protocol=ws'
        ]);

        const base = this.communicator.stringToProxy('ChatSession:ws -h localhost -p 10000');
        this.chatPrx = await Chat.ChatSessionPrx.checkedCast(base);
        this.adapter = await this.communicator.createObjectAdapter('');
        if (typeof this.adapter.activate === 'function') {
            await this.adapter.activate();
        }
        return 'Ice listo';
    }

    /**
     * Registra un usuario
     */
    async registerUser(desiredName) {
        if (!this.chatPrx) {
            throw new Error('La conexión con Ice no está lista todavía.');
        }
        const user = await this.chatPrx.registerUser(desiredName);
        this.user = user;
        await this.subscribePush();
        return user;
    }

    /**
     * Suscribe el push listener para recibir eventos en tiempo real
     */
    async subscribePush() {
        if (!this.user) return;

        class PushListener extends Chat.RealtimePush {
            constructor(service) {
                super();
                this.service = service;
            }

            async onIncomingMessage(payload) {
                this.service.notifyIncomingMessage(payload);
            }

            async onGroupCreated(group) {
                this.service.notifyGroupCreated(group);
            }

            async onCallEvent(event) {
                this.service.notifyCallEvent(event);
            }
        }

        const randomFromBrowser =
            typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client-${Date.now()}`;
        const uuid = Ice.generateUUID ? Ice.generateUUID() : randomFromBrowser;
        const identity = Ice.stringToIdentity(uuid);
        const servant = new PushListener(this);
        this.adapter.add(servant, identity);
        const prx = Chat.RealtimePushPrx.uncheckedCast(this.adapter.createProxy(identity));
        await this.chatPrx.subscribePush(this.user.id, prx);
        this.pushProxy = prx;
    }

    /**
     * Registra un listener para eventos push
     */
    onPushEvent(callback) {
        this.pushListeners.push(callback);
    }

    /**
     * Notifica a los listeners sobre un mensaje entrante
     */
    notifyIncomingMessage(payload) {
        this.pushListeners.forEach(listener => {
            if (listener.onIncomingMessage) {
                listener.onIncomingMessage(payload);
            }
        });
    }

    /**
     * Notifica a los listeners sobre un grupo creado
     */
    notifyGroupCreated(group) {
        this.groups.set(group.id, group);
        this.pushListeners.forEach(listener => {
            if (listener.onGroupCreated) {
                listener.onGroupCreated(group);
            }
        });
    }

    /**
     * Notifica a los listeners sobre un evento de llamada
     */
    notifyCallEvent(event) {
        this.pushListeners.forEach(listener => {
            if (listener.onCallEvent) {
                listener.onCallEvent(event);
            }
        });
    }

    /**
     * Crea un grupo
     */
    async createGroup(name, members) {
        if (!this.user) {
            throw new Error('Registra un usuario antes de crear grupos.');
        }
        const group = await this.chatPrx.createGroup(this.user.id, name, members);
        this.groups.set(group.id, group);
        return group;
    }

    /**
     * Obtiene el historial de mensajes
     */
    async getHistory(targetId, targetType) {
        if (!this.user) {
            throw new Error('Primero registra un usuario.');
        }
        try {
            const messages = await this.chatPrx.getHistory(this.user.id, targetId, targetType);
            console.log('getHistory - Mensajes recibidos del servidor (raw):', messages);
            console.log('getHistory - Tipo de mensajes:', Array.isArray(messages) ? 'Array' : typeof messages);
            console.log('getHistory - Constructor:', messages?.constructor?.name);
            console.log('getHistory - Tiene length?:', messages?.length !== undefined);
            console.log('getHistory - Tiene slice?:', typeof messages?.slice === 'function');
            
            // Convertir a array JavaScript nativo
            let messagesArray = [];
            if (messages) {
                if (Array.isArray(messages)) {
                    // Ya es un array nativo
                    messagesArray = messages;
                } else if (messages.length !== undefined) {
                    // Es un array-like object (como los arrays de Ice)
                    // Intentar múltiples métodos de conversión
                    try {
                        messagesArray = Array.from(messages);
                    } catch (e1) {
                        try {
                            messagesArray = Array.prototype.slice.call(messages);
                        } catch (e2) {
                            try {
                                messagesArray = [...messages];
                            } catch (e3) {
                                // Último recurso: iterar manualmente
                                messagesArray = [];
                                for (let i = 0; i < messages.length; i++) {
                                    messagesArray.push(messages[i]);
                                }
                            }
                        }
                    }
                } else if (typeof messages[Symbol.iterator] === 'function') {
                    // Es iterable
                    messagesArray = Array.from(messages);
                } else {
                    // Es un solo objeto
                    messagesArray = [messages];
                }
            }
            
            console.log('getHistory - Array convertido:', messagesArray);
            console.log('getHistory - Cantidad:', messagesArray.length);
            if (messagesArray.length > 0) {
                console.log('getHistory - Primer mensaje:', messagesArray[0]);
                console.log('getHistory - Campos del primer mensaje:', Object.keys(messagesArray[0] || {}));
            }
            
            this.history = messagesArray;
            return this.history;
        } catch (error) {
            console.error('Error en getHistory:', error);
            console.error('Error stack:', error.stack);
            this.history = [];
            throw error;
        }
    }

    /**
     * Envía un mensaje de texto
     */
    async sendText(targetId, targetType, text) {
        if (!this.user) {
            throw new Error('Primero registra un usuario.');
        }
        await this.chatPrx.sendText(this.user.id, targetId, targetType, text);
    }

    /**
     * Envía un mensaje de audio
     */
    async sendAudio(targetId, targetType, audioData, mimeType) {
        if (!this.user) {
            throw new Error('Primero registra un usuario.');
        }
        await this.chatPrx.sendAudio(this.user.id, targetId, targetType, audioData, mimeType);
    }

    /**
     * Inicia una llamada
     */
    async startCall(targetId, targetType) {
        if (!this.user) {
            throw new Error('Primero registra un usuario.');
        }
        return await this.chatPrx.startCall(this.user.id, targetId, targetType);
    }

    /**
     * Finaliza una llamada
     */
    async endCall(targetId, targetType) {
        if (!this.user) {
            throw new Error('Primero registra un usuario.');
        }
        return await this.chatPrx.endCall(this.user.id, targetId, targetType);
    }

    /**
     * Inicia la grabación de audio
     */
    async startRecording() {
        if (!navigator.mediaDevices) {
            throw new Error('El navegador no soporta MediaRecorder.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recorder = new MediaRecorder(stream);
        this.audioChunks = [];
        this.recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };
        this.recorder.start();
    }

    /**
     * Detiene la grabación de audio
     */
    stopRecording() {
        if (!this.recorder) return;
        this.recorder.stop();
    }

    /**
     * Sube el audio grabado
     */
    async uploadRecordedAudio(targetId, targetType) {
        return new Promise((resolve, reject) => {
            if (!this.recorder) {
                reject(new Error('No hay grabación activa'));
                return;
            }

            this.recorder.onstop = async () => {
                try {
                    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const buffer = await blob.arrayBuffer();
                    await this.sendAudio(targetId, targetType, new Uint8Array(buffer), blob.type || 'audio/webm');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            this.recorder.stop();
        });
    }

    /**
     * Establece un archivo de audio pendiente
     */
    setPendingAudioFile(file) {
        this.pendingAudioFile = file;
    }

    /**
     * Envía el archivo de audio pendiente
     */
    async sendPendingAudioFile(targetId, targetType) {
        if (!this.pendingAudioFile) {
            throw new Error('Selecciona un archivo de audio.');
        }
        const buffer = await this.pendingAudioFile.arrayBuffer();
        await this.sendAudio(targetId, targetType, new Uint8Array(buffer), this.pendingAudioFile.type || 'audio/webm');
        this.pendingAudioFile = null;
    }

    /**
     * Limpia el archivo de audio pendiente
     */
    clearPendingAudioFile() {
        this.pendingAudioFile = null;
    }

    /**
     * Obtiene el usuario actual
     */
    getUser() {
        return this.user;
    }

    /**
     * Obtiene los grupos
     */
    getGroups() {
        return Array.from(this.groups.values());
    }

    /**
     * Obtiene el historial actual
     */
    getHistory() {
        return this.history;
    }

    /**
     * Agrega un mensaje al historial
     */
    addToHistory(payload) {
        this.history.push(payload);
    }

    /**
     * Formatea un error para mostrar
     */
    formatError(error) {
        if (!error) {
            return 'desconocido';
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error.message) {
            return error.message;
        }
        if (error.ice_name) {
            return error.ice_name;
        }
        if (error.toString) {
            return error.toString();
        }
        try {
            return JSON.stringify(error);
        } catch (jsonError) {
            return 'sin detalles';
        }
    }
}
