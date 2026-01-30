/**
 * Modèle Immobilisation
 * Gestion des actifs immobilisés et de l'amortissement (solde dégressif canadien)
 */

const Immobilisation = {
    /**
     * Catégories d'amortissement canadiennes (solde dégressif)
     */
    CATEGORIES: [
        { id: 'mobilier', nom: 'Mobilier et agencements', taux: 20, compteActif: '1500', compteAmortCumule: '1510' },
        { id: 'informatique', nom: 'Équipement informatique', taux: 33.33, compteActif: '1520', compteAmortCumule: '1530' },
        { id: 'vehicules', nom: 'Véhicules', taux: 30, compteActif: '1600', compteAmortCumule: '1610' },
        { id: 'batiments', nom: 'Bâtiments', taux: 4, compteActif: '1700', compteAmortCumule: '1710' },
        { id: 'ameliorations', nom: 'Améliorations locatives', taux: 20, compteActif: '1540', compteAmortCumule: '1550' },
        { id: 'outillage', nom: 'Outillage', taux: 20, compteActif: '1560', compteAmortCumule: '1570' },
        { id: 'materiel_roulant', nom: 'Matériel roulant', taux: 30, compteActif: '1580', compteAmortCumule: '1590' }
    ],

    /**
     * Récupère une catégorie par ID
     */
    getCategorie(catId) {
        return this.CATEGORIES.find(c => c.id === catId);
    },

    // ========== CRUD Immobilisations ==========

    /**
     * Récupère toutes les immobilisations
     */
    getAll() {
        return Storage.get('immobilisations') || [];
    },

    /**
     * Récupère une immobilisation par ID
     */
    getById(id) {
        return this.getAll().find(i => i.id === id);
    },

    /**
     * Récupère les immobilisations d'une catégorie
     */
    getByCategorie(catId) {
        return this.getAll().filter(i => i.categorieId === catId);
    },

    /**
     * Récupère les immobilisations actives (non disposées)
     */
    getActives() {
        return this.getAll().filter(i => !i.disposition);
    },

    /**
     * Crée une nouvelle immobilisation
     */
    creer(immo) {
        const categorie = this.getCategorie(immo.categorieId);
        if (!categorie) {
            throw new Error('Catégorie invalide');
        }

        const nouvelleImmo = {
            id: Storage.generateId(),
            description: immo.description,
            categorieId: immo.categorieId,
            dateAcquisition: immo.dateAcquisition,
            cout: parseFloat(immo.cout),
            compteActif: categorie.compteActif,
            compteAmortCumule: categorie.compteAmortCumule,
            disposition: null,
            dateCreation: new Date().toISOString()
        };

        const immobilisations = this.getAll();
        immobilisations.push(nouvelleImmo);
        Storage.set('immobilisations', immobilisations);
        return nouvelleImmo;
    },

    /**
     * Modifie une immobilisation existante
     */
    modifier(id, modifications) {
        const immobilisations = this.getAll();
        const index = immobilisations.findIndex(i => i.id === id);

        if (index === -1) {
            throw new Error('Immobilisation non trouvée');
        }

        // Si la catégorie change, mettre à jour les comptes
        if (modifications.categorieId && modifications.categorieId !== immobilisations[index].categorieId) {
            const categorie = this.getCategorie(modifications.categorieId);
            if (!categorie) {
                throw new Error('Catégorie invalide');
            }
            modifications.compteActif = categorie.compteActif;
            modifications.compteAmortCumule = categorie.compteAmortCumule;
        }

        if (modifications.cout !== undefined) {
            modifications.cout = parseFloat(modifications.cout);
        }

        immobilisations[index] = { ...immobilisations[index], ...modifications };
        Storage.set('immobilisations', immobilisations);
        return immobilisations[index];
    },

    /**
     * Supprime une immobilisation (bloque si des amortissements existent)
     */
    supprimer(id) {
        const amortissements = this.getAllAmortissements();
        const aDesAmortissements = amortissements.some(a =>
            a.details.some(d => d.immobilisationId === id)
        );

        if (aDesAmortissements) {
            throw new Error('Impossible de supprimer : des amortissements ont été calculés pour cette immobilisation');
        }

        const immobilisations = this.getAll();
        const index = immobilisations.findIndex(i => i.id === id);
        if (index === -1) {
            throw new Error('Immobilisation non trouvée');
        }

        immobilisations.splice(index, 1);
        Storage.set('immobilisations', immobilisations);
        return true;
    },

    // ========== Calculs d'amortissement ==========

    /**
     * Récupère l'amortissement cumulé d'une immobilisation
     */
    getAmortCumule(id) {
        const amortissements = this.getAllAmortissements();
        let cumul = 0;

        amortissements.forEach(a => {
            a.details.forEach(d => {
                if (d.immobilisationId === id) {
                    cumul += d.montantAmortissement;
                }
            });
        });

        return cumul;
    },

    /**
     * Récupère la valeur nette comptable d'une immobilisation
     */
    getVNC(id) {
        const immo = this.getById(id);
        if (!immo) return 0;
        return immo.cout - this.getAmortCumule(id);
    },

    // ========== CRUD Amortissements ==========

    /**
     * Récupère tous les enregistrements d'amortissement
     */
    getAllAmortissements() {
        return Storage.get('amortissements') || [];
    },

    /**
     * Récupère un amortissement par ID
     */
    getAmortissementById(id) {
        return this.getAllAmortissements().find(a => a.id === id);
    },

    /**
     * Vérifie si l'amortissement a déjà été calculé pour un exercice
     */
    amortissementExiste(exercice) {
        return this.getAllAmortissements().some(a => a.exercice === exercice);
    },

    /**
     * Calcule la prévisualisation de l'amortissement pour l'exercice courant
     */
    previsualiserAmortissement() {
        const exercice = Storage.get('exercice');
        const debutExercice = exercice.debut;
        const finExercice = exercice.fin;
        const actives = this.getActives();

        const details = [];

        actives.forEach(immo => {
            const categorie = this.getCategorie(immo.categorieId);
            if (!categorie) return;

            const amortCumule = this.getAmortCumule(immo.id);
            const vnc = immo.cout - amortCumule;

            if (vnc <= 0) return; // Entièrement amorti

            // Règle du demi-taux : si acquisition dans l'exercice courant
            const regleDemiTaux = immo.dateAcquisition >= debutExercice && immo.dateAcquisition <= finExercice;
            const tauxApplique = regleDemiTaux ? categorie.taux / 2 : categorie.taux;

            const montant = Math.round(vnc * tauxApplique / 100 * 100) / 100;

            details.push({
                immobilisationId: immo.id,
                description: immo.description,
                categorieId: immo.categorieId,
                categorieNom: categorie.nom,
                compteAmortCumule: immo.compteAmortCumule,
                cout: immo.cout,
                tauxCategorie: categorie.taux,
                tauxApplique: tauxApplique,
                montantAmortissement: montant,
                amortCumuleAvant: amortCumule,
                amortCumuleApres: amortCumule + montant,
                regleDemiTaux: regleDemiTaux
            });
        });

        return details;
    },

    /**
     * Enregistre l'amortissement et crée l'écriture comptable
     */
    enregistrerAmortissement(details) {
        const exercice = Storage.get('exercice');
        const exerciceLabel = exercice.debut.substring(0, 4);

        if (this.amortissementExiste(exerciceLabel)) {
            throw new Error('L\'amortissement a déjà été calculé pour l\'exercice ' + exerciceLabel);
        }

        const totalAmort = details.reduce((sum, d) => sum + d.montantAmortissement, 0);
        if (totalAmort <= 0) {
            throw new Error('Aucun amortissement à enregistrer');
        }

        // Construire les lignes d'écriture comptable
        const lignes = [];

        // Débit : 5500 Amortissement (total)
        lignes.push({
            compte: '5500',
            debit: Math.round(totalAmort * 100) / 100,
            credit: 0
        });

        // Crédits : regrouper par compte d'amortissement cumulé
        const parCompte = {};
        details.forEach(d => {
            if (!parCompte[d.compteAmortCumule]) {
                parCompte[d.compteAmortCumule] = 0;
            }
            parCompte[d.compteAmortCumule] += d.montantAmortissement;
        });

        Object.keys(parCompte).sort().forEach(compte => {
            lignes.push({
                compte: compte,
                debit: 0,
                credit: Math.round(parCompte[compte] * 100) / 100
            });
        });

        // Créer la transaction
        const transaction = Transaction.creer({
            date: Storage.aujourdhui(),
            description: 'Amortissement - Exercice ' + exerciceLabel,
            reference: Transaction.genererReference('AMR'),
            lignes: lignes,
            module: 'immobilisations'
        });

        // Sauvegarder l'enregistrement d'amortissement
        const enregistrement = {
            id: Storage.generateId(),
            exercice: exerciceLabel,
            dateCalcul: Storage.aujourdhui(),
            transactionId: transaction.id,
            details: details.map(d => ({
                immobilisationId: d.immobilisationId,
                cout: d.cout,
                tauxApplique: d.tauxApplique,
                montantAmortissement: d.montantAmortissement,
                amortCumuleAvant: d.amortCumuleAvant,
                amortCumuleApres: d.amortCumuleApres,
                regleDemiTaux: d.regleDemiTaux
            }))
        };

        const amortissements = this.getAllAmortissements();
        amortissements.push(enregistrement);
        Storage.set('amortissements', amortissements);

        return enregistrement;
    },

    /**
     * Assure que les comptes nécessaires existent (pour dossiers existants)
     */
    verifierComptes() {
        const comptesRequis = [
            { numero: '1520', nom: 'Équipement informatique', type: 'actif', soldeNormal: 'debit' },
            { numero: '1530', nom: 'Amortissement cumulé - Équipement informatique', type: 'actif', soldeNormal: 'credit' },
            { numero: '1540', nom: 'Améliorations locatives', type: 'actif', soldeNormal: 'debit' },
            { numero: '1550', nom: 'Amortissement cumulé - Améliorations locatives', type: 'actif', soldeNormal: 'credit' },
            { numero: '1560', nom: 'Outillage', type: 'actif', soldeNormal: 'debit' },
            { numero: '1570', nom: 'Amortissement cumulé - Outillage', type: 'actif', soldeNormal: 'credit' },
            { numero: '1580', nom: 'Matériel roulant', type: 'actif', soldeNormal: 'debit' },
            { numero: '1590', nom: 'Amortissement cumulé - Matériel roulant', type: 'actif', soldeNormal: 'credit' }
        ];

        comptesRequis.forEach(c => {
            if (!Compte.getByNumero(c.numero)) {
                try {
                    Compte.creer(c);
                } catch (e) {
                    // Le compte existe déjà, ignorer
                }
            }
        });
    }
};
