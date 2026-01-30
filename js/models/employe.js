/**
 * Modele Employe
 * Gestion des employes
 */

const Employe = {
    getAll() {
        return Storage.get('employes') || [];
    },

    getActifs() {
        return this.getAll().filter(e => e.actif !== false);
    },

    getById(id) {
        return this.getAll().find(e => e.id === id) || null;
    },

    creer(data) {
        const employes = this.getAll();

        const employe = {
            id: Storage.generateId(),
            prenom: data.prenom || '',
            nom: data.nom || '',
            nas: data.nas || '',
            adresse: data.adresse || '',
            ville: data.ville || '',
            province: data.province || 'QC',
            codePostal: data.codePostal || '',
            dateEmbauche: data.dateEmbauche || Storage.aujourdhui(),
            typeSalaire: data.typeSalaire || 'horaire',
            tauxHoraire: parseFloat(data.tauxHoraire) || 0,
            salaireAnnuel: parseFloat(data.salaireAnnuel) || 0,
            heuresSemaine: parseFloat(data.heuresSemaine) || 40,
            frequencePaie: data.frequencePaie || 'bimensuel',
            poste: data.poste || '',
            actif: data.actif !== false,
            dateCreation: new Date().toISOString()
        };

        employes.push(employe);
        Storage.set('employes', employes);
        return employe;
    },

    modifier(id, modifications) {
        const employes = this.getAll();
        const index = employes.findIndex(e => e.id === id);
        if (index === -1) throw new Error('Employe non trouve');

        if (modifications.tauxHoraire !== undefined) modifications.tauxHoraire = parseFloat(modifications.tauxHoraire) || 0;
        if (modifications.salaireAnnuel !== undefined) modifications.salaireAnnuel = parseFloat(modifications.salaireAnnuel) || 0;
        if (modifications.heuresSemaine !== undefined) modifications.heuresSemaine = parseFloat(modifications.heuresSemaine) || 40;

        Object.assign(employes[index], modifications);
        Storage.set('employes', employes);
        return employes[index];
    },

    supprimer(id) {
        let employes = this.getAll();
        employes = employes.filter(e => e.id !== id);
        Storage.set('employes', employes);
    },

    getNomComplet(employe) {
        return (employe.prenom + ' ' + employe.nom).trim();
    },

    getSalairePeriode(employe) {
        const periodesParAn = this.getPeriodesParAn(employe.frequencePaie);
        if (employe.typeSalaire === 'annuel') {
            return Math.round((employe.salaireAnnuel / periodesParAn) * 100) / 100;
        }
        // Horaire
        const heuresParPeriode = employe.heuresSemaine * (52 / periodesParAn);
        return Math.round((employe.tauxHoraire * heuresParPeriode) * 100) / 100;
    },

    getPeriodesParAn(frequence) {
        switch (frequence) {
            case 'hebdo': return 52;
            case 'bimensuel': return 26;
            case 'mensuel': return 12;
            default: return 26;
        }
    },

    genererOptions(selectedId) {
        return this.getActifs().map(e =>
            '<option value="' + e.id + '"' + (e.id === selectedId ? ' selected' : '') + '>' +
            this.getNomComplet(e) + '</option>'
        ).join('');
    }
};
