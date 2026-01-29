/**
 * Module Encaissements
 * Réception des paiements clients
 */

const Encaissements = {
    /**
     * Affiche le module encaissements
     */
    afficher() {
        App.afficherPage('module-encaissements');

        const container = document.getElementById('module-encaissements');
        container.innerHTML = `
            <div class="module-header">
                <h1>Encaissements</h1>
                <button class="btn-retour" onclick="App.retourAccueil()">
                    ← Retour
                </button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Encaissements.afficherOnglet('nouveau')">Nouvel encaissement</button>
                <button class="tab" onclick="Encaissements.afficherOnglet('historique')">Historique</button>
            </div>

            <div id="tab-nouveau" class="tab-content active">
                ${this.renderNouvelEncaissement()}
            </div>

            <div id="tab-historique" class="tab-content">
                ${this.renderHistorique()}
            </div>
        `;
    },

    /**
     * Affiche un onglet
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-encaissements .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-encaissements .tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`#module-encaissements [onclick="Encaissements.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById('tab-' + onglet).classList.add('active');
    },

    /**
     * Render le formulaire d'encaissement
     */
    renderNouvelEncaissement() {
        const aujourdhui = new Date().toISOString().split('T')[0];

        return `
            <div class="ecritures-form">
                <h3>Recevoir un paiement client</h3>

                <div class="form-row-3">
                    <div class="form-group">
                        <label>Client *</label>
                        <select id="enc-client" required onchange="Encaissements.chargerFacturesClient()">
                            ${Client.genererOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date du paiement *</label>
                        <input type="date" id="enc-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Compte de dépôt *</label>
                        <select id="enc-compte" required>
                            ${Compte.genererOptions('actif', '1000')}
                        </select>
                    </div>
                </div>

                <div id="factures-client-container">
                    <div class="alert alert-info">Sélectionnez un client pour voir ses factures impayées.</div>
                </div>

                <div id="enc-total-section" style="display: none; text-align: right; margin-top: 20px;">
                    <p style="font-size: 18px;">
                        Total à encaisser: <strong id="enc-total-montant">0,00 $</strong>
                    </p>
                    <button type="button" class="btn btn-primary" onclick="Encaissements.enregistrerEncaissement()">
                        Enregistrer l'encaissement
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Charge les factures d'un client
     */
    chargerFacturesClient() {
        const clientId = document.getElementById('enc-client').value;
        const container = document.getElementById('factures-client-container');
        const totalSection = document.getElementById('enc-total-section');

        if (!clientId) {
            container.innerHTML = '<div class="alert alert-info">Sélectionnez un client pour voir ses factures impayées.</div>';
            totalSection.style.display = 'none';
            return;
        }

        const client = Client.getById(clientId);
        const factures = Facture.getByClient(clientId).filter(f =>
            f.statut !== 'payee' && f.statut !== 'annulee'
        );

        if (factures.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success">
                    ${client.nom} n'a aucune facture impayée.
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
                        <input type="checkbox" id="enc-fact-${f.id}"
                            data-facture-id="${f.id}"
                            data-solde="${solde}"
                            onchange="Encaissements.calculerTotal()">
                    </td>
                    <td>${f.numero}</td>
                    <td>${f.date}</td>
                    <td>${f.echeance}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.total)}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.montantPaye)}</td>
                    <td class="text-right">${Transaction.formaterMontant(solde)}</td>
                    <td>
                        <input type="number" id="enc-montant-${f.id}"
                            class="enc-montant-input"
                            value="${solde.toFixed(2)}"
                            step="0.01"
                            min="0.01"
                            max="${solde.toFixed(2)}"
                            style="width: 100px;"
                            onchange="Encaissements.calculerTotal()"
                            oninput="Encaissements.calculerTotal()">
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Client</h4>
                    <p>${client.nom}</p>
                </div>
                <div class="info-card">
                    <h4>Solde total dû</h4>
                    <p>${Transaction.formaterMontant(client.solde)}</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" id="enc-select-all" onchange="Encaissements.toggleTout(this.checked)">
                            </th>
                            <th>Numéro</th>
                            <th>Date</th>
                            <th>Échéance</th>
                            <th class="text-right">Total</th>
                            <th class="text-right">Payé</th>
                            <th class="text-right">Solde</th>
                            <th>Montant à recevoir</th>
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
        const checkboxes = document.querySelectorAll('[id^="enc-fact-"]');
        checkboxes.forEach(cb => cb.checked = checked);
        this.calculerTotal();
    },

    /**
     * Calcule le total à encaisser
     */
    calculerTotal() {
        let total = 0;
        const checkboxes = document.querySelectorAll('[id^="enc-fact-"]');

        checkboxes.forEach(cb => {
            if (cb.checked) {
                const factureId = cb.dataset.factureId;
                const montant = parseFloat(document.getElementById('enc-montant-' + factureId).value) || 0;
                total += montant;
            }
        });

        document.getElementById('enc-total-montant').textContent = Transaction.formaterMontant(total);
    },

    /**
     * Enregistre les encaissements
     */
    enregistrerEncaissement() {
        const clientId = document.getElementById('enc-client').value;
        const date = document.getElementById('enc-date').value;
        const compteBanque = document.getElementById('enc-compte').value;

        if (!clientId || !date || !compteBanque) {
            App.notification('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const checkboxes = document.querySelectorAll('[id^="enc-fact-"]:checked');

        if (checkboxes.length === 0) {
            App.notification('Veuillez sélectionner au moins une facture', 'warning');
            return;
        }

        let nbPaiements = 0;
        let erreurs = [];

        checkboxes.forEach(cb => {
            const factureId = cb.dataset.factureId;
            const montant = parseFloat(document.getElementById('enc-montant-' + factureId).value) || 0;

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
            this.chargerFacturesClient();
            App.mettreAJourDashboard();
        }

        if (erreurs.length > 0) {
            App.notification('Erreurs: ' + erreurs.join(', '), 'danger');
        }
    },

    /**
     * Render l'historique des encaissements
     */
    renderHistorique() {
        const transactions = Transaction.getByModule('encaissements');

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

        const totalEncaisse = transactions.reduce((sum, t) => sum + t.lignes[0].debit, 0);

        return `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Nombre d'encaissements</h4>
                    <p>${transactions.length}</p>
                </div>
                <div class="info-card">
                    <h4>Total encaissé</h4>
                    <p>${Transaction.formaterMontant(totalEncaisse)}</p>
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
                        ${tableRows || '<tr><td colspan="4" class="text-center">Aucun encaissement</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }
};
