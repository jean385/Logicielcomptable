/**
 * Modele Paie
 * Calcul des deductions Quebec 2026
 * Sources: Revenu Quebec, CRA T4032QC, CNESST
 */

const Paie = {
    // Taux 2026 Quebec
    TAUX: {
        // RRQ (Regime de rentes du Quebec)
        RRQ_TAUX: 0.0630,         // 6.30% employe (5.30% base + 1.00% supplementaire)
        RRQ_EXEMPTION: 3500,
        RRQ_MAX_ADMISSIBLE: 74600, // MGA 2026
        // RRQ2 (Regime supplementaire)
        RRQ2_TAUX: 0.04,          // 4% employe
        RRQ2_PLAFOND: 85000,      // Plafond des gains admissibles 2026
        // RQAP (Regime quebecois d'assurance parentale)
        RQAP_TAUX: 0.0043,        // 0.43% employe (baisse de 8% vs 2025)
        RQAP_MAX_ASSURABLE: 103000, // Maximum assurable 2026
        // AE (Assurance-emploi) taux Quebec
        AE_TAUX: 0.0130,          // 1.30% employe
        AE_MAX_ASSURABLE: 68900,   // Maximum assurable 2026
        // Impot federal 2026
        FED_TRANCHES: [
            { max: 58523, taux: 0.14 },   // 14% (reduit de 15% en 2025)
            { max: 117045, taux: 0.205 },
            { max: 181440, taux: 0.26 },
            { max: 258482, taux: 0.29 },
            { max: Infinity, taux: 0.33 }
        ],
        FED_EXEMPTION: 16452,      // Montant personnel de base federal 2026
        FED_ABATTEMENT_QC: 0.165,  // Abattement du Quebec 16.5%
        // Impot provincial QC 2026 (indexe a 2.05%)
        QC_TRANCHES: [
            { max: 54345, taux: 0.14 },
            { max: 108680, taux: 0.19 },
            { max: 132245, taux: 0.24 },
            { max: Infinity, taux: 0.2575 }
        ],
        QC_EXEMPTION: 18952        // Montant personnel de base provincial 2026
    },

    /**
     * Calcule toutes les deductions pour une periode de paie
     */
    calculerDeductions(salaireBrut, periodesParAn, cumulBrut) {
        cumulBrut = cumulBrut || 0;
        const salaireAnnualise = salaireBrut * periodesParAn;

        return {
            rrq: this._calculerRRQ(salaireBrut, periodesParAn, cumulBrut),
            rrq2: this._calculerRRQ2(salaireBrut, periodesParAn, cumulBrut),
            rqap: this._calculerRQAP(salaireBrut, periodesParAn, cumulBrut),
            ae: this._calculerAE(salaireBrut, periodesParAn, cumulBrut),
            impotFederal: this._calculerImpotFederal(salaireBrut, periodesParAn),
            impotProvincial: this._calculerImpotProvincial(salaireBrut, periodesParAn)
        };
    },

    _calculerRRQ(salaireBrut, periodesParAn, cumulBrut) {
        const T = this.TAUX;
        const exemptionPeriode = T.RRQ_EXEMPTION / periodesParAn;
        const maxCotisable = T.RRQ_MAX_ADMISSIBLE - T.RRQ_EXEMPTION;
        const cumulCotisable = Math.max(0, cumulBrut - (T.RRQ_EXEMPTION * (cumulBrut / (salaireBrut * periodesParAn || 1))));

        if (cumulCotisable >= maxCotisable) return 0;

        const montantCotisable = Math.max(0, salaireBrut - exemptionPeriode);
        const restant = maxCotisable - cumulCotisable;
        const cotisable = Math.min(montantCotisable, restant);

        return Math.round(cotisable * T.RRQ_TAUX * 100) / 100;
    },

    _calculerRRQ2(salaireBrut, periodesParAn, cumulBrut) {
        const T = this.TAUX;
        if (cumulBrut >= T.RRQ2_PLAFOND) return 0;

        const maxParPeriode = ((T.RRQ2_PLAFOND - T.RRQ_MAX_ADMISSIBLE) * T.RRQ2_TAUX) / periodesParAn;
        const salaireSurMax = Math.max(0, salaireBrut - (T.RRQ_MAX_ADMISSIBLE / periodesParAn));

        if (salaireSurMax <= 0) return 0;

        return Math.min(Math.round(salaireSurMax * T.RRQ2_TAUX * 100) / 100, maxParPeriode);
    },

    _calculerRQAP(salaireBrut, periodesParAn, cumulBrut) {
        const T = this.TAUX;
        if (cumulBrut >= T.RQAP_MAX_ASSURABLE) return 0;

        const maxPeriode = T.RQAP_MAX_ASSURABLE / periodesParAn;
        const assurable = Math.min(salaireBrut, maxPeriode);

        return Math.round(assurable * T.RQAP_TAUX * 100) / 100;
    },

    _calculerAE(salaireBrut, periodesParAn, cumulBrut) {
        const T = this.TAUX;
        if (cumulBrut >= T.AE_MAX_ASSURABLE) return 0;

        const maxPeriode = T.AE_MAX_ASSURABLE / periodesParAn;
        const assurable = Math.min(salaireBrut, maxPeriode);

        return Math.round(assurable * T.AE_TAUX * 100) / 100;
    },

    _calculerImpotFederal(salaireBrut, periodesParAn) {
        const T = this.TAUX;
        const salaireAnnuel = salaireBrut * periodesParAn;
        const imposable = Math.max(0, salaireAnnuel - T.FED_EXEMPTION);

        let impot = 0;
        let restant = imposable;

        for (let i = 0; i < T.FED_TRANCHES.length; i++) {
            const tranche = T.FED_TRANCHES[i];
            const seuilBas = i === 0 ? 0 : T.FED_TRANCHES[i - 1].max;
            const largeur = tranche.max === Infinity ? restant : Math.min(restant, tranche.max - seuilBas);

            if (largeur <= 0) break;

            impot += largeur * tranche.taux;
            restant -= largeur;
        }

        // Abattement du Quebec de 16.5%
        impot = impot * (1 - T.FED_ABATTEMENT_QC);

        return Math.max(0, Math.round((impot / periodesParAn) * 100) / 100);
    },

    _calculerImpotProvincial(salaireBrut, periodesParAn) {
        const T = this.TAUX;
        const salaireAnnuel = salaireBrut * periodesParAn;
        const imposable = Math.max(0, salaireAnnuel - T.QC_EXEMPTION);

        let impot = 0;
        let restant = imposable;

        for (let i = 0; i < T.QC_TRANCHES.length; i++) {
            const tranche = T.QC_TRANCHES[i];
            const seuilBas = i === 0 ? 0 : T.QC_TRANCHES[i - 1].max;
            const largeur = tranche.max === Infinity ? restant : Math.min(restant, tranche.max - seuilBas);

            if (largeur <= 0) break;

            impot += largeur * tranche.taux;
            restant -= largeur;
        }

        return Math.max(0, Math.round((impot / periodesParAn) * 100) / 100);
    },

    /**
     * Genere un talon de paie complet
     */
    genererTalon(data) {
        const employe = Employe.getById(data.employeId);
        if (!employe) throw new Error('Employe non trouve');

        const periodesParAn = Employe.getPeriodesParAn(employe.frequencePaie);
        let salaireBrut;

        if (data.heuresTravaillees && employe.typeSalaire === 'horaire') {
            salaireBrut = Math.round(data.heuresTravaillees * employe.tauxHoraire * 100) / 100;
        } else {
            salaireBrut = Employe.getSalairePeriode(employe);
        }

        // Recuperer le cumul pour l'annee
        const talons = (Storage.get('talons_paie') || [])
            .filter(t => t.employeId === data.employeId && t.date && t.date.startsWith(new Date().getFullYear().toString()));
        const cumulBrut = talons.reduce((s, t) => s + (t.salaireBrut || 0), 0);

        const deductions = this.calculerDeductions(salaireBrut, periodesParAn, cumulBrut);

        const totalDeductions = Math.round((
            deductions.rrq + deductions.rrq2 + deductions.rqap +
            deductions.ae + deductions.impotFederal + deductions.impotProvincial
        ) * 100) / 100;

        const salaireNet = Math.round((salaireBrut - totalDeductions) * 100) / 100;

        const talon = {
            id: Storage.generateId(),
            employeId: data.employeId,
            employeNom: Employe.getNomComplet(employe),
            date: data.date || Storage.aujourdhui(),
            periodeDu: data.periodeDu || '',
            periodeAu: data.periodeAu || '',
            heuresTravaillees: data.heuresTravaillees || null,
            tauxHoraire: employe.typeSalaire === 'horaire' ? employe.tauxHoraire : null,
            salaireBrut: salaireBrut,
            deductions: deductions,
            totalDeductions: totalDeductions,
            salaireNet: salaireNet,
            cumulBrutAnnee: cumulBrut + salaireBrut,
            dateCreation: new Date().toISOString()
        };

        // Sauvegarder le talon
        const talonsAll = Storage.get('talons_paie') || [];
        talonsAll.push(talon);
        Storage.set('talons_paie', talonsAll);

        // Creer l'ecriture comptable si le module Compte existe
        try {
            if (typeof Transaction !== 'undefined' && typeof Compte !== 'undefined') {
                Transaction.creer({
                    date: talon.date,
                    description: 'Paie - ' + talon.employeNom,
                    reference: 'PAIE-' + talon.id.substring(0, 8),
                    lignes: [
                        { compte: '5100', debit: salaireBrut, credit: 0 },
                        { compte: '1000', debit: 0, credit: salaireNet },
                        { compte: '2300', debit: 0, credit: totalDeductions }
                    ],
                    module: 'paie'
                });
            }
        } catch (e) {
            console.error('Erreur creation ecriture paie:', e);
        }

        return talon;
    },

    getTalons() {
        return Storage.get('talons_paie') || [];
    },

    getTalonsByEmploye(employeId) {
        return this.getTalons().filter(t => t.employeId === employeId);
    },

    formaterMontant(montant) {
        if (typeof Transaction !== 'undefined') {
            return Transaction.formaterMontant(montant);
        }
        return (montant || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
    }
};
