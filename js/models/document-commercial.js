/**
 * Modele Document Commercial
 * Gere les soumissions et bons de commande
 */

const DocumentCommercial = {
    STATUTS_SOUMISSION: ['brouillon', 'envoyee', 'acceptee', 'refusee', 'convertie', 'annulee'],
    STATUTS_BON_COMMANDE: ['brouillon', 'envoye', 'confirme', 'converti', 'annule'],

    getAll() {
        return Storage.get('documents_commerciaux') || [];
    },

    getById(id) {
        return this.getAll().find(d => d.id === id) || null;
    },

    getSoumissions() {
        return this.getAll().filter(d => d.type === 'soumission');
    },

    getBonsCommande() {
        return this.getAll().filter(d => d.type === 'bon_commande');
    },

    creer(data) {
        const docs = this.getAll();
        const doc = {
            id: Storage.generateId(),
            type: data.type,
            numero: data.numero || this.genererNumero(data.type === 'soumission' ? 'SOU' : 'BC'),
            date: data.date || Storage.aujourdhui(),
            clientId: data.clientId || null,
            clientNom: data.clientNom || '',
            codeTaxe: data.codeTaxe || null,
            lignes: data.lignes || [],
            sousTotal: data.sousTotal || 0,
            taxe1Nom: data.taxe1Nom || '',
            taxe1Montant: data.taxe1Montant || 0,
            taxe2Nom: data.taxe2Nom || '',
            taxe2Montant: data.taxe2Montant || 0,
            total: data.total || 0,
            statut: data.statut || 'brouillon',
            notes: data.notes || '',
            sourceId: data.sourceId || null,
            convertieEnId: data.convertieEnId || null,
            dateCreation: new Date().toISOString()
        };

        docs.push(doc);
        Storage.set('documents_commerciaux', docs);
        return doc;
    },

    modifier(id, modifications) {
        const docs = this.getAll();
        const index = docs.findIndex(d => d.id === id);
        if (index === -1) throw new Error('Document non trouve');

        Object.assign(docs[index], modifications);
        Storage.set('documents_commerciaux', docs);
        return docs[index];
    },

    changerStatut(id, nouveauStatut) {
        return this.modifier(id, { statut: nouveauStatut });
    },

    supprimer(id) {
        let docs = this.getAll();
        docs = docs.filter(d => d.id !== id);
        Storage.set('documents_commerciaux', docs);
    },

    convertirSoumissionEnBC(id) {
        const soumission = this.getById(id);
        if (!soumission) throw new Error('Soumission non trouvee');
        if (soumission.type !== 'soumission') throw new Error('Ce document n\'est pas une soumission');

        const bc = this.creer({
            type: 'bon_commande',
            clientId: soumission.clientId,
            clientNom: soumission.clientNom,
            codeTaxe: soumission.codeTaxe,
            lignes: JSON.parse(JSON.stringify(soumission.lignes)),
            sousTotal: soumission.sousTotal,
            taxe1Nom: soumission.taxe1Nom,
            taxe1Montant: soumission.taxe1Montant,
            taxe2Nom: soumission.taxe2Nom,
            taxe2Montant: soumission.taxe2Montant,
            total: soumission.total,
            notes: soumission.notes,
            sourceId: soumission.id,
            statut: 'brouillon'
        });

        this.modifier(id, { statut: 'convertie', convertieEnId: bc.id });
        return bc;
    },

    convertirBCEnFacture(id) {
        const bc = this.getById(id);
        if (!bc) throw new Error('Bon de commande non trouve');
        if (bc.type !== 'bon_commande') throw new Error('Ce document n\'est pas un bon de commande');

        // Utiliser le code de taxe du BC ou les taxes par defaut
        const taxes = Storage.get('taxes');
        const lignesFacture = bc.lignes.map(l => ({
            description: l.description,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            compte: l.compte || '4000',
            sousTotal: l.sousTotal || (l.quantite * l.prixUnitaire),
            tps: l.tps || 0,
            tvq: l.tvq || 0,
            total: l.total || (l.quantite * l.prixUnitaire)
        }));

        const facture = Facture.creerVente({
            clientId: bc.clientId,
            date: Storage.aujourdhui(),
            lignes: lignesFacture,
            sousTotal: bc.sousTotal,
            totalTPS: bc.taxe1Montant,
            totalTVQ: bc.taxe2Montant,
            total: bc.total,
            notes: bc.notes,
            sourceBC: bc.id
        });

        this.modifier(id, { statut: 'converti', convertieEnId: facture.id });
        return facture;
    },

    genererNumero(prefixe) {
        const docs = this.getAll();
        const filtered = docs.filter(d =>
            (prefixe === 'SOU' && d.type === 'soumission') ||
            (prefixe === 'BC' && d.type === 'bon_commande')
        );
        const num = filtered.length + 1;
        return prefixe + '-' + String(num).padStart(4, '0');
    },

    calculerTaxes(lignes, codeTaxe) {
        let taxeInfo;
        if (codeTaxe) {
            taxeInfo = Storage.getTaxesParCode(codeTaxe);
        } else {
            const taxes = Storage.get('taxes');
            taxeInfo = { taxe1Nom: 'TPS', taxe1Taux: taxes.tps, taxe2Nom: 'TVQ', taxe2Taux: taxes.tvq };
        }

        let sousTotal = 0;
        lignes.forEach(l => {
            sousTotal += (l.quantite || 0) * (l.prixUnitaire || 0);
        });

        const taxe1Montant = Math.round(sousTotal * (taxeInfo.taxe1Taux / 100) * 100) / 100;
        const taxe2Montant = Math.round(sousTotal * (taxeInfo.taxe2Taux / 100) * 100) / 100;
        const total = Math.round((sousTotal + taxe1Montant + taxe2Montant) * 100) / 100;

        return {
            sousTotal: Math.round(sousTotal * 100) / 100,
            taxe1Nom: taxeInfo.taxe1Nom,
            taxe1Taux: taxeInfo.taxe1Taux,
            taxe1Montant,
            taxe2Nom: taxeInfo.taxe2Nom,
            taxe2Taux: taxeInfo.taxe2Taux,
            taxe2Montant,
            total
        };
    },

    getStatutLibelle(statut) {
        const labels = {
            brouillon: 'Brouillon',
            envoyee: 'Envoyee',
            envoye: 'Envoye',
            acceptee: 'Acceptee',
            refusee: 'Refusee',
            confirmee: 'Confirmee',
            confirme: 'Confirme',
            convertie: 'Convertie',
            converti: 'Converti',
            annulee: 'Annulee',
            annule: 'Annule'
        };
        return labels[statut] || statut;
    },

    getStatutClasse(statut) {
        const classes = {
            brouillon: 'badge-warning',
            envoyee: 'badge-info',
            envoye: 'badge-info',
            acceptee: 'badge-success',
            confirmee: 'badge-success',
            confirme: 'badge-success',
            refusee: 'badge-danger',
            convertie: 'badge-info',
            converti: 'badge-info',
            annulee: 'badge-danger',
            annule: 'badge-danger'
        };
        return classes[statut] || 'badge-warning';
    }
};
