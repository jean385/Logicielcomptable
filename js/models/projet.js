/**
 * Modèle Projet
 * Gestion des projets pour le suivi de rentabilité
 */

const Projet = {
    /**
     * Récupère tous les projets
     */
    getAll() {
        return Storage.get('projets') || [];
    },

    /**
     * Récupère un projet par ID
     */
    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    /**
     * Récupère les projets actifs
     */
    getActifs() {
        return this.getAll().filter(p => p.statut === 'actif');
    },

    /**
     * Récupère les projets d'un client
     */
    getByClient(clientId) {
        return this.getAll().filter(p => p.clientId === clientId);
    },

    /**
     * Crée un nouveau projet
     */
    creer(projet) {
        const projets = this.getAll();

        // Vérifier l'unicité du code
        if (projet.code && projets.some(p => p.code === projet.code)) {
            throw new Error('Un projet avec ce code existe déjà');
        }

        const nouveauProjet = {
            id: Storage.generateId(),
            nom: projet.nom,
            code: projet.code || '',
            description: projet.description || '',
            clientId: projet.clientId || null,
            statut: projet.statut || 'actif',
            dateDebut: projet.dateDebut || '',
            dateFin: projet.dateFin || '',
            dateCreation: new Date().toISOString()
        };

        projets.push(nouveauProjet);
        projets.sort((a, b) => (a.code || a.nom).localeCompare(b.code || b.nom));
        Storage.set('projets', projets);

        return nouveauProjet;
    },

    /**
     * Modifie un projet
     */
    modifier(id, modifications) {
        const projets = this.getAll();
        const index = projets.findIndex(p => p.id === id);

        if (index === -1) {
            throw new Error('Projet non trouvé');
        }

        // Vérifier l'unicité du code si modifié
        if (modifications.code && modifications.code !== projets[index].code) {
            if (projets.some(p => p.code === modifications.code && p.id !== id)) {
                throw new Error('Un projet avec ce code existe déjà');
            }
        }

        projets[index] = { ...projets[index], ...modifications };
        Storage.set('projets', projets);

        return projets[index];
    },

    /**
     * Supprime un projet (bloqué si transactions liées)
     */
    supprimer(id) {
        const projets = this.getAll();
        const index = projets.findIndex(p => p.id === id);

        if (index === -1) {
            throw new Error('Projet non trouvé');
        }

        // Vérifier s'il y a des transactions liées
        const transactions = Transaction.getByProjet(id);
        if (transactions.length > 0) {
            throw new Error('Ce projet a des transactions liées. Impossible de supprimer.');
        }

        // Vérifier s'il y a des factures liées
        const factures = Facture.getByProjet(id);
        if (factures.length > 0) {
            throw new Error('Ce projet a des factures liées. Impossible de supprimer.');
        }

        projets.splice(index, 1);
        Storage.set('projets', projets);

        return true;
    },

    /**
     * Génère les options HTML pour un select (formulaires)
     */
    genererOptions(valeurSelectionnee = null) {
        const projets = this.getActifs();
        let options = '<option value="">Aucun projet</option>';

        projets.forEach(p => {
            const selected = p.id === valeurSelectionnee ? 'selected' : '';
            const label = p.code ? `${p.code} - ${p.nom}` : p.nom;
            options += `<option value="${p.id}" ${selected}>${label}</option>`;
        });

        return options;
    },

    /**
     * Génère les options HTML pour un filtre (rapports) - inclut tous les projets
     */
    genererOptionsFiltre(valeurSelectionnee = null) {
        const projets = this.getAll();
        let options = '<option value="">Tous les projets</option>';

        projets.forEach(p => {
            const selected = p.id === valeurSelectionnee ? 'selected' : '';
            const label = p.code ? `${p.code} - ${p.nom}` : p.nom;
            options += `<option value="${p.id}" ${selected}>${label}</option>`;
        });

        return options;
    },

    /**
     * Retourne le libellé du statut
     */
    getStatutLibelle(statut) {
        const statuts = {
            'actif': 'Actif',
            'termine': 'Terminé',
            'annule': 'Annulé'
        };
        return statuts[statut] || statut;
    },

    /**
     * Retourne la classe CSS du statut
     */
    getStatutClasse(statut) {
        const classes = {
            'actif': 'badge-success',
            'termine': 'badge-info',
            'annule': 'badge-danger'
        };
        return classes[statut] || '';
    }
};
