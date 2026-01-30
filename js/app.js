/**
 * Application principale - Point d'entrée
 * Gère le flux multi-dossiers et la navigation
 */

const App = {
    /**
     * Initialisation de l'application
     * Détecte le dernier dossier ou affiche l'écran de sélection
     */
    init() {
        // Initialiser Firebase Auth avec callbacks
        Auth.init(
            // Callback: utilisateur connecté
            async (utilisateur) => {
                this._mettreAJourEmailMenu(utilisateur.email);

                // Vérifier l'accès : propriétaire ou essai actif
                if (Auth.estProprietaire() || Auth.essaiActif()) {
                    document.getElementById('ecran-login').style.display = 'none';

                    // Initialiser Firestore et charger les données maître
                    this._afficherChargement(true);
                    try {
                        const result = await Storage.initFirestore(utilisateur.uid);

                        if (!result.success) {
                            this.notification(
                                'Erreur de connexion à la base de données: ' + result.error +
                                '. Vos données ne seront pas sauvegardées.',
                                'danger'
                            );
                        }

                        // Migration localStorage → Firestore (une seule fois)
                        await this.migrerLocalStorageVersFirestore();

                        // Migration V1: détecter les anciennes données sans dossier
                        this.migrerDonneesV1();

                        const dernierDossierId = Storage.getDernierDossier();
                        const dossiers = Storage.getDossiers();

                        if (dernierDossierId && dossiers.find(d => d.id === dernierDossierId)) {
                            await this.ouvrirDossierExistant(dernierDossierId);
                        } else {
                            this._afficherChargement(false);
                            this.afficherEcranDossiers();
                        }
                    } catch (e) {
                        console.error('Erreur initialisation:', e);
                        this._afficherChargement(false);
                        this.notification('Erreur d\'initialisation: ' + e.message, 'danger');
                        this.afficherEcranDossiers();
                    }
                } else {
                    // Essai expiré → écran abonnement requis
                    this.afficherAbonnementRequis();
                }
            },
            // Callback: utilisateur déconnecté
            () => {
                this.afficherEcranLogin();
            }
        );
    },

    // ========== MIGRATION LOCALSTORAGE → FIRESTORE ==========

    /**
     * Migre les données existantes de localStorage vers Firestore
     * Ne s'exécute qu'une seule fois (marqueur: comptabilite_firestore_migrated)
     */
    async migrerLocalStorageVersFirestore() {
        // Vérifier si la migration a déjà été effectuée
        if (localStorage.getItem('comptabilite_firestore_migrated')) return;

        // Vérifier s'il y a des données localStorage à migrer
        const dossiersMaster = localStorage.getItem('comptabilite_dossiers');
        if (!dossiersMaster) {
            // Rien à migrer
            localStorage.setItem('comptabilite_firestore_migrated', 'true');
            return;
        }

        console.log('Migration localStorage → Firestore en cours...');

        try {
            let dossiers;
            try {
                dossiers = JSON.parse(dossiersMaster);
            } catch (e) {
                dossiers = [];
            }

            if (!Array.isArray(dossiers) || dossiers.length === 0) {
                localStorage.setItem('comptabilite_firestore_migrated', 'true');
                return;
            }

            // Vérifier si Firestore a déjà des dossiers (éviter doublon)
            const dossiersFirestore = Storage.getDossiers();
            if (dossiersFirestore.length > 0) {
                localStorage.setItem('comptabilite_firestore_migrated', 'true');
                return;
            }

            // Sauvegarder les dossiers dans le master cache
            Storage._masterCache.dossiers = dossiers;

            const dernierDossier = localStorage.getItem('comptabilite_dernierDossier');
            if (dernierDossier) {
                try {
                    Storage._masterCache.dernierDossier = JSON.parse(dernierDossier);
                } catch (e) {
                    Storage._masterCache.dernierDossier = dernierDossier;
                }
            }

            // Écrire le document maître dans Firestore
            await Storage._db.collection('users').doc(Storage._uid).set({
                dossiers: Storage._masterCache.dossiers,
                dernierDossier: Storage._masterCache.dernierDossier
            });

            // Pour chaque dossier, migrer les données
            const cles = [
                'initialized', 'entreprise', 'taxes', 'exercice', 'comptes',
                'transactions', 'clients', 'fournisseurs', 'factures',
                'projets', 'immobilisations', 'amortissements', 'logo'
            ];

            for (const dossier of dossiers) {
                const prefix = 'comptabilite_' + dossier.id + '_';

                for (const cle of cles) {
                    const raw = localStorage.getItem(prefix + cle);
                    if (raw !== null) {
                        let value;
                        try {
                            value = JSON.parse(raw);
                        } catch (e) {
                            value = raw;
                        }

                        await Storage._db
                            .collection('users').doc(Storage._uid)
                            .collection('dossiers').doc(dossier.id)
                            .collection('data').doc(cle)
                            .set({ value: value });
                    }
                }

                console.log('Dossier migré:', dossier.nom);
            }

            // Marquer la migration comme complétée
            localStorage.setItem('comptabilite_firestore_migrated', 'true');
            console.log('Migration localStorage → Firestore terminée.');

        } catch (e) {
            console.error('Erreur migration localStorage → Firestore:', e);
        }
    },

    /**
     * Migration V1: migre les anciennes données (sans système de dossiers)
     * vers le nouveau format multi-dossiers
     */
    migrerDonneesV1() {
        // Vérifier s'il y a des données V1 (clé 'comptabilite_initialized' sans dossiers)
        const ancienneInit = localStorage.getItem('comptabilite_initialized');
        const dossiersExistants = Storage.getDossiers();

        if (ancienneInit && dossiersExistants.length === 0) {
            console.log('Migration V1 détectée: migration des anciennes données...');

            // Récupérer les anciennes données avec le préfixe simple
            const ancienPrefix = 'comptabilite_';
            const ancienneEntreprise = JSON.parse(localStorage.getItem(ancienPrefix + 'entreprise') || 'null');
            const anciennesTaxes = JSON.parse(localStorage.getItem(ancienPrefix + 'taxes') || 'null');
            const ancienExercice = JSON.parse(localStorage.getItem(ancienPrefix + 'exercice') || 'null');
            const anciensComptes = JSON.parse(localStorage.getItem(ancienPrefix + 'comptes') || 'null');
            const anciennesTransactions = JSON.parse(localStorage.getItem(ancienPrefix + 'transactions') || 'null');
            const anciensClients = JSON.parse(localStorage.getItem(ancienPrefix + 'clients') || 'null');
            const anciensFournisseurs = JSON.parse(localStorage.getItem(ancienPrefix + 'fournisseurs') || 'null');
            const anciennesFactures = JSON.parse(localStorage.getItem(ancienPrefix + 'factures') || 'null');

            // Créer un nouveau dossier pour les données migrées
            const id = Storage.generateId();
            const nomEntreprise = (ancienneEntreprise && (ancienneEntreprise.nomCommercial || ancienneEntreprise.nom)) || 'Dossier migré';

            // Enrichir l'entreprise avec le nouveau schéma
            const entrepriseMigree = ancienneEntreprise ? {
                nomCommercial: ancienneEntreprise.nomCommercial || ancienneEntreprise.nom || 'Mon Entreprise',
                raisonSociale: ancienneEntreprise.raisonSociale || '',
                adresse: ancienneEntreprise.adresse || '',
                ville: ancienneEntreprise.ville || '',
                province: ancienneEntreprise.province || 'QC',
                codePostal: ancienneEntreprise.codePostal || '',
                pays: ancienneEntreprise.pays || 'Canada',
                telephone: ancienneEntreprise.telephone || '',
                telecopieur: ancienneEntreprise.telecopieur || '',
                courriel: ancienneEntreprise.courriel || '',
                siteWeb: ancienneEntreprise.siteWeb || '',
                neq: ancienneEntreprise.neq || '',
                tps: ancienneEntreprise.tps || '',
                tvq: ancienneEntreprise.tvq || '',
                dateCreationEntreprise: ancienneEntreprise.dateCreationEntreprise || ''
            } : null;

            // Enregistrer le dossier dans le registre
            const dossiers = [{
                id: id,
                nom: nomEntreprise,
                dateCreation: new Date().toISOString(),
                dernierAcces: new Date().toISOString()
            }];
            Storage.saveDossiers(dossiers);

            // Activer le dossier et copier les données
            Storage.activerDossier(id);
            Storage._cache = {};
            Storage.initDefaultData();
            Storage.set('initialized', true);

            if (entrepriseMigree) Storage.set('entreprise', entrepriseMigree);
            if (anciennesTaxes) Storage.set('taxes', anciennesTaxes);
            if (ancienExercice) Storage.set('exercice', ancienExercice);
            if (anciensComptes) Storage.set('comptes', anciensComptes);
            if (anciennesTransactions) Storage.set('transactions', anciennesTransactions);
            if (anciensClients) Storage.set('clients', anciensClients);
            if (anciensFournisseurs) Storage.set('fournisseurs', anciensFournisseurs);
            if (anciennesFactures) Storage.set('factures', anciennesFactures);

            // Nettoyer les anciennes clés V1
            const anciensKeys = [
                'comptabilite_initialized',
                'comptabilite_entreprise',
                'comptabilite_taxes',
                'comptabilite_exercice',
                'comptabilite_comptes',
                'comptabilite_transactions',
                'comptabilite_clients',
                'comptabilite_fournisseurs',
                'comptabilite_factures'
            ];
            anciensKeys.forEach(k => localStorage.removeItem(k));

            console.log('Migration V1 terminée. Dossier créé:', nomEntreprise);
        }
    },

    // ========== AUTHENTIFICATION ==========

    /**
     * Affiche l'écran de connexion
     */
    afficherEcranLogin() {
        document.getElementById('ecran-login').style.display = '';
        document.getElementById('ecran-dossiers').style.display = 'none';
        document.getElementById('app-principal').style.display = 'none';
        this._mettreAJourEmailMenu('');
        // Réinitialiser les formulaires
        this.basculerInscription(false);
        document.getElementById('login-erreur').style.display = 'none';
        document.getElementById('inscription-erreur').style.display = 'none';
        document.getElementById('ecran-prix').style.display = 'none';
        document.getElementById('ecran-abonnement-requis').style.display = 'none';
    },

    /**
     * Bascule entre le formulaire de connexion et d'inscription
     */
    basculerInscription(afficherInscription) {
        document.getElementById('form-connexion').style.display = afficherInscription ? 'none' : '';
        document.getElementById('form-inscription').style.display = afficherInscription ? '' : 'none';
        document.getElementById('ecran-prix').style.display = 'none';
        document.getElementById('ecran-abonnement-requis').style.display = 'none';
        document.getElementById('login-erreur').style.display = 'none';
        document.getElementById('inscription-erreur').style.display = 'none';
    },

    /**
     * Envoie un courriel de réinitialisation du mot de passe
     */
    async reinitialiserMotDePasse() {
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            const erreurDiv = document.getElementById('login-erreur');
            erreurDiv.textContent = 'Entrez votre courriel avant de cliquer sur "Mot de passe oublié".';
            erreurDiv.style.display = '';
            return;
        }
        try {
            await Auth.reinitialiserMotDePasse(email);
            this.notification('Un courriel de réinitialisation a été envoyé à ' + email, 'success');
        } catch (erreur) {
            const erreurDiv = document.getElementById('login-erreur');
            erreurDiv.textContent = erreur;
            erreurDiv.style.display = '';
        }
    },

    /**
     * Affiche l'écran de prix (9,95$/mois) dans la login-card
     */
    afficherPrix() {
        document.getElementById('form-connexion').style.display = 'none';
        document.getElementById('form-inscription').style.display = 'none';
        document.getElementById('ecran-abonnement-requis').style.display = 'none';
        document.getElementById('ecran-prix').style.display = '';
    },

    /**
     * Affiche l'écran de blocage quand l'essai est expiré
     */
    afficherAbonnementRequis() {
        document.getElementById('ecran-login').style.display = '';
        document.getElementById('ecran-dossiers').style.display = 'none';
        document.getElementById('app-principal').style.display = 'none';
        document.getElementById('form-connexion').style.display = 'none';
        document.getElementById('form-inscription').style.display = 'none';
        document.getElementById('ecran-prix').style.display = 'none';
        document.getElementById('ecran-abonnement-requis').style.display = '';
    },

    /**
     * Soumet le formulaire de connexion
     */
    async soumettreConnexion(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const mdp = document.getElementById('login-mdp').value;
        const erreurDiv = document.getElementById('login-erreur');
        const btn = document.getElementById('btn-connexion');

        erreurDiv.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Connexion...';

        try {
            await Auth.connecter(email, mdp);
            // onAuthStateChanged gère la suite
        } catch (erreur) {
            erreurDiv.textContent = erreur;
            erreurDiv.style.display = '';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Se connecter';
        }
    },

    /**
     * Soumet le formulaire d'inscription
     */
    async soumettreInscription(event) {
        event.preventDefault();
        const email = document.getElementById('inscription-email').value.trim();
        const mdp = document.getElementById('inscription-mdp').value;
        const mdpConfirm = document.getElementById('inscription-mdp-confirm').value;
        const erreurDiv = document.getElementById('inscription-erreur');
        const btn = document.getElementById('btn-inscription');

        erreurDiv.style.display = 'none';

        if (mdp !== mdpConfirm) {
            erreurDiv.textContent = 'Les mots de passe ne correspondent pas.';
            erreurDiv.style.display = '';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Création...';

        try {
            await Auth.inscrire(email, mdp);
            // onAuthStateChanged gère la suite
        } catch (erreur) {
            erreurDiv.textContent = erreur;
            erreurDiv.style.display = '';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Créer le compte';
        }
    },

    /**
     * Déconnexion de l'utilisateur
     */
    async deconnecter() {
        try {
            await Auth.deconnecter();
            // onAuthStateChanged gère la suite
        } catch (erreur) {
            this.notification('Erreur lors de la déconnexion: ' + erreur, 'danger');
        }
    },

    /**
     * Met à jour l'email affiché dans la barre de menu
     */
    _mettreAJourEmailMenu(email) {
        const el = document.getElementById('utilisateur-email');
        if (el) {
            el.textContent = email || '';
        }
    },

    // ========== GESTION DES DOSSIERS ==========

    /**
     * Affiche l'écran de sélection de dossiers
     */
    afficherEcranDossiers() {
        document.getElementById('ecran-login').style.display = 'none';
        document.getElementById('ecran-dossiers').style.display = '';
        document.getElementById('app-principal').style.display = 'none';

        const dossiers = Storage.getDossiers();
        const container = document.getElementById('dossiers-liste');

        if (dossiers.length === 0) {
            container.innerHTML = `
                <div class="dossiers-vide">
                    <p>Aucun dossier</p>
                    <p>Cliquez sur "Nouveau dossier" pour commencer.</p>
                </div>
            `;
            return;
        }

        // Trier par dernier accès (plus récent en premier)
        const dossiersTries = [...dossiers].sort((a, b) =>
            new Date(b.dernierAcces) - new Date(a.dernierAcces)
        );

        container.innerHTML = dossiersTries.map(d => {
            const dateCreation = new Date(d.dateCreation).toLocaleDateString('fr-CA');
            const dernierAcces = new Date(d.dernierAcces).toLocaleDateString('fr-CA');
            return `
                <div class="dossier-card" onclick="App.ouvrirDossierExistant('${d.id}')">
                    <div class="dossier-nom">${this.escapeHtml(d.nom)}</div>
                    <div class="dossier-date">Créé le ${dateCreation}</div>
                    <div class="dossier-acces">Dernier accès: ${dernierAcces}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Ouvre un dossier existant et affiche l'application
     */
    async ouvrirDossierExistant(id) {
        this._afficherChargement(true);

        try {
            // Charger les données du dossier depuis Firestore
            await Storage.chargerDossierDepuisFirestore(id);

            Storage.activerDossier(id);
            Storage.init();

            document.getElementById('ecran-login').style.display = 'none';
            document.getElementById('ecran-dossiers').style.display = 'none';
            document.getElementById('app-principal').style.display = '';

            // Mettre à jour le nom de l'entreprise dans la barre
            const entreprise = Storage.get('entreprise');
            if (entreprise) {
                const nom = entreprise.nomCommercial || entreprise.nom || 'Votre Entreprise';
                document.getElementById('entreprise-nom').textContent = nom;
            }

            this.mettreAJourDashboard();
            this.afficherPage('accueil');

            console.log('Dossier ouvert:', id);
        } catch (e) {
            console.error('Erreur ouverture dossier:', e);
            this.notification('Erreur lors de l\'ouverture du dossier', 'danger');
        } finally {
            this._afficherChargement(false);
        }
    },

    /**
     * Change de dossier (retourne à l'écran de sélection)
     */
    changerDossier() {
        this.afficherEcranDossiers();
    },

    /**
     * Affiche le formulaire de création de dossier
     */
    afficherCreationDossier() {
        // S'assurer que le modal est visible (fonctionne depuis l'écran dossiers ou l'app)
        const contenu = `
            <form id="form-nouveau-dossier" onsubmit="App.creerNouveauDossier(event)">
                <div class="form-section">
                    <h4>Identification</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom commercial *</label>
                            <input type="text" id="nd-nomCommercial" required placeholder="Nom affiché de l'entreprise">
                        </div>
                        <div class="form-group">
                            <label>Raison sociale</label>
                            <input type="text" id="nd-raisonSociale" placeholder="Dénomination légale">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>NEQ (Numéro d'entreprise du Québec)</label>
                            <input type="text" id="nd-neq" placeholder="1234567890">
                        </div>
                        <div class="form-group">
                            <label>Date de création de l'entreprise</label>
                            <input type="date" id="nd-dateCreation">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Numéros de taxes</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Numéro de TPS</label>
                            <input type="text" id="nd-tps" placeholder="123456789 RT 0001">
                        </div>
                        <div class="form-group">
                            <label>Numéro de TVQ</label>
                            <input type="text" id="nd-tvq" placeholder="1234567890 TQ 0001">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Adresse</h4>
                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" id="nd-adresse" placeholder="123 rue Principale">
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label>Ville</label>
                            <input type="text" id="nd-ville">
                        </div>
                        <div class="form-group">
                            <label>Province</label>
                            <select id="nd-province">
                                <option value="QC" selected>Québec</option>
                                <option value="ON">Ontario</option>
                                <option value="BC">Colombie-Britannique</option>
                                <option value="AB">Alberta</option>
                                <option value="SK">Saskatchewan</option>
                                <option value="MB">Manitoba</option>
                                <option value="NB">Nouveau-Brunswick</option>
                                <option value="NS">Nouvelle-Écosse</option>
                                <option value="PE">Île-du-Prince-Édouard</option>
                                <option value="NL">Terre-Neuve-et-Labrador</option>
                                <option value="YT">Yukon</option>
                                <option value="NT">Territoires du Nord-Ouest</option>
                                <option value="NU">Nunavut</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Code postal</label>
                            <input type="text" id="nd-codePostal" placeholder="H1A 1A1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Pays</label>
                        <input type="text" id="nd-pays" value="Canada">
                    </div>
                </div>

                <div class="form-section">
                    <h4>Contact</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="nd-telephone" placeholder="(514) 555-1234">
                        </div>
                        <div class="form-group">
                            <label>Télécopieur</label>
                            <input type="tel" id="nd-telecopieur" placeholder="(514) 555-5678">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Courriel</label>
                            <input type="email" id="nd-courriel" placeholder="info@entreprise.ca">
                        </div>
                        <div class="form-group">
                            <label>Site Web</label>
                            <input type="text" id="nd-siteWeb" placeholder="www.entreprise.ca">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>Exercice financier</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Début de l'exercice</label>
                            <input type="date" id="nd-exerciceDebut" value="${new Date().getFullYear()}-01-01">
                        </div>
                        <div class="form-group">
                            <label>Fin de l'exercice</label>
                            <input type="date" id="nd-exerciceFin" value="${new Date().getFullYear()}-12-31">
                        </div>
                    </div>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Créer le dossier</button>
                </div>
            </form>
        `;

        this.ouvrirModal('Nouveau dossier', contenu);
    },

    /**
     * Crée un nouveau dossier à partir du formulaire
     */
    async creerNouveauDossier(event) {
        event.preventDefault();

        const infoEntreprise = {
            nomCommercial: document.getElementById('nd-nomCommercial').value.trim(),
            raisonSociale: document.getElementById('nd-raisonSociale').value.trim(),
            neq: document.getElementById('nd-neq').value.trim(),
            dateCreationEntreprise: document.getElementById('nd-dateCreation').value,
            tps: document.getElementById('nd-tps').value.trim(),
            tvq: document.getElementById('nd-tvq').value.trim(),
            adresse: document.getElementById('nd-adresse').value.trim(),
            ville: document.getElementById('nd-ville').value.trim(),
            province: document.getElementById('nd-province').value,
            codePostal: document.getElementById('nd-codePostal').value.trim(),
            pays: document.getElementById('nd-pays').value.trim(),
            telephone: document.getElementById('nd-telephone').value.trim(),
            telecopieur: document.getElementById('nd-telecopieur').value.trim(),
            courriel: document.getElementById('nd-courriel').value.trim(),
            siteWeb: document.getElementById('nd-siteWeb').value.trim()
        };

        this._afficherChargement(true);

        try {
            const id = await Storage.creerDossier(infoEntreprise);

            // Mettre à jour l'exercice si spécifié
            const exerciceDebut = document.getElementById('nd-exerciceDebut').value;
            const exerciceFin = document.getElementById('nd-exerciceFin').value;
            if (exerciceDebut && exerciceFin) {
                Storage.set('exercice', {
                    debut: exerciceDebut,
                    fin: exerciceFin,
                    actif: true
                });
            }

            this.fermerModal();
            await this.ouvrirDossierExistant(id);
            this.notification('Dossier créé et sauvegardé avec succès', 'success');
        } catch (e) {
            console.error('Erreur création dossier:', e);
            this._afficherChargement(false);
            this.notification(
                'Erreur lors de la sauvegarde du dossier dans Firestore: ' + e.message,
                'danger'
            );
        }
    },

    /**
     * Confirmation de suppression du dossier actif
     */
    confirmerSuppressionDossier() {
        if (!Storage.activeDossierId) return;

        const dossiers = Storage.getDossiers();
        const dossier = dossiers.find(d => d.id === Storage.activeDossierId);
        const nomDossier = dossier ? dossier.nom : 'ce dossier';

        this.ouvrirModal('Supprimer le dossier', `
            <div class="alert alert-danger">
                <strong>Attention!</strong> Vous êtes sur le point de supprimer le dossier
                "<strong>${this.escapeHtml(nomDossier)}</strong>" et toutes ses données comptables.
                <br><br>
                Cette action est <strong>irréversible</strong>.
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                <button class="btn btn-danger" onclick="App.executerSuppressionDossier()">Supprimer définitivement</button>
            </div>
        `);
    },

    /**
     * Exécute la suppression du dossier actif
     */
    async executerSuppressionDossier() {
        const id = Storage.activeDossierId;
        if (!id) return;

        this._afficherChargement(true);
        try {
            await Storage.supprimerDossier(id);
            this.fermerModal();
            this.afficherEcranDossiers();
            this.notification('Dossier supprimé', 'success');
        } catch (e) {
            console.error('Erreur suppression dossier:', e);
            this.notification('Erreur lors de la suppression', 'danger');
        } finally {
            this._afficherChargement(false);
        }
    },

    // ========== NAVIGATION ET UI ==========

    /**
     * Affiche ou masque l'overlay de chargement
     */
    _afficherChargement(afficher) {
        let overlay = document.getElementById('overlay-chargement');
        if (afficher) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'overlay-chargement';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255,255,255,0.85); z-index: 9999;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: #333;
                `;
                overlay.textContent = 'Chargement...';
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    },

    /**
     * Met à jour les stats du dashboard
     */
    mettreAJourDashboard() {
        const compteEncaisse = Compte.getByNumero('1000');
        const compteClients = Compte.getByNumero('1100');
        const compteFournisseurs = Compte.getByNumero('2100');

        document.getElementById('dash-encaisse').textContent =
            Transaction.formaterMontant(compteEncaisse ? compteEncaisse.solde : 0);
        document.getElementById('dash-clients').textContent =
            Transaction.formaterMontant(compteClients ? compteClients.solde : 0);
        document.getElementById('dash-fournisseurs').textContent =
            Transaction.formaterMontant(compteFournisseurs ? compteFournisseurs.solde : 0);

        // Revenus du mois
        const compteVentes = Compte.getByNumero('4000');
        document.getElementById('dash-revenus').textContent =
            Transaction.formaterMontant(compteVentes ? compteVentes.solde : 0);
    },

    /**
     * Affiche une page spécifique
     */
    afficherPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    },

    /**
     * Retourne à l'accueil
     */
    retourAccueil() {
        this.afficherPage('accueil');
        this.mettreAJourDashboard();
    },

    /**
     * Ouvre un modal
     */
    ouvrirModal(titre, contenu) {
        document.getElementById('modal-titre').textContent = titre;
        document.getElementById('modal-body').innerHTML = contenu;
        document.getElementById('modal').classList.add('active');
    },

    /**
     * Ferme le modal
     */
    fermerModal() {
        document.getElementById('modal').classList.remove('active');
    },

    /**
     * Affiche une notification
     */
    notification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `alert alert-${type}`;
        notif.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 300;
            min-width: 300px;
            max-width: 500px;
            animation: slideIn 0.3s ease;
        `;
        notif.textContent = message;

        if (!document.getElementById('notif-styles')) {
            const style = document.createElement('style');
            style.id = 'notif-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },

    // ========== FICHIER ==========

    /**
     * Exporter les données du dossier actif
     */
    exporter() {
        if (!Storage.activeDossierId) return;

        const donnees = Storage.exporterDonnees();
        const blob = new Blob([donnees], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const entreprise = Storage.get('entreprise');
        const nom = (entreprise.nomCommercial || entreprise.nom || 'comptabilite');
        const nomFichier = nom.replace(/[^a-z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/gi, '_');
        const date = Storage.aujourdhui();

        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomFichier}_${date}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.notification('Données exportées avec succès', 'success');
    },

    /**
     * Importer des données dans le dossier actif
     */
    importer() {
        if (!Storage.activeDossierId) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                if (Storage.importerDonnees(event.target.result)) {
                    this.notification('Données importées avec succès', 'success');
                    // Mettre à jour le nom du dossier dans le registre
                    const entreprise = Storage.get('entreprise');
                    if (entreprise) {
                        const nom = entreprise.nomCommercial || entreprise.nom;
                        if (nom) {
                            Storage.renommerDossier(Storage.activeDossierId, nom);
                        }
                    }
                    this.ouvrirDossierExistant(Storage.activeDossierId);
                } else {
                    this.notification('Erreur lors de l\'importation', 'danger');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },

    // ========== OUTILS ==========

    /**
     * Affiche la calculatrice
     */
    calculatrice() {
        document.getElementById('calculatrice').classList.remove('hidden');
        document.getElementById('calc-display').value = '';
    },

    /**
     * Ferme la calculatrice
     */
    fermerCalculatrice() {
        document.getElementById('calculatrice').classList.add('hidden');
    },

    /**
     * Bouton de la calculatrice
     */
    calcBtn(val) {
        document.getElementById('calc-display').value += val;
    },

    /**
     * Calculer le résultat
     */
    calcEgal() {
        try {
            const result = eval(document.getElementById('calc-display').value);
            document.getElementById('calc-display').value = result;
        } catch (e) {
            document.getElementById('calc-display').value = 'Erreur';
        }
    },

    /**
     * Effacer la calculatrice
     */
    calcClear() {
        document.getElementById('calc-display').value = '';
    },

    /**
     * Fermeture d'exercice
     */
    fermetureExercice() {
        this.ouvrirModal('Fermeture d\'exercice', `
            <div class="alert alert-warning">
                <strong>Attention:</strong> La fermeture d'exercice va:
                <ul>
                    <li>Transférer le bénéfice net aux bénéfices non répartis</li>
                    <li>Remettre à zéro les comptes de revenus et dépenses</li>
                </ul>
                Cette opération est irréversible.
            </div>

            <form onsubmit="App.executerFermeture(event)">
                <div class="form-group">
                    <label>Date de fermeture</label>
                    <input type="date" id="fermeture-date" value="${Storage.aujourdhui()}" required>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-danger">Confirmer la fermeture</button>
                </div>
            </form>
        `);
    },

    /**
     * Exécute la fermeture d'exercice
     */
    executerFermeture(event) {
        event.preventDefault();

        const date = document.getElementById('fermeture-date').value;
        const comptes = Compte.getActifs();

        const revenus = comptes.filter(c => c.type === 'revenus');
        const depenses = comptes.filter(c => c.type === 'depenses');

        const totalRevenus = revenus.reduce((s, c) => s + c.solde, 0);
        const totalDepenses = depenses.reduce((s, c) => s + c.solde, 0);
        const beneficeNet = totalRevenus - totalDepenses;

        const lignes = [];

        revenus.forEach(c => {
            if (c.solde !== 0) {
                lignes.push({
                    compte: c.numero,
                    debit: c.solde,
                    credit: 0
                });
            }
        });

        depenses.forEach(c => {
            if (c.solde !== 0) {
                lignes.push({
                    compte: c.numero,
                    debit: 0,
                    credit: c.solde
                });
            }
        });

        if (beneficeNet !== 0) {
            lignes.push({
                compte: '3400',
                debit: beneficeNet < 0 ? Math.abs(beneficeNet) : 0,
                credit: beneficeNet > 0 ? beneficeNet : 0
            });
        }

        if (lignes.length === 0) {
            this.notification('Aucune opération à effectuer', 'info');
            this.fermerModal();
            return;
        }

        try {
            Transaction.creer({
                date: date,
                description: 'Fermeture d\'exercice',
                reference: 'FERM-' + date,
                lignes: lignes,
                module: 'general'
            });

            this.notification('Fermeture d\'exercice effectuée avec succès', 'success');
            this.fermerModal();
            this.mettreAJourDashboard();
        } catch (e) {
            this.notification('Erreur: ' + e.message, 'danger');
        }
    },

    /**
     * À propos
     */
    aPropos() {
        this.ouvrirModal('À propos', `
            <div style="text-align: center;">
                <h2 style="color: var(--primary-color);">Votre Entreprise</h2>
                <p>Version 2.0</p>
                <p>Système de comptabilité web</p>
                <hr style="margin: 20px 0;">
                <p>Logiciel de comptabilité</p>
                <p>Plan comptable canadien</p>
                <hr style="margin: 20px 0;">
                <p><strong>Fonctionnalités:</strong></p>
                <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                    <li>Gestion multi-dossiers</li>
                    <li>Gestion du plan comptable</li>
                    <li>Écritures comptables</li>
                    <li>Gestion des clients et fournisseurs</li>
                    <li>Facturation (ventes et achats)</li>
                    <li>Encaissements et paiements</li>
                    <li>Rapports financiers</li>
                </ul>
            </div>
        `);
    },

    // ========== UTILITAIRES ==========

    /**
     * Échappe le HTML pour éviter les injections XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Fermer le modal en cliquant à l'extérieur
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) {
        App.fermerModal();
    }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        App.fermerModal();
        App.fermerCalculatrice();
    }
});
