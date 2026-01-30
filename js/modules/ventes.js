/**
 * Module Ventes
 * Gestion des clients et facturation
 */

const Ventes = {
    /**
     * Affiche le module ventes
     */
    afficher() {
        App.afficherPage('module-ventes');

        const container = document.getElementById('module-ventes');
        container.innerHTML = `
            <div class="module-header">
                <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                <h1>Ventes</h1>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Ventes.afficherOnglet('factures')">Factures</button>
                <button class="tab" onclick="Ventes.afficherOnglet('clients')">Clients</button>
                <button class="tab" onclick="Ventes.afficherOnglet('nouvelle-facture')">Nouvelle facture</button>
            </div>

            <div id="tab-factures" class="tab-content active">
                ${this.renderFactures()}
            </div>

            <div id="tab-clients" class="tab-content">
                ${this.renderClients()}
            </div>

            <div id="tab-nouvelle-facture" class="tab-content">
                ${this.renderNouvelleFacture()}
            </div>
        `;
    },

    /**
     * Affiche un onglet
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-ventes .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-ventes .tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`#module-ventes [onclick="Ventes.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById('tab-' + onglet).classList.add('active');

        // Rafraîchir le contenu selon l'onglet
        if (onglet === 'factures') {
            document.getElementById('tab-factures').innerHTML = this.renderFactures();
        } else if (onglet === 'clients') {
            document.getElementById('tab-clients').innerHTML = this.renderClients();
        } else if (onglet === 'nouvelle-facture') {
            document.getElementById('tab-nouvelle-facture').innerHTML = this.renderNouvelleFacture();
            this.ajouterLigneFacture();
        }
    },

    /**
     * Render la liste des factures
     */
    renderFactures() {
        const factures = Facture.getVentes();

        let tableRows = '';
        factures.forEach(f => {
            const solde = f.total - f.montantPaye;
            const projet = f.projetId ? Projet.getById(f.projetId) : null;
            tableRows += `
                <tr>
                    <td>${f.numero}</td>
                    <td>${f.date}</td>
                    <td>${f.clientNom}</td>
                    <td>${projet ? (projet.code || projet.nom) : '-'}</td>
                    <td>${f.echeance}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.total)}</td>
                    <td class="text-right">${Transaction.formaterMontant(solde)}</td>
                    <td class="text-center">
                        <span class="badge ${Facture.getStatutClasse(f.statut)}">${Facture.getStatutLibelle(f.statut)}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Ventes.voirFacture('${f.id}')">Voir</button>
                        <button class="btn btn-secondary" onclick="PdfFacture.generer('${f.id}')" title="Télécharger PDF">PDF</button>
                        ${f.statut !== 'annulee' && f.montantPaye === 0 ? `
                            <button class="btn btn-danger" onclick="Ventes.annulerFacture('${f.id}')">Annuler</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        return `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Total facturé</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + (f.statut !== 'annulee' ? f.total : 0), 0))}</p>
                </div>
                <div class="info-card">
                    <h4>Encaissé</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + f.montantPaye, 0))}</p>
                </div>
                <div class="info-card">
                    <h4>À recevoir</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + (f.statut !== 'annulee' ? f.total - f.montantPaye : 0), 0))}</p>
                </div>
            </div>

            <div class="toolbar">
                <select id="filtre-statut-vente" onchange="Ventes.filtrerFactures()">
                    <option value="">Tous les statuts</option>
                    <option value="impayee">Impayées</option>
                    <option value="partielle">Partiellement payées</option>
                    <option value="payee">Payées</option>
                    <option value="annulee">Annulées</option>
                </select>
                <input type="text" class="search-input" placeholder="Rechercher..."
                    onkeyup="Ventes.rechercherFactures(this.value)">
            </div>

            <div class="table-container">
                <table id="table-factures-vente">
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Projet</th>
                            <th>Échéance</th>
                            <th class="text-right">Total</th>
                            <th class="text-right">Solde</th>
                            <th class="text-center">Statut</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="9" class="text-center">Aucune facture</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Filtre les factures par statut
     */
    filtrerFactures() {
        const statut = document.getElementById('filtre-statut-vente').value;
        const rows = document.querySelectorAll('#table-factures-vente tbody tr');

        rows.forEach(row => {
            if (!statut) {
                row.style.display = '';
            } else {
                const badge = row.querySelector('.badge');
                if (badge) {
                    const rowStatut = badge.textContent.toLowerCase();
                    row.style.display = rowStatut.includes(Facture.getStatutLibelle(statut).toLowerCase()) ? '' : 'none';
                }
            }
        });
    },

    /**
     * Recherche dans les factures
     */
    rechercherFactures(terme) {
        const termeLower = terme.toLowerCase();
        const rows = document.querySelectorAll('#table-factures-vente tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Affiche une facture en détail
     */
    voirFacture(id) {
        const facture = Facture.getById(id);
        if (!facture) return;

        let lignesHtml = '';
        facture.lignes.forEach(l => {
            lignesHtml += `
                <tr>
                    <td>${l.description}</td>
                    <td class="text-center">${l.quantite}</td>
                    <td class="text-right">${Transaction.formaterMontant(l.prixUnitaire)}</td>
                    <td class="text-right">${Transaction.formaterMontant(l.sousTotal)}</td>
                </tr>
            `;
        });

        let paiementsHtml = '';
        if (facture.paiements && facture.paiements.length > 0) {
            paiementsHtml = `
                <h4 style="margin-top: 20px;">Paiements reçus</h4>
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${facture.paiements.map(p => `
                            <tr>
                                <td>${p.date}</td>
                                <td class="text-right">${Transaction.formaterMontant(p.montant)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        App.ouvrirModal('Facture ' + facture.numero, `
            <div class="rapport-container" style="box-shadow: none;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                        <strong>Client:</strong> ${facture.clientNom}<br>
                        <strong>Date:</strong> ${facture.date}<br>
                        <strong>Échéance:</strong> ${facture.echeance}
                    </div>
                    <div>
                        <span class="badge ${Facture.getStatutClasse(facture.statut)}">${Facture.getStatutLibelle(facture.statut)}</span>
                    </div>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-center">Qté</th>
                            <th class="text-right">Prix unit.</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lignesHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-right"><strong>Sous-total:</strong></td>
                            <td class="text-right">${Transaction.formaterMontant(facture.sousTotal)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-right">TPS:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.tps)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-right">TVQ:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.tvq)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-right"><strong>Total:</strong></td>
                            <td class="text-right"><strong>${Transaction.formaterMontant(facture.total)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-right">Payé:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.montantPaye)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-right"><strong>Solde dû:</strong></td>
                            <td class="text-right"><strong>${Transaction.formaterMontant(facture.total - facture.montantPaye)}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                ${paiementsHtml}

                ${facture.notes ? `<p style="margin-top: 20px;"><strong>Notes:</strong> ${facture.notes}</p>` : ''}

                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-secondary" onclick="App.fermerModal()">Fermer</button>
                    <button class="btn btn-primary" onclick="PdfFacture.generer('${facture.id}')">Générer PDF</button>
                    <button class="btn btn-primary" onclick="App.fermerModal(); EmailFacture.envoyerParCourriel('${facture.id}')">Envoyer par courriel</button>
                </div>
            </div>
        `);
    },

    /**
     * Annule une facture
     */
    annulerFacture(id) {
        if (!confirm('Êtes-vous sûr de vouloir annuler cette facture?')) return;

        try {
            Facture.annuler(id);
            App.notification('Facture annulée', 'success');
            document.getElementById('tab-factures').innerHTML = this.renderFactures();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Génère les options de types de client
     */
    genererOptionsTypes(valeur = '') {
        return Client.getTypes().map(t =>
            `<option value="${t.code}" ${t.code === valeur ? 'selected' : ''}>${t.label}</option>`
        ).join('');
    },

    /**
     * Génère les options de provinces
     */
    genererOptionsProvinces(valeur = 'QC') {
        const provinces = [
            { code: 'AB', nom: 'Alberta' },
            { code: 'BC', nom: 'Colombie-Britannique' },
            { code: 'MB', nom: 'Manitoba' },
            { code: 'NB', nom: 'Nouveau-Brunswick' },
            { code: 'NL', nom: 'Terre-Neuve-et-Labrador' },
            { code: 'NS', nom: 'Nouvelle-Écosse' },
            { code: 'NT', nom: 'Territoires du Nord-Ouest' },
            { code: 'NU', nom: 'Nunavut' },
            { code: 'ON', nom: 'Ontario' },
            { code: 'PE', nom: 'Île-du-Prince-Édouard' },
            { code: 'QC', nom: 'Québec' },
            { code: 'SK', nom: 'Saskatchewan' },
            { code: 'YT', nom: 'Yukon' }
        ];
        return provinces.map(p =>
            `<option value="${p.code}" ${p.code === valeur ? 'selected' : ''}>${p.nom}</option>`
        ).join('');
    },

    /**
     * Render la liste des clients
     */
    renderClients() {
        const clients = Client.getAll();

        let tableRows = '';
        clients.forEach(c => {
            tableRows += `
                <tr>
                    <td>
                        <strong>${c.nom}</strong>
                        ${c.contact ? `<br><small class="text-light">${c.contact}</small>` : ''}
                    </td>
                    <td><span class="badge badge-info">${Client.getTypeLibelle(c.type || 'entreprise')}</span></td>
                    <td>${c.telephone || '-'}</td>
                    <td>${c.courriel || '-'}</td>
                    <td class="text-right">${Transaction.formaterMontant(c.solde)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Ventes.voirClient('${c.id}')">Voir</button>
                        <button class="btn btn-secondary" onclick="Ventes.modifierClient('${c.id}')">Modifier</button>
                        ${c.solde === 0 ? `<button class="btn btn-danger" onclick="Ventes.supprimerClient('${c.id}')">Suppr</button>` : ''}
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Ventes.nouveauClient()">+ Nouveau client</button>
                <input type="text" class="search-input" placeholder="Rechercher..."
                    onkeyup="Ventes.rechercherClients(this.value)">
            </div>

            <div class="table-container">
                <table id="table-clients">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Téléphone</th>
                            <th>Courriel</th>
                            <th class="text-right">Solde</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucun client</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Affiche les détails d'un client
     */
    voirClient(id) {
        const c = Client.getById(id);
        if (!c) return;

        const adresseComplete = [c.adresse, c.ville, c.province, c.codePostal, c.pays]
            .filter(x => x).join(', ');

        App.ouvrirModal('Client: ' + c.nom, `
            <div class="info-cards" style="margin-bottom: 20px;">
                <div class="info-card">
                    <h4>Solde dû</h4>
                    <p>${Transaction.formaterMontant(c.solde)}</p>
                </div>
                <div class="info-card">
                    <h4>Type</h4>
                    <p>${Client.getTypeLibelle(c.type)}</p>
                </div>
                <div class="info-card">
                    <h4>Conditions</h4>
                    <p>${Client.getConditionsLibelle(c.conditions)}</p>
                </div>
                <div class="info-card">
                    <h4>Limite crédit</h4>
                    <p>${Transaction.formaterMontant(c.limiteCredit || 0)}</p>
                </div>
            </div>

            <div class="form-row">
                <div>
                    <h4>Contact</h4>
                    <p>${c.contact || '-'}</p>
                    <p>${c.telephone || ''} ${c.telecopieur ? '| Fax: ' + c.telecopieur : ''}</p>
                    <p>${c.courriel || ''}</p>
                    ${c.siteWeb ? `<p><a href="${c.siteWeb}" target="_blank">${c.siteWeb}</a></p>` : ''}
                </div>
                <div>
                    <h4>Adresse</h4>
                    <p>${adresseComplete || '-'}</p>
                </div>
            </div>

            <div class="form-row" style="margin-top: 20px;">
                <div>
                    <h4>Numéros de taxes</h4>
                    <p>TPS: ${c.numeroTPS || '-'}</p>
                    <p>TVQ: ${c.numeroTVQ || '-'}</p>
                </div>
                <div>
                    <h4>Informations bancaires</h4>
                    <p>Banque: ${c.banque || '-'}</p>
                    <p>Institution: ${c.institution || '-'} | Transit: ${c.transit || '-'}</p>
                    <p>Compte: ${c.compteBank || '-'}</p>
                </div>
            </div>

            ${c.notes ? `<div style="margin-top: 20px;"><h4>Notes</h4><p>${c.notes}</p></div>` : ''}

            <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary" onclick="App.fermerModal()">Fermer</button>
                <button class="btn btn-primary" onclick="App.fermerModal(); Ventes.modifierClient('${c.id}')">Modifier</button>
            </div>
        `);
    },

    /**
     * Recherche dans les clients
     */
    rechercherClients(terme) {
        const termeLower = terme.toLowerCase();
        const rows = document.querySelectorAll('#table-clients tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Gère les onglets du formulaire client
     */
    ongletClient(onglet, btn) {
        document.querySelectorAll('.client-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('#form-client .tab, #form-client-edit .tab').forEach(el => el.classList.remove('active'));

        document.getElementById('client-tab-' + onglet).style.display = 'block';
        if (btn) btn.classList.add('active');
    },

    /**
     * Ouvre le formulaire nouveau client
     */
    nouveauClient() {
        App.ouvrirModal('Nouveau client', `
            <form id="form-client" onsubmit="Ventes.sauvegarderClient(event)">
                <div class="tabs" style="margin-bottom: 20px;">
                    <button type="button" class="tab active" onclick="Ventes.ongletClient('general', this)">Général</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('adresse', this)">Adresse</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('taxes', this)">Taxes</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('bancaire', this)">Bancaire</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('comptabilite', this)">Comptabilité</button>
                </div>

                <!-- Onglet Général -->
                <div id="client-tab-general" class="client-tab-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du client *</label>
                            <input type="text" id="client-nom" required>
                        </div>
                        <div class="form-group">
                            <label>Type de client</label>
                            <select id="client-type">
                                ${this.genererOptionsTypes('entreprise')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Personne contact</label>
                            <input type="text" id="client-contact">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="client-telephone">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="client-courriel">
                        </div>
                        <div class="form-group">
                            <label>Télécopieur</label>
                            <input type="tel" id="client-telecopieur">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Site web</label>
                        <input type="url" id="client-siteweb" placeholder="https://">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="client-notes" rows="2"></textarea>
                    </div>
                </div>

                <!-- Onglet Adresse -->
                <div id="client-tab-adresse" class="client-tab-content" style="display: none;">
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="client-adresse" placeholder="Numéro et rue">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="client-ville">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <select id="client-province">
                                ${this.genererOptionsProvinces()}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="client-codePostal" placeholder="A1A 1A1">
                        </div>
                        <div class="form-group">
                            <label>Pays</label>
                            <input type="text" id="client-pays" value="Canada">
                        </div>
                    </div>
                </div>

                <!-- Onglet Taxes -->
                <div id="client-tab-taxes" class="client-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Numéros de taxes du client (pour clients exonérés ou revendeurs).
                    </div>
                    <div class="form-group">
                        <label>Numéro de TPS</label>
                        <input type="text" id="client-numeroTPS" placeholder="123456789 RT0001">
                    </div>
                    <div class="form-group">
                        <label>Numéro de TVQ</label>
                        <input type="text" id="client-numeroTVQ" placeholder="1234567890 TQ0001">
                    </div>
                </div>

                <!-- Onglet Bancaire -->
                <div id="client-tab-bancaire" class="client-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Informations pour les prélèvements automatiques.
                    </div>
                    <div class="form-group">
                        <label>Nom de la banque</label>
                        <input type="text" id="client-banque">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>N° Institution (3 chiffres)</label>
                            <input type="text" id="client-institution" maxlength="3" placeholder="000">
                        </div>
                        <div class="form-group">
                            <label>N° Transit (5 chiffres)</label>
                            <input type="text" id="client-transit" maxlength="5" placeholder="00000">
                        </div>
                        <div class="form-group">
                            <label>N° Compte</label>
                            <input type="text" id="client-compteBank" placeholder="0000000">
                        </div>
                    </div>
                </div>

                <!-- Onglet Comptabilité -->
                <div id="client-tab-comptabilite" class="client-tab-content" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Conditions de paiement</label>
                            <select id="client-conditions">
                                <option value="immediat">Paiement immédiat</option>
                                <option value="net15">Net 15 jours</option>
                                <option value="net30" selected>Net 30 jours</option>
                                <option value="net45">Net 45 jours</option>
                                <option value="net60">Net 60 jours</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Limite de crédit ($)</label>
                            <input type="number" id="client-limiteCredit" value="0" min="0" step="100">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Escompte (%)</label>
                            <input type="number" id="client-escompte" value="0" min="0" max="100" step="0.5">
                        </div>
                        <div class="form-group">
                            <label>Devise</label>
                            <select id="client-devise">
                                <option value="CAD" selected>CAD - Dollar canadien</option>
                                <option value="USD">USD - Dollar américain</option>
                                <option value="EUR">EUR - Euro</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Compte à recevoir</label>
                            <select id="client-compte">
                                ${Compte.genererOptions('actif', '1100')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Compte de revenu par défaut</label>
                            <select id="client-compteRevenu">
                                ${Compte.genererOptionsGroupees('4000')}
                            </select>
                        </div>
                    </div>
                </div>

                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer le client</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde un nouveau client
     */
    sauvegarderClient(event) {
        event.preventDefault();

        try {
            Client.creer({
                nom: document.getElementById('client-nom').value,
                type: document.getElementById('client-type').value,
                contact: document.getElementById('client-contact').value,
                telephone: document.getElementById('client-telephone').value,
                courriel: document.getElementById('client-courriel').value,
                telecopieur: document.getElementById('client-telecopieur').value,
                siteWeb: document.getElementById('client-siteweb').value,
                notes: document.getElementById('client-notes').value,
                // Adresse
                adresse: document.getElementById('client-adresse').value,
                ville: document.getElementById('client-ville').value,
                province: document.getElementById('client-province').value,
                codePostal: document.getElementById('client-codePostal').value,
                pays: document.getElementById('client-pays').value,
                // Taxes
                numeroTPS: document.getElementById('client-numeroTPS').value,
                numeroTVQ: document.getElementById('client-numeroTVQ').value,
                // Bancaire
                banque: document.getElementById('client-banque').value,
                institution: document.getElementById('client-institution').value,
                transit: document.getElementById('client-transit').value,
                compteBank: document.getElementById('client-compteBank').value,
                // Comptabilité
                conditions: document.getElementById('client-conditions').value,
                limiteCredit: document.getElementById('client-limiteCredit').value,
                escompte: document.getElementById('client-escompte').value,
                devise: document.getElementById('client-devise').value,
                compteRecevoir: document.getElementById('client-compte').value,
                compteRevenu: document.getElementById('client-compteRevenu').value
            });

            App.fermerModal();
            App.notification('Client créé avec succès', 'success');
            document.getElementById('tab-clients').innerHTML = this.renderClients();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Modifie un client
     */
    modifierClient(id) {
        const c = Client.getById(id);
        if (!c) return;

        App.ouvrirModal('Modifier le client', `
            <form id="form-client-edit" onsubmit="Ventes.sauvegarderModifClient(event, '${id}')">
                <div class="tabs" style="margin-bottom: 20px;">
                    <button type="button" class="tab active" onclick="Ventes.ongletClient('general', this)">Général</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('adresse', this)">Adresse</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('taxes', this)">Taxes</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('bancaire', this)">Bancaire</button>
                    <button type="button" class="tab" onclick="Ventes.ongletClient('comptabilite', this)">Comptabilité</button>
                </div>

                <!-- Onglet Général -->
                <div id="client-tab-general" class="client-tab-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du client *</label>
                            <input type="text" id="client-nom" value="${c.nom}" required>
                        </div>
                        <div class="form-group">
                            <label>Type de client</label>
                            <select id="client-type">
                                ${this.genererOptionsTypes(c.type)}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Personne contact</label>
                            <input type="text" id="client-contact" value="${c.contact || ''}">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="client-telephone" value="${c.telephone || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="client-courriel" value="${c.courriel || ''}">
                        </div>
                        <div class="form-group">
                            <label>Télécopieur</label>
                            <input type="tel" id="client-telecopieur" value="${c.telecopieur || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Site web</label>
                        <input type="url" id="client-siteweb" value="${c.siteWeb || ''}" placeholder="https://">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="client-notes" rows="2">${c.notes || ''}</textarea>
                    </div>
                </div>

                <!-- Onglet Adresse -->
                <div id="client-tab-adresse" class="client-tab-content" style="display: none;">
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="client-adresse" value="${c.adresse || ''}" placeholder="Numéro et rue">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="client-ville" value="${c.ville || ''}">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <select id="client-province">
                                ${this.genererOptionsProvinces(c.province)}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="client-codePostal" value="${c.codePostal || ''}" placeholder="A1A 1A1">
                        </div>
                        <div class="form-group">
                            <label>Pays</label>
                            <input type="text" id="client-pays" value="${c.pays || 'Canada'}">
                        </div>
                    </div>
                </div>

                <!-- Onglet Taxes -->
                <div id="client-tab-taxes" class="client-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Numéros de taxes du client (pour clients exonérés ou revendeurs).
                    </div>
                    <div class="form-group">
                        <label>Numéro de TPS</label>
                        <input type="text" id="client-numeroTPS" value="${c.numeroTPS || ''}" placeholder="123456789 RT0001">
                    </div>
                    <div class="form-group">
                        <label>Numéro de TVQ</label>
                        <input type="text" id="client-numeroTVQ" value="${c.numeroTVQ || ''}" placeholder="1234567890 TQ0001">
                    </div>
                </div>

                <!-- Onglet Bancaire -->
                <div id="client-tab-bancaire" class="client-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Informations pour les prélèvements automatiques.
                    </div>
                    <div class="form-group">
                        <label>Nom de la banque</label>
                        <input type="text" id="client-banque" value="${c.banque || ''}">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>N° Institution (3 chiffres)</label>
                            <input type="text" id="client-institution" value="${c.institution || ''}" maxlength="3" placeholder="000">
                        </div>
                        <div class="form-group">
                            <label>N° Transit (5 chiffres)</label>
                            <input type="text" id="client-transit" value="${c.transit || ''}" maxlength="5" placeholder="00000">
                        </div>
                        <div class="form-group">
                            <label>N° Compte</label>
                            <input type="text" id="client-compteBank" value="${c.compteBank || ''}" placeholder="0000000">
                        </div>
                    </div>
                </div>

                <!-- Onglet Comptabilité -->
                <div id="client-tab-comptabilite" class="client-tab-content" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Conditions de paiement</label>
                            <select id="client-conditions">
                                <option value="immediat" ${c.conditions === 'immediat' ? 'selected' : ''}>Paiement immédiat</option>
                                <option value="net15" ${c.conditions === 'net15' ? 'selected' : ''}>Net 15 jours</option>
                                <option value="net30" ${c.conditions === 'net30' ? 'selected' : ''}>Net 30 jours</option>
                                <option value="net45" ${c.conditions === 'net45' ? 'selected' : ''}>Net 45 jours</option>
                                <option value="net60" ${c.conditions === 'net60' ? 'selected' : ''}>Net 60 jours</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Limite de crédit ($)</label>
                            <input type="number" id="client-limiteCredit" value="${c.limiteCredit || 0}" min="0" step="100">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Escompte (%)</label>
                            <input type="number" id="client-escompte" value="${c.escompte || 0}" min="0" max="100" step="0.5">
                        </div>
                        <div class="form-group">
                            <label>Devise</label>
                            <select id="client-devise">
                                <option value="CAD" ${c.devise === 'CAD' ? 'selected' : ''}>CAD - Dollar canadien</option>
                                <option value="USD" ${c.devise === 'USD' ? 'selected' : ''}>USD - Dollar américain</option>
                                <option value="EUR" ${c.devise === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Compte à recevoir</label>
                            <select id="client-compte">
                                ${Compte.genererOptions('actif', c.compteRecevoir)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Compte de revenu par défaut</label>
                            <select id="client-compteRevenu">
                                ${Compte.genererOptionsGroupees(c.compteRevenu || '4000')}
                            </select>
                        </div>
                    </div>
                </div>

                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde les modifications d'un client
     */
    sauvegarderModifClient(event, id) {
        event.preventDefault();

        try {
            Client.modifier(id, {
                nom: document.getElementById('client-nom').value,
                type: document.getElementById('client-type').value,
                contact: document.getElementById('client-contact').value,
                telephone: document.getElementById('client-telephone').value,
                courriel: document.getElementById('client-courriel').value,
                telecopieur: document.getElementById('client-telecopieur').value,
                siteWeb: document.getElementById('client-siteweb').value,
                notes: document.getElementById('client-notes').value,
                // Adresse
                adresse: document.getElementById('client-adresse').value,
                ville: document.getElementById('client-ville').value,
                province: document.getElementById('client-province').value,
                codePostal: document.getElementById('client-codePostal').value,
                pays: document.getElementById('client-pays').value,
                // Taxes
                numeroTPS: document.getElementById('client-numeroTPS').value,
                numeroTVQ: document.getElementById('client-numeroTVQ').value,
                // Bancaire
                banque: document.getElementById('client-banque').value,
                institution: document.getElementById('client-institution').value,
                transit: document.getElementById('client-transit').value,
                compteBank: document.getElementById('client-compteBank').value,
                // Comptabilité
                conditions: document.getElementById('client-conditions').value,
                limiteCredit: document.getElementById('client-limiteCredit').value,
                escompte: document.getElementById('client-escompte').value,
                devise: document.getElementById('client-devise').value,
                compteRecevoir: document.getElementById('client-compte').value,
                compteRevenu: document.getElementById('client-compteRevenu').value
            });

            App.fermerModal();
            App.notification('Client modifié avec succès', 'success');
            document.getElementById('tab-clients').innerHTML = this.renderClients();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Supprime un client
     */
    supprimerClient(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client?')) return;

        try {
            Client.supprimer(id);
            App.notification('Client supprimé', 'success');
            document.getElementById('tab-clients').innerHTML = this.renderClients();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render le formulaire nouvelle facture
     */
    renderNouvelleFacture() {
        const aujourdhui = Storage.aujourdhui();

        return `
            <div class="ecritures-form">
                <h3>Nouvelle facture client</h3>

                <div class="form-row-3">
                    <div class="form-group">
                        <label>Client *</label>
                        <select id="facture-client" required onchange="Ventes.clientChange()">
                            ${Client.genererOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="facture-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Numéro</label>
                        <input type="text" id="facture-numero" value="${Facture.genererNumero()}" readonly>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Projet</label>
                        <select id="facture-projet">
                            ${Projet.genererOptions()}
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin: 15px 0;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="facture-avec-taxes" checked onchange="Ventes.calculerTotauxFacture()">
                        Appliquer les taxes (TPS/TVQ)
                    </label>
                </div>

                <h4>Lignes de facture</h4>
                <div id="lignes-facture-vente">
                    <!-- Lignes ajoutées dynamiquement -->
                </div>

                <button type="button" class="btn btn-secondary" onclick="Ventes.ajouterLigneFacture()">
                    + Ajouter une ligne
                </button>

                <div class="form-group" style="margin-top: 20px;">
                    <label>Notes</label>
                    <textarea id="facture-notes" rows="2"></textarea>
                </div>

                <div id="totaux-facture-vente" style="text-align: right; margin-top: 20px; font-size: 16px;">
                    <p>Sous-total: <strong id="facture-sous-total">0,00 $</strong></p>
                    <p>TPS: <strong id="facture-tps">0,00 $</strong></p>
                    <p>TVQ: <strong id="facture-tvq">0,00 $</strong></p>
                    <p style="font-size: 20px;">Total: <strong id="facture-total">0,00 $</strong></p>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="Ventes.reinitialiserFacture()">Réinitialiser</button>
                    <button type="button" class="btn btn-primary" onclick="Ventes.enregistrerFacture()">Créer la facture</button>
                </div>
            </div>
        `;
    },

    /**
     * Appelé quand le client change
     */
    clientChange() {
        // Peut être utilisé pour charger les infos du client
    },

    /**
     * Ajoute une ligne de facture
     */
    ajouterLigneFacture() {
        const container = document.getElementById('lignes-facture-vente');
        const index = container.children.length;

        const ligne = document.createElement('div');
        ligne.className = 'ligne-ecriture';
        ligne.style.gridTemplateColumns = '2fr 80px 120px 120px auto';
        ligne.innerHTML = `
            <input type="text" id="ligne-desc-${index}" placeholder="Description">
            <input type="number" id="ligne-qte-${index}" placeholder="Qté" value="1" min="1" step="1"
                onchange="Ventes.calculerTotauxFacture()" oninput="Ventes.calculerTotauxFacture()">
            <input type="number" id="ligne-prix-${index}" placeholder="Prix unit." step="0.01" min="0"
                onchange="Ventes.calculerTotauxFacture()" oninput="Ventes.calculerTotauxFacture()">
            <select id="ligne-compte-${index}">
                ${Compte.genererOptions('revenus', '4000')}
            </select>
            <button type="button" class="btn-supprimer-ligne" onclick="Ventes.supprimerLigneFacture(this)">×</button>
        `;

        container.appendChild(ligne);

        if (container.children.length === 1) {
            this.calculerTotauxFacture();
        }
    },

    /**
     * Supprime une ligne de facture
     */
    supprimerLigneFacture(btn) {
        const container = document.getElementById('lignes-facture-vente');
        if (container.children.length > 1) {
            btn.parentElement.remove();
            this.calculerTotauxFacture();
        }
    },

    /**
     * Calcule les totaux de la facture
     */
    calculerTotauxFacture() {
        const container = document.getElementById('lignes-facture-vente');
        const taxes = Storage.get('taxes');
        const avecTaxes = document.getElementById('facture-avec-taxes')?.checked;
        let sousTotal = 0;

        Array.from(container.children).forEach((ligne, index) => {
            const qte = parseFloat(document.getElementById(`ligne-qte-${index}`)?.value) || 0;
            const prix = parseFloat(document.getElementById(`ligne-prix-${index}`)?.value) || 0;
            sousTotal += qte * prix;
        });

        let tps = 0, tvq = 0;
        if (avecTaxes && taxes.appliquerTaxes) {
            tps = sousTotal * (taxes.tps / 100);
            tvq = sousTotal * (taxes.tvq / 100);
        }

        const total = sousTotal + tps + tvq;

        document.getElementById('facture-sous-total').textContent = Transaction.formaterMontant(sousTotal);
        document.getElementById('facture-tps').textContent = Transaction.formaterMontant(tps);
        document.getElementById('facture-tvq').textContent = Transaction.formaterMontant(tvq);
        document.getElementById('facture-total').textContent = Transaction.formaterMontant(total);
    },

    /**
     * Réinitialise le formulaire de facture
     */
    reinitialiserFacture() {
        document.getElementById('tab-nouvelle-facture').innerHTML = this.renderNouvelleFacture();
        this.ajouterLigneFacture();
    },

    /**
     * Enregistre la facture
     */
    enregistrerFacture() {
        const clientId = document.getElementById('facture-client').value;
        const date = document.getElementById('facture-date').value;

        if (!clientId) {
            App.notification('Veuillez sélectionner un client', 'warning');
            return;
        }

        const container = document.getElementById('lignes-facture-vente');
        const lignes = [];

        Array.from(container.children).forEach((ligne, index) => {
            const description = document.getElementById(`ligne-desc-${index}`)?.value;
            const quantite = parseFloat(document.getElementById(`ligne-qte-${index}`)?.value) || 0;
            const prixUnitaire = parseFloat(document.getElementById(`ligne-prix-${index}`)?.value) || 0;
            const compte = document.getElementById(`ligne-compte-${index}`)?.value;

            if (description && quantite > 0 && prixUnitaire > 0) {
                lignes.push({ description, quantite, prixUnitaire, compte });
            }
        });

        if (lignes.length === 0) {
            App.notification('Veuillez ajouter au moins une ligne valide', 'warning');
            return;
        }

        const avecTaxes = document.getElementById('facture-avec-taxes')?.checked;

        const projetId = document.getElementById('facture-projet')?.value || null;

        try {
            const facture = Facture.creerVente({
                clientId,
                date,
                lignes,
                projetId,
                avecTaxes: avecTaxes,
                notes: document.getElementById('facture-notes').value
            });

            App.notification('Facture ' + facture.numero + ' créée avec succès', 'success');
            this.afficherOnglet('factures');
            document.getElementById('tab-factures').innerHTML = this.renderFactures();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    }
};

// Initialiser avec une ligne
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('lignes-facture-vente');
    if (container && container.children.length === 0) {
        Ventes.ajouterLigneFacture();
    }
});
