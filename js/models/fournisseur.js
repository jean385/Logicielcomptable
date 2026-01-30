/**
 * Modèle Fournisseur
 */

const Fournisseur = {
    /**
     * Récupère tous les fournisseurs
     */
    getAll() {
        return Storage.get('fournisseurs') || [];
    },

    /**
     * Récupère un fournisseur par ID
     */
    getById(id) {
        return this.getAll().find(f => f.id === id);
    },

    /**
     * Crée un nouveau fournisseur
     */
    /**
     * Types de fournisseurs disponibles
     */
    getTypes() {
        return [
            { code: 'marchandises', label: 'Fournisseur de marchandises' },
            { code: 'services', label: 'Fournisseur de services' },
            { code: 'equipement', label: 'Fournisseur d\'équipement' },
            { code: 'utilities', label: 'Services publics (électricité, gaz, etc.)' },
            { code: 'professionnel', label: 'Services professionnels' },
            { code: 'gouvernement', label: 'Gouvernement / Organisme public' },
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
     * Crée un nouveau fournisseur
     */
    creer(fournisseur) {
        const fournisseurs = this.getAll();

        const nouveauFournisseur = {
            id: Storage.generateId(),
            nom: fournisseur.nom,
            type: fournisseur.type || 'autre',
            contact: fournisseur.contact || '',
            adresse: fournisseur.adresse || '',
            ville: fournisseur.ville || '',
            province: fournisseur.province || 'QC',
            codePostal: fournisseur.codePostal || '',
            pays: fournisseur.pays || 'Canada',
            telephone: fournisseur.telephone || '',
            telecopieur: fournisseur.telecopieur || '',
            courriel: fournisseur.courriel || '',
            siteWeb: fournisseur.siteWeb || '',
            // Numéros de taxes
            numeroTPS: fournisseur.numeroTPS || '',
            numeroTVQ: fournisseur.numeroTVQ || '',
            // Données bancaires
            banque: fournisseur.banque || '',
            transit: fournisseur.transit || '',
            institution: fournisseur.institution || '',
            compteBank: fournisseur.compteBank || '',
            // Comptabilité
            conditions: fournisseur.conditions || 'net30',
            devise: fournisseur.devise || 'CAD',
            limiteCredit: parseFloat(fournisseur.limiteCredit) || 0,
            solde: 0,
            compteFournisseur: fournisseur.compteFournisseur || '2100',
            compteDepense: fournisseur.compteDepense || '5990',
            // Méta
            notes: fournisseur.notes || '',
            actif: true,
            dateCreation: new Date().toISOString()
        };

        fournisseurs.push(nouveauFournisseur);
        fournisseurs.sort((a, b) => a.nom.localeCompare(b.nom));
        Storage.set('fournisseurs', fournisseurs);

        return nouveauFournisseur;
    },

    /**
     * Met à jour un fournisseur
     */
    modifier(id, modifications) {
        const fournisseurs = this.getAll();
        const index = fournisseurs.findIndex(f => f.id === id);

        if (index === -1) {
            throw new Error('Fournisseur non trouvé');
        }

        fournisseurs[index] = { ...fournisseurs[index], ...modifications };
        Storage.set('fournisseurs', fournisseurs);

        return fournisseurs[index];
    },

    /**
     * Supprime un fournisseur
     */
    supprimer(id) {
        const fournisseurs = this.getAll();
        const index = fournisseurs.findIndex(f => f.id === id);

        if (index === -1) {
            throw new Error('Fournisseur non trouvé');
        }

        // Vérifier s'il y a des factures
        const factures = Facture.getByFournisseur(id);
        if (factures.length > 0) {
            throw new Error('Ce fournisseur a des factures. Impossible de supprimer.');
        }

        fournisseurs.splice(index, 1);
        Storage.set('fournisseurs', fournisseurs);

        return true;
    },

    /**
     * Met à jour le solde d'un fournisseur
     */
    mettreAJourSolde(id, montant) {
        const fournisseur = this.getById(id);
        if (!fournisseur) {
            throw new Error('Fournisseur non trouvé');
        }

        const nouveauSolde = fournisseur.solde + montant;
        this.modifier(id, { solde: nouveauSolde });

        return nouveauSolde;
    },

    /**
     * Recalcule le solde d'un fournisseur à partir des factures
     */
    recalculerSolde(id) {
        const factures = Facture.getByFournisseur(id);
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
     * Recherche de fournisseurs
     */
    rechercher(terme) {
        const termeLower = terme.toLowerCase();
        return this.getAll().filter(f =>
            f.nom.toLowerCase().includes(termeLower) ||
            f.courriel.toLowerCase().includes(termeLower) ||
            f.telephone.includes(terme)
        );
    },

    /**
     * Génère les options HTML pour un select
     */
    genererOptions(valeurSelectionnee = null) {
        const fournisseurs = this.getAll().filter(f => f.actif);
        let options = '<option value="">Sélectionner un fournisseur</option>';

        fournisseurs.forEach(f => {
            const selected = f.id === valeurSelectionnee ? 'selected' : '';
            options += `<option value="${f.id}" ${selected}>${f.nom}</option>`;
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
