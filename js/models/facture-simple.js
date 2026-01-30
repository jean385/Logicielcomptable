/**
 * Modèle Factures Simplifiées (mode Travailleur autonome)
 * Client inline, pas de double-entrée, mémorisation clients fréquents
 */

const FactureSimple = {
    // ========== FACTURES ==========

    getAll() {
        return Storage.get('factures_simples') || [];
    },

    getById(id) {
        return this.getAll().find(f => f.id === id) || null;
    },

    creer(data) {
        const factures = this.getAll();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };

        // Calculer les totaux des lignes
        const lignes = (data.lignes || []).map(l => ({
            description: l.description || '',
            quantite: parseFloat(l.quantite) || 1,
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            montant: (parseFloat(l.quantite) || 1) * (parseFloat(l.prixUnitaire) || 0)
        }));

        const sousTotal = lignes.reduce((sum, l) => sum + l.montant, 0);
        let tps = 0, tvq = 0;
        if (taxes.appliquerTaxes) {
            tps = Math.round(sousTotal * (taxes.tps / 100) * 100) / 100;
            tvq = Math.round(sousTotal * (taxes.tvq / 100) * 100) / 100;
        }
        const total = sousTotal + tps + tvq;

        const facture = {
            id: Storage.generateId(),
            numero: data.numero || this.genererNumero(),
            date: data.date || Storage.aujourdhui(),
            echeance: data.echeance || '',
            clientNom: data.clientNom || '',
            clientAdresse: data.clientAdresse || '',
            clientVille: data.clientVille || '',
            clientProvince: data.clientProvince || '',
            clientCodePostal: data.clientCodePostal || '',
            clientCourriel: data.clientCourriel || '',
            clientTelephone: data.clientTelephone || '',
            clientFrequentId: data.clientFrequentId || null,
            lignes: lignes,
            sousTotal: sousTotal,
            tps: tps,
            tvq: tvq,
            total: total,
            statut: data.statut || 'brouillon',
            notes: data.notes || '',
            revenuId: null,
            dateCreation: new Date().toISOString()
        };

        factures.push(facture);
        Storage.set('factures_simples', factures);

        // Mémoriser le client fréquent si demandé
        if (data.memoriserClient && data.clientNom) {
            this.memoriserClientFrequent(facture);
        }

        return facture;
    },

    modifier(id, data) {
        const factures = this.getAll();
        const index = factures.findIndex(f => f.id === id);
        if (index === -1) throw new Error('Facture introuvable');

        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };

        const lignes = (data.lignes || factures[index].lignes).map(l => ({
            description: l.description || '',
            quantite: parseFloat(l.quantite) || 1,
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            montant: (parseFloat(l.quantite) || 1) * (parseFloat(l.prixUnitaire) || 0)
        }));

        const sousTotal = lignes.reduce((sum, l) => sum + l.montant, 0);
        let tps = 0, tvq = 0;
        if (taxes.appliquerTaxes) {
            tps = Math.round(sousTotal * (taxes.tps / 100) * 100) / 100;
            tvq = Math.round(sousTotal * (taxes.tvq / 100) * 100) / 100;
        }
        const total = sousTotal + tps + tvq;

        factures[index] = {
            ...factures[index],
            numero: data.numero || factures[index].numero,
            date: data.date || factures[index].date,
            echeance: data.echeance !== undefined ? data.echeance : factures[index].echeance,
            clientNom: data.clientNom !== undefined ? data.clientNom : factures[index].clientNom,
            clientAdresse: data.clientAdresse !== undefined ? data.clientAdresse : factures[index].clientAdresse,
            clientVille: data.clientVille !== undefined ? data.clientVille : factures[index].clientVille,
            clientProvince: data.clientProvince !== undefined ? data.clientProvince : factures[index].clientProvince,
            clientCodePostal: data.clientCodePostal !== undefined ? data.clientCodePostal : factures[index].clientCodePostal,
            clientCourriel: data.clientCourriel !== undefined ? data.clientCourriel : factures[index].clientCourriel,
            clientTelephone: data.clientTelephone !== undefined ? data.clientTelephone : factures[index].clientTelephone,
            clientFrequentId: data.clientFrequentId !== undefined ? data.clientFrequentId : factures[index].clientFrequentId,
            lignes: lignes,
            sousTotal: sousTotal,
            tps: tps,
            tvq: tvq,
            total: total,
            statut: data.statut || factures[index].statut,
            notes: data.notes !== undefined ? data.notes : factures[index].notes,
            revenuId: data.revenuId !== undefined ? data.revenuId : factures[index].revenuId
        };

        Storage.set('factures_simples', factures);
        return factures[index];
    },

    supprimer(id) {
        let factures = this.getAll();
        factures = factures.filter(f => f.id !== id);
        Storage.set('factures_simples', factures);
    },

    changerStatut(id, statut) {
        const factures = this.getAll();
        const index = factures.findIndex(f => f.id === id);
        if (index === -1) throw new Error('Facture introuvable');
        factures[index].statut = statut;
        Storage.set('factures_simples', factures);
        return factures[index];
    },

    /**
     * Émet une facture : passe en statut 'emise' et crée un revenu associé
     */
    emettre(id) {
        const facture = this.changerStatut(id, 'emise');

        // Créer un revenu associé
        const revenu = RevenuDepense.creerRevenu({
            date: facture.date,
            description: 'Facture ' + facture.numero + (facture.clientNom ? ' - ' + facture.clientNom : ''),
            categorie: 'Services',
            montant: facture.sousTotal,
            tps: facture.tps,
            tvq: facture.tvq,
            clientNom: facture.clientNom,
            reference: facture.numero,
            factureId: facture.id
        });

        // Lier le revenu à la facture
        this.modifier(id, { revenuId: revenu.id });
        return facture;
    },

    genererNumero() {
        const factures = this.getAll();
        let maxNum = 0;
        factures.forEach(f => {
            const match = (f.numero || '').match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        return 'FS-' + String(maxNum + 1).padStart(4, '0');
    },

    getParStatut(statut) {
        return this.getAll().filter(f => f.statut === statut);
    },

    getStatutLibelle(statut) {
        const libelles = {
            brouillon: 'Brouillon',
            emise: 'Émise',
            payee: 'Payée',
            annulee: 'Annulée'
        };
        return libelles[statut] || statut;
    },

    getStatutClasse(statut) {
        const classes = {
            brouillon: 'badge-warning',
            emise: 'badge-info',
            payee: 'badge-success',
            annulee: 'badge-danger'
        };
        return classes[statut] || 'badge-info';
    },

    // ========== CLIENTS FREQUENTS ==========

    getClientsFrequents() {
        return Storage.get('clients_frequents') || [];
    },

    getClientFrequentById(id) {
        return this.getClientsFrequents().find(c => c.id === id) || null;
    },

    memoriserClientFrequent(facture) {
        const clients = this.getClientsFrequents();
        // Vérifier si ce nom existe déjà
        const existant = clients.find(c => c.nom === facture.clientNom);
        if (existant) {
            // Mettre à jour les coordonnées
            Object.assign(existant, {
                adresse: facture.clientAdresse || existant.adresse,
                ville: facture.clientVille || existant.ville,
                province: facture.clientProvince || existant.province,
                codePostal: facture.clientCodePostal || existant.codePostal,
                courriel: facture.clientCourriel || existant.courriel,
                telephone: facture.clientTelephone || existant.telephone
            });
        } else {
            clients.push({
                id: Storage.generateId(),
                nom: facture.clientNom,
                adresse: facture.clientAdresse || '',
                ville: facture.clientVille || '',
                province: facture.clientProvince || '',
                codePostal: facture.clientCodePostal || '',
                courriel: facture.clientCourriel || '',
                telephone: facture.clientTelephone || ''
            });
        }
        Storage.set('clients_frequents', clients);
    },

    supprimerClientFrequent(id) {
        let clients = this.getClientsFrequents();
        clients = clients.filter(c => c.id !== id);
        Storage.set('clients_frequents', clients);
    },

    genererOptionsClientsFrequents(selectedId) {
        return this.getClientsFrequents().map(c =>
            `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${App.escapeHtml(c.nom)}</option>`
        ).join('');
    },

    // ========== UTILITAIRES ==========

    formaterMontant(montant) {
        return (montant || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
    }
};
