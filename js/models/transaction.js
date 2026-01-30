/**
 * Modèle Transaction (Écriture comptable)
 */

const Transaction = {
    /**
     * Récupère toutes les transactions
     */
    getAll() {
        return Storage.get('transactions') || [];
    },

    /**
     * Récupère une transaction par ID
     */
    getById(id) {
        return this.getAll().find(t => t.id === id);
    },

    /**
     * Récupère les transactions par module source
     */
    getByModule(module) {
        return this.getAll().filter(t => t.module === module);
    },

    /**
     * Récupère les transactions pour un compte
     */
    getByCompte(numeroCompte) {
        return this.getAll().filter(t =>
            t.lignes.some(l => l.compte === numeroCompte)
        );
    },

    /**
     * Récupère les transactions par période
     */
    getByPeriode(dateDebut, dateFin) {
        return this.getAll().filter(t =>
            t.date >= dateDebut && t.date <= dateFin
        );
    },

    /**
     * Crée une nouvelle transaction
     */
    creer(transaction) {
        // Valider l'équilibre débit/crédit
        const totalDebit = transaction.lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
        const totalCredit = transaction.lignes.reduce((sum, l) => sum + (l.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error('L\'écriture n\'est pas équilibrée. Débit: ' + totalDebit.toFixed(2) + ', Crédit: ' + totalCredit.toFixed(2));
        }

        if (totalDebit === 0) {
            throw new Error('Le montant total ne peut pas être zéro');
        }

        const nouvelleTransaction = {
            id: Storage.generateId(),
            date: transaction.date || Storage.aujourdhui(),
            description: transaction.description,
            reference: transaction.reference || '',
            projetId: transaction.projetId || null,
            lignes: transaction.lignes.map(l => ({
                compte: l.compte,
                debit: parseFloat(l.debit) || 0,
                credit: parseFloat(l.credit) || 0
            })),
            module: transaction.module || 'general',
            dateCreation: new Date().toISOString()
        };

        // Mettre à jour les soldes des comptes
        nouvelleTransaction.lignes.forEach(ligne => {
            if (ligne.debit > 0) {
                Compte.mettreAJourSolde(ligne.compte, ligne.debit, true);
            }
            if (ligne.credit > 0) {
                Compte.mettreAJourSolde(ligne.compte, ligne.credit, false);
            }
        });

        const transactions = this.getAll();
        transactions.push(nouvelleTransaction);
        transactions.sort((a, b) => b.date.localeCompare(a.date) || b.dateCreation.localeCompare(a.dateCreation));
        Storage.set('transactions', transactions);

        return nouvelleTransaction;
    },

    /**
     * Supprime une transaction et inverse les soldes
     */
    supprimer(id) {
        const transactions = this.getAll();
        const transaction = transactions.find(t => t.id === id);

        if (!transaction) {
            throw new Error('Transaction non trouvée');
        }

        // Inverser les effets sur les soldes
        transaction.lignes.forEach(ligne => {
            if (ligne.debit > 0) {
                Compte.mettreAJourSolde(ligne.compte, -ligne.debit, true);
            }
            if (ligne.credit > 0) {
                Compte.mettreAJourSolde(ligne.compte, -ligne.credit, false);
            }
        });

        const index = transactions.findIndex(t => t.id === id);
        transactions.splice(index, 1);
        Storage.set('transactions', transactions);

        return true;
    },

    /**
     * Génère un numéro de référence automatique
     */
    genererReference(prefixe = 'EC') {
        const transactions = this.getAll();
        const aujourdhui = Storage.aujourdhui().replace(/-/g, '');
        const count = transactions.filter(t =>
            t.reference && t.reference.startsWith(prefixe + aujourdhui)
        ).length + 1;

        return prefixe + aujourdhui + '-' + count.toString().padStart(3, '0');
    },

    /**
     * Récupère les transactions d'un projet
     */
    getByProjet(projetId) {
        return this.getAll().filter(t => t.projetId === projetId);
    },

    /**
     * Recherche dans les transactions
     */
    rechercher(terme) {
        const termeLower = terme.toLowerCase();
        return this.getAll().filter(t =>
            t.description.toLowerCase().includes(termeLower) ||
            t.reference.toLowerCase().includes(termeLower) ||
            t.lignes.some(l => {
                const compte = Compte.getByNumero(l.compte);
                return compte && compte.nom.toLowerCase().includes(termeLower);
            })
        );
    },

    /**
     * Calcule le total des débits et crédits pour une période
     */
    getTotauxPeriode(dateDebut, dateFin) {
        const transactions = this.getByPeriode(dateDebut, dateFin);
        let totalDebit = 0;
        let totalCredit = 0;

        transactions.forEach(t => {
            t.lignes.forEach(l => {
                totalDebit += l.debit || 0;
                totalCredit += l.credit || 0;
            });
        });

        return { totalDebit, totalCredit };
    },

    /**
     * Formate un montant en devise
     */
    formaterMontant(montant) {
        return new Intl.NumberFormat('fr-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(montant);
    },

    /**
     * Formate une date pour affichage
     */
    formaterDate(date) {
        return new Date(date + 'T00:00:00').toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};
