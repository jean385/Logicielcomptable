/**
 * Module Immobilisations
 * Gestion des actifs immobilisés et amortissement (solde dégressif canadien)
 */

const Immobilisations = {
    /**
     * Affiche le module immobilisations
     */
    afficher() {
        // Vérifier que les comptes nécessaires existent
        Immobilisation.verifierComptes();

        App.afficherPage('module-immobilisations');

        const container = document.getElementById('module-immobilisations');
        container.innerHTML = `
            <div class="module-header">
                <h1>Immobilisations</h1>
                <button class="btn-retour" onclick="App.retourAccueil()">
                    ← Retour
                </button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Immobilisations.afficherOnglet('tableau')">Tableau d'amortissement</button>
                <button class="tab" onclick="Immobilisations.afficherOnglet('liste')">Liste des immobilisations</button>
                <button class="tab" onclick="Immobilisations.afficherOnglet('calculer')">Calculer l'amortissement</button>
            </div>

            <div id="tab-immo-tableau" class="tab-content active">
                ${this.renderTableauAmortissement()}
            </div>

            <div id="tab-immo-liste" class="tab-content">
                ${this.renderListe()}
            </div>

            <div id="tab-immo-calculer" class="tab-content">
                ${this.renderCalculer()}
            </div>
        `;
    },

    /**
     * Affiche un onglet
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-immobilisations .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-immobilisations .tab-content').forEach(c => c.classList.remove('active'));

        const tabMap = {
            'tableau': 'tab-immo-tableau',
            'liste': 'tab-immo-liste',
            'calculer': 'tab-immo-calculer'
        };

        document.querySelector(`#module-immobilisations [onclick="Immobilisations.afficherOnglet('${onglet}')"]`).classList.add('active');

        const tabEl = document.getElementById(tabMap[onglet]);
        tabEl.classList.add('active');

        // Rafraîchir le contenu de l'onglet
        if (onglet === 'tableau') {
            tabEl.innerHTML = this.renderTableauAmortissement();
        } else if (onglet === 'liste') {
            tabEl.innerHTML = this.renderListe();
        } else if (onglet === 'calculer') {
            tabEl.innerHTML = this.renderCalculer();
        }
    },

    // ========== Onglet 1 : Tableau d'amortissement ==========

    renderTableauAmortissement() {
        const actives = Immobilisation.getActives();
        const exercice = Storage.get('exercice');
        const exerciceLabel = exercice.debut.substring(0, 4);

        let coutTotal = 0;
        let amortCumuleTotal = 0;
        let amortExerciceTotal = 0;

        // Données par catégorie
        const parCategorie = {};
        Immobilisation.CATEGORIES.forEach(cat => {
            parCategorie[cat.id] = {
                nom: cat.nom,
                taux: cat.taux,
                cout: 0,
                amortExercice: 0,
                amortCumule: 0,
                vnc: 0
            };
        });

        // Calculer les totaux par catégorie
        actives.forEach(immo => {
            const amortCumule = Immobilisation.getAmortCumule(immo.id);
            const vnc = immo.cout - amortCumule;

            if (parCategorie[immo.categorieId]) {
                parCategorie[immo.categorieId].cout += immo.cout;
                parCategorie[immo.categorieId].amortCumule += amortCumule;
                parCategorie[immo.categorieId].vnc += vnc;
            }

            coutTotal += immo.cout;
            amortCumuleTotal += amortCumule;
        });

        // Calculer l'amortissement de l'exercice courant
        const amortissements = Immobilisation.getAllAmortissements();
        const amortExercice = amortissements.find(a => a.exercice === exerciceLabel);
        if (amortExercice) {
            amortExercice.details.forEach(d => {
                if (parCategorie[Immobilisation.getById(d.immobilisationId)?.categorieId]) {
                    const catId = Immobilisation.getById(d.immobilisationId).categorieId;
                    parCategorie[catId].amortExercice += d.montantAmortissement;
                }
                amortExerciceTotal += d.montantAmortissement;
            });
        }

        const vncTotal = coutTotal - amortCumuleTotal;

        // Construire les lignes du tableau
        let tableRows = '';
        Immobilisation.CATEGORIES.forEach(cat => {
            const data = parCategorie[cat.id];
            if (data.cout > 0) {
                tableRows += `
                    <tr>
                        <td>${data.nom}</td>
                        <td class="text-center">${data.taux}%</td>
                        <td class="text-right">${Transaction.formaterMontant(data.cout)}</td>
                        <td class="text-right">${Transaction.formaterMontant(data.amortExercice)}</td>
                        <td class="text-right">${Transaction.formaterMontant(data.amortCumule)}</td>
                        <td class="text-right">${Transaction.formaterMontant(data.vnc)}</td>
                    </tr>
                `;
            }
        });

        if (!tableRows) {
            tableRows = '<tr><td colspan="6" class="text-center">Aucune immobilisation enregistrée</td></tr>';
        }

        return `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Coût total</h4>
                    <p>${Transaction.formaterMontant(coutTotal)}</p>
                </div>
                <div class="info-card">
                    <h4>Amort. cumulé total</h4>
                    <p>${Transaction.formaterMontant(amortCumuleTotal)}</p>
                </div>
                <div class="info-card">
                    <h4>Valeur nette comptable</h4>
                    <p>${Transaction.formaterMontant(vncTotal)}</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Catégorie</th>
                            <th class="text-center">Taux</th>
                            <th class="text-right">Coût</th>
                            <th class="text-right">Amort. exercice ${exerciceLabel}</th>
                            <th class="text-right">Amort. cumulé</th>
                            <th class="text-right">VNC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    ${coutTotal > 0 ? `
                    <tfoot>
                        <tr style="font-weight: bold;">
                            <td>Total</td>
                            <td></td>
                            <td class="text-right">${Transaction.formaterMontant(coutTotal)}</td>
                            <td class="text-right">${Transaction.formaterMontant(amortExerciceTotal)}</td>
                            <td class="text-right">${Transaction.formaterMontant(amortCumuleTotal)}</td>
                            <td class="text-right">${Transaction.formaterMontant(vncTotal)}</td>
                        </tr>
                    </tfoot>
                    ` : ''}
                </table>
            </div>
        `;
    },

    // ========== Onglet 2 : Liste des immobilisations ==========

    renderListe() {
        const immobilisations = Immobilisation.getAll();

        let tableRows = '';
        immobilisations.forEach(immo => {
            const categorie = Immobilisation.getCategorie(immo.categorieId);
            const amortCumule = Immobilisation.getAmortCumule(immo.id);
            const vnc = immo.cout - amortCumule;

            tableRows += `
                <tr>
                    <td>${immo.description}</td>
                    <td>${categorie ? categorie.nom : immo.categorieId}</td>
                    <td>${immo.dateAcquisition}</td>
                    <td class="text-right">${Transaction.formaterMontant(immo.cout)}</td>
                    <td class="text-right">${Transaction.formaterMontant(amortCumule)}</td>
                    <td class="text-right">${Transaction.formaterMontant(vnc)}</td>
                    <td>
                        <button class="btn btn-sm" onclick="Immobilisations.modifierImmo('${immo.id}')">Modifier</button>
                        <button class="btn btn-sm btn-danger" onclick="Immobilisations.supprimerImmo('${immo.id}')">Supprimer</button>
                    </td>
                </tr>
            `;
        });

        if (!tableRows) {
            tableRows = '<tr><td colspan="7" class="text-center">Aucune immobilisation enregistrée</td></tr>';
        }

        return `
            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="Immobilisations.ajouterImmo()">+ Ajouter une immobilisation</button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Catégorie</th>
                            <th>Date acquisition</th>
                            <th class="text-right">Coût</th>
                            <th class="text-right">Amort. cumulé</th>
                            <th class="text-right">VNC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Affiche le formulaire d'ajout d'immobilisation
     */
    ajouterImmo() {
        const categoriesOptions = Immobilisation.CATEGORIES.map(c =>
            `<option value="${c.id}">${c.nom} (${c.taux}%)</option>`
        ).join('');

        App.ouvrirModal('Ajouter une immobilisation', `
            <form onsubmit="Immobilisations.sauvegarderImmo(event)">
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="immo-description" required placeholder="Description de l'actif">
                </div>
                <div class="form-group">
                    <label>Catégorie *</label>
                    <select id="immo-categorie" required>
                        <option value="">Sélectionner une catégorie</option>
                        ${categoriesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date d'acquisition *</label>
                    <input type="date" id="immo-date" required value="${Storage.aujourdhui()}">
                </div>
                <div class="form-group">
                    <label>Coût *</label>
                    <input type="number" id="immo-cout" required step="0.01" min="0.01" placeholder="0.00">
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde une nouvelle immobilisation
     */
    sauvegarderImmo(event) {
        event.preventDefault();

        try {
            Immobilisation.creer({
                description: document.getElementById('immo-description').value,
                categorieId: document.getElementById('immo-categorie').value,
                dateAcquisition: document.getElementById('immo-date').value,
                cout: document.getElementById('immo-cout').value
            });

            App.fermerModal();
            App.notification('Immobilisation ajoutée avec succès', 'success');
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Affiche le formulaire de modification d'une immobilisation
     */
    modifierImmo(id) {
        const immo = Immobilisation.getById(id);
        if (!immo) return;

        const categoriesOptions = Immobilisation.CATEGORIES.map(c =>
            `<option value="${c.id}" ${c.id === immo.categorieId ? 'selected' : ''}>${c.nom} (${c.taux}%)</option>`
        ).join('');

        App.ouvrirModal('Modifier l\'immobilisation', `
            <form onsubmit="Immobilisations.sauvegarderModifImmo(event, '${id}')">
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="immo-description" required value="${immo.description}">
                </div>
                <div class="form-group">
                    <label>Catégorie *</label>
                    <select id="immo-categorie" required>
                        <option value="">Sélectionner une catégorie</option>
                        ${categoriesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date d'acquisition *</label>
                    <input type="date" id="immo-date" required value="${immo.dateAcquisition}">
                </div>
                <div class="form-group">
                    <label>Coût *</label>
                    <input type="number" id="immo-cout" required step="0.01" min="0.01" value="${immo.cout.toFixed(2)}">
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde les modifications d'une immobilisation
     */
    sauvegarderModifImmo(event, id) {
        event.preventDefault();

        try {
            Immobilisation.modifier(id, {
                description: document.getElementById('immo-description').value,
                categorieId: document.getElementById('immo-categorie').value,
                dateAcquisition: document.getElementById('immo-date').value,
                cout: document.getElementById('immo-cout').value
            });

            App.fermerModal();
            App.notification('Immobilisation modifiée avec succès', 'success');
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Supprime une immobilisation
     */
    supprimerImmo(id) {
        const immo = Immobilisation.getById(id);
        if (!immo) return;

        if (!confirm(`Supprimer l'immobilisation "${immo.description}" ?`)) return;

        try {
            Immobilisation.supprimer(id);
            App.notification('Immobilisation supprimée', 'success');
            this.afficherOnglet('liste');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    // ========== Onglet 3 : Calculer l'amortissement ==========

    renderCalculer() {
        const exercice = Storage.get('exercice');
        const exerciceLabel = exercice.debut.substring(0, 4);

        // Vérifier si déjà calculé
        if (Immobilisation.amortissementExiste(exerciceLabel)) {
            const amort = Immobilisation.getAllAmortissements().find(a => a.exercice === exerciceLabel);
            return `
                <div class="alert alert-info">
                    L'amortissement a déjà été calculé pour l'exercice ${exerciceLabel}.
                    <br>Date du calcul : ${amort.dateCalcul}
                </div>
                ${this.renderDetailAmortissementPasse(amort)}
            `;
        }

        // Prévisualisation
        const details = Immobilisation.previsualiserAmortissement();

        if (details.length === 0) {
            return `
                <div class="alert alert-info">
                    Aucune immobilisation active à amortir pour l'exercice ${exerciceLabel}.
                </div>
            `;
        }

        const totalAmort = details.reduce((sum, d) => sum + d.montantAmortissement, 0);

        // Tableau détaillé
        let tableRows = '';
        details.forEach(d => {
            tableRows += `
                <tr>
                    <td>${d.description}</td>
                    <td>${d.categorieNom}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.cout)}</td>
                    <td class="text-center">${d.tauxCategorie}%</td>
                    <td class="text-center">${d.regleDemiTaux ? 'Oui (' + d.tauxApplique.toFixed(2) + '%)' : 'Non'}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.amortCumuleAvant)}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.montantAmortissement)}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.amortCumuleApres)}</td>
                </tr>
            `;
        });

        // Aperçu de l'écriture comptable
        const parCompte = {};
        details.forEach(d => {
            if (!parCompte[d.compteAmortCumule]) {
                parCompte[d.compteAmortCumule] = 0;
            }
            parCompte[d.compteAmortCumule] += d.montantAmortissement;
        });

        let ecritureRows = `
            <tr>
                <td>5500 - Amortissement</td>
                <td class="text-right">${Transaction.formaterMontant(totalAmort)}</td>
                <td class="text-right"></td>
            </tr>
        `;

        Object.keys(parCompte).sort().forEach(compte => {
            const compteObj = Compte.getByNumero(compte);
            const nom = compteObj ? compteObj.nom : compte;
            ecritureRows += `
                <tr>
                    <td>${compte} - ${nom}</td>
                    <td class="text-right"></td>
                    <td class="text-right">${Transaction.formaterMontant(parCompte[compte])}</td>
                </tr>
            `;
        });

        return `
            <h3>Prévisualisation - Exercice ${exerciceLabel}</h3>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Catégorie</th>
                            <th class="text-right">Coût</th>
                            <th class="text-center">Taux</th>
                            <th class="text-center">Demi-taux?</th>
                            <th class="text-right">Amort. cumulé avant</th>
                            <th class="text-right">Montant</th>
                            <th class="text-right">Amort. cumulé après</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold;">
                            <td colspan="6">Total amortissement</td>
                            <td class="text-right">${Transaction.formaterMontant(totalAmort)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <h3 style="margin-top: 30px;">Aperçu de l'écriture comptable</h3>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Compte</th>
                            <th class="text-right">Débit</th>
                            <th class="text-right">Crédit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ecritureRows}
                    </tbody>
                </table>
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button class="btn btn-primary" onclick="Immobilisations.enregistrerAmortissement()">
                    Enregistrer l'amortissement
                </button>
            </div>
        `;
    },

    /**
     * Affiche le détail d'un amortissement déjà enregistré
     */
    renderDetailAmortissementPasse(amort) {
        let tableRows = '';
        let totalAmort = 0;

        amort.details.forEach(d => {
            const immo = Immobilisation.getById(d.immobilisationId);
            const description = immo ? immo.description : '(supprimé)';
            totalAmort += d.montantAmortissement;

            tableRows += `
                <tr>
                    <td>${description}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.cout)}</td>
                    <td class="text-center">${d.tauxApplique.toFixed(2)}%</td>
                    <td class="text-center">${d.regleDemiTaux ? 'Oui' : 'Non'}</td>
                    <td class="text-right">${Transaction.formaterMontant(d.montantAmortissement)}</td>
                </tr>
            `;
        });

        return `
            <h3 style="margin-top: 20px;">Détail de l'amortissement enregistré</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-right">Coût</th>
                            <th class="text-center">Taux appliqué</th>
                            <th class="text-center">Demi-taux?</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold;">
                            <td colspan="4">Total</td>
                            <td class="text-right">${Transaction.formaterMontant(totalAmort)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    },

    /**
     * Enregistre l'amortissement calculé
     */
    enregistrerAmortissement() {
        const exercice = Storage.get('exercice');
        const exerciceLabel = exercice.debut.substring(0, 4);

        if (Immobilisation.amortissementExiste(exerciceLabel)) {
            App.notification('L\'amortissement a déjà été calculé pour cet exercice', 'warning');
            return;
        }

        if (!confirm('Enregistrer l\'amortissement pour l\'exercice ' + exerciceLabel + ' ?\nUne écriture comptable sera créée automatiquement.')) {
            return;
        }

        try {
            const details = Immobilisation.previsualiserAmortissement();
            Immobilisation.enregistrerAmortissement(details);
            App.notification('Amortissement enregistré avec succès', 'success');
            this.afficherOnglet('calculer');
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    }
};
