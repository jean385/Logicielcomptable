/**
 * Module Paiements
 * Paiements aux fournisseurs
 */

const Paiements = {
    /**
     * Affiche le module paiements
     */
    afficher() {
        App.afficherPage('module-paiements');

        const container = document.getElementById('module-paiements');
        container.innerHTML = `
            <div class="module-header">
                <h1>Paiements</h1>
                <button class="btn-retour" onclick="App.retourAccueil()">
                    ← Retour
                </button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Paiements.afficherOnglet('nouveau')">Nouveau paiement</button>
                <button class="tab" onclick="Paiements.afficherOnglet('historique')">Historique</button>
            </div>

            <div id="tab-nouveau-paiement" class="tab-content active">
                ${this.renderNouveauPaiement()}
            </div>

            <div id="tab-historique-paiement" class="tab-content">
                ${this.renderHistorique()}
            </div>
        `;
    },

    /**
     * Affiche un onglet
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-paiements .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-paiements .tab-content').forEach(c => c.classList.remove('active'));

        const tabMap = {
            'nouveau': 'tab-nouveau-paiement',
            'historique': 'tab-historique-paiement'
        };

        document.querySelector(`#module-paiements [onclick="Paiements.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById(tabMap[onglet]).classList.add('active');
    },

    /**
     * Render le formulaire de paiement
     */
    renderNouveauPaiement() {
        const aujourdhui = new Date().toISOString().split('T')[0];

        return `
            <div class="ecritures-form">
                <h3>Effectuer un paiement fournisseur</h3>

                <div class="form-row-3">
                    <div class="form-group">
                        <label>Fournisseur *</label>
                        <select id="paie-fournisseur" required onchange="Paiements.chargerFacturesFournisseur()">
                            ${Fournisseur.genererOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date du paiement *</label>
                        <input type="date" id="paie-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Compte de paiement *</label>
                        <select id="paie-compte" required>
                            ${Compte.genererOptions('actif', '1000')}
                        </select>
                    </div>
                </div>

                <div id="factures-fournisseur-container">
                    <div class="alert alert-info">Sélectionnez un fournisseur pour voir ses factures impayées.</div>
                </div>

                <div id="paie-total-section" style="display: none; text-align: right; margin-top: 20px;">
                    <p style="font-size: 18px;">
                        Total à payer: <strong id="paie-total-montant">0,00 $</strong>
                    </p>
                    <button type="button" class="btn btn-primary" onclick="Paiements.enregistrerPaiement()">
                        Enregistrer le paiement
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Charge les factures d'un fournisseur
     */
    chargerFacturesFournisseur() {
        const fournisseurId = document.getElementById('paie-fournisseur').value;
        const container = document.getElementById('factures-fournisseur-container');
        const totalSection = document.getElementById('paie-total-section');

        if (!fournisseurId) {
            container.innerHTML = '<div class="alert alert-info">Sélectionnez un fournisseur pour voir ses factures impayées.</div>';
            totalSection.style.display = 'none';
            return;
        }

        const fournisseur = Fournisseur.getById(fournisseurId);
        const factures = Facture.getByFournisseur(fournisseurId).filter(f =>
            f.statut !== 'payee' && f.statut !== 'annulee'
        );

        if (factures.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success">
                    ${fournisseur.nom} n'a aucune facture impayée.
                </div>
            `;
            totalSection.style.display = 'none';
            return;
        }

        let tableRows = '';
        factures.forEach(f => {
            const solde = f.total - f.montantPaye;
            tableRows += `
                <tr>
                    <td>
                        <input type="checkbox" id="paie-fact-${f.id}"
                            data-facture-id="${f.id}"
                            data-solde="${solde}"
                            onchange="Paiements.calculerTotal()">
                    </td>
                    <td>${f.numeroInterne}</td>
                    <td>${f.numero}</td>
                    <td>${f.date}</td>
                    <td>${f.echeance}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.total)}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.montantPaye)}</td>
                    <td class="text-right">${Transaction.formaterMontant(solde)}</td>
                    <td>
                        <input type="number" id="paie-montant-${f.id}"
                            class="paie-montant-input"
                            value="${solde.toFixed(2)}"
                            step="0.01"
                            min="0.01"
                            max="${solde.toFixed(2)}"
                            style="width: 100px;"
                            onchange="Paiements.calculerTotal()"
                            oninput="Paiements.calculerTotal()">
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Fournisseur</h4>
                    <p>${fournisseur.nom}</p>
                </div>
                <div class="info-card">
                    <h4>Solde total dû</h4>
                    <p>${Transaction.formaterMontant(fournisseur.solde)}</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" id="paie-select-all" onchange="Paiements.toggleTout(this.checked)">
                            </th>
                            <th>N° Interne</th>
                            <th>N° Fournisseur</th>
                            <th>Date</th>
                            <th>Échéance</th>
                            <th class="text-right">Total</th>
                            <th class="text-right">Payé</th>
                            <th class="text-right">Solde</th>
                            <th>Montant à payer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        totalSection.style.display = 'block';
        this.calculerTotal();
    },

    /**
     * Toggle toutes les factures
     */
    toggleTout(checked) {
        const checkboxes = document.querySelectorAll('[id^="paie-fact-"]');
        checkboxes.forEach(cb => cb.checked = checked);
        this.calculerTotal();
    },

    /**
     * Calcule le total à payer
     */
    calculerTotal() {
        let total = 0;
        const checkboxes = document.querySelectorAll('[id^="paie-fact-"]');

        checkboxes.forEach(cb => {
            if (cb.checked) {
                const factureId = cb.dataset.factureId;
                const montant = parseFloat(document.getElementById('paie-montant-' + factureId).value) || 0;
                total += montant;
            }
        });

        document.getElementById('paie-total-montant').textContent = Transaction.formaterMontant(total);
    },

    /**
     * Enregistre les paiements
     */
    enregistrerPaiement() {
        const fournisseurId = document.getElementById('paie-fournisseur').value;
        const date = document.getElementById('paie-date').value;
        const compteBanque = document.getElementById('paie-compte').value;

        if (!fournisseurId || !date || !compteBanque) {
            App.notification('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const checkboxes = document.querySelectorAll('[id^="paie-fact-"]:checked');

        if (checkboxes.length === 0) {
            App.notification('Veuillez sélectionner au moins une facture', 'warning');
            return;
        }

        let nbPaiements = 0;
        let erreurs = [];

        checkboxes.forEach(cb => {
            const factureId = cb.dataset.factureId;
            const montant = parseFloat(document.getElementById('paie-montant-' + factureId).value) || 0;

            if (montant > 0) {
                try {
                    Facture.enregistrerPaiement(factureId, montant, compteBanque, date);
                    nbPaiements++;
                } catch (e) {
                    erreurs.push(e.message);
                }
            }
        });

        if (nbPaiements > 0) {
            App.notification(`${nbPaiements} paiement(s) enregistré(s) avec succès`, 'success');
            this.chargerFacturesFournisseur();
            App.mettreAJourDashboard();
        }

        if (erreurs.length > 0) {
            App.notification('Erreurs: ' + erreurs.join(', '), 'danger');
        }
    },

    /**
     * Render l'historique des paiements
     */
    renderHistorique() {
        const transactions = Transaction.getByModule('paiements');

        let tableRows = '';
        transactions.forEach(t => {
            tableRows += `
                <tr>
                    <td>${t.date}</td>
                    <td>${t.reference}</td>
                    <td>${t.description}</td>
                    <td class="text-right">${Transaction.formaterMontant(t.lignes[0].debit)}</td>
                </tr>
            `;
        });

        const totalPaye = transactions.reduce((sum, t) => sum + t.lignes[0].debit, 0);

        return `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Nombre de paiements</h4>
                    <p>${transactions.length}</p>
                </div>
                <div class="info-card">
                    <h4>Total payé</h4>
                    <p>${Transaction.formaterMontant(totalPaye)}</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Référence</th>
                            <th>Description</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="4" class="text-center">Aucun paiement</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }
};
