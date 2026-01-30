/**
 * Module Création Rapide
 * Dropdown "+" pour créer rapidement client, facture, écriture
 */

const CreationRapide = {
    /**
     * Bascule l'affichage du dropdown de création rapide
     */
    toggle() {
        const dropdown = document.getElementById('creation-rapide-dropdown');
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
        const dropdown = document.getElementById('creation-rapide-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    },

    /**
     * Affiche les options selon le mode
     */
    _render() {
        const dropdown = document.getElementById('creation-rapide-dropdown');
        if (!dropdown) return;

        const mode = Storage.getMode();
        let items = [];

        if (mode === 'complet') {
            items = [
                { icon: '👤', label: 'Nouveau client', action: 'CreationRapide.creer("client")' },
                { icon: '🏢', label: 'Nouveau fournisseur', action: 'CreationRapide.creer("fournisseur")' },
                { icon: '📤', label: 'Facture de vente', action: 'CreationRapide.creer("facture-vente")' },
                { icon: '📥', label: "Facture d'achat", action: 'CreationRapide.creer("facture-achat")' },
                { icon: '📝', label: 'Écriture comptable', action: 'CreationRapide.creer("ecriture")' }
            ];
        } else {
            items = [
                { icon: '💵', label: 'Nouveau revenu', action: 'CreationRapide.creer("revenu")' },
                { icon: '💸', label: 'Nouvelle dépense', action: 'CreationRapide.creer("depense")' },
                { icon: '📄', label: 'Nouvelle facture', action: 'CreationRapide.creer("facture-simple")' }
            ];
        }

        dropdown.innerHTML = items.map(item => `
            <div class="creation-rapide-item" onclick="${item.action}">
                <span class="cr-icon">${item.icon}</span>
                <span>${item.label}</span>
            </div>
        `).join('');
    },

    /**
     * Exécute la création selon le type
     */
    creer(type) {
        this.fermer();

        switch (type) {
            case 'client':
                Ventes.afficher();
                setTimeout(() => Ventes.nouveauClient(), 100);
                break;
            case 'fournisseur':
                Achats.afficher();
                setTimeout(() => Achats.nouveauFournisseur(), 100);
                break;
            case 'facture-vente':
                Ventes.afficher();
                setTimeout(() => Ventes.afficherOnglet('nouvelle-facture'), 100);
                break;
            case 'facture-achat':
                Achats.afficher();
                setTimeout(() => Achats.afficherOnglet('nouvelle-facture'), 100);
                break;
            case 'ecriture':
                General.afficher();
                setTimeout(() => General.afficherOnglet('ecritures'), 100);
                break;
            case 'revenu':
                if (typeof AutonomeRevenus !== 'undefined') {
                    AutonomeRevenus.afficher();
                }
                break;
            case 'depense':
                if (typeof AutonomeDepenses !== 'undefined') {
                    AutonomeDepenses.afficher();
                }
                break;
            case 'facture-simple':
                if (typeof AutonomeFactures !== 'undefined') {
                    AutonomeFactures.afficher();
                }
                break;
        }
    }
};
