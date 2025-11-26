/**
 * Componente para el panel de sesión (registro de usuario y gestión de grupos)
 */
export class SessionPanel {
    constructor(chatService, notificationCenter) {
        this.chatService = chatService;
        this.notificationCenter = notificationCenter;
        this.dom = {};
        this.onUserRegistered = null;
        this.onGroupSelected = null;
    }

    /**
     * Renderiza el panel
     */
    async render() {
        const container = document.createElement('div');
        container.className = 'panel';
        container.id = 'sessionPanel';
        container.innerHTML = `
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
        `;

        this.dom.displayName = container.querySelector('#displayName');
        this.dom.registerBtn = container.querySelector('#registerBtn');
        this.dom.statusChip = container.querySelector('#statusChip');
        this.dom.groupName = container.querySelector('#groupName');
        this.dom.groupMembers = container.querySelector('#groupMembers');
        this.dom.createGroupBtn = container.querySelector('#createGroupBtn');
        this.dom.groupList = container.querySelector('#groupList');

        this.bindEvents();
        return container;
    }

    /**
     * Vincula los eventos
     */
    bindEvents() {
        this.dom.registerBtn.addEventListener('click', () => this.handleRegisterUser());
        this.dom.createGroupBtn.addEventListener('click', () => this.handleCreateGroup());
        this.dom.groupList.addEventListener('click', (evt) => {
            const btn = evt.target.closest('button[data-group]');
            if (btn) {
                const groupId = btn.dataset.group;
                if (this.onGroupSelected) {
                    this.onGroupSelected(groupId, 'group');
                }
            }
        });
    }

    /**
     * Maneja el registro de usuario
     */
    async handleRegisterUser() {
        const desiredName = this.dom.displayName.value.trim();
        try {
            const user = await this.chatService.registerUser(desiredName);
            this.dom.statusChip.textContent = `Conectado como ${user.displayName}`;
            this.notificationCenter.push(`Bienvenido ${user.displayName}. Tu ID es ${user.id}`, 'info');
            if (this.onUserRegistered) {
                this.onUserRegistered(user);
            }
        } catch (error) {
            this.notificationCenter.showError('No se pudo registrar', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Maneja la creación de grupo
     */
    async handleCreateGroup() {
        const name = this.dom.groupName.value.trim() || 'Grupo sin nombre';
        const membersRaw = this.dom.groupMembers.value
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean);
        try {
            const group = await this.chatService.createGroup(name, membersRaw);
            this.renderGroups();
            this.notificationCenter.push(`Grupo ${group.name} creado (${group.id})`, 'info');
            this.dom.groupName.value = '';
            this.dom.groupMembers.value = '';
        } catch (error) {
            this.notificationCenter.showError('No se pudo crear el grupo', error, (e) => this.chatService.formatError(e));
        }
    }

    /**
     * Renderiza la lista de grupos
     */
    renderGroups() {
        const groups = this.chatService.getGroups();
        if (!groups.length) {
            this.dom.groupList.innerHTML = '<p>No hay grupos aún.</p>';
            return;
        }
        this.dom.groupList.innerHTML = groups
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

    /**
     * Actualiza el estado del chip
     */
    updateStatus(text) {
        if (this.dom.statusChip) {
            this.dom.statusChip.textContent = text;
        }
    }

    /**
     * Se llama cuando se crea un grupo (desde push)
     */
    onGroupCreated(group) {
        this.renderGroups();
    }
}
