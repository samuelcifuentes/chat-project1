import '../style.css';
import { ChatService } from '../services/chatService.js';
import { NotificationCenter } from '../components/NotificationCenter.js';
import { SessionPanel } from '../components/SessionPanel.js';
import { ChatPanel } from '../components/ChatPanel.js';

export class HomePage {
    constructor(root) {
        this.root = root;
        this.service = new ChatService();
        this.notifications = new NotificationCenter();
        this.sessionPanel = new SessionPanel(this.service, this.notifications);
        this.chatPanel = new ChatPanel(this.service, this.notifications);
    }

    async init() {
        this.root.innerHTML = '';
        
        // Renderizar notificaciones primero
        const notificationsNode = this.notifications.render();
        this.root.appendChild(notificationsNode);

        // Crear layout
        const layout = document.createElement('div');
        layout.className = 'layout';

        // Renderizar paneles
        const sessionNode = await this.sessionPanel.render();
        const chatNode = await this.chatPanel.render();

        layout.appendChild(sessionNode);
        layout.appendChild(chatNode);
        this.root.appendChild(layout);

        // Configurar callbacks
        this.setupCallbacks();

        // Inicializar Ice
        try {
            const status = await this.service.bootstrapIce();
            this.sessionPanel.updateStatus(status);
        } catch (error) {
            this.notifications.showError('Error inicializando Ice', error, (e) => this.service.formatError(e));
        }
    }

    setupCallbacks() {
        // Configurar callbacks del servicio
        this.service.onPushEvent({
            onIncomingMessage: (payload) => this.chatPanel.handleIncomingMessage(payload),
            onGroupCreated: (group) => {
                this.sessionPanel.onGroupCreated(group);
                this.notifications.push(`Se creó el grupo ${group.name}`, 'info');
            },
            onCallEvent: (event) => this.chatPanel.handleCallEvent(event)
        });

        // Configurar callbacks del panel de sesión
        this.sessionPanel.onUserRegistered = (user) => {
            // Usuario registrado, no necesitamos hacer nada adicional
        };
        this.sessionPanel.onGroupSelected = (id, type) => {
            this.chatPanel.setActiveTarget(id, type);
        };
    }
}
