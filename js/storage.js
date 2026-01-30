/**
 * Couche d'abstraction pour le stockage de données
 * Cache-first : lecture synchrone depuis le cache mémoire,
 * écriture asynchrone vers Firebase Firestore en arrière-plan.
 * Supporte la gestion multi-dossiers.
 */

const Storage = {
    MASTER_PREFIX: 'comptabilite_',
    PREFIX: 'comptabilite_',
    activeDossierId: null,

    // Cache mémoire et Firestore
    _cache: {},
    _masterCache: {},
    _db: null,
    _uid: null,
    _writeQueue: [],
    _writingInProgress: false,
    _firestoreConnected: false,

    /**
     * Initialise Firestore et charge les données maître (dossiers, dernierDossier)
     * Appelé une seule fois après le login.
     * Retourne { success: boolean, error?: string }
     */
    async initFirestore(uid) {
        this._uid = uid;
        this._db = firebase.firestore();
        this._firestoreConnected = false;

        // Charger les données maître depuis Firestore
        try {
            const userDoc = await this._db.collection('users').doc(uid).get();
            this._firestoreConnected = true;

            if (userDoc.exists) {
                const data = userDoc.data();
                this._masterCache.dossiers = data.dossiers || [];
                this._masterCache.dernierDossier = data.dernierDossier || null;
            } else {
                // Premier usage : créer le document utilisateur
                this._masterCache.dossiers = [];
                this._masterCache.dernierDossier = null;
                await this._db.collection('users').doc(uid).set({
                    dossiers: [],
                    dernierDossier: null
                });
            }
            return { success: true };
        } catch (e) {
            console.error('Erreur initFirestore:', e);
            // Fallback : caches vides
            this._masterCache.dossiers = [];
            this._masterCache.dernierDossier = null;
            return { success: false, error: e.message || e.code || 'Erreur inconnue' };
        }
    },

    /**
     * Charge toutes les clés d'un dossier depuis Firestore dans le cache mémoire
     */
    async chargerDossierDepuisFirestore(dossierId) {
        this._cache = {};
        if (!this._db || !this._uid) return;

        try {
            const snapshot = await this._db
                .collection('users').doc(this._uid)
                .collection('dossiers').doc(dossierId)
                .collection('data').get();

            snapshot.forEach(doc => {
                this._cache[doc.id] = doc.data().value;
            });
        } catch (e) {
            console.error('Erreur chargement dossier Firestore:', e);
        }
    },

    /**
     * Initialise le stockage avec les données par défaut si nécessaire
     * Ne s'exécute que si un dossier est actif
     */
    init() {
        if (!this.activeDossierId) return;

        if (!this.get('initialized')) {
            const mode = this.get('mode') || 'complet';
            if (mode === 'autonome') {
                this.initDefaultDataAutonome();
            } else {
                this.initDefaultData();
            }
            this.set('initialized', true);
        }
    },

    /**
     * Retourne le mode du dossier actif ('complet' ou 'autonome')
     * Les dossiers sans champ mode sont traités comme 'complet' (backward compatibility)
     */
    getMode() {
        return this.get('mode') || 'complet';
    },

    /**
     * Récupère une valeur du cache mémoire (synchrone)
     */
    get(key) {
        const value = this._cache[key];
        if (value === undefined) return null;
        return value;
    },

    /**
     * Stocke une valeur dans le cache + envoie à Firestore en arrière-plan
     */
    set(key, value) {
        this._cache[key] = value;
        this._enqueueWrite(key, value);
    },

    /**
     * Supprime une valeur du cache + supprime le doc Firestore
     */
    remove(key) {
        delete this._cache[key];
        if (this._db && this._uid && this.activeDossierId) {
            this._db
                .collection('users').doc(this._uid)
                .collection('dossiers').doc(this.activeDossierId)
                .collection('data').doc(key)
                .delete()
                .catch(e => console.error('Erreur suppression Firestore:', e));
        }
    },

    /**
     * Récupère une valeur maître depuis le cache (synchrone)
     */
    getMaster(key) {
        const value = this._masterCache[key];
        if (value === undefined) return null;
        return value;
    },

    /**
     * Stocke une valeur maître dans le cache + met à jour le doc utilisateur Firestore
     * Retourne une Promise pour permettre l'attente de la confirmation
     */
    setMaster(key, value) {
        this._masterCache[key] = value;
        if (this._db && this._uid) {
            return this._db.collection('users').doc(this._uid).update({
                [key]: value
            }).catch(e => {
                console.error('Erreur écriture maître Firestore:', e);
                throw e;
            });
        }
        return Promise.resolve();
    },

    // ========== FILE D'ATTENTE D'ÉCRITURE ==========

    /**
     * Ajoute une écriture à la file d'attente
     */
    _enqueueWrite(key, value) {
        // Remplacer si la même clé est déjà en attente
        const existing = this._writeQueue.findIndex(w => w.key === key);
        if (existing !== -1) {
            this._writeQueue[existing].value = value;
        } else {
            this._writeQueue.push({ key, value });
        }
        this._processWriteQueue();
    },

    /**
     * Traite la file d'attente d'écritures Firestore
     */
    async _processWriteQueue() {
        if (this._writingInProgress) return;
        if (this._writeQueue.length === 0) return;
        if (!this._db || !this._uid || !this.activeDossierId) return;

        this._writingInProgress = true;

        while (this._writeQueue.length > 0) {
            const { key, value } = this._writeQueue.shift();
            try {
                await this._db
                    .collection('users').doc(this._uid)
                    .collection('dossiers').doc(this.activeDossierId)
                    .collection('data').doc(key)
                    .set({ value: value });
            } catch (e) {
                console.error('Erreur écriture Firestore:', key, e);
            }
        }

        this._writingInProgress = false;
    },

    /**
     * Attend que toutes les écritures en attente soient terminées
     */
    async _flushWriteQueue() {
        // Si une écriture est déjà en cours, attendre qu'elle termine
        while (this._writingInProgress || this._writeQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    },

    // ========== UTILITAIRES ==========

    /**
     * Retourne la date du jour en format YYYY-MM-DD (fuseau local)
     */
    aujourdhui() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const j = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + j;
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
     * Sauvegarde la liste des dossiers (retourne la Promise Firestore)
     */
    saveDossiers(dossiers) {
        return this.setMaster('dossiers', dossiers);
    },

    /**
     * Crée un nouveau dossier et retourne son ID
     * Attend la confirmation Firestore pour les données critiques (liste de dossiers)
     * @param {Object} infoEntreprise - Informations de l'entreprise
     * @param {string} mode - 'complet' ou 'autonome'
     */
    async creerDossier(infoEntreprise, mode = 'complet') {
        const id = this.generateId();
        const dossiers = this.getDossiers();

        dossiers.push({
            id: id,
            nom: infoEntreprise.nomCommercial || infoEntreprise.nom || 'Nouveau dossier',
            mode: mode,
            dateCreation: new Date().toISOString(),
            dernierAcces: new Date().toISOString()
        });

        // Attendre la sauvegarde Firestore de la liste de dossiers (critique)
        await this.saveDossiers(dossiers);
        this.activerDossier(id);
        this._cache = {};

        // Stocker le mode dans les données du dossier
        this.set('mode', mode);

        if (mode === 'autonome') {
            this.initDefaultDataAutonome();
        } else {
            this.initDefaultData();
        }
        this.set('initialized', true);

        // Sauvegarder les infos entreprise enrichies
        this.set('entreprise', infoEntreprise);

        // Attendre que la file d'écriture se vide (données du dossier)
        await this._flushWriteQueue();

        return id;
    },

    /**
     * Active un dossier (met à jour le préfixe et les métadonnées)
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
     * Supprime un dossier et toutes ses données Firestore
     */
    async supprimerDossier(id) {
        // Supprimer les docs Firestore du dossier
        if (this._db && this._uid) {
            try {
                const dataRef = this._db
                    .collection('users').doc(this._uid)
                    .collection('dossiers').doc(id)
                    .collection('data');

                const snapshot = await dataRef.get();
                const batch = this._db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                // Supprimer le document dossier lui-même
                await this._db
                    .collection('users').doc(this._uid)
                    .collection('dossiers').doc(id)
                    .delete();
            } catch (e) {
                console.error('Erreur suppression dossier Firestore:', e);
            }
        }

        // Retirer du registre
        let dossiers = this.getDossiers();
        dossiers = dossiers.filter(d => d.id !== id);
        await this.saveDossiers(dossiers);

        // Si c'était le dossier actif, désactiver
        if (this.activeDossierId === id) {
            this.activeDossierId = null;
            this.PREFIX = this.MASTER_PREFIX;
            this._cache = {};
        }

        // Nettoyer le dernier dossier si c'était celui-ci
        if (this.getMaster('dernierDossier') === id) {
            this.setMaster('dernierDossier', null);
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
        if (!this.get('immobilisations')) this.set('immobilisations', []);
        if (!this.get('amortissements')) this.set('amortissements', []);
    },

    /**
     * Initialise les données par défaut pour le mode autonome (travailleur autonome)
     */
    initDefaultDataAutonome() {
        // Configuration de l'entreprise (schéma réutilisé)
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

        // Configuration des taxes (réutilisée)
        if (!this.get('taxes')) {
            this.set('taxes', {
                tps: 5.0,
                tvq: 9.975,
                appliquerTaxes: true
            });
        }

        // Exercice financier (réutilisé)
        if (!this.get('exercice')) {
            this.set('exercice', {
                debut: new Date().getFullYear() + '-01-01',
                fin: new Date().getFullYear() + '-12-31',
                actif: true
            });
        }

        // Catégories de revenus par défaut
        if (!this.get('categories_revenus')) {
            this.set('categories_revenus', [
                'Services',
                'Ventes de produits',
                'Commissions',
                'Intérêts',
                'Subventions',
                'Autres revenus'
            ]);
        }

        // Catégories de dépenses par défaut
        if (!this.get('categories_depenses')) {
            this.set('categories_depenses', [
                'Publicité/marketing',
                'Assurances',
                'Fournitures bureau',
                'Frais bureau (loyer)',
                'Frais véhicule',
                'Repas/représentation',
                'Télécommunications',
                'Transport/déplacement',
                'Formation',
                'Honoraires professionnels',
                'Frais bancaires',
                'Abonnements/logiciels',
                'Autres dépenses'
            ]);
        }

        // Collections vides pour le mode autonome
        if (!this.get('revenus')) this.set('revenus', []);
        if (!this.get('depenses')) this.set('depenses', []);
        if (!this.get('factures_simples')) this.set('factures_simples', []);
        if (!this.get('clients_frequents')) this.set('clients_frequents', []);
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
            { numero: '1500', nom: 'Mobilier et agencements', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1510', nom: 'Amortissement cumulé - Mobilier et agencements', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1520', nom: 'Équipement informatique', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1530', nom: 'Amortissement cumulé - Équipement informatique', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1540', nom: 'Améliorations locatives', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1550', nom: 'Amortissement cumulé - Améliorations locatives', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1560', nom: 'Outillage', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1570', nom: 'Amortissement cumulé - Outillage', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
            { numero: '1580', nom: 'Matériel roulant', type: 'actif', soldeNormal: 'debit', solde: 0, actif: true },
            { numero: '1590', nom: 'Amortissement cumulé - Matériel roulant', type: 'actif', soldeNormal: 'credit', solde: 0, actif: true },
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
        const mode = this.getMode();
        const donnees = {
            version: '2.0',
            mode: mode,
            dateExport: new Date().toISOString(),
            entreprise: this.get('entreprise'),
            taxes: this.get('taxes'),
            exercice: this.get('exercice'),
            logo: this.get('logo')
        };

        if (mode === 'autonome') {
            donnees.categories_revenus = this.get('categories_revenus');
            donnees.categories_depenses = this.get('categories_depenses');
            donnees.revenus = this.get('revenus');
            donnees.depenses = this.get('depenses');
            donnees.factures_simples = this.get('factures_simples');
            donnees.clients_frequents = this.get('clients_frequents');
        } else {
            donnees.comptes = this.get('comptes');
            donnees.transactions = this.get('transactions');
            donnees.clients = this.get('clients');
            donnees.fournisseurs = this.get('fournisseurs');
            donnees.factures = this.get('factures');
            donnees.projets = this.get('projets');
            donnees.immobilisations = this.get('immobilisations');
            donnees.amortissements = this.get('amortissements');
        }

        return JSON.stringify(donnees, null, 2);
    },

    /**
     * Importe des données depuis JSON dans le dossier actif
     */
    importerDonnees(jsonString) {
        try {
            const donnees = JSON.parse(jsonString);
            if (donnees.mode) this.set('mode', donnees.mode);
            if (donnees.entreprise) this.set('entreprise', donnees.entreprise);
            if (donnees.taxes) this.set('taxes', donnees.taxes);
            if (donnees.exercice) this.set('exercice', donnees.exercice);
            if (donnees.logo) this.set('logo', donnees.logo);

            // Données mode autonome
            if (donnees.categories_revenus) this.set('categories_revenus', donnees.categories_revenus);
            if (donnees.categories_depenses) this.set('categories_depenses', donnees.categories_depenses);
            if (donnees.revenus) this.set('revenus', donnees.revenus);
            if (donnees.depenses) this.set('depenses', donnees.depenses);
            if (donnees.factures_simples) this.set('factures_simples', donnees.factures_simples);
            if (donnees.clients_frequents) this.set('clients_frequents', donnees.clients_frequents);

            // Données mode complet
            if (donnees.comptes) this.set('comptes', donnees.comptes);
            if (donnees.transactions) this.set('transactions', donnees.transactions);
            if (donnees.clients) this.set('clients', donnees.clients);
            if (donnees.fournisseurs) this.set('fournisseurs', donnees.fournisseurs);
            if (donnees.factures) this.set('factures', donnees.factures);
            if (donnees.projets) this.set('projets', donnees.projets);
            if (donnees.immobilisations) this.set('immobilisations', donnees.immobilisations);
            if (donnees.amortissements) this.set('amortissements', donnees.amortissements);
            return true;
        } catch (e) {
            console.error('Erreur d\'importation:', e);
            return false;
        }
    },

    /**
     * Réinitialise toutes les données du dossier actif
     */
    async reinitialiser() {
        if (!this.activeDossierId) return;

        // Supprimer tous les docs Firestore du dossier
        if (this._db && this._uid) {
            try {
                const dataRef = this._db
                    .collection('users').doc(this._uid)
                    .collection('dossiers').doc(this.activeDossierId)
                    .collection('data');

                const snapshot = await dataRef.get();
                const batch = this._db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            } catch (e) {
                console.error('Erreur réinitialisation Firestore:', e);
            }
        }

        // Vider le cache et réinitialiser
        this._cache = {};
        this.initDefaultData();
        this.set('initialized', true);
    }
};
