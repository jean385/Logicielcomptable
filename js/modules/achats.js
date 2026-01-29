/**
 * Module Achats
 * Gestion des fournisseurs et factures d'achat
 */

const Achats = {
    /**
     * Affiche le module achats
     */
    afficher() {
        App.afficherPage('module-achats');

        const container = document.getElementById('module-achats');
        container.innerHTML = `
            <div class="module-header">
                <h1>Achats</h1>
                <button class="btn-retour" onclick="App.retourAccueil()">
                    ← Retour
                </button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Achats.afficherOnglet('factures')">Factures</button>
                <button class="tab" onclick="Achats.afficherOnglet('fournisseurs')">Fournisseurs</button>
                <button class="tab" onclick="Achats.afficherOnglet('nouvelle-facture')">Nouvelle facture</button>
            </div>

            <div id="tab-factures-achat" class="tab-content active">
                ${this.renderFactures()}
            </div>

            <div id="tab-fournisseurs" class="tab-content">
                ${this.renderFournisseurs()}
            </div>

            <div id="tab-nouvelle-facture-achat" class="tab-content">
                ${this.renderNouvelleFacture()}
            </div>
        `;
    },

    /**
     * Affiche un onglet
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-achats .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-achats .tab-content').forEach(c => c.classList.remove('active'));

        const tabMap = {
            'factures': 'tab-factures-achat',
            'fournisseurs': 'tab-fournisseurs',
            'nouvelle-facture': 'tab-nouvelle-facture-achat'
        };

        document.querySelector(`#module-achats [onclick="Achats.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById(tabMap[onglet]).classList.add('active');

        // Rafraîchir le contenu selon l'onglet
        if (onglet === 'factures') {
            document.getElementById('tab-factures-achat').innerHTML = this.renderFactures();
        } else if (onglet === 'fournisseurs') {
            document.getElementById('tab-fournisseurs').innerHTML = this.renderFournisseurs();
        } else if (onglet === 'nouvelle-facture') {
            document.getElementById('tab-nouvelle-facture-achat').innerHTML = this.renderNouvelleFacture();
            this.ajouterLigneFacture();
        }
    },

    /**
     * Render la liste des factures d'achat
     */
    renderFactures() {
        const factures = Facture.getAchats();

        let tableRows = '';
        factures.forEach(f => {
            const solde = f.total - f.montantPaye;
            const projet = f.projetId ? Projet.getById(f.projetId) : null;
            tableRows += `
                <tr>
                    <td>${f.numeroInterne}</td>
                    <td>${f.numero}</td>
                    <td>${f.date}</td>
                    <td>${f.fournisseurNom}</td>
                    <td>${projet ? (projet.code || projet.nom) : '-'}</td>
                    <td>${f.echeance}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.total)}</td>
                    <td class="text-right">${Transaction.formaterMontant(solde)}</td>
                    <td class="text-center">
                        <span class="badge ${Facture.getStatutClasse(f.statut)}">${Facture.getStatutLibelle(f.statut)}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Achats.voirFacture('${f.id}')">Voir</button>
                        ${f.statut !== 'annulee' && f.montantPaye === 0 ? `
                            <button class="btn btn-danger" onclick="Achats.annulerFacture('${f.id}')">Annuler</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        return `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Total factures</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + (f.statut !== 'annulee' ? f.total : 0), 0))}</p>
                </div>
                <div class="info-card">
                    <h4>Payé</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + f.montantPaye, 0))}</p>
                </div>
                <div class="info-card">
                    <h4>À payer</h4>
                    <p>${Transaction.formaterMontant(factures.reduce((s, f) => s + (f.statut !== 'annulee' ? f.total - f.montantPaye : 0), 0))}</p>
                </div>
            </div>

            <div class="toolbar">
                <select id="filtre-statut-achat" onchange="Achats.filtrerFactures()">
                    <option value="">Tous les statuts</option>
                    <option value="impayee">Impayées</option>
                    <option value="partielle">Partiellement payées</option>
                    <option value="payee">Payées</option>
                    <option value="annulee">Annulées</option>
                </select>
                <input type="text" class="search-input" placeholder="Rechercher..."
                    onkeyup="Achats.rechercherFactures(this.value)">
            </div>

            <div class="table-container">
                <table id="table-factures-achat">
                    <thead>
                        <tr>
                            <th>N° Interne</th>
                            <th>N° Fournisseur</th>
                            <th>Date</th>
                            <th>Fournisseur</th>
                            <th>Projet</th>
                            <th>Échéance</th>
                            <th class="text-right">Total</th>
                            <th class="text-right">Solde</th>
                            <th class="text-center">Statut</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="10" class="text-center">Aucune facture</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Filtre les factures
     */
    filtrerFactures() {
        const statut = document.getElementById('filtre-statut-achat').value;
        const rows = document.querySelectorAll('#table-factures-achat tbody tr');

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
        const rows = document.querySelectorAll('#table-factures-achat tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Affiche une facture
     */
    voirFacture(id) {
        const facture = Facture.getById(id);
        if (!facture) return;

        let lignesHtml = '';
        facture.lignes.forEach(l => {
            const compte = Compte.getByNumero(l.compte);
            lignesHtml += `
                <tr>
                    <td>${l.description}</td>
                    <td>${compte ? compte.nom : l.compte}</td>
                    <td class="text-center">${l.quantite}</td>
                    <td class="text-right">${Transaction.formaterMontant(l.prixUnitaire)}</td>
                    <td class="text-right">${Transaction.formaterMontant(l.sousTotal)}</td>
                </tr>
            `;
        });

        let paiementsHtml = '';
        if (facture.paiements && facture.paiements.length > 0) {
            paiementsHtml = `
                <h4 style="margin-top: 20px;">Paiements effectués</h4>
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

        App.ouvrirModal('Facture d\'achat ' + facture.numeroInterne, `
            <div class="rapport-container" style="box-shadow: none;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                        <strong>Fournisseur:</strong> ${facture.fournisseurNom}<br>
                        <strong>N° facture fournisseur:</strong> ${facture.numero}<br>
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
                            <th>Compte</th>
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
                            <td colspan="4" class="text-right"><strong>Sous-total:</strong></td>
                            <td class="text-right">${Transaction.formaterMontant(facture.sousTotal)}</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-right">TPS:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.tps)}</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-right">TVQ:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.tvq)}</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-right"><strong>Total:</strong></td>
                            <td class="text-right"><strong>${Transaction.formaterMontant(facture.total)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-right">Payé:</td>
                            <td class="text-right">${Transaction.formaterMontant(facture.montantPaye)}</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-right"><strong>Solde dû:</strong></td>
                            <td class="text-right"><strong>${Transaction.formaterMontant(facture.total - facture.montantPaye)}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                ${paiementsHtml}

                ${facture.notes ? `<p style="margin-top: 20px;"><strong>Notes:</strong> ${facture.notes}</p>` : ''}
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
            document.getElementById('tab-factures-achat').innerHTML = this.renderFactures();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render la liste des fournisseurs
     */
    renderFournisseurs() {
        const fournisseurs = Fournisseur.getAll();

        let tableRows = '';
        fournisseurs.forEach(f => {
            tableRows += `
                <tr>
                    <td>
                        <strong>${f.nom}</strong>
                        ${f.contact ? `<br><small class="text-light">${f.contact}</small>` : ''}
                    </td>
                    <td><span class="badge badge-info">${Fournisseur.getTypeLibelle(f.type || 'autre')}</span></td>
                    <td>${f.telephone || '-'}</td>
                    <td>${f.courriel || '-'}</td>
                    <td class="text-right">${Transaction.formaterMontant(f.solde)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Achats.voirFournisseur('${f.id}')">Voir</button>
                        <button class="btn btn-secondary" onclick="Achats.modifierFournisseur('${f.id}')">Modifier</button>
                        ${f.solde === 0 ? `<button class="btn btn-danger" onclick="Achats.supprimerFournisseur('${f.id}')">Suppr</button>` : ''}
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Achats.nouveauFournisseur()">+ Nouveau fournisseur</button>
                <input type="text" class="search-input" placeholder="Rechercher..."
                    onkeyup="Achats.rechercherFournisseurs(this.value)">
            </div>

            <div class="table-container">
                <table id="table-fournisseurs">
                    <thead>
                        <tr>
                            <th>Fournisseur</th>
                            <th>Type</th>
                            <th>Téléphone</th>
                            <th>Courriel</th>
                            <th class="text-right">Solde</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucun fournisseur</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Affiche les détails d'un fournisseur
     */
    voirFournisseur(id) {
        const f = Fournisseur.getById(id);
        if (!f) return;

        const adresseComplete = [f.adresse, f.ville, f.province, f.codePostal, f.pays]
            .filter(x => x).join(', ');

        App.ouvrirModal('Fournisseur: ' + f.nom, `
            <div class="info-cards" style="margin-bottom: 20px;">
                <div class="info-card">
                    <h4>Solde dû</h4>
                    <p>${Transaction.formaterMontant(f.solde)}</p>
                </div>
                <div class="info-card">
                    <h4>Type</h4>
                    <p>${Fournisseur.getTypeLibelle(f.type)}</p>
                </div>
                <div class="info-card">
                    <h4>Conditions</h4>
                    <p>${Fournisseur.getConditionsLibelle(f.conditions)}</p>
                </div>
            </div>

            <div class="form-row">
                <div>
                    <h4>Contact</h4>
                    <p>${f.contact || '-'}</p>
                    <p>${f.telephone || ''} ${f.telecopieur ? '| Fax: ' + f.telecopieur : ''}</p>
                    <p>${f.courriel || ''}</p>
                    ${f.siteWeb ? `<p><a href="${f.siteWeb}" target="_blank">${f.siteWeb}</a></p>` : ''}
                </div>
                <div>
                    <h4>Adresse</h4>
                    <p>${adresseComplete || '-'}</p>
                </div>
            </div>

            <div class="form-row" style="margin-top: 20px;">
                <div>
                    <h4>Numéros de taxes</h4>
                    <p>TPS: ${f.numeroTPS || '-'}</p>
                    <p>TVQ: ${f.numeroTVQ || '-'}</p>
                </div>
                <div>
                    <h4>Informations bancaires</h4>
                    <p>Banque: ${f.banque || '-'}</p>
                    <p>Institution: ${f.institution || '-'} | Transit: ${f.transit || '-'}</p>
                    <p>Compte: ${f.compteBank || '-'}</p>
                </div>
            </div>

            ${f.notes ? `<div style="margin-top: 20px;"><h4>Notes</h4><p>${f.notes}</p></div>` : ''}

            <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary" onclick="App.fermerModal()">Fermer</button>
                <button class="btn btn-primary" onclick="App.fermerModal(); Achats.modifierFournisseur('${f.id}')">Modifier</button>
            </div>
        `);
    },

    /**
     * Recherche fournisseurs
     */
    rechercherFournisseurs(terme) {
        const termeLower = terme.toLowerCase();
        const rows = document.querySelectorAll('#table-fournisseurs tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Génère les options de types de fournisseur
     */
    genererOptionsTypes(valeur = '') {
        return Fournisseur.getTypes().map(t =>
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
     * Nouveau fournisseur
     */
    nouveauFournisseur() {
        App.ouvrirModal('Nouveau fournisseur', `
            <form id="form-fournisseur" onsubmit="Achats.sauvegarderFournisseur(event)">
                <div class="tabs" style="margin-bottom: 20px;">
                    <button type="button" class="tab active" onclick="Achats.ongletFournisseur('general', this)">Général</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('adresse', this)">Adresse</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('taxes', this)">Taxes</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('bancaire', this)">Bancaire</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('comptabilite', this)">Comptabilité</button>
                </div>

                <!-- Onglet Général -->
                <div id="fourn-tab-general" class="fourn-tab-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du fournisseur *</label>
                            <input type="text" id="fourn-nom" required>
                        </div>
                        <div class="form-group">
                            <label>Type de fournisseur</label>
                            <select id="fourn-type">
                                ${this.genererOptionsTypes()}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Personne contact</label>
                            <input type="text" id="fourn-contact">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="fourn-telephone">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="fourn-courriel">
                        </div>
                        <div class="form-group">
                            <label>Télécopieur</label>
                            <input type="tel" id="fourn-telecopieur">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Site web</label>
                        <input type="url" id="fourn-siteweb" placeholder="https://">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="fourn-notes" rows="2"></textarea>
                    </div>
                </div>

                <!-- Onglet Adresse -->
                <div id="fourn-tab-adresse" class="fourn-tab-content" style="display: none;">
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="fourn-adresse" placeholder="Numéro et rue">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="fourn-ville">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <select id="fourn-province">
                                ${this.genererOptionsProvinces()}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="fourn-codePostal" placeholder="A1A 1A1">
                        </div>
                        <div class="form-group">
                            <label>Pays</label>
                            <input type="text" id="fourn-pays" value="Canada">
                        </div>
                    </div>
                </div>

                <!-- Onglet Taxes -->
                <div id="fourn-tab-taxes" class="fourn-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Ces numéros sont utilisés pour la validation des crédits de taxes sur intrants (CTI/RTI).
                    </div>
                    <div class="form-group">
                        <label>Numéro de TPS</label>
                        <input type="text" id="fourn-numeroTPS" placeholder="123456789 RT0001">
                    </div>
                    <div class="form-group">
                        <label>Numéro de TVQ</label>
                        <input type="text" id="fourn-numeroTVQ" placeholder="1234567890 TQ0001">
                    </div>
                </div>

                <!-- Onglet Bancaire -->
                <div id="fourn-tab-bancaire" class="fourn-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Informations pour les paiements par virement ou dépôt direct.
                    </div>
                    <div class="form-group">
                        <label>Nom de la banque</label>
                        <input type="text" id="fourn-banque">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>N° Institution (3 chiffres)</label>
                            <input type="text" id="fourn-institution" maxlength="3" placeholder="000">
                        </div>
                        <div class="form-group">
                            <label>N° Transit (5 chiffres)</label>
                            <input type="text" id="fourn-transit" maxlength="5" placeholder="00000">
                        </div>
                        <div class="form-group">
                            <label>N° Compte</label>
                            <input type="text" id="fourn-compteBank" placeholder="0000000">
                        </div>
                    </div>
                </div>

                <!-- Onglet Comptabilité -->
                <div id="fourn-tab-comptabilite" class="fourn-tab-content" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Conditions de paiement</label>
                            <select id="fourn-conditions">
                                <option value="immediat">Paiement immédiat</option>
                                <option value="net15">Net 15 jours</option>
                                <option value="net30" selected>Net 30 jours</option>
                                <option value="net45">Net 45 jours</option>
                                <option value="net60">Net 60 jours</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Limite de crédit ($)</label>
                            <input type="number" id="fourn-limiteCredit" value="0" min="0" step="100">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Devise</label>
                            <select id="fourn-devise">
                                <option value="CAD" selected>CAD - Dollar canadien</option>
                                <option value="USD">USD - Dollar américain</option>
                                <option value="EUR">EUR - Euro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Compte fournisseur</label>
                            <select id="fourn-compte">
                                ${Compte.genererOptions('passif', '2100')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Compte de dépense par défaut</label>
                        <select id="fourn-compte-depense">
                            ${Compte.genererOptionsGroupees('5990')}
                        </select>
                    </div>
                </div>

                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer le fournisseur</button>
                </div>
            </form>
        `);
    },

    /**
     * Gère les onglets du formulaire fournisseur
     */
    ongletFournisseur(onglet, btn) {
        // Cacher tous les contenus
        document.querySelectorAll('.fourn-tab-content').forEach(el => el.style.display = 'none');
        // Désactiver tous les onglets
        document.querySelectorAll('#form-fournisseur .tab, #form-fournisseur-edit .tab').forEach(el => el.classList.remove('active'));

        // Afficher le contenu sélectionné
        document.getElementById('fourn-tab-' + onglet).style.display = 'block';
        // Activer l'onglet
        if (btn) btn.classList.add('active');
    },

    /**
     * Sauvegarde un fournisseur
     */
    sauvegarderFournisseur(event) {
        event.preventDefault();

        try {
            Fournisseur.creer({
                nom: document.getElementById('fourn-nom').value,
                type: document.getElementById('fourn-type').value,
                contact: document.getElementById('fourn-contact').value,
                telephone: document.getElementById('fourn-telephone').value,
                courriel: document.getElementById('fourn-courriel').value,
                telecopieur: document.getElementById('fourn-telecopieur').value,
                siteWeb: document.getElementById('fourn-siteweb').value,
                notes: document.getElementById('fourn-notes').value,
                // Adresse
                adresse: document.getElementById('fourn-adresse').value,
                ville: document.getElementById('fourn-ville').value,
                province: document.getElementById('fourn-province').value,
                codePostal: document.getElementById('fourn-codePostal').value,
                pays: document.getElementById('fourn-pays').value,
                // Taxes
                numeroTPS: document.getElementById('fourn-numeroTPS').value,
                numeroTVQ: document.getElementById('fourn-numeroTVQ').value,
                // Bancaire
                banque: document.getElementById('fourn-banque').value,
                institution: document.getElementById('fourn-institution').value,
                transit: document.getElementById('fourn-transit').value,
                compteBank: document.getElementById('fourn-compteBank').value,
                // Comptabilité
                conditions: document.getElementById('fourn-conditions').value,
                limiteCredit: document.getElementById('fourn-limiteCredit').value,
                devise: document.getElementById('fourn-devise').value,
                compteFournisseur: document.getElementById('fourn-compte').value,
                compteDepense: document.getElementById('fourn-compte-depense').value
            });

            App.fermerModal();
            App.notification('Fournisseur créé avec succès', 'success');
            document.getElementById('tab-fournisseurs').innerHTML = this.renderFournisseurs();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Modifie un fournisseur
     */
    modifierFournisseur(id) {
        const f = Fournisseur.getById(id);
        if (!f) return;

        App.ouvrirModal('Modifier le fournisseur', `
            <form id="form-fournisseur-edit" onsubmit="Achats.sauvegarderModifFournisseur(event, '${id}')">
                <div class="tabs" style="margin-bottom: 20px;">
                    <button type="button" class="tab active" onclick="Achats.ongletFournisseur('general', this)">Général</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('adresse', this)">Adresse</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('taxes', this)">Taxes</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('bancaire', this)">Bancaire</button>
                    <button type="button" class="tab" onclick="Achats.ongletFournisseur('comptabilite', this)">Comptabilité</button>
                </div>

                <!-- Onglet Général -->
                <div id="fourn-tab-general" class="fourn-tab-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom du fournisseur *</label>
                            <input type="text" id="fourn-nom" value="${f.nom}" required>
                        </div>
                        <div class="form-group">
                            <label>Type de fournisseur</label>
                            <select id="fourn-type">
                                ${this.genererOptionsTypes(f.type)}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Personne contact</label>
                            <input type="text" id="fourn-contact" value="${f.contact || ''}">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="fourn-telephone" value="${f.telephone || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="fourn-courriel" value="${f.courriel || ''}">
                        </div>
                        <div class="form-group">
                            <label>Télécopieur</label>
                            <input type="tel" id="fourn-telecopieur" value="${f.telecopieur || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Site web</label>
                        <input type="url" id="fourn-siteweb" value="${f.siteWeb || ''}" placeholder="https://">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="fourn-notes" rows="2">${f.notes || ''}</textarea>
                    </div>
                </div>

                <!-- Onglet Adresse -->
                <div id="fourn-tab-adresse" class="fourn-tab-content" style="display: none;">
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="fourn-adresse" value="${f.adresse || ''}" placeholder="Numéro et rue">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="fourn-ville" value="${f.ville || ''}">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <select id="fourn-province">
                                ${this.genererOptionsProvinces(f.province)}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="fourn-codePostal" value="${f.codePostal || ''}" placeholder="A1A 1A1">
                        </div>
                        <div class="form-group">
                            <label>Pays</label>
                            <input type="text" id="fourn-pays" value="${f.pays || 'Canada'}">
                        </div>
                    </div>
                </div>

                <!-- Onglet Taxes -->
                <div id="fourn-tab-taxes" class="fourn-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Ces numéros sont utilisés pour la validation des crédits de taxes sur intrants (CTI/RTI).
                    </div>
                    <div class="form-group">
                        <label>Numéro de TPS</label>
                        <input type="text" id="fourn-numeroTPS" value="${f.numeroTPS || ''}" placeholder="123456789 RT0001">
                    </div>
                    <div class="form-group">
                        <label>Numéro de TVQ</label>
                        <input type="text" id="fourn-numeroTVQ" value="${f.numeroTVQ || ''}" placeholder="1234567890 TQ0001">
                    </div>
                </div>

                <!-- Onglet Bancaire -->
                <div id="fourn-tab-bancaire" class="fourn-tab-content" style="display: none;">
                    <div class="alert alert-info">
                        Informations pour les paiements par virement ou dépôt direct.
                    </div>
                    <div class="form-group">
                        <label>Nom de la banque</label>
                        <input type="text" id="fourn-banque" value="${f.banque || ''}">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>N° Institution (3 chiffres)</label>
                            <input type="text" id="fourn-institution" value="${f.institution || ''}" maxlength="3" placeholder="000">
                        </div>
                        <div class="form-group">
                            <label>N° Transit (5 chiffres)</label>
                            <input type="text" id="fourn-transit" value="${f.transit || ''}" maxlength="5" placeholder="00000">
                        </div>
                        <div class="form-group">
                            <label>N° Compte</label>
                            <input type="text" id="fourn-compteBank" value="${f.compteBank || ''}" placeholder="0000000">
                        </div>
                    </div>
                </div>

                <!-- Onglet Comptabilité -->
                <div id="fourn-tab-comptabilite" class="fourn-tab-content" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Conditions de paiement</label>
                            <select id="fourn-conditions">
                                <option value="immediat" ${f.conditions === 'immediat' ? 'selected' : ''}>Paiement immédiat</option>
                                <option value="net15" ${f.conditions === 'net15' ? 'selected' : ''}>Net 15 jours</option>
                                <option value="net30" ${f.conditions === 'net30' ? 'selected' : ''}>Net 30 jours</option>
                                <option value="net45" ${f.conditions === 'net45' ? 'selected' : ''}>Net 45 jours</option>
                                <option value="net60" ${f.conditions === 'net60' ? 'selected' : ''}>Net 60 jours</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Limite de crédit ($)</label>
                            <input type="number" id="fourn-limiteCredit" value="${f.limiteCredit || 0}" min="0" step="100">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Devise</label>
                            <select id="fourn-devise">
                                <option value="CAD" ${f.devise === 'CAD' ? 'selected' : ''}>CAD - Dollar canadien</option>
                                <option value="USD" ${f.devise === 'USD' ? 'selected' : ''}>USD - Dollar américain</option>
                                <option value="EUR" ${f.devise === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Compte fournisseur</label>
                            <select id="fourn-compte">
                                ${Compte.genererOptions('passif', f.compteFournisseur)}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Compte de dépense par défaut</label>
                        <select id="fourn-compte-depense">
                            ${Compte.genererOptionsGroupees(f.compteDepense)}
                        </select>
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
     * Sauvegarde les modifications
     */
    sauvegarderModifFournisseur(event, id) {
        event.preventDefault();

        try {
            Fournisseur.modifier(id, {
                nom: document.getElementById('fourn-nom').value,
                type: document.getElementById('fourn-type').value,
                contact: document.getElementById('fourn-contact').value,
                telephone: document.getElementById('fourn-telephone').value,
                courriel: document.getElementById('fourn-courriel').value,
                telecopieur: document.getElementById('fourn-telecopieur').value,
                siteWeb: document.getElementById('fourn-siteweb').value,
                notes: document.getElementById('fourn-notes').value,
                // Adresse
                adresse: document.getElementById('fourn-adresse').value,
                ville: document.getElementById('fourn-ville').value,
                province: document.getElementById('fourn-province').value,
                codePostal: document.getElementById('fourn-codePostal').value,
                pays: document.getElementById('fourn-pays').value,
                // Taxes
                numeroTPS: document.getElementById('fourn-numeroTPS').value,
                numeroTVQ: document.getElementById('fourn-numeroTVQ').value,
                // Bancaire
                banque: document.getElementById('fourn-banque').value,
                institution: document.getElementById('fourn-institution').value,
                transit: document.getElementById('fourn-transit').value,
                compteBank: document.getElementById('fourn-compteBank').value,
                // Comptabilité
                conditions: document.getElementById('fourn-conditions').value,
                limiteCredit: document.getElementById('fourn-limiteCredit').value,
                devise: document.getElementById('fourn-devise').value,
                compteFournisseur: document.getElementById('fourn-compte').value,
                compteDepense: document.getElementById('fourn-compte-depense').value
            });

            App.fermerModal();
            App.notification('Fournisseur modifié avec succès', 'success');
            document.getElementById('tab-fournisseurs').innerHTML = this.renderFournisseurs();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Supprime un fournisseur
     */
    supprimerFournisseur(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur?')) return;

        try {
            Fournisseur.supprimer(id);
            App.notification('Fournisseur supprimé', 'success');
            document.getElementById('tab-fournisseurs').innerHTML = this.renderFournisseurs();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render formulaire nouvelle facture achat
     */
    renderNouvelleFacture() {
        const aujourdhui = new Date().toISOString().split('T')[0];

        return `
            <div class="ecritures-form">
                <h3>Nouvelle facture fournisseur</h3>

                <div class="form-row">
                    <div class="form-group">
                        <label>Fournisseur *</label>
                        <select id="achat-fournisseur" required onchange="Achats.fournisseurChange()">
                            ${Fournisseur.genererOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>N° facture fournisseur *</label>
                        <input type="text" id="achat-numero" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Projet</label>
                        <select id="achat-projet">
                            ${Projet.genererOptions()}
                        </select>
                    </div>
                </div>

                <div class="form-row-3">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="achat-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Contre-partie (crédit)</label>
                        <select id="achat-compte-contrepartie">
                            <option value="2100">2100 - Comptes fournisseurs</option>
                            <option value="1000">1000 - Encaisse (payé comptant)</option>
                            <option value="3200">3200 - Apports (payé personnellement)</option>
                            ${Compte.genererOptionsGroupees()}
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end; padding-bottom: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                            <input type="checkbox" id="achat-avec-taxes" checked onchange="Achats.calculerTotauxFacture()">
                            Appliquer les taxes (TPS/TVQ)
                        </label>
                    </div>
                </div>

                <h4>Lignes de facture</h4>
                <div id="lignes-facture-achat">
                    <!-- Lignes ajoutées dynamiquement -->
                </div>

                <button type="button" class="btn btn-secondary" onclick="Achats.ajouterLigneFacture()">
                    + Ajouter une ligne
                </button>

                <div class="form-group" style="margin-top: 20px;">
                    <label>Notes</label>
                    <textarea id="achat-notes" rows="2"></textarea>
                </div>

                <div id="totaux-facture-achat" style="text-align: right; margin-top: 20px; font-size: 16px;">
                    <p>Sous-total: <strong id="achat-sous-total">0,00 $</strong></p>
                    <p>TPS: <strong id="achat-tps">0,00 $</strong></p>
                    <p>TVQ: <strong id="achat-tvq">0,00 $</strong></p>
                    <p style="font-size: 20px;">Total: <strong id="achat-total">0,00 $</strong></p>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="Achats.reinitialiserFacture()">Réinitialiser</button>
                    <button type="button" class="btn btn-primary" onclick="Achats.enregistrerFacture()">Créer la facture</button>
                </div>
            </div>
        `;
    },

    /**
     * Appelé quand le fournisseur change
     */
    fournisseurChange() {
        const fournisseurId = document.getElementById('achat-fournisseur').value;
        if (fournisseurId) {
            const fournisseur = Fournisseur.getById(fournisseurId);
            if (fournisseur && fournisseur.compteDepense) {
                // Mettre à jour toutes les lignes existantes avec le compte du fournisseur
                const selects = document.querySelectorAll('[id^="ligne-compte-achat-"]');
                selects.forEach(select => {
                    select.value = fournisseur.compteDepense;
                });
            }
        }
    },

    /**
     * Retourne le compte de dépense par défaut du fournisseur sélectionné
     */
    getCompteDepenseFournisseur() {
        const fournisseurId = document.getElementById('achat-fournisseur')?.value;
        if (fournisseurId) {
            const fournisseur = Fournisseur.getById(fournisseurId);
            if (fournisseur && fournisseur.compteDepense) {
                return fournisseur.compteDepense;
            }
        }
        return '5990';
    },

    /**
     * Ajoute une ligne de facture
     */
    ajouterLigneFacture() {
        const container = document.getElementById('lignes-facture-achat');
        const index = container.children.length;
        const compteDefaut = this.getCompteDepenseFournisseur();

        const ligne = document.createElement('div');
        ligne.className = 'ligne-ecriture';
        ligne.style.gridTemplateColumns = '2fr 80px 120px 150px auto';
        ligne.innerHTML = `
            <input type="text" id="ligne-desc-achat-${index}" placeholder="Description">
            <input type="number" id="ligne-qte-achat-${index}" placeholder="Qté" value="1" min="1" step="1"
                onchange="Achats.calculerTotauxFacture()" oninput="Achats.calculerTotauxFacture()">
            <input type="number" id="ligne-prix-achat-${index}" placeholder="Prix unit." step="0.01" min="0"
                onchange="Achats.calculerTotauxFacture()" oninput="Achats.calculerTotauxFacture()">
            <select id="ligne-compte-achat-${index}">
                ${Compte.genererOptionsGroupees(compteDefaut)}
            </select>
            <button type="button" class="btn-supprimer-ligne" onclick="Achats.supprimerLigneFacture(this)">×</button>
        `;

        container.appendChild(ligne);
    },

    /**
     * Supprime une ligne
     */
    supprimerLigneFacture(btn) {
        const container = document.getElementById('lignes-facture-achat');
        if (container.children.length > 1) {
            btn.parentElement.remove();
            this.calculerTotauxFacture();
        }
    },

    /**
     * Calcule les totaux
     */
    calculerTotauxFacture() {
        const container = document.getElementById('lignes-facture-achat');
        const taxes = Storage.get('taxes');
        const avecTaxes = document.getElementById('achat-avec-taxes')?.checked;
        let sousTotal = 0;

        Array.from(container.children).forEach((ligne, index) => {
            const qte = parseFloat(document.getElementById(`ligne-qte-achat-${index}`)?.value) || 0;
            const prix = parseFloat(document.getElementById(`ligne-prix-achat-${index}`)?.value) || 0;
            sousTotal += qte * prix;
        });

        let tps = 0, tvq = 0;
        if (avecTaxes && taxes.appliquerTaxes) {
            tps = sousTotal * (taxes.tps / 100);
            tvq = sousTotal * (taxes.tvq / 100);
        }

        const total = sousTotal + tps + tvq;

        document.getElementById('achat-sous-total').textContent = Transaction.formaterMontant(sousTotal);
        document.getElementById('achat-tps').textContent = Transaction.formaterMontant(tps);
        document.getElementById('achat-tvq').textContent = Transaction.formaterMontant(tvq);
        document.getElementById('achat-total').textContent = Transaction.formaterMontant(total);
    },

    /**
     * Réinitialise le formulaire
     */
    reinitialiserFacture() {
        document.getElementById('tab-nouvelle-facture-achat').innerHTML = this.renderNouvelleFacture();
        this.ajouterLigneFacture();
    },

    /**
     * Enregistre la facture
     */
    enregistrerFacture() {
        const fournisseurId = document.getElementById('achat-fournisseur').value;
        const numeroFournisseur = document.getElementById('achat-numero').value;
        const date = document.getElementById('achat-date').value;

        if (!fournisseurId || !numeroFournisseur) {
            App.notification('Veuillez remplir le fournisseur et le numéro de facture', 'warning');
            return;
        }

        const container = document.getElementById('lignes-facture-achat');
        const lignes = [];

        Array.from(container.children).forEach((ligne, index) => {
            const description = document.getElementById(`ligne-desc-achat-${index}`)?.value;
            const quantite = parseFloat(document.getElementById(`ligne-qte-achat-${index}`)?.value) || 0;
            const prixUnitaire = parseFloat(document.getElementById(`ligne-prix-achat-${index}`)?.value) || 0;
            const compte = document.getElementById(`ligne-compte-achat-${index}`)?.value;

            if (description && quantite > 0 && prixUnitaire > 0) {
                lignes.push({ description, quantite, prixUnitaire, compte });
            }
        });

        if (lignes.length === 0) {
            App.notification('Veuillez ajouter au moins une ligne valide', 'warning');
            return;
        }

        const avecTaxes = document.getElementById('achat-avec-taxes')?.checked;
        const compteContrepartie = document.getElementById('achat-compte-contrepartie')?.value;
        const projetId = document.getElementById('achat-projet')?.value || null;

        try {
            const facture = Facture.creerAchat({
                fournisseurId,
                numeroFournisseur,
                date,
                lignes,
                projetId,
                avecTaxes: avecTaxes,
                compteContrepartie: compteContrepartie,
                notes: document.getElementById('achat-notes').value
            });

            App.notification('Facture ' + facture.numeroInterne + ' créée avec succès', 'success');
            this.afficherOnglet('factures');
            document.getElementById('tab-factures-achat').innerHTML = this.renderFactures();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    }
};

// Initialiser avec une ligne
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('lignes-facture-achat');
    if (container && container.children.length === 0) {
        Achats.ajouterLigneFacture();
    }
});
