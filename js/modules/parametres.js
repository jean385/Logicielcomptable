/**
 * Module Paramètres
 * Configuration de l'entreprise, plan comptable, taxes
 */

const Parametres = {
    /**
     * Affiche le module Paramètres
     */
    afficher() {
        App.afficherPage('module-parametres');

        const container = document.getElementById('module-parametres');
        const mode = Storage.getMode();

        if (mode === 'autonome') {
            container.innerHTML = `
                <div class="module-header">
                    <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                    <h1>Paramètres</h1>
                </div>

                <div class="tabs">
                    <button class="tab active" onclick="Parametres.afficherOnglet('entreprise')">Entreprise</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('taxes')">Taxes</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('categories')">Catégories</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('produits')">Produits</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('exercice')">Exercice</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('abonnement')">Abonnement</button>
                </div>

                <div id="tab-entreprise" class="tab-content active">
                    ${this.renderEntreprise()}
                </div>

                <div id="tab-taxes" class="tab-content">
                    ${this.renderTaxes()}
                </div>

                <div id="tab-categories" class="tab-content">
                    ${this.renderCategories()}
                </div>

                <div id="tab-produits" class="tab-content">
                    ${this.renderProduits()}
                </div>

                <div id="tab-exercice" class="tab-content">
                    ${this.renderExercice()}
                </div>

                <div id="tab-abonnement" class="tab-content">
                    ${this.renderAbonnement()}
                </div>

                <div class="form-section" style="margin-top: 30px; padding: 20px; background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px;">
                    <h4>Changer de mode</h4>
                    <p style="margin-bottom: 10px; color: var(--text-light);">Si votre entreprise grossit, vous pouvez passer en mode comptabilité complète avec plan comptable, écritures en partie double, et rapports financiers avancés.</p>
                    <button class="btn btn-danger" onclick="App.confirmerMigrationComplet()">Passer en comptabilité complète</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="module-header">
                    <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                    <h1>Paramètres</h1>
                </div>

                <div class="tabs">
                    <button class="tab active" onclick="Parametres.afficherOnglet('entreprise')">Entreprise</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('plan-comptable')">Plan comptable</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('taxes')">Taxes</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('produits')">Produits</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('exercice')">Exercice</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('projets')">Projets</button>
                    <button class="tab" onclick="Parametres.afficherOnglet('abonnement')">Abonnement</button>
                </div>

                <div id="tab-entreprise" class="tab-content active">
                    ${this.renderEntreprise()}
                </div>

                <div id="tab-plan-comptable" class="tab-content">
                    ${this.renderPlanComptable()}
                </div>

                <div id="tab-taxes" class="tab-content">
                    ${this.renderTaxes()}
                </div>

                <div id="tab-produits" class="tab-content">
                    ${this.renderProduits()}
                </div>

                <div id="tab-exercice" class="tab-content">
                    ${this.renderExercice()}
                </div>

                <div id="tab-projets" class="tab-content">
                    ${this.renderProjets()}
                </div>

                <div id="tab-abonnement" class="tab-content">
                    ${this.renderAbonnement()}
                </div>
            `;
        }
    },

    /**
     * Affiche un onglet spécifique
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-parametres .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-parametres .tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`#module-parametres [onclick="Parametres.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById('tab-' + onglet).classList.add('active');

        if (onglet === 'projets') {
            document.getElementById('tab-projets').innerHTML = this.renderProjets();
        }
        if (onglet === 'produits') {
            document.getElementById('tab-produits').innerHTML = this.renderProduits();
        }
        if (onglet === 'abonnement') {
            document.getElementById('tab-abonnement').innerHTML = this.renderAbonnement();
        }
    },

    /**
     * Render l'onglet Catégories (mode autonome)
     */
    renderCategories() {
        const catsRevenus = RevenuDepense.getCategoriesRevenus();
        const catsDepenses = RevenuDepense.getCategoriesDepenses();

        let revenusHTML = catsRevenus.map(c => `
            <div class="categorie-item">
                <span>${App.escapeHtml(c)}</span>
                <button class="btn btn-danger" onclick="Parametres.supprimerCategorie('revenus', '${App.escapeHtml(c)}')" title="Supprimer">✕</button>
            </div>
        `).join('');

        let depensesHTML = catsDepenses.map(c => `
            <div class="categorie-item">
                <span>${App.escapeHtml(c)}</span>
                <button class="btn btn-danger" onclick="Parametres.supprimerCategorie('depenses', '${App.escapeHtml(c)}')" title="Supprimer">✕</button>
            </div>
        `).join('');

        return `
            <div class="rapport-container">
                <h3>Catégories de revenus et dépenses</h3>

                <div class="form-row" style="align-items: start;">
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 12px;">Catégories de revenus</h4>
                        <div class="categories-list">${revenusHTML || '<p class="text-light">Aucune catégorie</p>'}</div>
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <input type="text" id="nouvelle-cat-revenu" placeholder="Nouvelle catégorie" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 3px;">
                            <button class="btn btn-primary" onclick="Parametres.ajouterCategorie('revenus')">Ajouter</button>
                        </div>
                    </div>
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 12px;">Catégories de dépenses</h4>
                        <div class="categories-list">${depensesHTML || '<p class="text-light">Aucune catégorie</p>'}</div>
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <input type="text" id="nouvelle-cat-depense" placeholder="Nouvelle catégorie" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 3px;">
                            <button class="btn btn-primary" onclick="Parametres.ajouterCategorie('depenses')">Ajouter</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    ajouterCategorie(type) {
        const inputId = type === 'revenus' ? 'nouvelle-cat-revenu' : 'nouvelle-cat-depense';
        const input = document.getElementById(inputId);
        const nom = input.value.trim();
        if (!nom) return;

        try {
            if (type === 'revenus') {
                RevenuDepense.ajouterCategorieRevenu(nom);
            } else {
                RevenuDepense.ajouterCategorieDepense(nom);
            }
            App.notification('Catégorie ajoutée', 'success');
            document.getElementById('tab-categories').innerHTML = this.renderCategories();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    supprimerCategorie(type, nom) {
        if (!confirm('Supprimer la catégorie "' + nom + '"?')) return;
        try {
            if (type === 'revenus') {
                RevenuDepense.supprimerCategorieRevenu(nom);
            } else {
                RevenuDepense.supprimerCategorieDepense(nom);
            }
            App.notification('Catégorie supprimée', 'success');
            document.getElementById('tab-categories').innerHTML = this.renderCategories();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render formulaire entreprise enrichi avec sections
     */
    renderEntreprise() {
        const entreprise = Storage.get('entreprise') || {};

        const provinces = [
            { code: 'QC', nom: 'Québec' },
            { code: 'ON', nom: 'Ontario' },
            { code: 'BC', nom: 'Colombie-Britannique' },
            { code: 'AB', nom: 'Alberta' },
            { code: 'SK', nom: 'Saskatchewan' },
            { code: 'MB', nom: 'Manitoba' },
            { code: 'NB', nom: 'Nouveau-Brunswick' },
            { code: 'NS', nom: 'Nouvelle-Écosse' },
            { code: 'PE', nom: 'Île-du-Prince-Édouard' },
            { code: 'NL', nom: 'Terre-Neuve-et-Labrador' },
            { code: 'YT', nom: 'Yukon' },
            { code: 'NT', nom: 'Territoires du Nord-Ouest' },
            { code: 'NU', nom: 'Nunavut' }
        ];

        const provinceOptions = provinces.map(p =>
            `<option value="${p.code}" ${(entreprise.province || 'QC') === p.code ? 'selected' : ''}>${p.nom}</option>`
        ).join('');

        return `
            <div class="rapport-container">
                <h3>Informations de l'entreprise</h3>
                <form id="form-entreprise" onsubmit="Parametres.sauvegarderEntreprise(event)">

                    <div class="form-section">
                        <h4>Identification</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nom commercial *</label>
                                <input type="text" id="ent-nomCommercial" value="${entreprise.nomCommercial || entreprise.nom || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Raison sociale</label>
                                <input type="text" id="ent-raisonSociale" value="${entreprise.raisonSociale || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>NEQ (Numéro d'entreprise du Québec)</label>
                                <input type="text" id="ent-neq" value="${entreprise.neq || ''}">
                            </div>
                            <div class="form-group">
                                <label>Date de création de l'entreprise</label>
                                <input type="date" id="ent-dateCreation" value="${entreprise.dateCreationEntreprise || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Numéros de taxes</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Numéro de TPS</label>
                                <input type="text" id="ent-tps" value="${entreprise.tps || ''}">
                            </div>
                            <div class="form-group">
                                <label>Numéro de TVQ</label>
                                <input type="text" id="ent-tvq" value="${entreprise.tvq || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Adresse</h4>
                        <div class="form-group">
                            <label>Adresse</label>
                            <input type="text" id="ent-adresse" value="${entreprise.adresse || ''}">
                        </div>
                        <div class="form-row-3">
                            <div class="form-group">
                                <label>Ville</label>
                                <input type="text" id="ent-ville" value="${entreprise.ville || ''}">
                            </div>
                            <div class="form-group">
                                <label>Province</label>
                                <select id="ent-province">
                                    ${provinceOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Code postal</label>
                                <input type="text" id="ent-codePostal" value="${entreprise.codePostal || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Pays</label>
                            <input type="text" id="ent-pays" value="${entreprise.pays || 'Canada'}">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Contact</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Téléphone</label>
                                <input type="tel" id="ent-telephone" value="${entreprise.telephone || ''}">
                            </div>
                            <div class="form-group">
                                <label>Télécopieur</label>
                                <input type="tel" id="ent-telecopieur" value="${entreprise.telecopieur || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Courriel</label>
                                <input type="email" id="ent-courriel" value="${entreprise.courriel || ''}">
                            </div>
                            <div class="form-group">
                                <label>Site Web</label>
                                <input type="text" id="ent-siteWeb" value="${entreprise.siteWeb || ''}">
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </form>

                <div class="form-section" style="margin-top: 30px;">
                    <h4>Logo de l'entreprise</h4>
                    <div id="logo-preview-container">
                        ${this.renderLogoPreview()}
                    </div>
                    <div style="margin-top: 10px;">
                        <button type="button" class="btn btn-secondary" onclick="Parametres.telechargerLogo()">Choisir une image</button>
                        <button type="button" class="btn btn-danger" onclick="Parametres.supprimerLogo()" id="btn-supprimer-logo" style="${Storage.get('logo') ? '' : 'display:none;'} margin-left: 5px;">Supprimer le logo</button>
                        <input type="file" id="input-logo" accept="image/*" style="display: none;" onchange="Parametres.traiterLogo(event)">
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render l'aperçu du logo
     */
    renderLogoPreview() {
        const logo = Storage.get('logo');
        if (logo) {
            return '<img src="' + logo + '" alt="Logo" style="max-width: 200px; max-height: 100px; border: 1px solid var(--border-color); padding: 5px; border-radius: 4px;">';
        }
        return '<div style="width: 200px; height: 80px; border: 2px dashed var(--border-color); display: flex; align-items: center; justify-content: center; color: #999; border-radius: 4px;">Aucun logo</div>';
    },

    /**
     * Ouvre le sélecteur de fichier pour le logo
     */
    telechargerLogo() {
        document.getElementById('input-logo').click();
    },

    /**
     * Traite le fichier logo sélectionné (redimensionne via canvas)
     */
    traiterLogo(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            App.notification('Veuillez sélectionner un fichier image', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const maxW = 400;
                const maxH = 200;
                let w = img.width;
                let h = img.height;

                if (w > maxW || h > maxH) {
                    const ratio = Math.min(maxW / w, maxH / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                const base64 = canvas.toDataURL('image/png');
                Storage.set('logo', base64);

                document.getElementById('logo-preview-container').innerHTML = Parametres.renderLogoPreview();
                document.getElementById('btn-supprimer-logo').style.display = '';
                App.notification('Logo enregistré', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    /**
     * Supprime le logo
     */
    supprimerLogo() {
        if (!confirm('Supprimer le logo?')) return;
        Storage.remove('logo');
        document.getElementById('logo-preview-container').innerHTML = this.renderLogoPreview();
        document.getElementById('btn-supprimer-logo').style.display = 'none';
        App.notification('Logo supprimé', 'success');
    },

    /**
     * Sauvegarde les infos entreprise (schéma enrichi)
     * Synchronise aussi le nom dans le registre des dossiers
     */
    sauvegarderEntreprise(event) {
        event.preventDefault();

        const entreprise = {
            nomCommercial: document.getElementById('ent-nomCommercial').value.trim(),
            raisonSociale: document.getElementById('ent-raisonSociale').value.trim(),
            neq: document.getElementById('ent-neq').value.trim(),
            dateCreationEntreprise: document.getElementById('ent-dateCreation').value,
            tps: document.getElementById('ent-tps').value.trim(),
            tvq: document.getElementById('ent-tvq').value.trim(),
            adresse: document.getElementById('ent-adresse').value.trim(),
            ville: document.getElementById('ent-ville').value.trim(),
            province: document.getElementById('ent-province').value,
            codePostal: document.getElementById('ent-codePostal').value.trim(),
            pays: document.getElementById('ent-pays').value.trim(),
            telephone: document.getElementById('ent-telephone').value.trim(),
            telecopieur: document.getElementById('ent-telecopieur').value.trim(),
            courriel: document.getElementById('ent-courriel').value.trim(),
            siteWeb: document.getElementById('ent-siteWeb').value.trim()
        };

        Storage.set('entreprise', entreprise);

        // Mettre à jour le nom dans la barre de menu
        document.getElementById('entreprise-nom').textContent = entreprise.nomCommercial;

        // Synchroniser le nom dans le registre des dossiers
        if (Storage.activeDossierId) {
            Storage.renommerDossier(Storage.activeDossierId, entreprise.nomCommercial);
        }

        App.notification('Informations enregistrées avec succès', 'success');
    },

    /**
     * Render l'onglet Abonnement
     */
    renderAbonnement() {
        // On charge les données de manière asynchrone et on met à jour le DOM
        const uid = Auth.getUtilisateur() ? Auth.getUtilisateur().uid : null;
        const containerId = 'abonnement-contenu';

        // Contenu par défaut (chargement)
        setTimeout(async () => {
            const container = document.getElementById(containerId);
            if (!container || !uid) return;

            try {
                const doc = await firebase.firestore().collection('users').doc(uid).get();
                const data = doc.data();
                const sub = data && data.subscription ? data.subscription : null;
                const status = sub ? sub.status : 'none';

                const statusLabels = {
                    'active': 'Actif',
                    'canceled': 'Annulé',
                    'past_due': 'Paiement en retard',
                    'none': 'Aucun abonnement'
                };

                let periodEnd = '';
                if (sub && sub.currentPeriodEnd) {
                    const date = new Date(sub.currentPeriodEnd * 1000);
                    periodEnd = date.toLocaleDateString('fr-CA');
                }

                let html = `
                    <div class="abonnement-info">
                        <div class="abonnement-info-row">
                            <span class="abonnement-info-label">Statut</span>
                            <span class="abonnement-badge abonnement-badge-${status}">${statusLabels[status] || status}</span>
                        </div>
                `;

                if (periodEnd && status === 'active') {
                    html += `
                        <div class="abonnement-info-row">
                            <span class="abonnement-info-label">Prochain renouvellement</span>
                            <span>${periodEnd}</span>
                        </div>
                    `;
                    if (sub.cancelAtPeriodEnd) {
                        html += `
                            <div class="alert alert-warning" style="margin-top: 10px;">
                                Votre abonnement sera annulé le ${periodEnd}. Vous conservez l'accès jusqu'à cette date.
                            </div>
                        `;
                    }
                }

                html += '</div>';

                if (status === 'active' || status === 'past_due') {
                    html += `<button class="btn btn-primary" id="btn-gerer-abonnement" onclick="App.gererAbonnement()">Gérer mon abonnement</button>`;
                } else {
                    html += `<button class="btn btn-stripe" id="btn-souscrire" onclick="App.souscrireAbonnement()">S'abonner — 9,95 $/mois</button>`;
                }

                if (Auth.estProprietaire()) {
                    html += `<p style="margin-top: 15px; color: var(--text-light); font-style: italic;">Vous êtes le propriétaire du système — accès illimité.</p>`;
                } else if (Auth.essaiActif()) {
                    const jours = Auth.joursRestants();
                    html += `<p style="margin-top: 15px; color: var(--text-light);">Essai gratuit : ${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}.</p>`;
                }

                container.innerHTML = html;
            } catch (e) {
                console.error('Erreur chargement abonnement:', e);
                container.innerHTML = '<p class="text-light">Impossible de charger les informations d\'abonnement.</p>';
            }
        }, 0);

        return `
            <div class="rapport-container">
                <h3>Abonnement</h3>
                <div id="${containerId}">
                    <p class="text-light">Chargement...</p>
                </div>
            </div>
        `;
    },

    /**
     * Render plan comptable
     */
    renderPlanComptable() {
        const comptes = Compte.getAll();

        let tableRows = '';
        comptes.forEach(c => {
            const typeClasse = c.actif ? '' : 'style="opacity: 0.5"';
            tableRows += `
                <tr ${typeClasse}>
                    <td>${c.numero}</td>
                    <td>${c.nom}</td>
                    <td>${Compte.getTypeLibelle(c.type)}</td>
                    <td>${c.soldeNormal === 'debit' ? 'Débit' : 'Crédit'}</td>
                    <td class="text-right">${Transaction.formaterMontant(c.solde)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Parametres.modifierCompte('${c.numero}')" title="Modifier">
                            Modifier
                        </button>
                        ${c.actif
                ? `<button class="btn btn-danger" onclick="Parametres.toggleCompte('${c.numero}', false)" title="Désactiver">Désactiver</button>`
                : `<button class="btn btn-success" onclick="Parametres.toggleCompte('${c.numero}', true)" title="Activer">Activer</button>`
            }
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Parametres.nouveauCompte()">
                    + Nouveau compte
                </button>
                <input type="text" class="search-input" placeholder="Rechercher un compte..."
                    onkeyup="Parametres.filtrerComptes(this.value)">
            </div>

            <div class="table-container">
                <table id="table-comptes">
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Solde normal</th>
                            <th class="text-right">Solde</th>
                            <th class="text-center">Actions</th>
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
     * Filtre les comptes dans le tableau
     */
    filtrerComptes(terme) {
        const rows = document.querySelectorAll('#table-comptes tbody tr');
        const termeLower = terme.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Ouvre le modal pour un nouveau compte
     */
    nouveauCompte() {
        App.ouvrirModal('Nouveau compte', `
            <form id="form-compte" onsubmit="Parametres.sauvegarderCompte(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Numéro de compte *</label>
                        <input type="text" id="compte-numero" required pattern="[0-9]{4}" title="4 chiffres">
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="compte-type" required onchange="Parametres.ajusterSoldeNormal()">
                            <option value="">Sélectionner</option>
                            <option value="actif">Actif</option>
                            <option value="passif">Passif</option>
                            <option value="capitaux">Capitaux propres</option>
                            <option value="revenus">Revenus</option>
                            <option value="depenses">Dépenses</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Nom du compte *</label>
                    <input type="text" id="compte-nom" required>
                </div>
                <div class="form-group">
                    <label>Solde normal *</label>
                    <select id="compte-solde-normal" required>
                        <option value="debit">Débit</option>
                        <option value="credit">Crédit</option>
                    </select>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer</button>
                </div>
            </form>
        `);
    },

    /**
     * Ajuste le solde normal selon le type sélectionné
     */
    ajusterSoldeNormal() {
        const type = document.getElementById('compte-type').value;
        const soldeNormal = Compte.getSoldeNormalParDefaut(type);
        document.getElementById('compte-solde-normal').value = soldeNormal;
    },

    /**
     * Sauvegarde un nouveau compte
     */
    sauvegarderCompte(event) {
        event.preventDefault();

        try {
            Compte.creer({
                numero: document.getElementById('compte-numero').value,
                nom: document.getElementById('compte-nom').value,
                type: document.getElementById('compte-type').value,
                soldeNormal: document.getElementById('compte-solde-normal').value
            });

            App.fermerModal();
            App.notification('Compte créé avec succès', 'success');
            document.getElementById('tab-plan-comptable').innerHTML = this.renderPlanComptable();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Ouvre le modal pour modifier un compte
     */
    modifierCompte(numero) {
        const compte = Compte.getByNumero(numero);
        if (!compte) return;

        App.ouvrirModal('Modifier le compte', `
            <form id="form-compte-edit" onsubmit="Parametres.sauvegarderModifCompte(event, '${numero}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Numéro de compte *</label>
                        <input type="text" id="compte-numero" value="${compte.numero}" required pattern="[0-9]{4}">
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="compte-type" required>
                            <option value="actif" ${compte.type === 'actif' ? 'selected' : ''}>Actif</option>
                            <option value="passif" ${compte.type === 'passif' ? 'selected' : ''}>Passif</option>
                            <option value="capitaux" ${compte.type === 'capitaux' ? 'selected' : ''}>Capitaux propres</option>
                            <option value="revenus" ${compte.type === 'revenus' ? 'selected' : ''}>Revenus</option>
                            <option value="depenses" ${compte.type === 'depenses' ? 'selected' : ''}>Dépenses</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Nom du compte *</label>
                    <input type="text" id="compte-nom" value="${compte.nom}" required>
                </div>
                <div class="form-group">
                    <label>Solde normal *</label>
                    <select id="compte-solde-normal" required>
                        <option value="debit" ${compte.soldeNormal === 'debit' ? 'selected' : ''}>Débit</option>
                        <option value="credit" ${compte.soldeNormal === 'credit' ? 'selected' : ''}>Crédit</option>
                    </select>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde les modifications d'un compte
     */
    sauvegarderModifCompte(event, numeroOriginal) {
        event.preventDefault();

        try {
            Compte.modifier(numeroOriginal, {
                numero: document.getElementById('compte-numero').value,
                nom: document.getElementById('compte-nom').value,
                type: document.getElementById('compte-type').value,
                soldeNormal: document.getElementById('compte-solde-normal').value
            });

            App.fermerModal();
            App.notification('Compte modifié avec succès', 'success');
            document.getElementById('tab-plan-comptable').innerHTML = this.renderPlanComptable();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Active ou désactive un compte
     */
    toggleCompte(numero, activer) {
        try {
            if (activer) {
                Compte.activer(numero);
                App.notification('Compte activé', 'success');
            } else {
                Compte.desactiver(numero);
                App.notification('Compte désactivé', 'success');
            }
            document.getElementById('tab-plan-comptable').innerHTML = this.renderPlanComptable();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render configuration des taxes
     */
    renderTaxes() {
        const taxes = Storage.get('taxes');

        return `
            <div class="rapport-container">
                <h3>Configuration des taxes</h3>
                <form id="form-taxes" onsubmit="Parametres.sauvegarderTaxes(event)">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="taxes-appliquer" ${taxes.appliquerTaxes ? 'checked' : ''}>
                            Appliquer les taxes automatiquement
                        </label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>TPS (Taxe sur les produits et services) %</label>
                            <input type="number" id="taxes-tps" value="${taxes.tps}" step="0.001" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>TVQ (Taxe de vente du Québec) %</label>
                            <input type="number" id="taxes-tvq" value="${taxes.tvq}" step="0.001" min="0" max="100">
                        </div>
                    </div>

                    <div class="alert alert-info">
                        <strong>Taux actuels au Québec:</strong><br>
                        TPS: 5% (fédéral)<br>
                        TVQ: 9.975% (provincial)
                    </div>

                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </form>
            </div>
        `;
    },

    /**
     * Sauvegarde la configuration des taxes
     */
    sauvegarderTaxes(event) {
        event.preventDefault();

        const taxes = {
            appliquerTaxes: document.getElementById('taxes-appliquer').checked,
            tps: parseFloat(document.getElementById('taxes-tps').value) || 0,
            tvq: parseFloat(document.getElementById('taxes-tvq').value) || 0
        };

        Storage.set('taxes', taxes);
        App.notification('Configuration des taxes enregistrée', 'success');
    },

    /**
     * Render configuration de l'exercice
     */
    renderExercice() {
        const exercice = Storage.get('exercice');

        return `
            <div class="rapport-container">
                <h3>Exercice financier</h3>
                <form id="form-exercice" onsubmit="Parametres.sauvegarderExercice(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date de début</label>
                            <input type="date" id="exercice-debut" value="${exercice.debut}">
                        </div>
                        <div class="form-group">
                            <label>Date de fin</label>
                            <input type="date" id="exercice-fin" value="${exercice.fin}">
                        </div>
                    </div>

                    <div class="alert alert-warning">
                        <strong>Attention:</strong> La modification des dates d'exercice peut affecter les rapports financiers.
                    </div>

                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </form>
            </div>
        `;
    },

    /**
     * Sauvegarde la configuration de l'exercice
     */
    sauvegarderExercice(event) {
        event.preventDefault();

        const exercice = {
            debut: document.getElementById('exercice-debut').value,
            fin: document.getElementById('exercice-fin').value,
            actif: true
        };

        Storage.set('exercice', exercice);
        App.notification('Exercice financier enregistré', 'success');
    },

    // ========== GESTION DES PROJETS ==========

    /**
     * Render la liste des projets
     */
    renderProjets() {
        const projets = Projet.getAll();

        let tableRows = '';
        projets.forEach(p => {
            const client = p.clientId ? Client.getById(p.clientId) : null;
            tableRows += `
                <tr>
                    <td>${p.code || '-'}</td>
                    <td><strong>${p.nom}</strong>${p.description ? '<br><small class="text-light">' + p.description + '</small>' : ''}</td>
                    <td>${client ? client.nom : '-'}</td>
                    <td><span class="badge ${Projet.getStatutClasse(p.statut)}">${Projet.getStatutLibelle(p.statut)}</span></td>
                    <td>${p.dateDebut || '-'}</td>
                    <td>${p.dateFin || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Parametres.modifierProjet('${p.id}')">Modifier</button>
                        <button class="btn btn-danger" onclick="Parametres.supprimerProjet('${p.id}')">Suppr</button>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Parametres.nouveauProjet()">+ Nouveau projet</button>
                <input type="text" class="search-input" placeholder="Rechercher un projet..."
                    onkeyup="Parametres.filtrerProjets(this.value)">
            </div>

            <div class="table-container">
                <table id="table-projets">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Nom</th>
                            <th>Client</th>
                            <th>Statut</th>
                            <th>Début</th>
                            <th>Fin</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="7" class="text-center">Aucun projet</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Filtre les projets dans le tableau
     */
    filtrerProjets(terme) {
        const rows = document.querySelectorAll('#table-projets tbody tr');
        const termeLower = terme.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Ouvre le formulaire nouveau projet
     */
    nouveauProjet() {
        App.ouvrirModal('Nouveau projet', `
            <form id="form-projet" onsubmit="Parametres.sauvegarderProjet(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>Code du projet</label>
                        <input type="text" id="projet-code" placeholder="Ex: PRJ-001">
                    </div>
                    <div class="form-group">
                        <label>Nom du projet *</label>
                        <input type="text" id="projet-nom" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="projet-description" rows="2"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Client</label>
                        <select id="projet-client">
                            <option value="">Aucun client</option>
                            ${Client.genererOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="projet-statut">
                            <option value="actif" selected>Actif</option>
                            <option value="termine">Terminé</option>
                            <option value="annule">Annulé</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date de début</label>
                        <input type="date" id="projet-date-debut">
                    </div>
                    <div class="form-group">
                        <label>Date de fin</label>
                        <input type="date" id="projet-date-fin">
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer le projet</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde un nouveau projet
     */
    sauvegarderProjet(event) {
        event.preventDefault();

        try {
            Projet.creer({
                code: document.getElementById('projet-code').value.trim(),
                nom: document.getElementById('projet-nom').value.trim(),
                description: document.getElementById('projet-description').value.trim(),
                clientId: document.getElementById('projet-client').value || null,
                statut: document.getElementById('projet-statut').value,
                dateDebut: document.getElementById('projet-date-debut').value,
                dateFin: document.getElementById('projet-date-fin').value
            });

            App.fermerModal();
            App.notification('Projet créé avec succès', 'success');
            document.getElementById('tab-projets').innerHTML = this.renderProjets();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Ouvre le formulaire de modification d'un projet
     */
    modifierProjet(id) {
        const p = Projet.getById(id);
        if (!p) return;

        App.ouvrirModal('Modifier le projet', `
            <form id="form-projet-edit" onsubmit="Parametres.sauvegarderModifProjet(event, '${id}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>Code du projet</label>
                        <input type="text" id="projet-code" value="${p.code || ''}" placeholder="Ex: PRJ-001">
                    </div>
                    <div class="form-group">
                        <label>Nom du projet *</label>
                        <input type="text" id="projet-nom" value="${p.nom}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="projet-description" rows="2">${p.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Client</label>
                        <select id="projet-client">
                            <option value="">Aucun client</option>
                            ${Client.genererOptions(p.clientId)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="projet-statut">
                            <option value="actif" ${p.statut === 'actif' ? 'selected' : ''}>Actif</option>
                            <option value="termine" ${p.statut === 'termine' ? 'selected' : ''}>Terminé</option>
                            <option value="annule" ${p.statut === 'annule' ? 'selected' : ''}>Annulé</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date de début</label>
                        <input type="date" id="projet-date-debut" value="${p.dateDebut || ''}">
                    </div>
                    <div class="form-group">
                        <label>Date de fin</label>
                        <input type="date" id="projet-date-fin" value="${p.dateFin || ''}">
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
     * Sauvegarde les modifications d'un projet
     */
    sauvegarderModifProjet(event, id) {
        event.preventDefault();

        try {
            Projet.modifier(id, {
                code: document.getElementById('projet-code').value.trim(),
                nom: document.getElementById('projet-nom').value.trim(),
                description: document.getElementById('projet-description').value.trim(),
                clientId: document.getElementById('projet-client').value || null,
                statut: document.getElementById('projet-statut').value,
                dateDebut: document.getElementById('projet-date-debut').value,
                dateFin: document.getElementById('projet-date-fin').value
            });

            App.fermerModal();
            App.notification('Projet modifié avec succès', 'success');
            document.getElementById('tab-projets').innerHTML = this.renderProjets();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Supprime un projet
     */
    supprimerProjet(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet?')) return;

        try {
            Projet.supprimer(id);
            App.notification('Projet supprimé', 'success');
            document.getElementById('tab-projets').innerHTML = this.renderProjets();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    // ========== GESTION DES PRODUITS ==========

    /**
     * Render la liste des produits
     */
    renderProduits() {
        const produits = Produit.getAll();

        let tableRows = '';
        produits.forEach(p => {
            const prix = p.prixUnitaire.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
            const styleInactif = p.actif === false ? ' style="opacity: 0.5"' : '';
            tableRows += `
                <tr${styleInactif}>
                    <td><strong>${App.escapeHtml(p.nom)}</strong></td>
                    <td>${App.escapeHtml(p.description || '-')}</td>
                    <td class="text-right">${prix}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="Parametres.modifierProduit('${p.id}')">Modifier</button>
                        <button class="btn btn-danger" onclick="Parametres.supprimerProduit('${p.id}')">Suppr</button>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <button class="btn btn-primary" onclick="Parametres.nouveauProduit()">+ Nouveau produit</button>
                <input type="text" class="search-input" placeholder="Rechercher un produit..."
                    onkeyup="Parametres.filtrerProduits(this.value)">
            </div>

            <div class="table-container">
                <table id="table-produits">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Description</th>
                            <th class="text-right">Prix unitaire</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="4" class="text-center">Aucun produit</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Filtre les produits dans le tableau
     */
    filtrerProduits(terme) {
        const rows = document.querySelectorAll('#table-produits tbody tr');
        const termeLower = terme.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(termeLower) ? '' : 'none';
        });
    },

    /**
     * Ouvre le formulaire nouveau produit
     */
    nouveauProduit() {
        App.ouvrirModal('Nouveau produit', `
            <form id="form-produit" onsubmit="Parametres.sauvegarderProduit(event)">
                <div class="form-group">
                    <label>Nom du produit/service *</label>
                    <input type="text" id="produit-nom" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="produit-description" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Prix unitaire *</label>
                    <input type="number" id="produit-prix" step="0.01" min="0" required>
                </div>
                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde un nouveau produit
     */
    sauvegarderProduit(event) {
        event.preventDefault();

        try {
            Produit.creer({
                nom: document.getElementById('produit-nom').value.trim(),
                description: document.getElementById('produit-description').value.trim(),
                prixUnitaire: document.getElementById('produit-prix').value
            });

            App.fermerModal();
            App.notification('Produit créé avec succès', 'success');
            document.getElementById('tab-produits').innerHTML = this.renderProduits();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Ouvre le formulaire de modification d'un produit
     */
    modifierProduit(id) {
        const p = Produit.getById(id);
        if (!p) return;

        App.ouvrirModal('Modifier le produit', `
            <form id="form-produit-edit" onsubmit="Parametres.sauvegarderModifProduit(event, '${id}')">
                <div class="form-group">
                    <label>Nom du produit/service *</label>
                    <input type="text" id="produit-nom" value="${App.escapeHtml(p.nom)}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="produit-description" rows="2">${App.escapeHtml(p.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Prix unitaire *</label>
                    <input type="number" id="produit-prix" value="${p.prixUnitaire}" step="0.01" min="0" required>
                </div>
                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Enregistrer</button>
                </div>
            </form>
        `);
    },

    /**
     * Sauvegarde les modifications d'un produit
     */
    sauvegarderModifProduit(event, id) {
        event.preventDefault();

        try {
            Produit.modifier(id, {
                nom: document.getElementById('produit-nom').value.trim(),
                description: document.getElementById('produit-description').value.trim(),
                prixUnitaire: document.getElementById('produit-prix').value
            });

            App.fermerModal();
            App.notification('Produit modifié avec succès', 'success');
            document.getElementById('tab-produits').innerHTML = this.renderProduits();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Supprime un produit
     */
    supprimerProduit(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;

        try {
            Produit.supprimer(id);
            App.notification('Produit supprimé', 'success');
            document.getElementById('tab-produits').innerHTML = this.renderProduits();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    }
};
