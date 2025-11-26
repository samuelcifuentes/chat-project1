/**
 * Componente para mostrar notificaciones
 */
export class NotificationCenter {
    constructor() {
        this.container = null;
    }

    /**
     * Renderiza el contenedor de notificaciones
     */
    render() {
        const container = document.createElement('div');
        container.id = 'notifications';
        this.container = container;
        return container;
    }

    /**
     * Muestra una notificación
     */
    push(message, level = 'info') {
        if (!this.container) return;
        const box = document.createElement('div');
        box.className = 'notification';
        if (level === 'error') {
            box.style.background = '#fee2e2';
            box.style.borderColor = '#fecaca';
            box.style.color = '#991b1b';
        }
        box.textContent = message;
        this.container.prepend(box);
        setTimeout(() => box.remove(), 6000);
    }

    /**
     * Muestra un error con detalles
     */
    showError(prefix, error, formatError) {
        const details = formatError ? formatError(error) : (error?.message || 'desconocido');
        console.error(prefix, error);
        this.push(`${prefix}: ${details}`, 'error');
    }
}
