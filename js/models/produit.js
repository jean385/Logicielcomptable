/**
 * Modèle Produit
 * Catalogue de produits/services réutilisables
 */

const Produit = {
    /**
     * Récupère tous les produits
     */
    getAll() {
        return Storage.get('produits') || [];
    },

    /**
     * Récupère les produits actifs uniquement
     */
    getActifs() {
        return this.getAll().filter(p => p.actif !== false);
    },

    /**
     * Récupère un produit par son ID
     */
    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    /**
     * Crée un nouveau produit
     */
    creer(data) {
        if (!data.nom || !data.nom.trim()) {
            throw new Error('Le nom du produit est requis');
        }
        if (data.prixUnitaire === undefined || data.prixUnitaire === '' || isNaN(parseFloat(data.prixUnitaire))) {
            throw new Error('Le prix unitaire est requis');
        }

        const produits = this.getAll();

        const nouveau = {
            id: Storage.generateId(),
            nom: data.nom.trim(),
            description: (data.description || '').trim(),
            prixUnitaire: parseFloat(data.prixUnitaire),
            actif: true
        };

        produits.push(nouveau);
        produits.sort((a, b) => a.nom.localeCompare(b.nom));
        Storage.set('produits', produits);

        return nouveau;
    },

    /**
     * Modifie un produit existant
     */
    modifier(id, data) {
        const produits = this.getAll();
        const index = produits.findIndex(p => p.id === id);

        if (index === -1) {
            throw new Error('Produit non trouvé');
        }

        if (data.nom !== undefined) {
            if (!data.nom || !data.nom.trim()) {
                throw new Error('Le nom du produit est requis');
            }
            produits[index].nom = data.nom.trim();
        }
        if (data.description !== undefined) {
            produits[index].description = (data.description || '').trim();
        }
        if (data.prixUnitaire !== undefined) {
            produits[index].prixUnitaire = parseFloat(data.prixUnitaire);
        }
        if (data.actif !== undefined) {
            produits[index].actif = data.actif;
        }

        produits.sort((a, b) => a.nom.localeCompare(b.nom));
        Storage.set('produits', produits);

        return produits[index];
    },

    /**
     * Supprime un produit
     */
    supprimer(id) {
        const produits = this.getAll();
        const index = produits.findIndex(p => p.id === id);

        if (index === -1) {
            throw new Error('Produit non trouvé');
        }

        produits.splice(index, 1);
        Storage.set('produits', produits);

        return true;
    },

    /**
     * Génère les options HTML pour un select de produit
     */
    genererOptions() {
        const produits = this.getActifs();
        let options = '<option value="">— Sélectionner un produit —</option>';

        produits.forEach(p => {
            const prix = p.prixUnitaire.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
            options += `<option value="${p.id}">${p.nom} (${prix})</option>`;
        });

        return options;
    }
};
