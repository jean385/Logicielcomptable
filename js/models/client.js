/**
 * Modèle Client
 */

const Client = {
    /**
     * Récupère tous les clients
     */
    getAll() {
        return Storage.get('clients') || [];
    },

    /**
     * Récupère un client par ID
     */
    getById(id) {
        return this.getAll().find(c => c.id === id);
    },

    /**
     * Types de clients disponibles
     */
    getTypes() {
        return [
            { code: 'particulier', label: 'Particulier' },
            { code: 'entreprise', label: 'Entreprise' },
            { code: 'organisme', label: 'Organisme à but non lucratif' },
            { code: 'gouvernement', label: 'Gouvernement / Organisme public' },
            { code: 'revendeur', label: 'Revendeur / Distributeur' },
            { code: 'autre', label: 'Autre' }
        ];
    },

    /**
     * Retourne le libellé d'un type
     */
    getTypeLibelle(code) {
        const type = this.getTypes().find(t => t.code === code);
        return type ? type.label : code;
    },

    /**
     * Crée un nouveau client
     */
    creer(client) {
        const clients = this.getAll();

        const nouveauClient = {
            id: Storage.generateId(),
            nom: client.nom,
            type: client.type || 'entreprise',
            contact: client.contact || '',
            adresse: client.adresse || '',
            ville: client.ville || '',
            province: client.province || 'QC',
            codePostal: client.codePostal || '',
            pays: client.pays || 'Canada',
            telephone: client.telephone || '',
            telecopieur: client.telecopieur || '',
            courriel: client.courriel || '',
            siteWeb: client.siteWeb || '',
            // Numéros de taxes
            numeroTPS: client.numeroTPS || '',
            numeroTVQ: client.numeroTVQ || '',
            // Données bancaires (pour prélèvements)
            banque: client.banque || '',
            transit: client.transit || '',
            institution: client.institution || '',
            compteBank: client.compteBank || '',
            // Comptabilité
            conditions: client.conditions || 'net30',
            devise: client.devise || 'CAD',
            limiteCredit: parseFloat(client.limiteCredit) || 0,
            escompte: parseFloat(client.escompte) || 0,
            solde: 0,
            compteRecevoir: client.compteRecevoir || '1100',
            compteRevenu: client.compteRevenu || '4000',
            // Méta
            notes: client.notes || '',
            actif: true,
            dateCreation: new Date().toISOString()
        };

        clients.push(nouveauClient);
        clients.sort((a, b) => a.nom.localeCompare(b.nom));
        Storage.set('clients', clients);

        return nouveauClient;
    },

    /**
     * Met à jour un client
     */
    modifier(id, modifications) {
        const clients = this.getAll();
        const index = clients.findIndex(c => c.id === id);

        if (index === -1) {
            throw new Error('Client non trouvé');
        }

        clients[index] = { ...clients[index], ...modifications };
        Storage.set('clients', clients);

        return clients[index];
    },

    /**
     * Supprime un client
     */
    supprimer(id) {
        const clients = this.getAll();
        const index = clients.findIndex(c => c.id === id);

        if (index === -1) {
            throw new Error('Client non trouvé');
        }

        // Vérifier s'il y a des factures
        const factures = Facture.getByClient(id);
        if (factures.length > 0) {
            throw new Error('Ce client a des factures. Impossible de supprimer.');
        }

        clients.splice(index, 1);
        Storage.set('clients', clients);

        return true;
    },

    /**
     * Met à jour le solde d'un client
     */
    mettreAJourSolde(id, montant) {
        const client = this.getById(id);
        if (!client) {
            throw new Error('Client non trouvé');
        }

        const nouveauSolde = client.solde + montant;
        this.modifier(id, { solde: nouveauSolde });

        return nouveauSolde;
    },

    /**
     * Recalcule le solde d'un client à partir des factures
     */
    recalculerSolde(id) {
        const factures = Facture.getByClient(id);
        let solde = 0;

        factures.forEach(f => {
            if (f.statut !== 'annulee') {
                solde += f.total - f.montantPaye;
            }
        });

        this.modifier(id, { solde: solde });
        return solde;
    },

    /**
     * Recherche de clients
     */
    rechercher(terme) {
        const termeLower = terme.toLowerCase();
        return this.getAll().filter(c =>
            c.nom.toLowerCase().includes(termeLower) ||
            c.courriel.toLowerCase().includes(termeLower) ||
            c.telephone.includes(terme)
        );
    },

    /**
     * Génère les options HTML pour un select
     */
    genererOptions(valeurSelectionnee = null) {
        const clients = this.getAll().filter(c => c.actif);
        let options = '<option value="">Sélectionner un client</option>';

        clients.forEach(c => {
            const selected = c.id === valeurSelectionnee ? 'selected' : '';
            options += `<option value="${c.id}" ${selected}>${c.nom}</option>`;
        });

        return options;
    },

    /**
     * Retourne le libellé des conditions de paiement
     */
    getConditionsLibelle(conditions) {
        const conditionsMap = {
            'immediat': 'Paiement immédiat',
            'net15': 'Net 15 jours',
            'net30': 'Net 30 jours',
            'net45': 'Net 45 jours',
            'net60': 'Net 60 jours'
        };
        return conditionsMap[conditions] || conditions;
    },

    /**
     * Calcule la date d'échéance selon les conditions
     */
    calculerEcheance(dateFacture, conditions) {
        const date = new Date(dateFacture);
        const jours = {
            'immediat': 0,
            'net15': 15,
            'net30': 30,
            'net45': 45,
            'net60': 60
        };
        date.setDate(date.getDate() + (jours[conditions] || 30));
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }
};
