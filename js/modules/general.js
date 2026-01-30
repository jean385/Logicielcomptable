/**
 * Module Général
 * Grand livre, journal général, écritures manuelles
 */

const General = {
    /**
     * Affiche le module général
     */
    afficher() {
        App.afficherPage('module-general');

        const container = document.getElementById('module-general');
        container.innerHTML = `
            <div class="module-header">
                <button class="btn-retour" onclick="App.retourAccueil()">← Tableau de bord</button>
                <h1>Module Général</h1>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="General.afficherOnglet('journal')">Journal général</button>
                <button class="tab" onclick="General.afficherOnglet('grand-livre')">Grand livre</button>
                <button class="tab" onclick="General.afficherOnglet('ecriture')">Nouvelle écriture</button>
            </div>

            <div id="tab-journal" class="tab-content active">
                ${this.renderJournal()}
            </div>

            <div id="tab-grand-livre" class="tab-content">
                ${this.renderGrandLivre()}
            </div>

            <div id="tab-ecriture" class="tab-content">
                ${this.renderNouvelleEcriture()}
            </div>
        `;

        this.initEcriture();
    },

    /**
     * Affiche un onglet spécifique
     */
    afficherOnglet(onglet) {
        document.querySelectorAll('#module-general .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#module-general .tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`#module-general [onclick="General.afficherOnglet('${onglet}')"]`).classList.add('active');
        document.getElementById('tab-' + onglet).classList.add('active');

        // Rafraîchir le contenu selon l'onglet
        if (onglet === 'journal') {
            document.getElementById('tab-journal').innerHTML = this.renderJournal();
        } else if (onglet === 'grand-livre') {
            document.getElementById('tab-grand-livre').innerHTML = this.renderGrandLivre();
        } else if (onglet === 'ecriture') {
            this.initEcriture();
        }
    },

    /**
     * Render le journal général
     */
    renderJournal() {
        const transactions = Transaction.getAll();
        const exercice = Storage.get('exercice');

        let tableRows = '';
        transactions.forEach(t => {
            const premiereLigne = t.lignes[0];
            const compte = Compte.getByNumero(premiereLigne.compte);

            tableRows += `
                <tr class="transaction-header" onclick="General.toggleDetails('${t.id}')">
                    <td>${t.date}</td>
                    <td>${t.reference}</td>
                    <td>${t.description}${t.projetId ? (() => { const p = Projet.getById(t.projetId); return p ? ' <span class="badge badge-info">' + (p.code || p.nom) + '</span>' : ''; })() : ''}</td>
                    <td colspan="2" class="text-right">
                        ${Transaction.formaterMontant(t.lignes.reduce((s, l) => s + l.debit, 0))}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); General.contrepasserTransaction('${t.id}')" title="Contre-passer">
                            Corriger
                        </button>
                        <button class="btn btn-danger" onclick="event.stopPropagation(); General.supprimerTransaction('${t.id}')" title="Supprimer">
                            Suppr
                        </button>
                    </td>
                </tr>
                <tr id="details-${t.id}" class="transaction-details" style="display: none;">
                    <td colspan="6">
                        <table style="width: 100%; margin-left: 20px;">
                            ${t.lignes.map(l => {
                const c = Compte.getByNumero(l.compte);
                return `
                                    <tr>
                                        <td style="width: 150px;">${l.compte}</td>
                                        <td>${c ? c.nom : 'Compte inconnu'}</td>
                                        <td class="text-right" style="width: 120px;">${l.debit ? Transaction.formaterMontant(l.debit) : ''}</td>
                                        <td class="text-right" style="width: 120px;">${l.credit ? Transaction.formaterMontant(l.credit) : ''}</td>
                                    </tr>
                                `;
            }).join('')}
                        </table>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="toolbar">
                <input type="date" id="journal-date-debut" value="${exercice.debut}" onchange="General.filtrerJournal()">
                <input type="date" id="journal-date-fin" value="${exercice.fin}" onchange="General.filtrerJournal()">
                <input type="text" class="search-input" placeholder="Rechercher..."
                    onkeyup="General.rechercherJournal(this.value)">
            </div>

            <div class="table-container">
                <table id="table-journal">
                    <thead>
                        <tr>
                            <th style="width: 100px;">Date</th>
                            <th style="width: 120px;">Référence</th>
                            <th>Description</th>
                            <th class="text-right" style="width: 120px;">Débit</th>
                            <th class="text-right" style="width: 120px;">Crédit</th>
                            <th class="text-center" style="width: 140px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucune écriture</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Toggle les détails d'une transaction
     */
    toggleDetails(id) {
        const details = document.getElementById('details-' + id);
        if (details) {
            details.style.display = details.style.display === 'none' ? '' : 'none';
        }
    },

    /**
     * Filtre le journal par dates
     */
    filtrerJournal() {
        const dateDebut = document.getElementById('journal-date-debut').value;
        const dateFin = document.getElementById('journal-date-fin').value;

        const rows = document.querySelectorAll('#table-journal tbody tr.transaction-header');
        rows.forEach(row => {
            const date = row.cells[0].textContent;
            const visible = date >= dateDebut && date <= dateFin;
            row.style.display = visible ? '' : 'none';

            // Cacher aussi les détails
            const id = row.getAttribute('onclick').match(/'([^']+)'/)[1];
            const details = document.getElementById('details-' + id);
            if (details) {
                details.style.display = 'none';
            }
        });
    },

    /**
     * Recherche dans le journal
     */
    rechercherJournal(terme) {
        const termeLower = terme.toLowerCase();
        const rows = document.querySelectorAll('#table-journal tbody tr.transaction-header');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const visible = text.includes(termeLower);
            row.style.display = visible ? '' : 'none';

            const id = row.getAttribute('onclick').match(/'([^']+)'/)[1];
            const details = document.getElementById('details-' + id);
            if (details) {
                details.style.display = 'none';
            }
        });
    },

    /**
     * Supprime une transaction
     */
    supprimerTransaction(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette écriture? Cette action inversera les soldes des comptes affectés.')) {
            return;
        }

        try {
            Transaction.supprimer(id);
            App.notification('Écriture supprimée', 'success');
            document.getElementById('tab-journal').innerHTML = this.renderJournal();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Contre-passe une transaction (crée une écriture inverse)
     */
    contrepasserTransaction(id) {
        const transaction = Transaction.getById(id);
        if (!transaction) {
            App.notification('Transaction non trouvée', 'danger');
            return;
        }

        // Afficher les détails et demander confirmation
        let lignesHtml = transaction.lignes.map(l => {
            const c = Compte.getByNumero(l.compte);
            return `<tr>
                <td>${l.compte} - ${c ? c.nom : 'Inconnu'}</td>
                <td class="text-right">${l.debit ? Transaction.formaterMontant(l.debit) : ''}</td>
                <td class="text-right">${l.credit ? Transaction.formaterMontant(l.credit) : ''}</td>
            </tr>`;
        }).join('');

        let lignesInverseHtml = transaction.lignes.map(l => {
            const c = Compte.getByNumero(l.compte);
            return `<tr>
                <td>${l.compte} - ${c ? c.nom : 'Inconnu'}</td>
                <td class="text-right">${l.credit ? Transaction.formaterMontant(l.credit) : ''}</td>
                <td class="text-right">${l.debit ? Transaction.formaterMontant(l.debit) : ''}</td>
            </tr>`;
        }).join('');

        const aujourdhui = Storage.aujourdhui();

        App.ouvrirModal('Contre-passation', `
            <div class="alert alert-info">
                La contre-passation crée une écriture inverse pour annuler l'effet de l'écriture originale,
                tout en conservant la trace des deux écritures dans le journal.
            </div>

            <h4>Écriture originale (${transaction.date})</h4>
            <p><strong>Réf:</strong> ${transaction.reference} | <strong>Description:</strong> ${transaction.description}</p>
            <table style="width: 100%; margin-bottom: 20px;">
                <thead>
                    <tr><th>Compte</th><th class="text-right">Débit</th><th class="text-right">Crédit</th></tr>
                </thead>
                <tbody>${lignesHtml}</tbody>
            </table>

            <h4>Écriture de contre-passation (inverse)</h4>
            <table style="width: 100%; margin-bottom: 20px;">
                <thead>
                    <tr><th>Compte</th><th class="text-right">Débit</th><th class="text-right">Crédit</th></tr>
                </thead>
                <tbody>${lignesInverseHtml}</tbody>
            </table>

            <div class="form-group">
                <label>Date de la contre-passation</label>
                <input type="date" id="cp-date" value="${aujourdhui}">
            </div>
            <div class="form-group">
                <label>Motif de la correction</label>
                <input type="text" id="cp-motif" placeholder="Ex: Erreur de compte, montant erroné..." value="Correction de ${transaction.reference}">
            </div>

            <div class="form-group">
                <label>
                    <input type="checkbox" id="cp-nouvelle-ecriture" checked>
                    Créer ensuite une nouvelle écriture corrigée
                </label>
            </div>

            <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                <button type="button" class="btn btn-primary" onclick="General.executerContrepassation('${id}')">
                    Créer la contre-passation
                </button>
            </div>
        `);
    },

    /**
     * Exécute la contre-passation
     */
    executerContrepassation(id) {
        const transaction = Transaction.getById(id);
        if (!transaction) return;

        const date = document.getElementById('cp-date').value;
        const motif = document.getElementById('cp-motif').value;
        const creerNouvelle = document.getElementById('cp-nouvelle-ecriture').checked;

        // Créer les lignes inversées (débits deviennent crédits et vice-versa)
        const lignesInverses = transaction.lignes.map(l => ({
            compte: l.compte,
            debit: l.credit || 0,
            credit: l.debit || 0
        }));

        try {
            // Créer l'écriture de contre-passation
            Transaction.creer({
                date: date,
                reference: 'CP-' + transaction.reference,
                description: 'CONTRE-PASSATION: ' + motif,
                lignes: lignesInverses,
                module: 'general'
            });

            App.notification('Contre-passation créée avec succès', 'success');
            App.fermerModal();

            // Rafraîchir le journal
            document.getElementById('tab-journal').innerHTML = this.renderJournal();

            // Si demandé, ouvrir le formulaire pour la nouvelle écriture corrigée
            if (creerNouvelle) {
                setTimeout(() => {
                    this.ouvrirNouvelleEcritureCorrigee(transaction, motif);
                }, 300);
            }
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Ouvre le formulaire de nouvelle écriture pré-rempli pour correction
     */
    ouvrirNouvelleEcritureCorrigee(transactionOriginale, motif) {
        const aujourdhui = Storage.aujourdhui();

        // Générer les lignes pré-remplies
        let lignesHtml = '';
        transactionOriginale.lignes.forEach((l, index) => {
            lignesHtml += `
                <div class="ligne-ecriture">
                    <select id="ligne-compte-${index}">
                        ${Compte.genererOptionsGroupees(l.compte)}
                    </select>
                    <input type="number" id="ligne-debit-${index}" placeholder="Débit" step="0.01" min="0"
                        value="${l.debit || ''}" onchange="General.calculerTotaux()" oninput="General.calculerTotaux()">
                    <input type="number" id="ligne-credit-${index}" placeholder="Crédit" step="0.01" min="0"
                        value="${l.credit || ''}" onchange="General.calculerTotaux()" oninput="General.calculerTotaux()">
                    <button type="button" class="btn-supprimer-ligne" onclick="General.supprimerLigneEcriture(this)">×</button>
                </div>
            `;
        });

        App.ouvrirModal('Nouvelle écriture corrigée', `
            <div class="alert alert-info">
                Modifiez les valeurs ci-dessous pour créer l'écriture corrigée.
            </div>

            <div class="ecritures-form">
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="corr-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="corr-reference" value="${Transaction.genererReference('CORR')}">
                    </div>
                    <div class="form-group">
                        <label>Description *</label>
                        <input type="text" id="corr-description" value="Correction: ${transactionOriginale.description}" required>
                    </div>
                </div>

                <h4>Lignes d'écriture</h4>
                <div id="lignes-correction" class="lignes-ecriture">
                    ${lignesHtml}
                </div>

                <button type="button" class="btn btn-secondary" onclick="General.ajouterLigneCorrection()">
                    + Ajouter une ligne
                </button>

                <div id="totaux-correction" class="totaux-ecriture">
                    <span>Total débits: <strong id="total-debits-corr">0,00 $</strong></span>
                    <span>Total crédits: <strong id="total-credits-corr">0,00 $</strong></span>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="General.enregistrerCorrection()">Enregistrer</button>
                </div>
            </div>
        `);

        // Calculer les totaux initiaux
        setTimeout(() => this.calculerTotauxCorrection(), 100);
    },

    /**
     * Ajoute une ligne au formulaire de correction
     */
    ajouterLigneCorrection() {
        const container = document.getElementById('lignes-correction');
        const index = container.children.length;

        const ligne = document.createElement('div');
        ligne.className = 'ligne-ecriture';
        ligne.innerHTML = `
            <select id="ligne-compte-${index}">
                ${Compte.genererOptionsGroupees()}
            </select>
            <input type="number" id="ligne-debit-${index}" placeholder="Débit" step="0.01" min="0"
                onchange="General.calculerTotauxCorrection()" oninput="General.calculerTotauxCorrection()">
            <input type="number" id="ligne-credit-${index}" placeholder="Crédit" step="0.01" min="0"
                onchange="General.calculerTotauxCorrection()" oninput="General.calculerTotauxCorrection()">
            <button type="button" class="btn-supprimer-ligne" onclick="this.parentElement.remove(); General.calculerTotauxCorrection()">×</button>
        `;

        container.appendChild(ligne);
    },

    /**
     * Calcule les totaux du formulaire de correction
     */
    calculerTotauxCorrection() {
        const container = document.getElementById('lignes-correction');
        if (!container) return;

        let totalDebits = 0;
        let totalCredits = 0;

        Array.from(container.children).forEach((ligne, index) => {
            const debit = parseFloat(document.getElementById(`ligne-debit-${index}`)?.value) || 0;
            const credit = parseFloat(document.getElementById(`ligne-credit-${index}`)?.value) || 0;
            totalDebits += debit;
            totalCredits += credit;
        });

        const debitEl = document.getElementById('total-debits-corr');
        const creditEl = document.getElementById('total-credits-corr');
        if (debitEl) debitEl.textContent = Transaction.formaterMontant(totalDebits);
        if (creditEl) creditEl.textContent = Transaction.formaterMontant(totalCredits);

        const totauxDiv = document.getElementById('totaux-correction');
        if (totauxDiv) {
            if (Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0) {
                totauxDiv.className = 'totaux-ecriture equilibre';
            } else {
                totauxDiv.className = 'totaux-ecriture desequilibre';
            }
        }
    },

    /**
     * Enregistre l'écriture corrigée
     */
    enregistrerCorrection() {
        const date = document.getElementById('corr-date').value;
        const reference = document.getElementById('corr-reference').value;
        const description = document.getElementById('corr-description').value;

        if (!date || !description) {
            App.notification('Veuillez remplir la date et la description', 'warning');
            return;
        }

        const container = document.getElementById('lignes-correction');
        const lignes = [];

        Array.from(container.children).forEach((ligne, index) => {
            const compte = document.getElementById(`ligne-compte-${index}`)?.value;
            const debit = parseFloat(document.getElementById(`ligne-debit-${index}`)?.value) || 0;
            const credit = parseFloat(document.getElementById(`ligne-credit-${index}`)?.value) || 0;

            if (compte && (debit > 0 || credit > 0)) {
                lignes.push({ compte, debit, credit });
            }
        });

        if (lignes.length < 2) {
            App.notification('Une écriture doit avoir au moins 2 lignes valides', 'warning');
            return;
        }

        try {
            Transaction.creer({
                date,
                reference,
                description,
                lignes,
                module: 'general'
            });

            App.notification('Écriture corrigée enregistrée', 'success');
            App.fermerModal();
            document.getElementById('tab-journal').innerHTML = this.renderJournal();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    },

    /**
     * Render le grand livre
     */
    renderGrandLivre() {
        const comptes = Compte.getActifs();

        return `
            <div class="toolbar">
                <select id="gl-compte" onchange="General.afficherCompteGL()">
                    ${Compte.genererOptionsGroupees()}
                </select>
            </div>

            <div id="grand-livre-detail">
                <div class="alert alert-info">Sélectionnez un compte pour voir ses transactions.</div>
            </div>
        `;
    },

    /**
     * Affiche le détail d'un compte dans le grand livre
     */
    afficherCompteGL() {
        const numeroCompte = document.getElementById('gl-compte').value;
        const container = document.getElementById('grand-livre-detail');

        if (!numeroCompte) {
            container.innerHTML = '<div class="alert alert-info">Sélectionnez un compte pour voir ses transactions.</div>';
            return;
        }

        const compte = Compte.getByNumero(numeroCompte);
        const transactions = Transaction.getByCompte(numeroCompte);

        let soldeRunning = 0;
        let tableRows = '';

        transactions.forEach(t => {
            const ligne = t.lignes.find(l => l.compte === numeroCompte);
            if (ligne) {
                if (compte.soldeNormal === 'debit') {
                    soldeRunning += ligne.debit - ligne.credit;
                } else {
                    soldeRunning += ligne.credit - ligne.debit;
                }

                tableRows += `
                    <tr>
                        <td>${t.date}</td>
                        <td>${t.reference}</td>
                        <td>${t.description}</td>
                        <td class="text-right">${ligne.debit ? Transaction.formaterMontant(ligne.debit) : ''}</td>
                        <td class="text-right">${ligne.credit ? Transaction.formaterMontant(ligne.credit) : ''}</td>
                        <td class="text-right">${Transaction.formaterMontant(soldeRunning)}</td>
                    </tr>
                `;
            }
        });

        container.innerHTML = `
            <div class="info-cards">
                <div class="info-card">
                    <h4>Compte</h4>
                    <p>${compte.numero} - ${compte.nom}</p>
                </div>
                <div class="info-card">
                    <h4>Type</h4>
                    <p>${Compte.getTypeLibelle(compte.type)}</p>
                </div>
                <div class="info-card">
                    <h4>Solde actuel</h4>
                    <p>${Transaction.formaterMontant(compte.solde)}</p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Référence</th>
                            <th>Description</th>
                            <th class="text-right">Débit</th>
                            <th class="text-right">Crédit</th>
                            <th class="text-right">Solde</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucune transaction pour ce compte</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Render le formulaire de nouvelle écriture
     */
    renderNouvelleEcriture() {
        const aujourdhui = Storage.aujourdhui();

        return `
            <div class="ecritures-form">
                <h3>Nouvelle écriture comptable</h3>

                <div class="form-row-3">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="ecriture-date" value="${aujourdhui}" required>
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="ecriture-reference" value="${Transaction.genererReference()}">
                    </div>
                    <div class="form-group">
                        <label>Description *</label>
                        <input type="text" id="ecriture-description" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Projet</label>
                        <select id="ecriture-projet">
                            ${Projet.genererOptions()}
                        </select>
                    </div>
                </div>

                <h4>Lignes d'écriture</h4>
                <div id="lignes-ecriture" class="lignes-ecriture">
                    <!-- Les lignes seront ajoutées ici -->
                </div>

                <button type="button" class="btn btn-secondary" onclick="General.ajouterLigneEcriture()">
                    + Ajouter une ligne
                </button>

                <div id="totaux-ecriture" class="totaux-ecriture">
                    <span>Total débits: <strong id="total-debits">0,00 $</strong></span>
                    <span>Total crédits: <strong id="total-credits">0,00 $</strong></span>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="General.reinitialiserEcriture()">Réinitialiser</button>
                    <button type="button" class="btn btn-primary" onclick="General.enregistrerEcriture()">Enregistrer l'écriture</button>
                </div>
            </div>
        `;
    },

    /**
     * Initialise le formulaire d'écriture
     */
    initEcriture() {
        const container = document.getElementById('lignes-ecriture');
        if (container && container.children.length === 0) {
            this.ajouterLigneEcriture();
            this.ajouterLigneEcriture();
        }
    },

    /**
     * Ajoute une ligne d'écriture
     */
    ajouterLigneEcriture() {
        const container = document.getElementById('lignes-ecriture');
        const index = container.children.length;

        const ligne = document.createElement('div');
        ligne.className = 'ligne-ecriture';
        ligne.innerHTML = `
            <select id="ligne-compte-${index}" onchange="General.calculerTotaux()">
                ${Compte.genererOptionsGroupees()}
            </select>
            <input type="number" id="ligne-debit-${index}" placeholder="Débit" step="0.01" min="0"
                onchange="General.calculerTotaux()" oninput="General.calculerTotaux()">
            <input type="number" id="ligne-credit-${index}" placeholder="Crédit" step="0.01" min="0"
                onchange="General.calculerTotaux()" oninput="General.calculerTotaux()">
            <button type="button" class="btn-supprimer-ligne" onclick="General.supprimerLigneEcriture(this)">×</button>
        `;

        container.appendChild(ligne);
    },

    /**
     * Supprime une ligne d'écriture
     */
    supprimerLigneEcriture(btn) {
        const container = document.getElementById('lignes-ecriture');
        if (container.children.length > 2) {
            btn.parentElement.remove();
            this.calculerTotaux();
        } else {
            App.notification('Une écriture doit avoir au moins 2 lignes', 'warning');
        }
    },

    /**
     * Calcule les totaux de l'écriture
     */
    calculerTotaux() {
        const container = document.getElementById('lignes-ecriture');
        let totalDebits = 0;
        let totalCredits = 0;

        Array.from(container.children).forEach((ligne, index) => {
            const debit = parseFloat(document.getElementById(`ligne-debit-${index}`)?.value) || 0;
            const credit = parseFloat(document.getElementById(`ligne-credit-${index}`)?.value) || 0;
            totalDebits += debit;
            totalCredits += credit;
        });

        document.getElementById('total-debits').textContent = Transaction.formaterMontant(totalDebits);
        document.getElementById('total-credits').textContent = Transaction.formaterMontant(totalCredits);

        const totauxDiv = document.getElementById('totaux-ecriture');
        if (Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0) {
            totauxDiv.className = 'totaux-ecriture equilibre';
        } else {
            totauxDiv.className = 'totaux-ecriture desequilibre';
        }
    },

    /**
     * Réinitialise le formulaire d'écriture
     */
    reinitialiserEcriture() {
        document.getElementById('tab-ecriture').innerHTML = this.renderNouvelleEcriture();
        this.initEcriture();
    },

    /**
     * Enregistre l'écriture
     */
    enregistrerEcriture() {
        const date = document.getElementById('ecriture-date').value;
        const reference = document.getElementById('ecriture-reference').value;
        const description = document.getElementById('ecriture-description').value;

        if (!date || !description) {
            App.notification('Veuillez remplir la date et la description', 'warning');
            return;
        }

        const container = document.getElementById('lignes-ecriture');
        const lignes = [];

        Array.from(container.children).forEach((ligne, index) => {
            const compte = document.getElementById(`ligne-compte-${index}`)?.value;
            const debit = parseFloat(document.getElementById(`ligne-debit-${index}`)?.value) || 0;
            const credit = parseFloat(document.getElementById(`ligne-credit-${index}`)?.value) || 0;

            if (compte && (debit > 0 || credit > 0)) {
                lignes.push({ compte, debit, credit });
            }
        });

        if (lignes.length < 2) {
            App.notification('Une écriture doit avoir au moins 2 lignes valides', 'warning');
            return;
        }

        const projetId = document.getElementById('ecriture-projet')?.value || null;

        try {
            Transaction.creer({
                date,
                reference,
                description,
                projetId,
                lignes,
                module: 'general'
            });

            App.notification('Écriture enregistrée avec succès', 'success');
            this.reinitialiserEcriture();
            document.getElementById('ecriture-reference').value = Transaction.genererReference();
            // Rafraîchir le journal
            document.getElementById('tab-journal').innerHTML = this.renderJournal();
        } catch (e) {
            App.notification(e.message, 'danger');
        }
    }
};
