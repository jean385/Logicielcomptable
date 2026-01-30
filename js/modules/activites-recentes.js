/**
 * Module Activités Récentes
 * Suivi et affichage des activités récentes sur le dashboard
 */

const ActivitesRecentes = {
    MAX_ACTIVITES: 50,
    MAX_AFFICHEES: 10,

    /**
     * Enregistre une nouvelle activité
     * @param {Object} activite - { type, description, icon, entiteId, module }
     */
    enregistrer(activite) {
        const activites = Storage.get('activites_recentes') || [];

        activites.unshift({
            id: Storage.generateId(),
            type: activite.type,
            description: activite.description,
            icon: activite.icon || '📄',
            entiteId: activite.entiteId || null,
            module: activite.module || null,
            date: new Date().toISOString()
        });

        // Limiter à MAX_ACTIVITES
        if (activites.length > this.MAX_ACTIVITES) {
            activites.length = this.MAX_ACTIVITES;
        }

        Storage.set('activites_recentes', activites);
    },

    /**
     * Récupère les activités récentes
     */
    getAll() {
        return Storage.get('activites_recentes') || [];
    },

    /**
     * Affiche les activités récentes sur le dashboard
     */
    render() {
        const container = document.getElementById('activites-recentes-liste');
        if (!container) return;

        const activites = this.getAll().slice(0, this.MAX_AFFICHEES);

        if (activites.length === 0) {
            container.innerHTML = '<div class="activites-vide">Aucune activité récente</div>';
            return;
        }

        container.innerHTML = activites.map(a => {
            const date = this._formaterDate(a.date);
            return `
                <div class="activite-item" onclick="ActivitesRecentes.naviguer('${a.module || ''}', '${a.entiteId || ''}')">
                    <span class="activite-icon">${a.icon}</span>
                    <div class="activite-contenu">
                        <div class="activite-description">${this._escapeHtml(a.description)}</div>
                        <div class="activite-date">${date}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Navigue vers l'entité de l'activité
     */
    naviguer(module, entiteId) {
        if (!module) return;

        switch (module) {
            case 'ventes':
                Ventes.afficher();
                if (entiteId) {
                    setTimeout(() => Ventes.voirFacture(entiteId), 100);
                }
                break;
            case 'achats':
                Achats.afficher();
                break;
            case 'general':
                General.afficher();
                break;
            case 'encaissements':
                Encaissements.afficher();
                break;
            case 'paiements':
                Paiements.afficher();
                break;
            case 'parametres':
                Parametres.afficher();
                break;
            case 'immobilisations':
                Immobilisations.afficher();
                break;
            default:
                break;
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
        const jours = Math.floor(diff / 86400000);

        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes} min`;
        if (heures < 24) return `Il y a ${heures}h`;
        if (jours < 7) return `Il y a ${jours}j`;
        return date.toLocaleDateString('fr-CA');
    },

    /**
     * Échappe le HTML
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
