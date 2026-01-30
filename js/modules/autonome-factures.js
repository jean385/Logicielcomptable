/**
 * Module Facturation simplifiée (mode Travailleur autonome)
 * Client inline, mémorisation clients fréquents, génération PDF
 */

const AutonomeFactures = {
    afficher() {
        App.afficherPage('module-autonome-factures');
        this.render();
    },

    render() {
        const container = document.getElementById('module-autonome-factures');
        const factures = FactureSimple.getAll().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        let tableRows = '';
        factures.forEach(f => {
            tableRows += `
                <tr>
                    <td>${App.escapeHtml(f.numero)}</td>
                    <td>${RevenuDepense.formaterDate(f.date)}</td>
                    <td>${App.escapeHtml(f.clientNom || '-')}</td>
                    <td class="text-right">${FactureSimple.formaterMontant(f.total)}</td>
                    <td class="text-center">
                        <span class="badge ${FactureSimple.getStatutClasse(f.statut)}">${FactureSimple.getStatutLibelle(f.statut)}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="AutonomeFactures.voirFacture('${f.id}')">Voir</button>
                        ${f.statut === 'brouillon' ? `
                            <button class="btn btn-primary" onclick="AutonomeFactures.emettreFacture('${f.id}')">Émettre</button>
                            <button class="btn btn-secondary" onclick="AutonomeFactures.modifierFacture('${f.id}')">Modifier</button>
                        ` : ''}
                        ${f.statut === 'emise' ? `
                            <button class="btn btn-success" onclick="AutonomeFactures.marquerPayee('${f.id}')">Payée</button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="AutonomeFactures.genererPdf('${f.id}')">PDF</button>
                        ${f.statut === 'brouillon' ? `
                            <button class="btn btn-danger" onclick="AutonomeFactures.supprimerFacture('${f.id}')">Suppr</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="module-header">
                <button class="btn-retour" onclick="AutonomeDashboard.afficher()">← Tableau de bord</button>
                <h1>Facturation</h1>
            </div>

            <div class="toolbar">
                <button class="btn btn-primary" onclick="AutonomeFactures.nouvelleFacture()">+ Nouvelle facture</button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th class="text-right">Total</th>
                            <th class="text-center">Statut</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucune facture</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    nouvelleFacture() {
        const numero = FactureSimple.genererNumero();
        const clientsFrequents = FactureSimple.getClientsFrequents();

        App.ouvrirModal('Nouvelle facture', `
            <form id="form-facture-simple" onsubmit="AutonomeFactures.sauvegarderFacture(event)">
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Numéro *</label>
                        <input type="text" id="fs-numero" value="${numero}" required>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="fs-date" value="${Storage.aujourdhui()}" required>
                    </div>
                    <div class="form-group">
                        <label>Échéance</label>
                        <input type="date" id="fs-echeance">
                    </div>
                </div>

                <div class="form-section">
                    <h4>Client</h4>
                    ${clientsFrequents.length > 0 ? `
                        <div class="form-group">
                            <label>Client fréquent</label>
                            <select id="fs-client-frequent" onchange="AutonomeFactures.remplirClientFrequent()">
                                <option value="">-- Saisie manuelle --</option>
                                ${FactureSimple.genererOptionsClientsFrequents()}
                            </select>
                        </div>
                    ` : ''}
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du client *</label>
                            <input type="text" id="fs-clientNom" required>
                        </div>
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="fs-clientCourriel">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="fs-clientAdresse">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="fs-clientVille">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <input type="text" id="fs-clientProvince" value="QC">
                        </div>
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="fs-clientCodePostal">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="tel" id="fs-clientTelephone">
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="fs-memoriser"> Mémoriser ce client pour les prochaines factures</label>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Lignes de facture</h4>
                    <div id="fs-lignes">
                        <div class="fs-ligne" data-index="0">
                            <div class="form-group" style="margin-bottom: 4px;">
                                <label>Produit</label>
                                <select name="fs-ligne-produit-0" onchange="AutonomeFactures.selectionnerProduit(0)">
                                    ${Produit.genererOptions()}
                                </select>
                            </div>
                            <div class="form-row" style="grid-template-columns: 3fr 1fr 1fr 1fr auto;">
                                <div class="form-group">
                                    <label>Description</label>
                                    <input type="text" name="fs-ligne-desc-0" required>
                                </div>
                                <div class="form-group">
                                    <label>Quantité</label>
                                    <input type="number" name="fs-ligne-qte-0" step="0.01" min="0.01" value="1" required
                                        onchange="AutonomeFactures.calculerLigne(0)">
                                </div>
                                <div class="form-group">
                                    <label>Prix unitaire</label>
                                    <input type="number" name="fs-ligne-prix-0" step="0.01" min="0" required
                                        onchange="AutonomeFactures.calculerLigne(0)">
                                </div>
                                <div class="form-group">
                                    <label>Montant</label>
                                    <input type="text" name="fs-ligne-montant-0" readonly class="text-right">
                                </div>
                                <div class="form-group" style="align-self: end;">
                                    <button type="button" class="btn-supprimer-ligne" onclick="AutonomeFactures.supprimerLigne(0)" title="Supprimer">✕</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="AutonomeFactures.ajouterLigne()" style="margin-top:8px;">+ Ajouter une ligne</button>
                </div>

                <div class="form-section" style="text-align: right;">
                    <div id="fs-totaux">
                        <div><strong>Sous-total:</strong> <span id="fs-sous-total">0,00 $</span></div>
                        <div><strong>TPS:</strong> <span id="fs-tps">0,00 $</span></div>
                        <div><strong>TVQ:</strong> <span id="fs-tvq">0,00 $</span></div>
                        <div style="font-size: 16px; margin-top: 8px;"><strong>Total:</strong> <span id="fs-total">0,00 $</span></div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="fs-notes" rows="2"></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer (brouillon)</button>
                </div>
            </form>
        `);

        this._ligneCount = 1;
    },

    _ligneCount: 1,

    ajouterLigne() {
        const idx = this._ligneCount++;
        const container = document.getElementById('fs-lignes');
        const div = document.createElement('div');
        div.className = 'fs-ligne';
        div.dataset.index = idx;
        div.innerHTML = `
            <div class="form-group" style="margin-bottom: 4px;">
                <select name="fs-ligne-produit-${idx}" onchange="AutonomeFactures.selectionnerProduit(${idx})">
                    ${Produit.genererOptions()}
                </select>
            </div>
            <div class="form-row" style="grid-template-columns: 3fr 1fr 1fr 1fr auto;">
                <div class="form-group">
                    <input type="text" name="fs-ligne-desc-${idx}" required>
                </div>
                <div class="form-group">
                    <input type="number" name="fs-ligne-qte-${idx}" step="0.01" min="0.01" value="1" required
                        onchange="AutonomeFactures.calculerLigne(${idx})">
                </div>
                <div class="form-group">
                    <input type="number" name="fs-ligne-prix-${idx}" step="0.01" min="0" required
                        onchange="AutonomeFactures.calculerLigne(${idx})">
                </div>
                <div class="form-group">
                    <input type="text" name="fs-ligne-montant-${idx}" readonly class="text-right">
                </div>
                <div class="form-group" style="align-self: end;">
                    <button type="button" class="btn-supprimer-ligne" onclick="AutonomeFactures.supprimerLigne(${idx})" title="Supprimer">✕</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    },

    supprimerLigne(idx) {
        const ligne = document.querySelector(`.fs-ligne[data-index="${idx}"]`);
        if (ligne && document.querySelectorAll('.fs-ligne').length > 1) {
            ligne.remove();
            this.calculerTotaux();
        }
    },

    calculerLigne(idx) {
        const qte = parseFloat(document.querySelector(`[name="fs-ligne-qte-${idx}"]`)?.value) || 0;
        const prix = parseFloat(document.querySelector(`[name="fs-ligne-prix-${idx}"]`)?.value) || 0;
        const montantField = document.querySelector(`[name="fs-ligne-montant-${idx}"]`);
        if (montantField) {
            montantField.value = (qte * prix).toFixed(2) + ' $';
        }
        this.calculerTotaux();
    },

    selectionnerProduit(idx) {
        const select = document.querySelector(`[name="fs-ligne-produit-${idx}"]`);
        if (!select || !select.value) return;

        const produit = Produit.getById(select.value);
        if (!produit) return;

        const descField = document.querySelector(`[name="fs-ligne-desc-${idx}"]`);
        const prixField = document.querySelector(`[name="fs-ligne-prix-${idx}"]`);

        if (descField) descField.value = produit.description || produit.nom;
        if (prixField) prixField.value = produit.prixUnitaire;

        this.calculerLigne(idx);
    },

    calculerTotaux() {
        const taxes = Storage.get('taxes') || { tps: 5, tvq: 9.975, appliquerTaxes: true };
        let sousTotal = 0;

        document.querySelectorAll('.fs-ligne').forEach(ligne => {
            const idx = ligne.dataset.index;
            const qte = parseFloat(document.querySelector(`[name="fs-ligne-qte-${idx}"]`)?.value) || 0;
            const prix = parseFloat(document.querySelector(`[name="fs-ligne-prix-${idx}"]`)?.value) || 0;
            sousTotal += qte * prix;
        });

        let tps = 0, tvq = 0;
        if (taxes.appliquerTaxes) {
            tps = Math.round(sousTotal * (taxes.tps / 100) * 100) / 100;
            tvq = Math.round(sousTotal * (taxes.tvq / 100) * 100) / 100;
        }

        const fmt = (v) => v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
        document.getElementById('fs-sous-total').textContent = fmt(sousTotal);
        document.getElementById('fs-tps').textContent = fmt(tps);
        document.getElementById('fs-tvq').textContent = fmt(tvq);
        document.getElementById('fs-total').textContent = fmt(sousTotal + tps + tvq);
    },

    remplirClientFrequent() {
        const select = document.getElementById('fs-client-frequent');
        if (!select) return;
        const id = select.value;
        if (!id) return;

        const client = FactureSimple.getClientFrequentById(id);
        if (!client) return;

        document.getElementById('fs-clientNom').value = client.nom || '';
        document.getElementById('fs-clientAdresse').value = client.adresse || '';
        document.getElementById('fs-clientVille').value = client.ville || '';
        document.getElementById('fs-clientProvince').value = client.province || 'QC';
        document.getElementById('fs-clientCodePostal').value = client.codePostal || '';
        document.getElementById('fs-clientCourriel').value = client.courriel || '';
        document.getElementById('fs-clientTelephone').value = client.telephone || '';
    },

    _collecterLignes() {
        const lignes = [];
        document.querySelectorAll('.fs-ligne').forEach(ligne => {
            const idx = ligne.dataset.index;
            const desc = document.querySelector(`[name="fs-ligne-desc-${idx}"]`)?.value?.trim();
            const qte = document.querySelector(`[name="fs-ligne-qte-${idx}"]`)?.value;
            const prix = document.querySelector(`[name="fs-ligne-prix-${idx}"]`)?.value;
            if (desc) {
                lignes.push({ description: desc, quantite: qte, prixUnitaire: prix });
            }
        });
        return lignes;
    },

    sauvegarderFacture(event) {
        event.preventDefault();
        try {
            const clientFrequentSelect = document.getElementById('fs-client-frequent');
            FactureSimple.creer({
                numero: document.getElementById('fs-numero').value.trim(),
                date: document.getElementById('fs-date').value,
                echeance: document.getElementById('fs-echeance').value,
                clientNom: document.getElementById('fs-clientNom').value.trim(),
                clientAdresse: document.getElementById('fs-clientAdresse').value.trim(),
                clientVille: document.getElementById('fs-clientVille').value.trim(),
                clientProvince: document.getElementById('fs-clientProvince').value.trim(),
                clientCodePostal: document.getElementById('fs-clientCodePostal').value.trim(),
                clientCourriel: document.getElementById('fs-clientCourriel').value.trim(),
                clientTelephone: document.getElementById('fs-clientTelephone').value.trim(),
                clientFrequentId: clientFrequentSelect ? clientFrequentSelect.value : null,
                lignes: this._collecterLignes(),
                notes: document.getElementById('fs-notes').value.trim(),
                memoriserClient: document.getElementById('fs-memoriser')?.checked || false
            });
            App.fermerModal();
            App.notification('Facture créée', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    voirFacture(id) {
        const f = FactureSimple.getById(id);
        if (!f) return;

        const taxes = Storage.get('taxes') || {};
        const fmt = (v) => (v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

        let lignesHTML = '';
        (f.lignes || []).forEach((l, i) => {
            lignesHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${App.escapeHtml(l.description)}</td>
                    <td class="text-right">${l.quantite}</td>
                    <td class="text-right">${fmt(l.prixUnitaire)}</td>
                    <td class="text-right">${fmt(l.montant)}</td>
                </tr>
            `;
        });

        App.ouvrirModal('Facture ' + f.numero, `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>FACTURE ${App.escapeHtml(f.numero)}</h2>
                    <p>Date: ${RevenuDepense.formaterDate(f.date)}${f.echeance ? ' | Échéance: ' + RevenuDepense.formaterDate(f.echeance) : ''}</p>
                    <p>Statut: <span class="badge ${FactureSimple.getStatutClasse(f.statut)}">${FactureSimple.getStatutLibelle(f.statut)}</span></p>
                </div>

                <div class="form-section">
                    <h4>Client</h4>
                    <p><strong>${App.escapeHtml(f.clientNom)}</strong></p>
                    ${f.clientAdresse ? '<p>' + App.escapeHtml(f.clientAdresse) + '</p>' : ''}
                    ${f.clientVille ? '<p>' + App.escapeHtml(f.clientVille) + (f.clientProvince ? ', ' + f.clientProvince : '') + (f.clientCodePostal ? ' ' + f.clientCodePostal : '') + '</p>' : ''}
                    ${f.clientCourriel ? '<p>' + App.escapeHtml(f.clientCourriel) + '</p>' : ''}
                    ${f.clientTelephone ? '<p>' + App.escapeHtml(f.clientTelephone) + '</p>' : ''}
                </div>

                <table style="width:100%;">
                    <thead>
                        <tr><th>#</th><th>Description</th><th class="text-right">Qté</th><th class="text-right">Prix unit.</th><th class="text-right">Montant</th></tr>
                    </thead>
                    <tbody>${lignesHTML}</tbody>
                </table>

                <div style="text-align: right; margin-top: 16px;">
                    <div>Sous-total: ${fmt(f.sousTotal)}</div>
                    <div>TPS (${taxes.tps || 5}%): ${fmt(f.tps)}</div>
                    <div>TVQ (${taxes.tvq || 9.975}%): ${fmt(f.tvq)}</div>
                    <div style="font-size: 16px; font-weight: bold; margin-top: 8px;">Total: ${fmt(f.total)}</div>
                </div>

                ${f.notes ? '<div class="form-section"><h4>Notes</h4><p>' + App.escapeHtml(f.notes) + '</p></div>' : ''}
            </div>

            <div style="text-align: right; margin-top: 16px;">
                <button class="btn btn-secondary" onclick="AutonomeFactures.genererPdf('${f.id}')">Télécharger PDF</button>
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
                <button class="btn btn-secondary" onclick="App.fermerModal()">Fermer</button>
            </div>
        `);
    },

    modifierFacture(id) {
        const f = FactureSimple.getById(id);
        if (!f) return;

        const clientsFrequents = FactureSimple.getClientsFrequents();

        let lignesHTML = '';
        (f.lignes || []).forEach((l, idx) => {
            lignesHTML += `
                <div class="fs-ligne" data-index="${idx}">
                    <div class="form-group" style="margin-bottom: 4px;">
                        ${idx === 0 ? '<label>Produit</label>' : ''}
                        <select name="fs-ligne-produit-${idx}" onchange="AutonomeFactures.selectionnerProduit(${idx})">
                            ${Produit.genererOptions()}
                        </select>
                    </div>
                    <div class="form-row" style="grid-template-columns: 3fr 1fr 1fr 1fr auto;">
                        <div class="form-group">
                            ${idx === 0 ? '<label>Description</label>' : ''}
                            <input type="text" name="fs-ligne-desc-${idx}" value="${App.escapeHtml(l.description)}" required>
                        </div>
                        <div class="form-group">
                            ${idx === 0 ? '<label>Quantité</label>' : ''}
                            <input type="number" name="fs-ligne-qte-${idx}" step="0.01" min="0.01" value="${l.quantite}" required
                                onchange="AutonomeFactures.calculerLigne(${idx})">
                        </div>
                        <div class="form-group">
                            ${idx === 0 ? '<label>Prix unitaire</label>' : ''}
                            <input type="number" name="fs-ligne-prix-${idx}" step="0.01" min="0" value="${l.prixUnitaire}" required
                                onchange="AutonomeFactures.calculerLigne(${idx})">
                        </div>
                        <div class="form-group">
                            ${idx === 0 ? '<label>Montant</label>' : ''}
                            <input type="text" name="fs-ligne-montant-${idx}" readonly class="text-right" value="${(l.montant || 0).toFixed(2)} $">
                        </div>
                        <div class="form-group" style="align-self: end;">
                            <button type="button" class="btn-supprimer-ligne" onclick="AutonomeFactures.supprimerLigne(${idx})" title="Supprimer">✕</button>
                        </div>
                    </div>
                </div>
            `;
        });

        this._ligneCount = f.lignes.length;

        const fmt = (v) => (v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

        App.ouvrirModal('Modifier la facture', `
            <form id="form-facture-simple-edit" onsubmit="AutonomeFactures.sauvegarderModifFacture(event, '${id}')">
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Numéro *</label>
                        <input type="text" id="fs-numero" value="${App.escapeHtml(f.numero)}" required>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="fs-date" value="${f.date}" required>
                    </div>
                    <div class="form-group">
                        <label>Échéance</label>
                        <input type="date" id="fs-echeance" value="${f.echeance || ''}">
                    </div>
                </div>

                <div class="form-section">
                    <h4>Client</h4>
                    ${clientsFrequents.length > 0 ? `
                        <div class="form-group">
                            <label>Client fréquent</label>
                            <select id="fs-client-frequent" onchange="AutonomeFactures.remplirClientFrequent()">
                                <option value="">-- Saisie manuelle --</option>
                                ${FactureSimple.genererOptionsClientsFrequents(f.clientFrequentId)}
                            </select>
                        </div>
                    ` : ''}
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du client *</label>
                            <input type="text" id="fs-clientNom" value="${App.escapeHtml(f.clientNom)}" required>
                        </div>
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="fs-clientCourriel" value="${App.escapeHtml(f.clientCourriel || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="fs-clientAdresse" value="${App.escapeHtml(f.clientAdresse || '')}">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="fs-clientVille" value="${App.escapeHtml(f.clientVille || '')}">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <input type="text" id="fs-clientProvince" value="${App.escapeHtml(f.clientProvince || 'QC')}">
                        </div>
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="fs-clientCodePostal" value="${App.escapeHtml(f.clientCodePostal || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="tel" id="fs-clientTelephone" value="${App.escapeHtml(f.clientTelephone || '')}">
                    </div>
                </div>

                <div class="form-section">
                    <h4>Lignes de facture</h4>
                    <div id="fs-lignes">${lignesHTML}</div>
                    <button type="button" class="btn btn-secondary" onclick="AutonomeFactures.ajouterLigne()" style="margin-top:8px;">+ Ajouter une ligne</button>
                </div>

                <div class="form-section" style="text-align: right;">
                    <div id="fs-totaux">
                        <div><strong>Sous-total:</strong> <span id="fs-sous-total">${fmt(f.sousTotal)}</span></div>
                        <div><strong>TPS:</strong> <span id="fs-tps">${fmt(f.tps)}</span></div>
                        <div><strong>TVQ:</strong> <span id="fs-tvq">${fmt(f.tvq)}</span></div>
                        <div style="font-size: 16px; margin-top: 8px;"><strong>Total:</strong> <span id="fs-total">${fmt(f.total)}</span></div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="fs-notes" rows="2">${App.escapeHtml(f.notes || '')}</textarea>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    sauvegarderModifFacture(event, id) {
        event.preventDefault();
        try {
            FactureSimple.modifier(id, {
                numero: document.getElementById('fs-numero').value.trim(),
                date: document.getElementById('fs-date').value,
                echeance: document.getElementById('fs-echeance').value,
                clientNom: document.getElementById('fs-clientNom').value.trim(),
                clientAdresse: document.getElementById('fs-clientAdresse').value.trim(),
                clientVille: document.getElementById('fs-clientVille').value.trim(),
                clientProvince: document.getElementById('fs-clientProvince').value.trim(),
                clientCodePostal: document.getElementById('fs-clientCodePostal').value.trim(),
                clientCourriel: document.getElementById('fs-clientCourriel').value.trim(),
                clientTelephone: document.getElementById('fs-clientTelephone').value.trim(),
                lignes: this._collecterLignes(),
                notes: document.getElementById('fs-notes').value.trim()
            });
            App.fermerModal();
            App.notification('Facture modifiée', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    emettreFacture(id) {
        if (!confirm('Émettre cette facture? Un revenu sera créé automatiquement.')) return;
        try {
            FactureSimple.emettre(id);
            App.notification('Facture émise et revenu créé', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    marquerPayee(id) {
        if (!confirm('Marquer cette facture comme payée?')) return;
        try {
            FactureSimple.changerStatut(id, 'payee');
            App.notification('Facture marquée comme payée', 'success');
            this.render();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    supprimerFacture(id) {
        if (!confirm('Supprimer cette facture?')) return;
        FactureSimple.supprimer(id);
        App.notification('Facture supprimée', 'success');
        this.render();
    },

    genererPdf(id) {
        const f = FactureSimple.getById(id);
        if (!f) return;

        if (!window.jspdf) {
            App.notification('La librairie jsPDF n\'est pas chargée.', 'danger');
            return;
        }

        const entreprise = Storage.get('entreprise') || {};
        const taxes = Storage.get('taxes') || {};
        const logo = Storage.get('logo');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'letter');
        const font = 'helvetica';
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;

        // Logo
        const enteteStartY = y;
        let logoEndX = margin;
        if (logo) {
            try {
                const props = doc.getImageProperties(logo);
                const maxW = 40, maxH = 20;
                const ratio = Math.min(maxW / props.width, maxH / props.height);
                doc.addImage(logo, 'PNG', margin, y, props.width * ratio, props.height * ratio);
                logoEndX = margin + props.width * ratio + 5;
            } catch (e) { logoEndX = margin; }
        }

        // Entreprise
        const infoX = logoEndX;
        doc.setFontSize(14);
        doc.setFont(font, 'bold');
        doc.text(entreprise.nomCommercial || 'Mon Entreprise', infoX, y + 5);
        doc.setFontSize(9);
        doc.setFont(font, 'normal');
        let infoY = y + 10;
        const adresse = [entreprise.adresse, entreprise.ville, entreprise.province, entreprise.codePostal].filter(x => x).join(', ');
        if (adresse) { doc.text(adresse, infoX, infoY); infoY += 4; }
        if (entreprise.telephone) { doc.text('Tel: ' + entreprise.telephone, infoX, infoY); infoY += 4; }
        if (entreprise.courriel) { doc.text(entreprise.courriel, infoX, infoY); infoY += 4; }

        let taxeY = y + 5;
        doc.setFontSize(8);
        if (entreprise.tps) { doc.text('TPS: ' + entreprise.tps, pageWidth - margin, taxeY, { align: 'right' }); taxeY += 4; }
        if (entreprise.tvq) { doc.text('TVQ: ' + entreprise.tvq, pageWidth - margin, taxeY, { align: 'right' }); taxeY += 4; }

        y = Math.max(infoY, taxeY, enteteStartY + 22) + 5;
        doc.setDrawColor(30, 58, 95);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        // Titre
        doc.setFontSize(20);
        doc.setFont(font, 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text('FACTURE', margin, y);

        doc.setFontSize(10);
        doc.setFont(font, 'normal');
        doc.setTextColor(0, 0, 0);

        const fInfoX = pageWidth - margin - 60;
        doc.setFont(font, 'bold');
        doc.text('Numero:', fInfoX, y - 5);
        doc.text('Date:', fInfoX, y);
        doc.text('Echeance:', fInfoX, y + 5);
        doc.setFont(font, 'normal');
        doc.text(f.numero, fInfoX + 30, y - 5);
        doc.text(f.date, fInfoX + 30, y);
        doc.text(f.echeance || '-', fInfoX + 30, y + 5);
        y += 12;

        // Client
        doc.setFont(font, 'bold');
        doc.text('Facturer a:', margin, y);
        doc.setFont(font, 'normal');
        y += 5;
        doc.text(f.clientNom || '', margin, y); y += 4;
        const clientAddr = [f.clientAdresse, f.clientVille, f.clientProvince, f.clientCodePostal].filter(x => x).join(', ');
        if (clientAddr) { doc.text(clientAddr, margin, y); y += 4; }
        if (f.clientTelephone) { doc.text('Tel: ' + f.clientTelephone, margin, y); y += 4; }
        if (f.clientCourriel) { doc.text(f.clientCourriel, margin, y); y += 4; }
        y += 8;

        // Tableau
        const tableRows = f.lignes.map((l, i) => ({
            num: (i + 1).toString(),
            description: l.description,
            quantite: l.quantite.toString(),
            prixUnitaire: PdfFacture.formaterMontant(l.prixUnitaire),
            montant: PdfFacture.formaterMontant(l.montant)
        }));

        doc.autoTable({
            startY: y,
            columns: [
                { header: '#', dataKey: 'num' },
                { header: 'Description', dataKey: 'description' },
                { header: 'Qte', dataKey: 'quantite' },
                { header: 'Prix unitaire', dataKey: 'prixUnitaire' },
                { header: 'Montant', dataKey: 'montant' }
            ],
            body: tableRows,
            margin: { left: margin, right: margin },
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                num: { cellWidth: 12, halign: 'center' },
                quantite: { cellWidth: 20, halign: 'right' },
                prixUnitaire: { cellWidth: 35, halign: 'right' },
                montant: { cellWidth: 35, halign: 'right' }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        const totX = pageWidth - margin - 70;
        const totValX = pageWidth - margin;

        doc.setFontSize(10);
        doc.setFont(font, 'normal');
        doc.text('Sous-total:', totX, y, { align: 'right' });
        doc.text(PdfFacture.formaterMontant(f.sousTotal), totValX, y, { align: 'right' });
        y += 5;
        if (f.tps > 0) {
            doc.text('TPS (' + (taxes.tps || 5) + '%):', totX, y, { align: 'right' });
            doc.text(PdfFacture.formaterMontant(f.tps), totValX, y, { align: 'right' });
            y += 5;
        }
        if (f.tvq > 0) {
            doc.text('TVQ (' + (taxes.tvq || 9.975) + '%):', totX, y, { align: 'right' });
            doc.text(PdfFacture.formaterMontant(f.tvq), totValX, y, { align: 'right' });
            y += 5;
        }
        doc.setLineWidth(0.3);
        doc.line(totX - 10, y, totValX, y);
        y += 5;
        doc.setFontSize(12);
        doc.setFont(font, 'bold');
        doc.text('Total:', totX, y, { align: 'right' });
        doc.text(PdfFacture.formaterMontant(f.total), totValX, y, { align: 'right' });

        if (f.notes) {
            y += 15;
            doc.setFontSize(9);
            doc.setFont(font, 'bold');
            doc.text('Notes:', margin, y);
            doc.setFont(font, 'normal');
            y += 4;
            const lines = doc.splitTextToSize(f.notes, pageWidth - 2 * margin);
            doc.text(lines, margin, y);
        }

        doc.save('Facture_' + f.numero + '.pdf');
    }
};
