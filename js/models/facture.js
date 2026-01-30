/**
 * Modèle Facture (Vente et Achat)
 */

const Facture = {
    /**
     * Récupère toutes les factures
     */
    getAll() {
        return Storage.get('factures') || [];
    },

    /**
     * Récupère une facture par ID
     */
    getById(id) {
        return this.getAll().find(f => f.id === id);
    },

    /**
     * Récupère les factures de vente
     */
    getVentes() {
        return this.getAll().filter(f => f.type === 'vente');
    },

    /**
     * Récupère les factures d'achat
     */
    getAchats() {
        return this.getAll().filter(f => f.type === 'achat');
    },

    /**
     * Récupère les factures d'un client
     */
    getByClient(clientId) {
        return this.getAll().filter(f => f.clientId === clientId && f.type === 'vente');
    },

    /**
     * Récupère les factures d'un fournisseur
     */
    getByFournisseur(fournisseurId) {
        return this.getAll().filter(f => f.fournisseurId === fournisseurId && f.type === 'achat');
    },

    /**
     * Récupère les factures impayées
     */
    getImpayees(type = null) {
        return this.getAll().filter(f =>
            f.statut !== 'payee' &&
            f.statut !== 'annulee' &&
            (!type || f.type === type)
        );
    },

    /**
     * Crée une nouvelle facture de vente
     */
    creerVente(facture) {
        const client = Client.getById(facture.clientId);
        if (!client) {
            throw new Error('Client non trouvé');
        }

        const taxes = Storage.get('taxes');
        const avecTaxes = facture.avecTaxes !== false; // true par défaut
        const lignes = facture.lignes.map(l => {
            const sousTotal = parseFloat(l.quantite) * parseFloat(l.prixUnitaire);
            let tps = 0, tvq = 0;

            if (avecTaxes && taxes.appliquerTaxes && l.taxable !== false) {
                tps = sousTotal * (taxes.tps / 100);
                tvq = sousTotal * (taxes.tvq / 100);
            }

            return {
                description: l.description,
                quantite: parseFloat(l.quantite),
                prixUnitaire: parseFloat(l.prixUnitaire),
                compte: l.compte || '4000',
                sousTotal: sousTotal,
                tps: tps,
                tvq: tvq,
                total: sousTotal + tps + tvq
            };
        });

        const sousTotal = lignes.reduce((sum, l) => sum + l.sousTotal, 0);
        const totalTPS = lignes.reduce((sum, l) => sum + l.tps, 0);
        const totalTVQ = lignes.reduce((sum, l) => sum + l.tvq, 0);
        const total = sousTotal + totalTPS + totalTVQ;

        const nouvelleFacture = {
            id: Storage.generateId(),
            type: 'vente',
            numero: this.genererNumero('FACT'),
            date: facture.date || Storage.aujourdhui(),
            echeance: Client.calculerEcheance(facture.date || Storage.aujourdhui(), client.conditions),
            clientId: facture.clientId,
            clientNom: client.nom,
            projetId: facture.projetId || null,
            lignes: lignes,
            sousTotal: sousTotal,
            tps: totalTPS,
            tvq: totalTVQ,
            total: total,
            montantPaye: 0,
            statut: 'impayee',
            notes: facture.notes || '',
            transactionId: null,
            dateCreation: new Date().toISOString()
        };

        // Créer l'écriture comptable
        const transaction = Transaction.creer({
            date: nouvelleFacture.date,
            description: 'Facture ' + nouvelleFacture.numero + ' - ' + client.nom,
            reference: nouvelleFacture.numero,
            projetId: nouvelleFacture.projetId,
            lignes: this.genererLignesComptablesVente(nouvelleFacture, client),
            module: 'ventes'
        });

        nouvelleFacture.transactionId = transaction.id;

        // Mettre à jour le solde du client
        Client.mettreAJourSolde(client.id, total);

        const factures = this.getAll();
        factures.push(nouvelleFacture);
        Storage.set('factures', factures);

        return nouvelleFacture;
    },

    /**
     * Crée une nouvelle facture d'achat
     */
    creerAchat(facture) {
        const fournisseur = Fournisseur.getById(facture.fournisseurId);
        if (!fournisseur) {
            throw new Error('Fournisseur non trouvé');
        }

        const taxes = Storage.get('taxes');
        const avecTaxes = facture.avecTaxes !== false; // true par défaut
        const lignes = facture.lignes.map(l => {
            const sousTotal = parseFloat(l.quantite) * parseFloat(l.prixUnitaire);
            let tps = 0, tvq = 0;

            if (avecTaxes && taxes.appliquerTaxes && l.taxable !== false) {
                tps = sousTotal * (taxes.tps / 100);
                tvq = sousTotal * (taxes.tvq / 100);
            }

            return {
                description: l.description,
                quantite: parseFloat(l.quantite),
                prixUnitaire: parseFloat(l.prixUnitaire),
                compte: l.compte || fournisseur.compteDepense,
                sousTotal: sousTotal,
                tps: tps,
                tvq: tvq,
                total: sousTotal + tps + tvq
            };
        });

        const sousTotal = lignes.reduce((sum, l) => sum + l.sousTotal, 0);
        const totalTPS = lignes.reduce((sum, l) => sum + l.tps, 0);
        const totalTVQ = lignes.reduce((sum, l) => sum + l.tvq, 0);
        const total = sousTotal + totalTPS + totalTVQ;

        // Compte de contre-partie (par défaut: comptes fournisseurs)
        const compteContrepartie = facture.compteContrepartie || fournisseur.compteFournisseur || '2100';

        // Si payé comptant ou par apport, marquer comme payée
        const estPayeComptant = compteContrepartie !== '2100' && !compteContrepartie.startsWith('21');

        const nouvelleFacture = {
            id: Storage.generateId(),
            type: 'achat',
            numero: facture.numeroFournisseur || this.genererNumero('ACH'),
            numeroInterne: this.genererNumero('ACH'),
            date: facture.date || Storage.aujourdhui(),
            echeance: Fournisseur.calculerEcheance(facture.date || Storage.aujourdhui(), fournisseur.conditions),
            fournisseurId: facture.fournisseurId,
            fournisseurNom: fournisseur.nom,
            projetId: facture.projetId || null,
            compteContrepartie: compteContrepartie,
            lignes: lignes,
            sousTotal: sousTotal,
            tps: totalTPS,
            tvq: totalTVQ,
            total: total,
            montantPaye: estPayeComptant ? total : 0,
            statut: estPayeComptant ? 'payee' : 'impayee',
            notes: facture.notes || '',
            transactionId: null,
            dateCreation: new Date().toISOString()
        };

        // Créer l'écriture comptable
        const transaction = Transaction.creer({
            date: nouvelleFacture.date,
            description: 'Facture ' + nouvelleFacture.numero + ' - ' + fournisseur.nom,
            reference: nouvelleFacture.numeroInterne,
            projetId: nouvelleFacture.projetId,
            lignes: this.genererLignesComptablesAchat(nouvelleFacture, fournisseur, compteContrepartie),
            module: 'achats'
        });

        nouvelleFacture.transactionId = transaction.id;

        // Mettre à jour le solde du fournisseur seulement si c'est un compte fournisseur
        if (!estPayeComptant) {
            Fournisseur.mettreAJourSolde(fournisseur.id, total);
        }

        const factures = this.getAll();
        factures.push(nouvelleFacture);
        Storage.set('factures', factures);

        return nouvelleFacture;
    },

    /**
     * Génère les lignes comptables pour une vente
     */
    genererLignesComptablesVente(facture, client) {
        const lignes = [];

        // Débit: Comptes clients
        lignes.push({
            compte: client.compteRecevoir,
            debit: facture.total,
            credit: 0
        });

        // Crédit: Revenus par ligne
        const revenusParCompte = {};
        facture.lignes.forEach(l => {
            if (!revenusParCompte[l.compte]) {
                revenusParCompte[l.compte] = 0;
            }
            revenusParCompte[l.compte] += l.sousTotal;
        });

        for (const compte in revenusParCompte) {
            lignes.push({
                compte: compte,
                debit: 0,
                credit: revenusParCompte[compte]
            });
        }

        // Crédit: TPS à payer
        if (facture.tps > 0) {
            lignes.push({
                compte: '2200',
                debit: 0,
                credit: facture.tps
            });
        }

        // Crédit: TVQ à payer
        if (facture.tvq > 0) {
            lignes.push({
                compte: '2210',
                debit: 0,
                credit: facture.tvq
            });
        }

        return lignes;
    },

    /**
     * Génère les lignes comptables pour un achat
     */
    genererLignesComptablesAchat(facture, fournisseur, compteContrepartie = null) {
        const lignes = [];

        // Débit: Dépenses par ligne
        const depensesParCompte = {};
        facture.lignes.forEach(l => {
            if (!depensesParCompte[l.compte]) {
                depensesParCompte[l.compte] = 0;
            }
            depensesParCompte[l.compte] += l.sousTotal;
        });

        for (const compte in depensesParCompte) {
            lignes.push({
                compte: compte,
                debit: depensesParCompte[compte],
                credit: 0
            });
        }

        // Débit: TPS à recevoir
        if (facture.tps > 0) {
            lignes.push({
                compte: '1150',
                debit: facture.tps,
                credit: 0
            });
        }

        // Débit: TVQ à recevoir
        if (facture.tvq > 0) {
            lignes.push({
                compte: '1160',
                debit: facture.tvq,
                credit: 0
            });
        }

        // Crédit: Compte de contre-partie (fournisseur, encaisse, apport, etc.)
        const compteCredit = compteContrepartie || fournisseur.compteFournisseur || '2100';
        lignes.push({
            compte: compteCredit,
            debit: 0,
            credit: facture.total
        });

        return lignes;
    },

    /**
     * Enregistre un paiement sur une facture
     */
    enregistrerPaiement(factureId, montant, compteBanque, date = null) {
        const factures = this.getAll();
        const index = factures.findIndex(f => f.id === factureId);

        if (index === -1) {
            throw new Error('Facture non trouvée');
        }

        const facture = factures[index];
        const montantPaiement = parseFloat(montant);
        const soldeRestant = facture.total - facture.montantPaye;

        if (montantPaiement > soldeRestant + 0.01) {
            throw new Error('Le montant dépasse le solde dû');
        }

        // Créer l'écriture comptable du paiement
        let lignes = [];
        let description = '';

        if (facture.type === 'vente') {
            const client = Client.getById(facture.clientId);
            description = 'Encaissement ' + facture.numero + ' - ' + facture.clientNom;

            lignes = [
                { compte: compteBanque, debit: montantPaiement, credit: 0 },
                { compte: client.compteRecevoir, debit: 0, credit: montantPaiement }
            ];

            Client.mettreAJourSolde(facture.clientId, -montantPaiement);
        } else {
            const fournisseur = Fournisseur.getById(facture.fournisseurId);
            description = 'Paiement ' + facture.numero + ' - ' + facture.fournisseurNom;

            lignes = [
                { compte: fournisseur.compteFournisseur, debit: montantPaiement, credit: 0 },
                { compte: compteBanque, debit: 0, credit: montantPaiement }
            ];

            Fournisseur.mettreAJourSolde(facture.fournisseurId, -montantPaiement);
        }

        const transaction = Transaction.creer({
            date: date || Storage.aujourdhui(),
            description: description,
            reference: facture.numero,
            lignes: lignes,
            module: facture.type === 'vente' ? 'encaissements' : 'paiements'
        });

        // Mettre à jour la facture
        facture.montantPaye += montantPaiement;
        if (Math.abs(facture.montantPaye - facture.total) < 0.01) {
            facture.statut = 'payee';
        } else {
            facture.statut = 'partielle';
        }

        if (!facture.paiements) {
            facture.paiements = [];
        }
        facture.paiements.push({
            date: date || Storage.aujourdhui(),
            montant: montantPaiement,
            transactionId: transaction.id
        });

        Storage.set('factures', factures);

        return facture;
    },

    /**
     * Annule une facture
     */
    annuler(id) {
        const factures = this.getAll();
        const index = factures.findIndex(f => f.id === id);

        if (index === -1) {
            throw new Error('Facture non trouvée');
        }

        const facture = factures[index];

        if (facture.montantPaye > 0) {
            throw new Error('Impossible d\'annuler une facture ayant des paiements');
        }

        // Supprimer l'écriture comptable originale
        if (facture.transactionId) {
            Transaction.supprimer(facture.transactionId);
        }

        // Annuler le solde
        if (facture.type === 'vente') {
            Client.mettreAJourSolde(facture.clientId, -facture.total);
        } else {
            Fournisseur.mettreAJourSolde(facture.fournisseurId, -facture.total);
        }

        facture.statut = 'annulee';
        Storage.set('factures', factures);

        return facture;
    },

    /**
     * Récupère les factures d'un projet
     */
    getByProjet(projetId) {
        return this.getAll().filter(f => f.projetId === projetId);
    },

    /**
     * Génère un numéro de facture
     */
    genererNumero(prefixe = 'FACT') {
        const factures = this.getAll();
        const annee = new Date().getFullYear().toString().slice(-2);
        const count = factures.filter(f =>
            f.numero && f.numero.startsWith(prefixe + annee)
        ).length + 1;

        return prefixe + annee + '-' + count.toString().padStart(4, '0');
    },

    /**
     * Retourne le libellé du statut
     */
    getStatutLibelle(statut) {
        const statuts = {
            'impayee': 'Impayée',
            'partielle': 'Partiellement payée',
            'payee': 'Payée',
            'annulee': 'Annulée'
        };
        return statuts[statut] || statut;
    },

    /**
     * Retourne la classe CSS du statut
     */
    getStatutClasse(statut) {
        const classes = {
            'impayee': 'badge-warning',
            'partielle': 'badge-info',
            'payee': 'badge-success',
            'annulee': 'badge-danger'
        };
        return classes[statut] || '';
    }
};
