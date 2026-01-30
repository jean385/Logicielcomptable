/**
 * Module Centre de Notifications
 * Capture les toasts existants et affiche un centre de notifications (cloche)
 */

const NotificationsCentre = {
    _notifications: [],
    _nonLues: 0,
    MAX_NOTIFICATIONS: 20,

    /**
     * Ajoute une notification au centre
     * @param {string} message - Texte de la notification
     * @param {string} type - Type (info, success, warning, danger)
     */
    ajouter(message, type) {
        this._notifications.unshift({
            id: Date.now(),
            message: message,
            type: type || 'info',
            date: new Date().toISOString(),
            lue: false
        });

        // Limiter
        if (this._notifications.length > this.MAX_NOTIFICATIONS) {
            this._notifications.length = this.MAX_NOTIFICATIONS;
        }

        this._nonLues++;
        this._mettreAJourBadge();
    },

    /**
     * Bascule l'affichage du dropdown
     */
    toggle() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;

        if (dropdown.classList.contains('active')) {
            this.fermer();
        } else {
            this._render();
            dropdown.classList.add('active');
        }
    },

    /**
     * Ferme le dropdown
     */
    fermer() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    },

    /**
     * Marque toutes les notifications comme lues
     */
    toutMarquerLu() {
        this._notifications.forEach(n => n.lue = true);
        this._nonLues = 0;
        this._mettreAJourBadge();
        this._render();
    },

    /**
     * Affiche les notifications dans le dropdown
     */
    _render() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (!dropdown) return;

        if (this._notifications.length === 0) {
            dropdown.innerHTML = '<div class="notif-empty">Aucune notification</div>';
            return;
        }

        let html = `
            <div class="notif-header">
                <span class="notif-header-title">Notifications</span>
                ${this._nonLues > 0 ?
                    '<button class="notif-header-action" onclick="NotificationsCentre.toutMarquerLu()">Tout marquer comme lu</button>' :
                    ''}
            </div>
        `;

        this._notifications.forEach(n => {
            const date = this._formaterDate(n.date);
            const classeNonLue = n.lue ? '' : ' notif-unread';
            html += `
                <div class="notif-item${classeNonLue}">
                    <div class="notif-item-message">${this._escapeHtml(n.message)}</div>
                    <div class="notif-item-time">${date}</div>
                </div>
            `;
        });

        dropdown.innerHTML = html;
    },

    /**
     * Met à jour le badge de notification
     */
    _mettreAJourBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;

        if (this._nonLues > 0) {
            badge.textContent = this._nonLues > 9 ? '9+' : this._nonLues;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    },

    /**
     * Formate une date ISO en texte relatif
     */
    _formaterDate(dateISO) {
        const date = new Date(dateISO);
        const maintenant = new Date();
        const diff = maintenant - date;
        const minutes = Math.floor(diff / 60000);
        const heures = Math.floor(diff / 3600000);

        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (heures < 24) return `Il y a ${heures}h`;
        return date.toLocaleDateString('fr-CA');
    },

    /**
     * Échappe le HTML
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
