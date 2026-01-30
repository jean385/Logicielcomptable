/**
 * Module Revenus (mode Travailleur autonome)
 * Liste, ajout, modification, suppression, filtres
 */

const AutonomeRevenus = {
    _filtreCategorie: '',
    _filtreMois: '',

    afficher() {
        App.afficherPage('module-autonome-revenus');
        this.render();
    },

    render() {
        const container = document.getElementById('module-autonome-revenus');
        let revenus = RevenuDepense.getRevenus();
        const categories = RevenuDepense.getCategoriesRevenus();

        // Appliquer les filtres
        if (this._filtreCategorie) {
            revenus = revenus.filter(r => r.categorie === this._filtreCategorie);
        }
        if (this._filtreMois) {
            revenus = revenus.filter(r => r.date && r.date.substring(0, 7) === this._filtreMois);
        }

        // Trier par date descendante
        revenus.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const total = revenus.reduce((s, r) => s + (r.montant || 0), 0);

        let tableRows = '';
        revenus.forEach(r => {
            tableRows += `
                <tr>
                    <td>${RevenuDepense.formaterDate(r.date)}</td>
                    <td>${App.escapeHtml(r.description)}</td>
                    <td>${App.escapeHtml(r.categorie)}</td>
                    <td>${App.escapeHtml(r.clientNom || '-')}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(r.montant)}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(r.tps + r.tvq)}</td>
                    <td class="text-right">${RevenuDepense.formaterMontant(r.montantTotal)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="AutonomeRevenus.modifierRevenu('${r.id}')">Modifier</button>
                        <button class="btn btn-danger" onclick="AutonomeRevenus.supprimerRevenu('${r.id}')">Suppr</button>
                    </td>
                </tr>
            `;
        });

        const moisOptions = this._genererOptionsMois();

        container.innerHTML = `
            <div class="module-header">
                <h1>Revenus</h1>
                <button class="btn-retour" onclick="AutonomeDashboard.afficher()">← Retour</button>
            </div>

            <div class="toolbar">
                <button class="btn btn-success" onclick="AutonomeRevenus.ajouterRevenu()">+ Nouveau revenu</button>
                <select onchange="AutonomeRevenus.filtrerCategorie(this.value)">
                    <option value="">Toutes les catégories</option>
                    ${categories.map(c => `<option value="${c}" ${c === this._filtreCategorie ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
                <select onchange="AutonomeRevenus.filtrerMois(this.value)">
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
                            <th>Client</th>
                            <th class="text-right">Montant</th>
                            <th class="text-right">Taxes</th>
                            <th class="text-right">Total</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="8" class="text-center">Aucun revenu enregistré</td></tr>'}
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
        const revenus = RevenuDepense.getRevenus();
        const moisSet = new Set();
        revenus.forEach(r => {
            if (r.date) moisSet.add(r.date.substring(0, 7));
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

    ajouterRevenu() {
        const categories = RevenuDepense.getCategoriesRevenus();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975 };

        App.ouvrirModal('Nouveau revenu', `
            <form id="form-revenu" onsubmit="AutonomeRevenus.sauvegarderRevenu(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="rev-date" value="${Storage.aujourdhui()}" required>
                    </div>
                    <div class="form-group">
                        <label>Catégorie *</label>
                        <select id="rev-categorie" required>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="rev-description" required placeholder="Description du revenu">
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Montant (avant taxes) *</label>
                        <input type="number" id="rev-montant" step="0.01" min="0" required
                            onchange="AutonomeRevenus.calculerTaxes()">
                    </div>
                    <div class="form-group">
                        <label>TPS (${taxes.tps}%)</label>
                        <input type="number" id="rev-tps" step="0.01" min="0" value="0">
                    </div>
                    <div class="form-group">
                        <label>TVQ (${taxes.tvq}%)</label>
                        <input type="number" id="rev-tvq" step="0.01" min="0" value="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Client</label>
                        <input type="text" id="rev-client" placeholder="Nom du client (optionnel)">
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="rev-reference" placeholder="No chèque, virement, etc.">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="rev-notes" rows="2"></textarea>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    calculerTaxes() {
        const montant = parseFloat(document.getElementById('rev-montant').value) || 0;
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };
        if (taxes.appliquerTaxes) {
            document.getElementById('rev-tps').value = (Math.round(montant * (taxes.tps / 100) * 100) / 100).toFixed(2);
            document.getElementById('rev-tvq').value = (Math.round(montant * (taxes.tvq / 100) * 100) / 100).toFixed(2);
        }
    },

    sauvegarderRevenu(event) {
        event.preventDefault();
        try {
            RevenuDepense.creerRevenu({
                date: document.getElementById('rev-date').value,
                description: document.getElementById('rev-description').value.trim(),
                categorie: document.getElementById('rev-categorie').value,
                montant: document.getElementById('rev-montant').value,
                tps: document.getElementById('rev-tps').value,
                tvq: document.getElementById('rev-tvq').value,
                clientNom: document.getElementById('rev-client').value.trim(),
                reference: document.getElementById('rev-reference').value.trim(),
                notes: document.getElementById('rev-notes').value.trim()
            });
            App.fermerModal();
            App.notification('Revenu enregistré', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    modifierRevenu(id) {
        const r = RevenuDepense.getRevenuById(id);
        if (!r) return;

        const categories = RevenuDepense.getCategoriesRevenus();
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975 };

        App.ouvrirModal('Modifier le revenu', `
            <form id="form-revenu-edit" onsubmit="AutonomeRevenus.sauvegarderModifRevenu(event, '${id}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="rev-date" value="${r.date}" required>
                    </div>
                    <div class="form-group">
                        <label>Catégorie *</label>
                        <select id="rev-categorie" required>
                            ${categories.map(c => `<option value="${c}" ${c === r.categorie ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="rev-description" value="${App.escapeHtml(r.description)}" required>
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Montant (avant taxes) *</label>
                        <input type="number" id="rev-montant" step="0.01" min="0" value="${r.montant}" required
                            onchange="AutonomeRevenus.calculerTaxes()">
                    </div>
                    <div class="form-group">
                        <label>TPS (${taxes.tps}%)</label>
                        <input type="number" id="rev-tps" step="0.01" min="0" value="${r.tps || 0}">
                    </div>
                    <div class="form-group">
                        <label>TVQ (${taxes.tvq}%)</label>
                        <input type="number" id="rev-tvq" step="0.01" min="0" value="${r.tvq || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Client</label>
                        <input type="text" id="rev-client" value="${App.escapeHtml(r.clientNom || '')}">
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="rev-reference" value="${App.escapeHtml(r.reference || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="rev-notes" rows="2">${App.escapeHtml(r.notes || '')}</textarea>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    sauvegarderModifRevenu(event, id) {
        event.preventDefault();
        try {
            RevenuDepense.modifierRevenu(id, {
                date: document.getElementById('rev-date').value,
                description: document.getElementById('rev-description').value.trim(),
                categorie: document.getElementById('rev-categorie').value,
                montant: document.getElementById('rev-montant').value,
                tps: document.getElementById('rev-tps').value,
                tvq: document.getElementById('rev-tvq').value,
                clientNom: document.getElementById('rev-client').value.trim(),
                reference: document.getElementById('rev-reference').value.trim(),
                notes: document.getElementById('rev-notes').value.trim()
            });
            App.fermerModal();
            App.notification('Revenu modifié', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    supprimerRevenu(id) {
        if (!confirm('Supprimer ce revenu?')) return;
        RevenuDepense.supprimerRevenu(id);
        App.notification('Revenu supprimé', 'success');
        this.render();
    }
};
