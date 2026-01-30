/**
 * Module Soumissions
 * Interface de gestion des soumissions
 */

const Soumissions = {
    afficher() {
        App.afficherPage('module-soumissions');

        const container = document.getElementById('module-soumissions');
        container.innerHTML = `
            <div class="module-header">
                <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                <h1>Soumissions</h1>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Soumissions.afficherOnglet('liste')">Liste des soumissions</button>
                <button class="tab" onclick="Soumissions.afficherOnglet('nouvelle')">Nouvelle soumission</button>
            </div>

            <div id="tab-soumissions-liste" class="tab-content active">
                ${this.renderListe()}
            </div>

            <div id="tab-soumissions-nouvelle" class="tab-content">
                ${this.renderFormulaire()}
            </div>
        `;
    },

    afficherOnglet(onglet) {
        document.querySelectorAll('#module-soumissions .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-soumissions .tab-content').forEach(c => c.classList.remove('active'));

        const tabName = onglet === 'liste' ? 'soumissions-liste' : 'soumissions-nouvelle';
        document.querySelector('#module-soumissions [onclick="Soumissions.afficherOnglet(\'' + onglet + '\')"]').classList.add('active');
        document.getElementById('tab-' + tabName).classList.add('active');

        if (onglet === 'liste') {
            document.getElementById('tab-soumissions-liste').innerHTML = this.renderListe();
        }
        if (onglet === 'nouvelle') {
            document.getElementById('tab-soumissions-nouvelle').innerHTML = this.renderFormulaire();
        }
    },

    renderListe() {
        const soumissions = DocumentCommercial.getSoumissions();

        let rows = '';
        soumissions.sort((a, b) => b.date.localeCompare(a.date)).forEach(s => {
            const client = s.clientId ? (Client.getById(s.clientId) || {}) : {};
            rows += `
                <tr>
                    <td>${s.numero}</td>
                    <td>${s.date}</td>
                    <td>${App.escapeHtml(client.nom || s.clientNom || '-')}</td>
                    <td class="text-right">${Paie.formaterMontant(s.total)}</td>
                    <td><span class="badge ${DocumentCommercial.getStatutClasse(s.statut)}">${DocumentCommercial.getStatutLibelle(s.statut)}</span></td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Soumissions.voir('${s.id}')">Voir</button>
                        ${s.statut !== 'convertie' && s.statut !== 'annulee' ? '<button class="btn btn-primary" onclick="Soumissions.convertirEnBC(\'' + s.id + '\')">→ BC</button>' : ''}
                        ${s.statut === 'brouillon' ? '<button class="btn btn-success" onclick="Soumissions.changerStatut(\'' + s.id + '\', \'envoyee\')">Envoyer</button>' : ''}
                        ${s.statut === 'envoyee' ? '<button class="btn btn-success" onclick="Soumissions.changerStatut(\'' + s.id + '\', \'acceptee\')">Accepter</button><button class="btn btn-danger" onclick="Soumissions.changerStatut(\'' + s.id + '\', \'refusee\')">Refuser</button>' : ''}
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Soumissions.afficherOnglet('nouvelle')">+ Nouvelle soumission</button>
                <input type="text" class="search-input" placeholder="Rechercher..." onkeyup="Soumissions.filtrer(this.value)">
            </div>
            <div class="table-container">
                <table id="table-soumissions">
                    <thead>
                        <tr>
                            <th>Numero</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th class="text-right">Total</th>
                            <th>Statut</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="6" class="text-center">Aucune soumission</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFormulaire(doc) {
        const clients = Client.genererOptions(doc ? doc.clientId : null);
        const codesTaxe = this._renderCodesTaxeOptions(doc ? doc.codeTaxe : null);
        const lignes = doc ? doc.lignes : [{ description: '', quantite: 1, prixUnitaire: 0 }];

        let lignesHTML = '';
        lignes.forEach((l, i) => {
            lignesHTML += this._renderLigneFormulaire(i, l);
        });

        return `
            <div class="rapport-container">
                <h3>${doc ? 'Modifier la soumission' : 'Nouvelle soumission'}</h3>
                <form id="form-soumission" onsubmit="Soumissions.sauvegarder(event${doc ? ', \'' + doc.id + '\'' : ''})">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Client *</label>
                            <select id="soum-client" required>
                                <option value="">Selectionner un client</option>
                                ${clients}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date *</label>
                            <input type="date" id="soum-date" value="${doc ? doc.date : Storage.aujourdhui()}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Code de taxe</label>
                            <select id="soum-code-taxe" onchange="Soumissions.recalculer()">
                                ${codesTaxe}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <input type="text" id="soum-notes" value="${doc ? App.escapeHtml(doc.notes || '') : ''}">
                        </div>
                    </div>

                    <h4 style="margin: 15px 0 10px;">Lignes</h4>
                    <div id="soum-lignes">${lignesHTML}</div>
                    <button type="button" class="btn btn-secondary" onclick="Soumissions.ajouterLigne()" style="margin: 10px 0;">+ Ajouter une ligne</button>

                    <div id="soum-totaux" style="margin-top: 15px; padding: 12px; background: var(--background-color); border-radius: 4px;">
                        ${this._renderTotaux(doc)}
                    </div>

                    <div style="text-align: right; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="Soumissions.afficherOnglet('liste')">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        `;
    },

    _renderLigneFormulaire(index, ligne) {
        return `
            <div class="ligne-ecriture" data-ligne="${index}">
                <input type="text" placeholder="Description" value="${App.escapeHtml((ligne && ligne.description) || '')}" onchange="Soumissions.recalculer()">
                <input type="number" placeholder="Qte" value="${(ligne && ligne.quantite) || 1}" min="0" step="0.01" onchange="Soumissions.recalculer()">
                <input type="number" placeholder="Prix unitaire" value="${(ligne && ligne.prixUnitaire) || 0}" min="0" step="0.01" onchange="Soumissions.recalculer()">
                <button type="button" class="btn-supprimer-ligne" onclick="this.closest('.ligne-ecriture').remove(); Soumissions.recalculer();">&times;</button>
            </div>
        `;
    },

    _renderTotaux(doc) {
        const st = doc ? doc.sousTotal : 0;
        const t1 = doc ? doc.taxe1Montant : 0;
        const t2 = doc ? doc.taxe2Montant : 0;
        const tot = doc ? doc.total : 0;
        const t1n = doc ? (doc.taxe1Nom || 'TPS') : 'TPS';
        const t2n = doc ? (doc.taxe2Nom || 'TVQ') : 'TVQ';
        return `
            <div style="text-align: right;">
                <div>Sous-total: <strong id="soum-sous-total">${Paie.formaterMontant(st)}</strong></div>
                <div><span id="soum-taxe1-nom">${t1n}</span>: <strong id="soum-taxe1-montant">${Paie.formaterMontant(t1)}</strong></div>
                <div><span id="soum-taxe2-nom">${t2n}</span>: <strong id="soum-taxe2-montant">${Paie.formaterMontant(t2)}</strong></div>
                <div style="font-size: 16px; margin-top: 5px;">Total: <strong id="soum-total">${Paie.formaterMontant(tot)}</strong></div>
            </div>
        `;
    },

    _renderCodesTaxeOptions(selectedId) {
        const codes = Storage.get('codes_taxe') || [];
        let opts = '<option value="">(Taxe par defaut)</option>';
        codes.forEach(c => {
            opts += '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + App.escapeHtml(c.nom) + '</option>';
        });
        return opts;
    },

    ajouterLigne() {
        const container = document.getElementById('soum-lignes');
        const index = container.querySelectorAll('.ligne-ecriture').length;
        const div = document.createElement('div');
        div.innerHTML = this._renderLigneFormulaire(index, null);
        container.appendChild(div.firstElementChild);
    },

    recalculer() {
        const lignesEl = document.querySelectorAll('#soum-lignes .ligne-ecriture');
        const lignes = [];
        lignesEl.forEach(el => {
            const inputs = el.querySelectorAll('input');
            lignes.push({
                description: inputs[0].value,
                quantite: parseFloat(inputs[1].value) || 0,
                prixUnitaire: parseFloat(inputs[2].value) || 0
            });
        });

        const codeTaxe = document.getElementById('soum-code-taxe').value || null;
        const calc = DocumentCommercial.calculerTaxes(lignes, codeTaxe);

        document.getElementById('soum-sous-total').textContent = Paie.formaterMontant(calc.sousTotal);
        document.getElementById('soum-taxe1-nom').textContent = calc.taxe1Nom || 'TPS';
        document.getElementById('soum-taxe1-montant').textContent = Paie.formaterMontant(calc.taxe1Montant);
        document.getElementById('soum-taxe2-nom').textContent = calc.taxe2Nom || 'TVQ';
        document.getElementById('soum-taxe2-montant').textContent = Paie.formaterMontant(calc.taxe2Montant);
        document.getElementById('soum-total').textContent = Paie.formaterMontant(calc.total);
    },

    sauvegarder(event, existingId) {
        event.preventDefault();

        const clientId = document.getElementById('soum-client').value;
        const client = clientId ? Client.getById(clientId) : null;
        const codeTaxe = document.getElementById('soum-code-taxe').value || null;

        const lignesEl = document.querySelectorAll('#soum-lignes .ligne-ecriture');
        const lignes = [];
        lignesEl.forEach(el => {
            const inputs = el.querySelectorAll('input');
            const desc = inputs[0].value.trim();
            const qte = parseFloat(inputs[1].value) || 0;
            const prix = parseFloat(inputs[2].value) || 0;
            if (desc) {
                lignes.push({ description: desc, quantite: qte, prixUnitaire: prix, sousTotal: Math.round(qte * prix * 100) / 100 });
            }
        });

        if (lignes.length === 0) {
            App.notification('Ajoutez au moins une ligne', 'warning');
            return;
        }

        const calc = DocumentCommercial.calculerTaxes(lignes, codeTaxe);

        const data = {
            type: 'soumission',
            clientId: clientId || null,
            clientNom: client ? client.nom : '',
            date: document.getElementById('soum-date').value,
            codeTaxe: codeTaxe,
            lignes: lignes,
            sousTotal: calc.sousTotal,
            taxe1Nom: calc.taxe1Nom,
            taxe1Montant: calc.taxe1Montant,
            taxe2Nom: calc.taxe2Nom,
            taxe2Montant: calc.taxe2Montant,
            total: calc.total,
            notes: document.getElementById('soum-notes').value.trim()
        };

        try {
            if (existingId) {
                DocumentCommercial.modifier(existingId, data);
                App.notification('Soumission modifiee', 'success');
            } else {
                DocumentCommercial.creer(data);
                App.notification('Soumission creee', 'success');
            }
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    voir(id) {
        const doc = DocumentCommercial.getById(id);
        if (!doc) return;

        const client = doc.clientId ? (Client.getById(doc.clientId) || {}) : {};
        let lignesHTML = doc.lignes.map(l =>
            '<tr><td>' + App.escapeHtml(l.description) + '</td><td class="text-right">' + (l.quantite || 0) +
            '</td><td class="text-right">' + Paie.formaterMontant(l.prixUnitaire) +
            '</td><td class="text-right">' + Paie.formaterMontant(l.sousTotal || (l.quantite * l.prixUnitaire)) + '</td></tr>'
        ).join('');

        App.ouvrirModal('Soumission ' + doc.numero, `
            <div class="rapport-container" style="border: none; box-shadow: none;">
                <div class="form-row">
                    <div><strong>Client:</strong> ${App.escapeHtml(client.nom || doc.clientNom || '-')}</div>
                    <div><strong>Date:</strong> ${doc.date}</div>
                </div>
                <div style="margin: 8px 0;"><strong>Statut:</strong> <span class="badge ${DocumentCommercial.getStatutClasse(doc.statut)}">${DocumentCommercial.getStatutLibelle(doc.statut)}</span></div>
                ${doc.notes ? '<div style="margin: 8px 0;"><strong>Notes:</strong> ' + App.escapeHtml(doc.notes) + '</div>' : ''}
                <table style="margin-top: 12px;">
                    <thead><tr><th>Description</th><th class="text-right">Qte</th><th class="text-right">Prix unit.</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>${lignesHTML}</tbody>
                </table>
                <div style="text-align: right; margin-top: 12px;">
                    <div>Sous-total: <strong>${Paie.formaterMontant(doc.sousTotal)}</strong></div>
                    <div>${doc.taxe1Nom || 'TPS'}: <strong>${Paie.formaterMontant(doc.taxe1Montant)}</strong></div>
                    <div>${doc.taxe2Nom || 'TVQ'}: <strong>${Paie.formaterMontant(doc.taxe2Montant)}</strong></div>
                    <div style="font-size: 16px; margin-top: 5px;">Total: <strong>${Paie.formaterMontant(doc.total)}</strong></div>
                </div>
            </div>
        `);
    },

    convertirEnBC(id) {
        if (!confirm('Convertir cette soumission en bon de commande?')) return;
        try {
            const bc = DocumentCommercial.convertirSoumissionEnBC(id);
            App.notification('Soumission convertie en bon de commande ' + bc.numero, 'success');
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    changerStatut(id, statut) {
        try {
            DocumentCommercial.changerStatut(id, statut);
            App.notification('Statut mis a jour', 'success');
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    filtrer(terme) {
        const rows = document.querySelectorAll('#table-soumissions tbody tr');
        const t = terme.toLowerCase();
        rows.forEach(r => {
            r.style.display = r.textContent.toLowerCase().includes(t) ? '' : 'none';
        });
    }
};
