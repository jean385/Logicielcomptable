/**
 * Couche d'abstraction pour le stockage de données
 * Utilise localStorage mais peut être migré vers API REST
 * Supporte la gestion multi-dossiers
 */

const Storage = {
    MASTER_PREFIX: 'comptabilite_',
    PREFIX: 'comptabilite_',
    activeDossierId: null,

    /**
     * Initialise le stockage avec les données par défaut si nécessaire
     * Ne s'exécute que si un dossier est actif
     */
    init() {
        if (!this.activeDossierId) return;

        if (!this.get('initialized')) {
            this.initDefaultData();
            this.set('initialized', true);
        }
    },

    /**
     * Récupère une valeur du stockage
     */
    get(key) {
        const data = localStorage.getItem(this.PREFIX + key);
        if (data === null) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    },

    /**
     * Stocke une valeur
     */
    set(key, value) {
        localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    },

    /**
     * Supprime une valeur
     */
    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
    },

    /**
     * Récupère une valeur avec le préfixe maître (indépendant du dossier)
     */
    getMaster(key) {
        const data = localStorage.getItem(this.MASTER_PREFIX + key);
        if (data === null) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    },

    /**
     * Stocke une valeur avec le préfixe maître (indépendant du dossier)
     */
    setMaster(key, value) {
        localStorage.setItem(this.MASTER_PREFIX + key, JSON.stringify(value));
    },

    /**
     * Génère un UUID unique
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // ========== GESTION DES DOSSIERS ==========

    /**
     * Récupère la liste de tous les dossiers
     */
    getDossiers() {
        return this.getMaster('dossiers') || [];
    },

    /**
     * Sauvegarde la liste des dossiers
     */
    saveDossiers(dossiers) {
        this.setMaster('dossiers', dossiers);
    },

    /**
     * Crée un nouveau dossier et retourne son ID
     */
    creerDossier(infoEntreprise) {
        const id = this.generateId();
        const dossiers = this.getDossiers();

        dossiers.push({
            id: id,
            nom: infoEntreprise.nomCommercial || infoEntreprise.nom || 'Nouveau dossier',
            dateCreation: new Date().toISOString(),
            dernierAcces: new Date().toISOString()
        });

        this.saveDossiers(dossiers);
        this.activerDossier(id);
        this.initDefaultData();
        this.set('initialized', true);

        // Sauvegarder les infos entreprise enrichies
        this.set('entreprise', infoEntreprise);

        return id;
    },

    /**
     * Active un dossier (change le préfixe de stockage)
     */
    activerDossier(id) {
        this.activeDossierId = id;
        this.PREFIX = this.MASTER_PREFIX + id + '_';
        this.setMaster('dernierDossier', id);

        // Mettre à jour la date de dernier accès
        const dossiers = this.getDossiers();
        const dossier = dossiers.find(d => d.id === id);
        if (dossier) {
            dossier.dernierAcces = new Date().toISOString();
            this.saveDossiers(dossiers);
        }
    },

    /**
     * Supprime un dossier et toutes ses données
     */
    supprimerDossier(id) {
        const prefixDossier = this.MASTER_PREFIX + id + '_';

        // Supprimer toutes les clés du dossier
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefixDossier));
        keys.forEach(k => localStorage.removeItem(k));

        // Retirer du registre
        let dossiers = this.getDossiers();
        dossiers = dossiers.filter(d => d.id !== id);
        this.saveDossiers(dossiers);

        // Si c'était le dossier actif, désactiver
        if (this.activeDossierId === id) {
            this.activeDossierId = null;
            this.PREFIX = this.MASTER_PREFIX;
        }

        // Nettoyer le dernier dossier si c'était celui-ci
        if (this.getMaster('dernierDossier') === id) {
            localStorage.removeItem(this.MASTER_PREFIX + 'dernierDossier');
        }
    },

    /**
     * Récupère l'ID du dernier dossier ouvert
     */
    getDernierDossier() {
        return this.getMaster('dernierDossier');
    },

    /**
     * Renomme un dossier dans le registre
     */
    renommerDossier(id, nouveauNom) {
        const dossiers = this.getDossiers();
        const dossier = dossiers.find(d => d.id === id);
        if (dossier) {
            dossier.nom = nouveauNom;
            this.saveDossiers(dossiers);
        }
    },

    // ========== DONNÉES PAR DÉFAUT ==========

    /**
     * Initialise les données par défaut
     */
    initDefaultData() {
        // Configuration de l'entreprise (schéma enrichi)
        if (!this.get('entreprise')) {
            this.set('entreprise', {
                nomCommercial: 'Mon Entreprise',
                raisonSociale: '',
                adresse: '',
                ville: '',
                province: 'QC',
                codePostal: '',
                pays: 'Canada',
                telephone: '',
                telecopieur: '',
                courriel: '',
                siteWeb: '',
                neq: '',
                tps: '',
                tvq: '',
                dateCreationEntreprise: ''
            });
        }

        // Configuration des taxes
        if (!this.get('taxes')) {
            this.set('taxes', {
                tps: 5.0,
                tvq: 9.975,
                appliquerTaxes: true
            });
        }

        // Exercice financier
        if (!this.get('exercice')) {
            this.set('exercice', {
                debut: new Date().getFullYear() + '-01-01',
                fin: new Date().getFullYear() + '-12-31',
                actif: true
            });
        }

        // Plan comptable par défaut (canadien)
        if (!this.get('comptes')) {
            this.set('comptes', this.getPlanComptableDefaut());
        }

        // Collections vides
        if (!this.get('transactions')) this.set('transactions', []);
        if (!this.get('clients')) this.set('clients', []);
        if (!this.get('fournisseurs')) this.set('fournisseurs', []);
        if (!this.get('factures')) this.set('factures', []);
        if (!this.get('projets')) this.set('projets', []);
    },

    /**
     * Retourne le plan comptable canadien par défaut
     */
    getPlanComptableDefaut() {
        return [
            // Actifs (1000-1999)
            { numero: '1000', nom: 'Encaisse', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1050', nom: 'Petite caisse', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1100', nom: 'Comptes clients', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1150', nom: 'TPS à recevoir', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1160', nom: 'TVQ à recevoir', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1200', nom: 'Stock de marchandises', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1300', nom: 'Frais payés d\'avance', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1500', nom: 'Équipement', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1510', nom: 'Amortissement cumulé - Équipement', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1600', nom: 'Véhicules', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1610', nom: 'Amortissement cumulé - Véhicules', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1700', nom: 'Bâtiments', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1710', nom: 'Amortissement cumulé - Bâtiments', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1800', nom: 'Terrain', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },

            // Passifs (2000-2999)
            { numero: '2100', nom: 'Comptes fournisseurs', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2200', nom: 'TPS à payer', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2210', nom: 'TVQ à payer', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2300', nom: 'Salaires à payer', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2400', nom: 'Emprunt bancaire - Court terme', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2500', nom: 'Portion courante dette long terme', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2600', nom: 'Emprunt bancaire - Long terme', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '2700', nom: 'Hypothèque à payer', type: 'passif', soldeNormal: 'credit', solde: 0, actif: true },

            // Capitaux propres (3000-3999)
            { numero: '3100', nom: 'Capital', type: 'capitaux', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '3200', nom: 'Apports', type: 'capitaux', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '3300', nom: 'Retraits', type: 'capitaux', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '3400', nom: 'Bénéfices non répartis', type: 'capitaux', soldeNormal: 'credit', solde: 0, actif: true },

            // Revenus (4000-4999)
            { numero: '4000', nom: 'Ventes', type: 'revenus', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '4050', nom: 'Rendus et rabais sur ventes', type: 'revenus', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '4100', nom: 'Revenus de services', type: 'revenus', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '4200', nom: 'Revenus d\'intérêts', type: 'revenus', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '4300', nom: 'Autres revenus', type: 'revenus', soldeNormal: 'credit', solde: 0, actif: true },

            // Dépenses (5000-5999)
            { numero: '5000', nom: 'Coût des marchandises vendues', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5100', nom: 'Salaires', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5110', nom: 'Avantages sociaux', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5200', nom: 'Loyer', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5300', nom: 'Électricité', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5310', nom: 'Chauffage', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5400', nom: 'Fournitures de bureau', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5500', nom: 'Amortissement', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5600', nom: 'Assurances', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5700', nom: 'Publicité et marketing', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5800', nom: 'Frais bancaires', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5810', nom: 'Intérêts sur emprunts', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5900', nom: 'Télécommunications', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5910', nom: 'Frais de déplacement', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5920', nom: 'Frais de représentation', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5950', nom: 'Honoraires professionnels', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '5990', nom: 'Autres dépenses', type: 'depenses', soldeNormal: 'debit', solde: 0, actif: true }
        ];
    },

    // ========== EXPORT / IMPORT ==========

    /**
     * Exporte toutes les données du dossier actif en JSON
     */
    exporterDonnees() {
        const donnees = {
            version: '2.0',
            dateExport: new Date().toISOString(),
            entreprise: this.get('entreprise'),
            taxes: this.get('taxes'),
            exercice: this.get('exercice'),
            comptes: this.get('comptes'),
            transactions: this.get('transactions'),
            clients: this.get('clients'),
            fournisseurs: this.get('fournisseurs'),
            factures: this.get('factures'),
            projets: this.get('projets'),
            logo: this.get('logo')
        };
        return JSON.stringify(donnees, null, 2);
    },

    /**
     * Importe des données depuis JSON dans le dossier actif
     */
    importerDonnees(jsonString) {
        try {
            const donnees = JSON.parse(jsonString);
            if (donnees.entreprise) this.set('entreprise', donnees.entreprise);
            if (donnees.taxes) this.set('taxes', donnees.taxes);
            if (donnees.exercice) this.set('exercice', donnees.exercice);
            if (donnees.comptes) this.set('comptes', donnees.comptes);
            if (donnees.transactions) this.set('transactions', donnees.transactions);
            if (donnees.clients) this.set('clients', donnees.clients);
            if (donnees.fournisseurs) this.set('fournisseurs', donnees.fournisseurs);
            if (donnees.factures) this.set('factures', donnees.factures);
            if (donnees.projets) this.set('projets', donnees.projets);
            if (donnees.logo) this.set('logo', donnees.logo);
            return true;
        } catch (e) {
            console.error('Erreur d\'importation:', e);
            return false;
        }
    },

    /**
     * Réinitialise toutes les données du dossier actif
     */
    reinitialiser() {
        if (!this.activeDossierId) return;
        const prefixDossier = this.MASTER_PREFIX + this.activeDossierId + '_';
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefixDossier));
        keys.forEach(k => localStorage.removeItem(k));
        this.initDefaultData();
        this.set('initialized', true);
    }
};
