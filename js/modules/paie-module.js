/**
 * Module Paie
 * Interface de gestion des employes et de la paie
 */

const PaieModule = {
    afficher() {
        App.afficherPage('module-paie');

        const container = document.getElementById('module-paie');
        container.innerHTML = `
            <div class="module-header">
                <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                <h1>Employes & Paie</h1>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="PaieModule.afficherOnglet('employes')">Employes</button>
                <button class="tab" onclick="PaieModule.afficherOnglet('generer')">Generer un talon</button>
                <button class="tab" onclick="PaieModule.afficherOnglet('historique')">Historique</button>
            </div>

            <div id="tab-paie-employes" class="tab-content active">
                ${this.renderEmployes()}
            </div>

            <div id="tab-paie-generer" class="tab-content">
                ${this.renderGenerer()}
            </div>

            <div id="tab-paie-historique" class="tab-content">
                ${this.renderHistorique()}
            </div>
        `;
    },

    afficherOnglet(onglet) {
        document.querySelectorAll('#module-paie .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-paie .tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector('#module-paie [onclick="PaieModule.afficherOnglet(\'' + onglet + '\')"]').classList.add('active');
        document.getElementById('tab-paie-' + onglet).classList.add('active');

        if (onglet === 'employes') {
            document.getElementById('tab-paie-employes').innerHTML = this.renderEmployes();
        }
        if (onglet === 'generer') {
            document.getElementById('tab-paie-generer').innerHTML = this.renderGenerer();
        }
        if (onglet === 'historique') {
            document.getElementById('tab-paie-historique').innerHTML = this.renderHistorique();
        }
    },

    // ===== EMPLOYES =====

    renderEmployes() {
        const employes = Employe.getAll();

        let rows = '';
        employes.forEach(e => {
            const styleInactif = !e.actif ? ' style="opacity: 0.5"' : '';
            const salaire = e.typeSalaire === 'horaire'
                ? Paie.formaterMontant(e.tauxHoraire) + '/h'
                : Paie.formaterMontant(e.salaireAnnuel) + '/an';
            const freq = { hebdo: 'Hebdo', bimensuel: 'Bimensuel', mensuel: 'Mensuel' };

            rows += `
                <tr${styleInactif}>
                    <td><strong>${App.escapeHtml(Employe.getNomComplet(e))}</strong></td>
                    <td>${App.escapeHtml(e.poste || '-')}</td>
                    <td>${salaire}</td>
                    <td>${freq[e.frequencePaie] || e.frequencePaie}</td>
                    <td>${e.dateEmbauche || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="PaieModule.modifierEmploye('${e.id}')">Modifier</button>
                        <button class="btn btn-danger" onclick="PaieModule.supprimerEmploye('${e.id}')">Suppr</button>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="PaieModule.nouvelEmploye()">+ Nouvel employe</button>
                <input type="text" class="search-input" placeholder="Rechercher..." onkeyup="PaieModule.filtrerEmployes(this.value)">
            </div>
            <div class="table-container">
                <table id="table-employes">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Poste</th>
                            <th>Salaire</th>
                            <th>Frequence</th>
                            <th>Embauche</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="6" class="text-center">Aucun employe</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    nouvelEmploye() {
        App.ouvrirModal('Nouvel employe', this._formEmploye());
    },

    modifierEmploye(id) {
        const e = Employe.getById(id);
        if (!e) return;
        App.ouvrirModal('Modifier l\'employe', this._formEmploye(e));
    },

    _formEmploye(e) {
        const isEdit = !!e;
        return `
            <form id="form-employe" onsubmit="PaieModule.sauvegarderEmploye(event${isEdit ? ', \'' + e.id + '\'' : ''})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Prenom *</label>
                        <input type="text" id="emp-prenom" value="${e ? App.escapeHtml(e.prenom) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Nom *</label>
                        <input type="text" id="emp-nom" value="${e ? App.escapeHtml(e.nom) : ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>NAS</label>
                        <input type="text" id="emp-nas" value="${e ? App.escapeHtml(e.nas || '') : ''}" placeholder="000 000 000">
                    </div>
                    <div class="form-group">
                        <label>Poste</label>
                        <input type="text" id="emp-poste" value="${e ? App.escapeHtml(e.poste || '') : ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="emp-adresse" value="${e ? App.escapeHtml(e.adresse || '') : ''}">
                    </div>
                    <div class="form-group">
                        <label>Ville</label>
                        <input type="text" id="emp-ville" value="${e ? App.escapeHtml(e.ville || '') : ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date d'embauche</label>
                        <input type="date" id="emp-embauche" value="${e ? (e.dateEmbauche || '') : Storage.aujourdhui()}">
                    </div>
                    <div class="form-group">
                        <label>Type de salaire *</label>
                        <select id="emp-type-salaire" onchange="PaieModule._toggleSalaire()">
                            <option value="horaire" ${!e || e.typeSalaire === 'horaire' ? 'selected' : ''}>Horaire</option>
                            <option value="annuel" ${e && e.typeSalaire === 'annuel' ? 'selected' : ''}>Annuel</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" id="grp-taux-horaire" ${e && e.typeSalaire === 'annuel' ? 'style="display:none"' : ''}>
                        <label>Taux horaire ($)</label>
                        <input type="number" id="emp-taux-horaire" value="${e ? (e.tauxHoraire || 0) : 0}" step="0.01" min="0">
                    </div>
                    <div class="form-group" id="grp-salaire-annuel" ${!e || e.typeSalaire !== 'annuel' ? 'style="display:none"' : ''}>
                        <label>Salaire annuel ($)</label>
                        <input type="number" id="emp-salaire-annuel" value="${e ? (e.salaireAnnuel || 0) : 0}" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label>Heures/semaine</label>
                        <input type="number" id="emp-heures" value="${e ? (e.heuresSemaine || 40) : 40}" step="0.5" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Frequence de paie *</label>
                    <select id="emp-frequence">
                        <option value="hebdo" ${e && e.frequencePaie === 'hebdo' ? 'selected' : ''}>Hebdomadaire (52/an)</option>
                        <option value="bimensuel" ${!e || e.frequencePaie === 'bimensuel' ? 'selected' : ''}>Bimensuel (26/an)</option>
                        <option value="mensuel" ${e && e.frequencePaie === 'mensuel' ? 'selected' : ''}>Mensuel (12/an)</option>
                    </select>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Enregistrer' : 'Creer'}</button>
                </div>
            </form>
        `;
    },

    _toggleSalaire() {
        const type = document.getElementById('emp-type-salaire').value;
        document.getElementById('grp-taux-horaire').style.display = type === 'horaire' ? '' : 'none';
        document.getElementById('grp-salaire-annuel').style.display = type === 'annuel' ? '' : 'none';
    },

    sauvegarderEmploye(event, existingId) {
        event.preventDefault();

        const data = {
            prenom: document.getElementById('emp-prenom').value.trim(),
            nom: document.getElementById('emp-nom').value.trim(),
            nas: document.getElementById('emp-nas').value.trim(),
            poste: document.getElementById('emp-poste').value.trim(),
            adresse: document.getElementById('emp-adresse').value.trim(),
            ville: document.getElementById('emp-ville').value.trim(),
            dateEmbauche: document.getElementById('emp-embauche').value,
            typeSalaire: document.getElementById('emp-type-salaire').value,
            tauxHoraire: document.getElementById('emp-taux-horaire').value,
            salaireAnnuel: document.getElementById('emp-salaire-annuel').value,
            heuresSemaine: document.getElementById('emp-heures').value,
            frequencePaie: document.getElementById('emp-frequence').value
        };

        try {
            if (existingId) {
                Employe.modifier(existingId, data);
                App.notification('Employe modifie', 'success');
            } else {
                Employe.creer(data);
                App.notification('Employe cree', 'success');
            }
            App.fermerModal();
            this.afficherOnglet('employes');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    supprimerEmploye(id) {
        if (!confirm('Supprimer cet employe?')) return;
        try {
            Employe.supprimer(id);
            App.notification('Employe supprime', 'success');
            this.afficherOnglet('employes');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    filtrerEmployes(terme) {
        const rows = document.querySelectorAll('#table-employes tbody tr');
        const t = terme.toLowerCase();
        rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(t) ? '' : 'none'; });
    },

    // ===== GENERER UN TALON =====

    renderGenerer() {
        const employes = Employe.getActifs();
        if (employes.length === 0) {
            return `<div class="rapport-container"><h3>Generer un talon de paie</h3><p>Aucun employe actif. Ajoutez d'abord un employe.</p></div>`;
        }

        const options = employes.map(e =>
            '<option value="' + e.id + '">' + App.escapeHtml(Employe.getNomComplet(e)) + '</option>'
        ).join('');

        return `
            <div class="rapport-container">
                <h3>Generer un talon de paie</h3>
                <form id="form-talon" onsubmit="PaieModule.genererTalon(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Employe *</label>
                            <select id="talon-employe" required onchange="PaieModule.previsualiser()">
                                <option value="">Selectionner</option>
                                ${options}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date de paie *</label>
                            <input type="date" id="talon-date" value="${Storage.aujourdhui()}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Periode du</label>
                            <input type="date" id="talon-du">
                        </div>
                        <div class="form-group">
                            <label>Periode au</label>
                            <input type="date" id="talon-au">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Heures travaillees (laisser vide pour le salaire standard de la periode)</label>
                        <input type="number" id="talon-heures" step="0.5" min="0" onchange="PaieModule.previsualiser()">
                    </div>

                    <div id="talon-preview" style="margin-top: 20px;"></div>

                    <div style="text-align: right; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary">Generer et enregistrer le talon</button>
                    </div>
                </form>
            </div>
        `;
    },

    previsualiser() {
        const employeId = document.getElementById('talon-employe').value;
        if (!employeId) {
            document.getElementById('talon-preview').innerHTML = '';
            return;
        }

        const employe = Employe.getById(employeId);
        if (!employe) return;

        const periodesParAn = Employe.getPeriodesParAn(employe.frequencePaie);
        const heures = parseFloat(document.getElementById('talon-heures').value) || null;

        let salaireBrut;
        if (heures && employe.typeSalaire === 'horaire') {
            salaireBrut = Math.round(heures * employe.tauxHoraire * 100) / 100;
        } else {
            salaireBrut = Employe.getSalairePeriode(employe);
        }

        const talons = Paie.getTalonsByEmploye(employeId)
            .filter(t => t.date && t.date.startsWith(new Date().getFullYear().toString()));
        const cumulBrut = talons.reduce((s, t) => s + (t.salaireBrut || 0), 0);

        const deductions = Paie.calculerDeductions(salaireBrut, periodesParAn, cumulBrut);
        const totalDed = Math.round((deductions.rrq + deductions.rrq2 + deductions.rqap + deductions.ae + deductions.impotFederal + deductions.impotProvincial) * 100) / 100;
        const net = Math.round((salaireBrut - totalDed) * 100) / 100;

        document.getElementById('talon-preview').innerHTML = `
            <div style="background: var(--background-color); padding: 15px; border-radius: 4px; border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: 10px; color: var(--primary-color);">Previsualisation</h4>
                <div class="form-row" style="margin-bottom: 0;">
                    <div>
                        <div style="margin-bottom: 6px;"><strong>Salaire brut:</strong> ${Paie.formaterMontant(salaireBrut)}</div>
                        <div style="font-size: 12px; color: var(--text-light);">
                            <div>RRQ: ${Paie.formaterMontant(deductions.rrq)}</div>
                            <div>RRQ2: ${Paie.formaterMontant(deductions.rrq2)}</div>
                            <div>RQAP: ${Paie.formaterMontant(deductions.rqap)}</div>
                            <div>AE: ${Paie.formaterMontant(deductions.ae)}</div>
                            <div>Impot federal: ${Paie.formaterMontant(deductions.impotFederal)}</div>
                            <div>Impot provincial: ${Paie.formaterMontant(deductions.impotProvincial)}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-bottom: 6px;"><strong>Total deductions:</strong> ${Paie.formaterMontant(totalDed)}</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--primary-color);">Net: ${Paie.formaterMontant(net)}</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">Cumul brut annee: ${Paie.formaterMontant(cumulBrut)}</div>
                    </div>
                </div>
            </div>
        `;
    },

    genererTalon(event) {
        event.preventDefault();

        const employeId = document.getElementById('talon-employe').value;
        if (!employeId) {
            App.notification('Selectionnez un employe', 'warning');
            return;
        }

        try {
            const talon = Paie.genererTalon({
                employeId: employeId,
                date: document.getElementById('talon-date').value,
                periodeDu: document.getElementById('talon-du').value,
                periodeAu: document.getElementById('talon-au').value,
                heuresTravaillees: parseFloat(document.getElementById('talon-heures').value) || null
            });

            App.notification('Talon de paie genere pour ' + talon.employeNom + ' — Net: ' + Paie.formaterMontant(talon.salaireNet), 'success');
            App.mettreAJourDashboard();
            this.afficherOnglet('historique');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    // ===== HISTORIQUE =====

    renderHistorique() {
        const talons = Paie.getTalons().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        let rows = '';
        talons.forEach(t => {
            rows += `
                <tr>
                    <td>${t.date || '-'}</td>
                    <td><strong>${App.escapeHtml(t.employeNom || '-')}</strong></td>
                    <td>${t.periodeDu && t.periodeAu ? t.periodeDu + ' au ' + t.periodeAu : '-'}</td>
                    <td class="text-right">${Paie.formaterMontant(t.salaireBrut)}</td>
                    <td class="text-right">${Paie.formaterMontant(t.totalDeductions)}</td>
                    <td class="text-right"><strong>${Paie.formaterMontant(t.salaireNet)}</strong></td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="PaieModule.voirTalon('${t.id}')">Voir</button>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Employe</th>
                            <th>Periode</th>
                            <th class="text-right">Brut</th>
                            <th class="text-right">Deductions</th>
                            <th class="text-right">Net</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="7" class="text-center">Aucun talon de paie</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    voirTalon(id) {
        const t = Paie.getTalons().find(tal => tal.id === id);
        if (!t) return;

        const d = t.deductions || {};
        App.ouvrirModal('Talon de paie — ' + (t.employeNom || ''), `
            <div style="padding: 10px;">
                <div class="form-row">
                    <div><strong>Date:</strong> ${t.date}</div>
                    <div><strong>Periode:</strong> ${t.periodeDu && t.periodeAu ? t.periodeDu + ' au ' + t.periodeAu : '-'}</div>
                </div>
                ${t.heuresTravaillees ? '<div style="margin: 8px 0;"><strong>Heures:</strong> ' + t.heuresTravaillees + ' h' + (t.tauxHoraire ? ' x ' + Paie.formaterMontant(t.tauxHoraire) : '') + '</div>' : ''}

                <table style="margin-top: 15px;">
                    <thead><tr><th>Description</th><th class="text-right">Montant</th></tr></thead>
                    <tbody>
                        <tr><td><strong>Salaire brut</strong></td><td class="text-right"><strong>${Paie.formaterMontant(t.salaireBrut)}</strong></td></tr>
                        <tr><td>RRQ</td><td class="text-right">-${Paie.formaterMontant(d.rrq)}</td></tr>
                        <tr><td>RRQ2</td><td class="text-right">-${Paie.formaterMontant(d.rrq2)}</td></tr>
                        <tr><td>RQAP</td><td class="text-right">-${Paie.formaterMontant(d.rqap)}</td></tr>
                        <tr><td>Assurance-emploi</td><td class="text-right">-${Paie.formaterMontant(d.ae)}</td></tr>
                        <tr><td>Impot federal</td><td class="text-right">-${Paie.formaterMontant(d.impotFederal)}</td></tr>
                        <tr><td>Impot provincial QC</td><td class="text-right">-${Paie.formaterMontant(d.impotProvincial)}</td></tr>
                        <tr style="border-top: 2px solid var(--primary-color);"><td><strong>Total deductions</strong></td><td class="text-right"><strong>-${Paie.formaterMontant(t.totalDeductions)}</strong></td></tr>
                        <tr style="font-size: 16px;"><td><strong>Salaire net</strong></td><td class="text-right"><strong>${Paie.formaterMontant(t.salaireNet)}</strong></td></tr>
                    </tbody>
                </table>
                <div style="margin-top: 10px; font-size: 11px; color: var(--text-light);">Cumul brut annee: ${Paie.formaterMontant(t.cumulBrutAnnee)}</div>
            </div>
        `);
    }
};
