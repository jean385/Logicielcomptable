/**
 * Modèle Compte Comptable
 */

const Compte = {
    /**
     * Récupère tous les comptes
     */
    getAll() {
        return Storage.get('comptes') || [];
    },

    /**
     * Récupère les comptes actifs uniquement
     */
    getActifs() {
        return this.getAll().filter(c => c.actif);
    },

    /**
     * Récupère un compte par numéro
     */
    getByNumero(numero) {
        return this.getAll().find(c => c.numero === numero);
    },

    /**
     * Récupère les comptes par type
     */
    getByType(type) {
        return this.getActifs().filter(c => c.type === type);
    },

    /**
     * Crée un nouveau compte
     */
    creer(compte) {
        const comptes = this.getAll();

        // Vérifier si le numéro existe déjà
        if (comptes.find(c => c.numero === compte.numero)) {
            throw new Error('Ce numéro de compte existe déjà');
        }

        const nouveauCompte = {
            numero: compte.numero,
            nom: compte.nom,
            type: compte.type,
            soldeNormal: compte.soldeNormal || this.getSoldeNormalParDefaut(compte.type),
            solde: 0,
            actif: true
        };

        comptes.push(nouveauCompte);
        comptes.sort((a, b) => a.numero.localeCompare(b.numero));
        Storage.set('comptes', comptes);
        return nouveauCompte;
    },

    /**
     * Met à jour un compte existant
     */
    modifier(numero, modifications) {
        const comptes = this.getAll();
        const index = comptes.findIndex(c => c.numero === numero);

        if (index === -1) {
            throw new Error('Compte non trouvé');
        }

        // Ne pas permettre de changer le numéro vers un existant
        if (modifications.numero && modifications.numero !== numero) {
            if (comptes.find(c => c.numero === modifications.numero)) {
                throw new Error('Ce numéro de compte existe déjà');
            }
        }

        comptes[index] = { ...comptes[index], ...modifications };
        comptes.sort((a, b) => a.numero.localeCompare(b.numero));
        Storage.set('comptes', comptes);
        return comptes[index];
    },

    /**
     * Désactive un compte (soft delete)
     */
    desactiver(numero) {
        return this.modifier(numero, { actif: false });
    },

    /**
     * Active un compte
     */
    activer(numero) {
        return this.modifier(numero, { actif: true });
    },

    /**
     * Met à jour le solde d'un compte
     */
    mettreAJourSolde(numero, montant, estDebit) {
        const compte = this.getByNumero(numero);
        if (!compte) {
            throw new Error('Compte non trouvé: ' + numero);
        }

        let nouveauSolde = compte.solde;

        if (compte.soldeNormal === 'debit') {
            nouveauSolde += estDebit ? montant : -montant;
        } else {
            nouveauSolde += estDebit ? -montant : montant;
        }

        this.modifier(numero, { solde: nouveauSolde });
        return nouveauSolde;
    },

    /**
     * Recalcule tous les soldes à partir des transactions
     */
    recalculerSoldes() {
        const comptes = this.getAll();
        const transactions = Storage.get('transactions') || [];

        // Réinitialiser tous les soldes
        comptes.forEach(c => c.solde = 0);

        // Recalculer à partir des transactions
        transactions.forEach(trans => {
            trans.lignes.forEach(ligne => {
                const compte = comptes.find(c => c.numero === ligne.compte);
                if (compte) {
                    if (compte.soldeNormal === 'debit') {
                        compte.solde += ligne.debit - ligne.credit;
                    } else {
                        compte.solde += ligne.credit - ligne.debit;
                    }
                }
            });
        });

        Storage.set('comptes', comptes);
    },

    /**
     * Retourne le solde normal par défaut selon le type
     */
    getSoldeNormalParDefaut(type) {
        switch (type) {
            case 'actif':
            case 'depenses':
                return 'debit';
            case 'passif':
            case 'capitaux':
            case 'revenus':
                return 'credit';
            default:
                return 'debit';
        }
    },

    /**
     * Formate un numéro de compte pour affichage
     */
    formaterNumero(numero) {
        return numero;
    },

    /**
     * Retourne le libellé du type
     */
    getTypeLibelle(type) {
        const types = {
            'actif': 'Actif',
            'passif': 'Passif',
            'capitaux': 'Capitaux propres',
            'revenus': 'Revenus',
            'depenses': 'Dépenses'
        };
        return types[type] || type;
    },

    /**
     * Génère les options HTML pour un select de comptes
     */
    genererOptions(filtreType = null, valeurSelectionnee = null) {
        const comptes = filtreType ? this.getByType(filtreType) : this.getActifs();
        let options = '<option value="">Sélectionner un compte</option>';

        comptes.forEach(c => {
            const selected = c.numero === valeurSelectionnee ? 'selected' : '';
            options += `<option value="${c.numero}" ${selected}>${c.numero} - ${c.nom}</option>`;
        });

        return options;
    },

    /**
     * Génère les options groupées par type
     */
    genererOptionsGroupees(valeurSelectionnee = null) {
        const comptes = this.getActifs();
        const types = ['actif', 'passif', 'capitaux', 'revenus', 'depenses'];
        let options = '<option value="">Sélectionner un compte</option>';

        types.forEach(type => {
            const comptesType = comptes.filter(c => c.type === type);
            if (comptesType.length > 0) {
                options += `<optgroup label="${this.getTypeLibelle(type)}">`;
                comptesType.forEach(c => {
                    const selected = c.numero === valeurSelectionnee ? 'selected' : '';
                    options += `<option value="${c.numero}" ${selected}>${c.numero} - ${c.nom}</option>`;
                });
                options += '</optgroup>';
            }
        });

        return options;
    }
};
