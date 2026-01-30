/**
 * Module Dépenses (mode Travailleur autonome)
 * Liste, ajout, modification, suppression, filtres
 */

const AutonomeDepenses = {
    _filtreCategorie: '',
    _filtreMois: '',

    afficher() {
        App.afficherPage('module-autonome-depenses');
        this.render();
    },

    render() {
        const container = document.getElementById('module-autonome-depenses');
        let depenses = RevenuDepense.getDepenses();
        const categories = RevenuDepense.getCategoriesDepenses();

        // Appliquer les filtres
        if (this._filtreCategorie) {
            depenses = depenses.filter(d => d.categorie === this._filtreCategorie);
        }
        if (this._filtreMois) {
            depenses = depenses.filter(d => d.date && d.date.substring(0, 7) === this._filtreMois);
        }

        // Trier par date descendante
        depenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const total = depenses.reduce((s, d) => s + (d.montant || 0), 0);

        let tableRows = '';
        depenses.forEach(d => {
            tableRows += `
                <tr>
                    <td>${RevenuDepense.formaterDate(d.date)}</td>
                    <td>${App.escapeHtml(d.description)}</td>
                    <td>${App.escapeHtml(d.categorie)}</td>
                    <td>${App.escapeHtml(d.fournisseurNom || '-')}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(d.montant)}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(d.tps + d.tvq)}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(d.montantTotal)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="AutonomeDepenses.modifierDepense('${d.id}')">Modifier</button>
                        <button class="btn btn-danger" onclick="AutonomeDepenses.supprimerDepense('${d.id}')">Suppr</button>
                    </td>
                </tr>
            `;
        });

        const moisOptions = this._genererOptionsMois();

        container.innerHTML = `
            <div class="module-header">
                <h1>Dépenses</h1>
                <button class="btn-retour" onclick="AutonomeDashboard.afficher()">← Retour</button>
            </div>

            <div class="toolbar">
                <button class="btn btn-danger" onclick="AutonomeDepenses.ajouterDepense()">+ Nouvelle dépense</button>
                <select onchange="AutonomeDepenses.filtrerCategorie(this.value)">
                    <option value="">Toutes les catégories</option>
                    ${categories.map(c => `<option value="${c}" ${c === this._filtreCategorie ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
                <select onchange="AutonomeDepenses.filtrerMois(this.value)">
                    <option value="">Tous les mois</option>
                    ${moisOptions}
                </select>
                <div style="flex:1"></div>
                <strong>Total: ${RevenuDepense.formaterMontant(total)}</strong>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Catégorie</th>
                            <th>Fournisseur</th>
                            <th class="text-right">Montant</th>
                            <th class="text-right">Taxes</th>
                            <th class="text-right">Total</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="8" class="text-center">Aucune dépense enregistrée</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    filtrerCategorie(cat) {
        this._filtreCategorie = cat;
        this.render();
    },

    filtrerMois(mois) {
        this._filtreMois = mois;
        this.render();
    },

    _genererOptionsMois() {
        const depenses = RevenuDepense.getDepenses();
        const moisSet = new Set();
        depenses.forEach(d => {
            if (d.date) moisSet.add(d.date.substring(0, 7));
        });
        const mois = [...moisSet].sort().reverse();
        const noms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return mois.map(m => {
            const [annee, num] = m.split('-');
            const label = noms[parseInt(num, 10) - 1] + ' ' + annee;
            return `<option value="${m}" ${m === this._filtreMois ? 'selected' : ''}>${label}</option>`;
        }).join('');
    },

    ajouterDepense() {
        const categories = RevenuDepense.getCategoriesDepenses();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975 };

        App.ouvrirModal('Nouvelle dépense', `
            <form id="form-depense" onsubmit="AutonomeDepenses.sauvegarderDepense(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="dep-date" value="${Storage.aujourdhui()}" required>
                    </div>
                    <div class="form-group">
                        <label>Catégorie *</label>
                        <select id="dep-categorie" required>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="dep-description" required placeholder="Description de la dépense">
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Montant (avant taxes) *</label>
                        <input type="number" id="dep-montant" step="0.01" min="0" required
                            onchange="AutonomeDepenses.calculerTaxes()">
                    </div>
                    <div class="form-group">
                        <label>TPS (${taxes.tps}%)</label>
                        <input type="number" id="dep-tps" step="0.01" min="0" value="0">
                    </div>
                    <div class="form-group">
                        <label>TVQ (${taxes.tvq}%)</label>
                        <input type="number" id="dep-tvq" step="0.01" min="0" value="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fournisseur</label>
                        <input type="text" id="dep-fournisseur" placeholder="Nom du fournisseur (optionnel)">
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="dep-reference" placeholder="No facture, reçu, etc.">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="dep-notes" rows="2"></textarea>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    calculerTaxes() {
        const montant = parseFloat(document.getElementById('dep-montant').value) || 0;
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };
        if (taxes.appliquerTaxes) {
            document.getElementById('dep-tps').value = (Math.round(montant * (taxes.tps / 100) * 100) / 100).toFixed(2);
            document.getElementById('dep-tvq').value = (Math.round(montant * (taxes.tvq / 100) * 100) / 100).toFixed(2);
        }
    },

    sauvegarderDepense(event) {
        event.preventDefault();
        try {
            RevenuDepense.creerDepense({
                date: document.getElementById('dep-date').value,
                description: document.getElementById('dep-description').value.trim(),
                categorie: document.getElementById('dep-categorie').value,
                montant: document.getElementById('dep-montant').value,
                tps: document.getElementById('dep-tps').value,
                tvq: document.getElementById('dep-tvq').value,
                fournisseurNom: document.getElementById('dep-fournisseur').value.trim(),
                reference: document.getElementById('dep-reference').value.trim(),
                notes: document.getElementById('dep-notes').value.trim()
            });
            App.fermerModal();
            App.notification('Dépense enregistrée', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    modifierDepense(id) {
        const d = RevenuDepense.getDepenseById(id);
        if (!d) return;

        const categories = RevenuDepense.getCategoriesDepenses();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975 };

        App.ouvrirModal('Modifier la dépense', `
            <form id="form-depense-edit" onsubmit="AutonomeDepenses.sauvegarderModifDepense(event, '${id}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="dep-date" value="${d.date}" required>
                    </div>
                    <div class="form-group">
                        <label>Catégorie *</label>
                        <select id="dep-categorie" required>
                            ${categories.map(c => `<option value="${c}" ${c === d.categorie ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="dep-description" value="${App.escapeHtml(d.description)}" required>
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Montant (avant taxes) *</label>
                        <input type="number" id="dep-montant" step="0.01" min="0" value="${d.montant}" required
                            onchange="AutonomeDepenses.calculerTaxes()">
                    </div>
                    <div class="form-group">
                        <label>TPS (${taxes.tps}%)</label>
                        <input type="number" id="dep-tps" step="0.01" min="0" value="${d.tps || 0}">
                    </div>
                    <div class="form-group">
                        <label>TVQ (${taxes.tvq}%)</label>
                        <input type="number" id="dep-tvq" step="0.01" min="0" value="${d.tvq || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fournisseur</label>
                        <input type="text" id="dep-fournisseur" value="${App.escapeHtml(d.fournisseurNom || '')}">
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="dep-reference" value="${App.escapeHtml(d.reference || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="dep-notes" rows="2">${App.escapeHtml(d.notes || '')}</textarea>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    sauvegarderModifDepense(event, id) {
        event.preventDefault();
        try {
            RevenuDepense.modifierDepense(id, {
                date: document.getElementById('dep-date').value,
                description: document.getElementById('dep-description').value.trim(),
                categorie: document.getElementById('dep-categorie').value,
                montant: document.getElementById('dep-montant').value,
                tps: document.getElementById('dep-tps').value,
                tvq: document.getElementById('dep-tvq').value,
                fournisseurNom: document.getElementById('dep-fournisseur').value.trim(),
                reference: document.getElementById('dep-reference').value.trim(),
                notes: document.getElementById('dep-notes').value.trim()
            });
            App.fermerModal();
            App.notification('Dépense modifiée', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    supprimerDepense(id) {
        if (!confirm('Supprimer cette dépense?')) return;
        RevenuDepense.supprimerDepense(id);
        App.notification('Dépense supprimée', 'success');
        this.render();
    }
};
