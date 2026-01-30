/**
 * Modèle Revenus et Dépenses (mode Travailleur autonome)
 * CRUD simplifié par catégorie, sans double-entrée
 */

const RevenuDepense = {
    // ========== REVENUS ==========

    getRevenus() {
        return Storage.get('revenus') || [];
    },

    getRevenuById(id) {
        return this.getRevenus().find(r => r.id === id) || null;
    },

    creerRevenu(data) {
        const revenus = this.getRevenus();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };
        const montant = parseFloat(data.montant) || 0;

        let tps = 0, tvq = 0;
        if (taxes.appliquerTaxes) {
            tps = parseFloat(data.tps) || 0;
            tvq = parseFloat(data.tvq) || 0;
        }

        const revenu = {
            id: Storage.generateId(),
            date: data.date || Storage.aujourdhui(),
            description: data.description || '',
            categorie: data.categorie || 'Autres revenus',
            montant: montant,
            tps: tps,
            tvq: tvq,
            montantTotal: montant + tps + tvq,
            clientNom: data.clientNom || '',
            reference: data.reference || '',
            notes: data.notes || '',
            factureId: data.factureId || null,
            dateCreation: new Date().toISOString()
        };

        revenus.push(revenu);
        Storage.set('revenus', revenus);
        return revenu;
    },

    modifierRevenu(id, data) {
        const revenus = this.getRevenus();
        const index = revenus.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Revenu introuvable');

        const montant = parseFloat(data.montant) || 0;
        const tps = parseFloat(data.tps) || 0;
        const tvq = parseFloat(data.tvq) || 0;

        revenus[index] = {
            ...revenus[index],
            date: data.date || revenus[index].date,
            description: data.description !== undefined ? data.description : revenus[index].description,
            categorie: data.categorie || revenus[index].categorie,
            montant: montant,
            tps: tps,
            tvq: tvq,
            montantTotal: montant + tps + tvq,
            clientNom: data.clientNom !== undefined ? data.clientNom : revenus[index].clientNom,
            reference: data.reference !== undefined ? data.reference : revenus[index].reference,
            notes: data.notes !== undefined ? data.notes : revenus[index].notes,
            factureId: data.factureId !== undefined ? data.factureId : revenus[index].factureId
        };

        Storage.set('revenus', revenus);
        return revenus[index];
    },

    supprimerRevenu(id) {
        let revenus = this.getRevenus();
        revenus = revenus.filter(r => r.id !== id);
        Storage.set('revenus', revenus);
    },

    getRevenusParCategorie() {
        const revenus = this.getRevenus();
        const parCategorie = {};
        revenus.forEach(r => {
            if (!parCategorie[r.categorie]) parCategorie[r.categorie] = 0;
            parCategorie[r.categorie] += r.montant;
        });
        return parCategorie;
    },

    getTotalRevenus() {
        return this.getRevenus().reduce((sum, r) => sum + (r.montant || 0), 0);
    },

    getRevenusByPeriode(dateDebut, dateFin) {
        return this.getRevenus().filter(r => r.date >= dateDebut && r.date <= dateFin);
    },

    // ========== DEPENSES ==========

    getDepenses() {
        return Storage.get('depenses') || [];
    },

    getDepenseById(id) {
        return this.getDepenses().find(d => d.id === id) || null;
    },

    creerDepense(data) {
        const depenses = this.getDepenses();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };
        const montant = parseFloat(data.montant) || 0;

        let tps = 0, tvq = 0;
        if (taxes.appliquerTaxes) {
            tps = parseFloat(data.tps) || 0;
            tvq = parseFloat(data.tvq) || 0;
        }

        const depense = {
            id: Storage.generateId(),
            date: data.date || Storage.aujourdhui(),
            description: data.description || '',
            categorie: data.categorie || 'Autres dépenses',
            montant: montant,
            tps: tps,
            tvq: tvq,
            montantTotal: montant + tps + tvq,
            fournisseurNom: data.fournisseurNom || '',
            reference: data.reference || '',
            notes: data.notes || '',
            dateCreation: new Date().toISOString()
        };

        depenses.push(depense);
        Storage.set('depenses', depenses);
        return depense;
    },

    modifierDepense(id, data) {
        const depenses = this.getDepenses();
        const index = depenses.findIndex(d => d.id === id);
        if (index === -1) throw new Error('Dépense introuvable');

        const montant = parseFloat(data.montant) || 0;
        const tps = parseFloat(data.tps) || 0;
        const tvq = parseFloat(data.tvq) || 0;

        depenses[index] = {
            ...depenses[index],
            date: data.date || depenses[index].date,
            description: data.description !== undefined ? data.description : depenses[index].description,
            categorie: data.categorie || depenses[index].categorie,
            montant: montant,
            tps: tps,
            tvq: tvq,
            montantTotal: montant + tps + tvq,
            fournisseurNom: data.fournisseurNom !== undefined ? data.fournisseurNom : depenses[index].fournisseurNom,
            reference: data.reference !== undefined ? data.reference : depenses[index].reference,
            notes: data.notes !== undefined ? data.notes : depenses[index].notes
        };

        Storage.set('depenses', depenses);
        return depenses[index];
    },

    supprimerDepense(id) {
        let depenses = this.getDepenses();
        depenses = depenses.filter(d => d.id !== id);
        Storage.set('depenses', depenses);
    },

    getDepensesParCategorie() {
        const depenses = this.getDepenses();
        const parCategorie = {};
        depenses.forEach(d => {
            if (!parCategorie[d.categorie]) parCategorie[d.categorie] = 0;
            parCategorie[d.categorie] += d.montant;
        });
        return parCategorie;
    },

    getTotalDepenses() {
        return this.getDepenses().reduce((sum, d) => sum + (d.montant || 0), 0);
    },

    getDepensesByPeriode(dateDebut, dateFin) {
        return this.getDepenses().filter(d => d.date >= dateDebut && d.date <= dateFin);
    },

    // ========== CATEGORIES ==========

    getCategoriesRevenus() {
        return Storage.get('categories_revenus') || [];
    },

    getCategoriesDepenses() {
        return Storage.get('categories_depenses') || [];
    },

    ajouterCategorieRevenu(categorie) {
        const cats = this.getCategoriesRevenus();
        if (cats.includes(categorie)) throw new Error('Cette catégorie existe déjà');
        cats.push(categorie);
        Storage.set('categories_revenus', cats);
    },

    supprimerCategorieRevenu(categorie) {
        let cats = this.getCategoriesRevenus();
        cats = cats.filter(c => c !== categorie);
        Storage.set('categories_revenus', cats);
    },

    ajouterCategorieDepense(categorie) {
        const cats = this.getCategoriesDepenses();
        if (cats.includes(categorie)) throw new Error('Cette catégorie existe déjà');
        cats.push(categorie);
        Storage.set('categories_depenses', cats);
    },

    supprimerCategorieDepense(categorie) {
        let cats = this.getCategoriesDepenses();
        cats = cats.filter(c => c !== categorie);
        Storage.set('categories_depenses', cats);
    },

    // ========== UTILITAIRES ==========

    formaterMontant(montant) {
        return (montant || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
    },

    formaterDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    },

    genererOptionsCategoriesRevenus(selected) {
        return this.getCategoriesRevenus().map(c =>
            `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`
        ).join('');
    },

    genererOptionsCategoriesDepenses(selected) {
        return this.getCategoriesDepenses().map(c =>
            `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`
        ).join('');
    }
};
