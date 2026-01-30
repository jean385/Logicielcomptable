/**
 * Module Rapports
 * Bilan, État des résultats, Balance de vérification, Grand livre
 */

const Rapports = {
    /**
     * Affiche le bilan
     */
    afficherBilan() {
        const date = Storage.aujourdhui();

        App.ouvrirModal('Bilan', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <label>En date du: </label>
                <input type="date" id="bilan-date" value="${date}" onchange="Rapports.genererBilan()">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-bilan-contenu">
                ${this.genererBilanHTML(date)}
            </div>
        `);
    },

    /**
     * Génère le bilan
     */
    genererBilan() {
        const date = document.getElementById('bilan-date').value;
        document.getElementById('rapport-bilan-contenu').innerHTML = this.genererBilanHTML(date);
    },

    /**
     * Génère le HTML du bilan
     */
    genererBilanHTML(date) {
        const entreprise = Storage.get('entreprise');
        const comptes = Compte.getActifs();

        // Actifs
        const actifs = comptes.filter(c => c.type === 'actif');
        let totalActifs = 0;
        let actifsHTML = '';

        actifs.forEach(c => {
            if (c.solde !== 0) {
                totalActifs += c.solde;
                actifsHTML += `
                    <div class="rapport-ligne">
                        <span>${c.numero} - ${c.nom}</span>
                        <span>${Transaction.formaterMontant(c.solde)}</span>
                    </div>
                `;
            }
        });

        // Passifs
        const passifs = comptes.filter(c => c.type === 'passif');
        let totalPassifs = 0;
        let passifsHTML = '';

        passifs.forEach(c => {
            if (c.solde !== 0) {
                totalPassifs += c.solde;
                passifsHTML += `
                    <div class="rapport-ligne">
                        <span>${c.numero} - ${c.nom}</span>
                        <span>${Transaction.formaterMontant(c.solde)}</span>
                    </div>
                `;
            }
        });

        // Capitaux propres
        const capitaux = comptes.filter(c => c.type === 'capitaux');
        let totalCapitaux = 0;
        let capitauxHTML = '';

        capitaux.forEach(c => {
            if (c.solde !== 0) {
                totalCapitaux += c.solde;
                capitauxHTML += `
                    <div class="rapport-ligne">
                        <span>${c.numero} - ${c.nom}</span>
                        <span>${Transaction.formaterMontant(c.solde)}</span>
                    </div>
                `;
            }
        });

        // Bénéfice net de l'exercice
        const revenus = comptes.filter(c => c.type === 'revenus').reduce((s, c) => s + c.solde, 0);
        const depenses = comptes.filter(c => c.type === 'depenses').reduce((s, c) => s + c.solde, 0);
        const beneficeNet = revenus - depenses;

        totalCapitaux += beneficeNet;
        if (beneficeNet !== 0) {
            capitauxHTML += `
                <div class="rapport-ligne">
                    <span>Bénéfice net de l'exercice</span>
                    <span>${Transaction.formaterMontant(beneficeNet)}</span>
                </div>
            `;
        }

        const totalPassifsCapitaux = totalPassifs + totalCapitaux;

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Bilan au ${Transaction.formaterDate(date)}</p>
                </div>

                <div class="rapport-section">
                    <h3>ACTIF</h3>
                    ${actifsHTML || '<div class="rapport-ligne"><span>Aucun actif</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total de l'actif</span>
                        <span>${Transaction.formaterMontant(totalActifs)}</span>
                    </div>
                </div>

                <div class="rapport-section">
                    <h3>PASSIF</h3>
                    ${passifsHTML || '<div class="rapport-ligne"><span>Aucun passif</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total du passif</span>
                        <span>${Transaction.formaterMontant(totalPassifs)}</span>
                    </div>
                </div>

                <div class="rapport-section">
                    <h3>CAPITAUX PROPRES</h3>
                    ${capitauxHTML || '<div class="rapport-ligne"><span>Aucun capital</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total des capitaux propres</span>
                        <span>${Transaction.formaterMontant(totalCapitaux)}</span>
                    </div>
                </div>

                <div class="rapport-ligne grand-total">
                    <span>Total du passif et des capitaux propres</span>
                    <span>${Transaction.formaterMontant(totalPassifsCapitaux)}</span>
                </div>

                ${Math.abs(totalActifs - totalPassifsCapitaux) > 0.01 ? `
                    <div class="alert alert-danger" style="margin-top: 20px;">
                        Attention: Le bilan n'est pas équilibré!
                        Différence: ${Transaction.formaterMontant(totalActifs - totalPassifsCapitaux)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Affiche l'état des résultats
     */
    afficherEtatResultats() {
        const exercice = Storage.get('exercice');

        App.ouvrirModal('État des résultats', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <label>Du: </label>
                <input type="date" id="er-date-debut" value="${exercice.debut}" onchange="Rapports.genererEtatResultats()">
                <label>Au: </label>
                <input type="date" id="er-date-fin" value="${exercice.fin}" onchange="Rapports.genererEtatResultats()">
                <select id="er-projet" onchange="Rapports.genererEtatResultats()">
                    ${Projet.genererOptionsFiltre()}
                </select>
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-er-contenu">
                ${this.genererEtatResultatsHTML(exercice.debut, exercice.fin, null)}
            </div>
        `);
    },

    /**
     * Génère l'état des résultats
     */
    genererEtatResultats() {
        const debut = document.getElementById('er-date-debut').value;
        const fin = document.getElementById('er-date-fin').value;
        const projetId = document.getElementById('er-projet')?.value || null;
        document.getElementById('rapport-er-contenu').innerHTML = this.genererEtatResultatsHTML(debut, fin, projetId);
    },

    /**
     * Génère le HTML de l'état des résultats
     */
    genererEtatResultatsHTML(dateDebut, dateFin, projetId) {
        const entreprise = Storage.get('entreprise');

        let totalRevenus = 0;
        let revenusHTML = '';
        let totalDepenses = 0;
        let depensesHTML = '';

        if (projetId) {
            // Mode filtré par projet : calculer à partir des transactions du projet
            const transactions = Transaction.getByProjet(projetId).filter(t =>
                t.date >= dateDebut && t.date <= dateFin
            );
            const comptes = Compte.getActifs();

            // Accumuler revenus et dépenses par compte
            const revenusParCompte = {};
            const depensesParCompte = {};

            transactions.forEach(t => {
                t.lignes.forEach(l => {
                    const compte = comptes.find(c => c.numero === l.compte);
                    if (!compte) return;

                    if (compte.type === 'revenus') {
                        if (!revenusParCompte[l.compte]) revenusParCompte[l.compte] = 0;
                        revenusParCompte[l.compte] += (l.credit || 0) - (l.debit || 0);
                    } else if (compte.type === 'depenses') {
                        if (!depensesParCompte[l.compte]) depensesParCompte[l.compte] = 0;
                        depensesParCompte[l.compte] += (l.debit || 0) - (l.credit || 0);
                    }
                });
            });

            for (const numero in revenusParCompte) {
                const montant = revenusParCompte[numero];
                if (montant !== 0) {
                    const compte = Compte.getByNumero(numero);
                    totalRevenus += montant;
                    revenusHTML += `
                        <div class="rapport-ligne">
                            <span>${numero} - ${compte ? compte.nom : 'Inconnu'}</span>
                            <span>${Transaction.formaterMontant(montant)}</span>
                        </div>
                    `;
                }
            }

            for (const numero in depensesParCompte) {
                const montant = depensesParCompte[numero];
                if (montant !== 0) {
                    const compte = Compte.getByNumero(numero);
                    totalDepenses += montant;
                    depensesHTML += `
                        <div class="rapport-ligne">
                            <span>${numero} - ${compte ? compte.nom : 'Inconnu'}</span>
                            <span>${Transaction.formaterMontant(montant)}</span>
                        </div>
                    `;
                }
            }
        } else {
            // Mode standard : utiliser les soldes des comptes
            const comptes = Compte.getActifs();

            const revenus = comptes.filter(c => c.type === 'revenus');
            revenus.forEach(c => {
                if (c.solde !== 0) {
                    totalRevenus += c.solde;
                    revenusHTML += `
                        <div class="rapport-ligne">
                            <span>${c.numero} - ${c.nom}</span>
                            <span>${Transaction.formaterMontant(c.solde)}</span>
                        </div>
                    `;
                }
            });

            const depenses = comptes.filter(c => c.type === 'depenses');
            depenses.forEach(c => {
                if (c.solde !== 0) {
                    totalDepenses += c.solde;
                    depensesHTML += `
                        <div class="rapport-ligne">
                            <span>${c.numero} - ${c.nom}</span>
                            <span>${Transaction.formaterMontant(c.solde)}</span>
                        </div>
                    `;
                }
            });
        }

        const beneficeNet = totalRevenus - totalDepenses;
        const estBenefice = beneficeNet >= 0;
        const projetInfo = projetId ? Projet.getById(projetId) : null;
        const projetLabel = projetInfo ? ` - Projet: ${projetInfo.code || projetInfo.nom}` : '';

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>État des résultats${projetLabel}</p>
                    <p>Du ${Transaction.formaterDate(dateDebut)} au ${Transaction.formaterDate(dateFin)}</p>
                </div>

                <div class="rapport-section">
                    <h3>REVENUS</h3>
                    ${revenusHTML || '<div class="rapport-ligne"><span>Aucun revenu</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total des revenus</span>
                        <span>${Transaction.formaterMontant(totalRevenus)}</span>
                    </div>
                </div>

                <div class="rapport-section">
                    <h3>DÉPENSES</h3>
                    ${depensesHTML || '<div class="rapport-ligne"><span>Aucune dépense</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total des dépenses</span>
                        <span>${Transaction.formaterMontant(totalDepenses)}</span>
                    </div>
                </div>

                <div class="rapport-ligne grand-total" style="color: ${estBenefice ? 'var(--success-color)' : 'var(--danger-color)'}">
                    <span>${estBenefice ? 'BÉNÉFICE NET' : 'PERTE NETTE'}</span>
                    <span>${Transaction.formaterMontant(Math.abs(beneficeNet))}</span>
                </div>
            </div>
        `;
    },

    /**
     * Affiche la balance de vérification
     */
    afficherBalance() {
        App.ouvrirModal('Balance de vérification', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-balance-contenu">
                ${this.genererBalanceHTML()}
            </div>
        `);
    },

    /**
     * Génère le HTML de la balance
     */
    genererBalanceHTML() {
        const entreprise = Storage.get('entreprise');
        const comptes = Compte.getActifs();

        let tableRows = '';
        let totalDebits = 0;
        let totalCredits = 0;

        comptes.forEach(c => {
            if (c.solde !== 0) {
                let debit = 0;
                let credit = 0;

                if (c.soldeNormal === 'debit') {
                    if (c.solde >= 0) {
                        debit = c.solde;
                    } else {
                        credit = Math.abs(c.solde);
                    }
                } else {
                    if (c.solde >= 0) {
                        credit = c.solde;
                    } else {
                        debit = Math.abs(c.solde);
                    }
                }

                totalDebits += debit;
                totalCredits += credit;

                tableRows += `
                    <tr>
                        <td>${c.numero}</td>
                        <td>${c.nom}</td>
                        <td class="text-right">${debit ? Transaction.formaterMontant(debit) : ''}</td>
                        <td class="text-right">${credit ? Transaction.formaterMontant(credit) : ''}</td>
                    </tr>
                `;
            }
        });

        const estEquilibree = Math.abs(totalDebits - totalCredits) < 0.01;

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Balance de vérification</p>
                    <p>Au ${Transaction.formaterDate(Storage.aujourdhui())}</p>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>N° Compte</th>
                            <th>Nom du compte</th>
                            <th class="text-right">Débit</th>
                            <th class="text-right">Crédit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="4" class="text-center">Aucune donnée</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; border-top: 2px solid var(--primary-color);">
                            <td colspan="2">TOTAUX</td>
                            <td class="text-right">${Transaction.formaterMontant(totalDebits)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalCredits)}</td>
                        </tr>
                    </tfoot>
                </table>

                ${estEquilibree ? `
                    <div class="alert alert-success" style="margin-top: 20px;">
                        La balance de vérification est équilibrée.
                    </div>
                ` : `
                    <div class="alert alert-danger" style="margin-top: 20px;">
                        Attention: La balance de vérification n'est pas équilibrée!
                        Différence: ${Transaction.formaterMontant(totalDebits - totalCredits)}
                    </div>
                `}
            </div>
        `;
    },

    /**
     * Affiche le grand livre
     */
    afficherGrandLivre() {
        const exercice = Storage.get('exercice');

        App.ouvrirModal('Grand livre', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <select id="gl-compte-rapport" onchange="Rapports.genererGrandLivre()">
                    <option value="">Tous les comptes</option>
                    ${Compte.genererOptionsGroupees()}
                </select>
                <label>Du: </label>
                <input type="date" id="gl-date-debut" value="${exercice.debut}" onchange="Rapports.genererGrandLivre()">
                <label>Au: </label>
                <input type="date" id="gl-date-fin" value="${exercice.fin}" onchange="Rapports.genererGrandLivre()">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-gl-contenu">
                ${this.genererGrandLivreHTML('', exercice.debut, exercice.fin)}
            </div>
        `);
    },

    /**
     * Génère le grand livre
     */
    genererGrandLivre() {
        const compte = document.getElementById('gl-compte-rapport').value;
        const debut = document.getElementById('gl-date-debut').value;
        const fin = document.getElementById('gl-date-fin').value;
        document.getElementById('rapport-gl-contenu').innerHTML = this.genererGrandLivreHTML(compte, debut, fin);
    },

    /**
     * Génère le HTML du grand livre
     */
    genererGrandLivreHTML(numeroCompte, dateDebut, dateFin) {
        const entreprise = Storage.get('entreprise');
        const comptes = numeroCompte ? [Compte.getByNumero(numeroCompte)] : Compte.getActifs();
        const transactions = Transaction.getByPeriode(dateDebut, dateFin);

        let html = `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Grand livre</p>
                    <p>Du ${Transaction.formaterDate(dateDebut)} au ${Transaction.formaterDate(dateFin)}</p>
                </div>
        `;

        comptes.forEach(compte => {
            if (!compte) return;

            const transCompte = transactions.filter(t =>
                t.lignes.some(l => l.compte === compte.numero)
            );

            if (transCompte.length === 0 && numeroCompte === '') return;

            let soldeRunning = 0;
            let tableRows = '';

            transCompte.forEach(t => {
                const ligne = t.lignes.find(l => l.compte === compte.numero);
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

            html += `
                <div class="rapport-section">
                    <h3>${compte.numero} - ${compte.nom}</h3>
                    <table style="width: 100%;">
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
                            ${tableRows || '<tr><td colspan="6" class="text-center">Aucune transaction</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold;">
                                <td colspan="5">Solde final</td>
                                <td class="text-right">${Transaction.formaterMontant(compte.solde)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Affiche le rapport de rentabilité par projet
     */
    afficherRentabiliteProjet() {
        App.ouvrirModal('Rentabilité par projet', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-rentabilite-contenu">
                ${this.genererRentabiliteProjetHTML()}
            </div>
        `);
    },

    /**
     * Génère le HTML du rapport de rentabilité par projet
     */
    genererRentabiliteProjetHTML() {
        const entreprise = Storage.get('entreprise');
        const projets = Projet.getAll();
        const transactions = Transaction.getAll();
        const comptes = Compte.getActifs();

        // Fonction utilitaire pour calculer revenus/dépenses d'un ensemble de transactions
        const calculerMontants = (transList) => {
            let revenus = 0;
            let depenses = 0;

            transList.forEach(t => {
                t.lignes.forEach(l => {
                    const compte = comptes.find(c => c.numero === l.compte);
                    if (!compte) return;

                    if (compte.type === 'revenus') {
                        revenus += (l.credit || 0) - (l.debit || 0);
                    } else if (compte.type === 'depenses') {
                        depenses += (l.debit || 0) - (l.credit || 0);
                    }
                });
            });

            return { revenus, depenses };
        };

        let tableRows = '';
        let grandTotalRevenus = 0;
        let grandTotalDepenses = 0;

        // Lignes pour chaque projet
        projets.forEach(p => {
            const transProjet = transactions.filter(t => t.projetId === p.id);
            const { revenus, depenses } = calculerMontants(transProjet);
            const benefice = revenus - depenses;
            const estBenefice = benefice >= 0;

            grandTotalRevenus += revenus;
            grandTotalDepenses += depenses;

            tableRows += `
                <tr>
                    <td>${p.code || '-'}</td>
                    <td>${p.nom}</td>
                    <td><span class="badge ${Projet.getStatutClasse(p.statut)}">${Projet.getStatutLibelle(p.statut)}</span></td>
                    <td class="text-right">${Transaction.formaterMontant(revenus)}</td>
                    <td class="text-right">${Transaction.formaterMontant(depenses)}</td>
                    <td class="text-right" style="color: ${estBenefice ? 'var(--success-color)' : 'var(--danger-color)'}">
                        ${Transaction.formaterMontant(benefice)}
                    </td>
                </tr>
            `;
        });

        // Ligne "(Sans projet)" pour les transactions non assignées
        const transSansProjet = transactions.filter(t => !t.projetId);
        const { revenus: revSP, depenses: depSP } = calculerMontants(transSansProjet);
        const beneficeSP = revSP - depSP;
        const estBeneficeSP = beneficeSP >= 0;

        grandTotalRevenus += revSP;
        grandTotalDepenses += depSP;

        tableRows += `
            <tr style="font-style: italic;">
                <td>-</td>
                <td>(Sans projet)</td>
                <td>-</td>
                <td class="text-right">${Transaction.formaterMontant(revSP)}</td>
                <td class="text-right">${Transaction.formaterMontant(depSP)}</td>
                <td class="text-right" style="color: ${estBeneficeSP ? 'var(--success-color)' : 'var(--danger-color)'}">
                    ${Transaction.formaterMontant(beneficeSP)}
                </td>
            </tr>
        `;

        const grandTotalBenefice = grandTotalRevenus - grandTotalDepenses;
        const estGrandBenefice = grandTotalBenefice >= 0;

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Rentabilité par projet</p>
                    <p>Au ${Transaction.formaterDate(Storage.aujourdhui())}</p>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Projet</th>
                            <th>Statut</th>
                            <th class="text-right">Revenus</th>
                            <th class="text-right">Dépenses</th>
                            <th class="text-right">Bénéfice / Perte</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; border-top: 2px solid var(--primary-color);">
                            <td colspan="3">TOTAUX</td>
                            <td class="text-right">${Transaction.formaterMontant(grandTotalRevenus)}</td>
                            <td class="text-right">${Transaction.formaterMontant(grandTotalDepenses)}</td>
                            <td class="text-right" style="color: ${estGrandBenefice ? 'var(--success-color)' : 'var(--danger-color)'}">
                                ${Transaction.formaterMontant(grandTotalBenefice)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    },

    // ========== ÂGE DES COMPTES ==========

    /**
     * Calcule le nombre de jours entre une date et aujourd'hui
     */
    calculerJoursEcoules(dateStr) {
        const date = new Date(dateStr);
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return Math.floor((aujourdhui - date) / (1000 * 60 * 60 * 24));
    },

    /**
     * Classe un montant dans les tranches d'âge selon le nombre de jours
     */
    classerParAge(jours) {
        if (jours <= 30) return 'courant';
        if (jours <= 60) return 'j31_60';
        if (jours <= 90) return 'j61_90';
        return 'j91plus';
    },

    /**
     * Affiche le rapport d'âge des comptes clients
     */
    afficherAgeComptesClients() {
        App.ouvrirModal('Âge des comptes clients', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-age-clients-contenu">
                ${this.genererAgeComptesClientsHTML()}
            </div>
        `);
    },

    /**
     * Génère le HTML du rapport d'âge des comptes clients
     */
    genererAgeComptesClientsHTML() {
        const entreprise = Storage.get('entreprise');
        const factures = Facture.getVentes().filter(f =>
            f.statut !== 'annulee' && f.statut !== 'payee'
        );

        // Regrouper par client
        const parClient = {};
        factures.forEach(f => {
            const cle = f.clientId || f.clientNom;
            if (!parClient[cle]) {
                parClient[cle] = {
                    nom: f.clientNom,
                    courant: 0,
                    j31_60: 0,
                    j61_90: 0,
                    j91plus: 0,
                    total: 0
                };
            }
            const solde = f.total - (f.montantPaye || 0);
            if (solde <= 0) return;
            const jours = this.calculerJoursEcoules(f.date);
            const tranche = this.classerParAge(jours);
            parClient[cle][tranche] += solde;
            parClient[cle].total += solde;
        });

        const clients = Object.values(parClient).sort((a, b) => b.total - a.total);

        let totalCourant = 0, totalJ31 = 0, totalJ61 = 0, totalJ91 = 0, grandTotal = 0;

        let tableRows = '';
        clients.forEach(c => {
            totalCourant += c.courant;
            totalJ31 += c.j31_60;
            totalJ61 += c.j61_90;
            totalJ91 += c.j91plus;
            grandTotal += c.total;

            tableRows += `
                <tr>
                    <td>${c.nom}</td>
                    <td class="text-right">${c.courant ? Transaction.formaterMontant(c.courant) : '-'}</td>
                    <td class="text-right">${c.j31_60 ? Transaction.formaterMontant(c.j31_60) : '-'}</td>
                    <td class="text-right">${c.j61_90 ? Transaction.formaterMontant(c.j61_90) : '-'}</td>
                    <td class="text-right">${c.j91plus ? Transaction.formaterMontant(c.j91plus) : '-'}</td>
                    <td class="text-right"><strong>${Transaction.formaterMontant(c.total)}</strong></td>
                </tr>
            `;
        });

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Âge des comptes clients</p>
                    <p>Au ${Transaction.formaterDate(Storage.aujourdhui())}</p>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th class="text-right">Courant (0-30 j)</th>
                            <th class="text-right">31-60 jours</th>
                            <th class="text-right">61-90 jours</th>
                            <th class="text-right">90+ jours</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucun compte client en souffrance</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; border-top: 2px solid var(--primary-color);">
                            <td>TOTAUX</td>
                            <td class="text-right">${Transaction.formaterMontant(totalCourant)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ31)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ61)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ91)}</td>
                            <td class="text-right">${Transaction.formaterMontant(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>

                ${totalJ91 > 0 ? `
                    <div class="alert alert-danger" style="margin-top: 20px;">
                        <strong>Attention:</strong> ${Transaction.formaterMontant(totalJ91)} en comptes de plus de 90 jours.
                    </div>
                ` : ''}
                ${totalJ61 > 0 && totalJ91 === 0 ? `
                    <div class="alert alert-warning" style="margin-top: 20px;">
                        <strong>Avertissement:</strong> ${Transaction.formaterMontant(totalJ61)} en comptes de 61 à 90 jours.
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Affiche le rapport d'âge des comptes fournisseurs
     */
    afficherAgeComptesFournisseurs() {
        App.ouvrirModal('Âge des comptes fournisseurs', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-age-fournisseurs-contenu">
                ${this.genererAgeComptesFournisseursHTML()}
            </div>
        `);
    },

    /**
     * Génère le HTML du rapport d'âge des comptes fournisseurs
     */
    genererAgeComptesFournisseursHTML() {
        const entreprise = Storage.get('entreprise');
        const factures = Facture.getAchats().filter(f =>
            f.statut !== 'annulee' && f.statut !== 'payee'
        );

        // Regrouper par fournisseur
        const parFournisseur = {};
        factures.forEach(f => {
            const cle = f.fournisseurId || f.fournisseurNom;
            if (!parFournisseur[cle]) {
                parFournisseur[cle] = {
                    nom: f.fournisseurNom,
                    courant: 0,
                    j31_60: 0,
                    j61_90: 0,
                    j91plus: 0,
                    total: 0
                };
            }
            const solde = f.total - (f.montantPaye || 0);
            if (solde <= 0) return;
            const jours = this.calculerJoursEcoules(f.date);
            const tranche = this.classerParAge(jours);
            parFournisseur[cle][tranche] += solde;
            parFournisseur[cle].total += solde;
        });

        const fournisseurs = Object.values(parFournisseur).sort((a, b) => b.total - a.total);

        let totalCourant = 0, totalJ31 = 0, totalJ61 = 0, totalJ91 = 0, grandTotal = 0;

        let tableRows = '';
        fournisseurs.forEach(f => {
            totalCourant += f.courant;
            totalJ31 += f.j31_60;
            totalJ61 += f.j61_90;
            totalJ91 += f.j91plus;
            grandTotal += f.total;

            tableRows += `
                <tr>
                    <td>${f.nom}</td>
                    <td class="text-right">${f.courant ? Transaction.formaterMontant(f.courant) : '-'}</td>
                    <td class="text-right">${f.j31_60 ? Transaction.formaterMontant(f.j31_60) : '-'}</td>
                    <td class="text-right">${f.j61_90 ? Transaction.formaterMontant(f.j61_90) : '-'}</td>
                    <td class="text-right">${f.j91plus ? Transaction.formaterMontant(f.j91plus) : '-'}</td>
                    <td class="text-right"><strong>${Transaction.formaterMontant(f.total)}</strong></td>
                </tr>
            `;
        });

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${entreprise.nomCommercial || entreprise.nom}</h2>
                    <p>Âge des comptes fournisseurs</p>
                    <p>Au ${Transaction.formaterDate(Storage.aujourdhui())}</p>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Fournisseur</th>
                            <th class="text-right">Courant (0-30 j)</th>
                            <th class="text-right">31-60 jours</th>
                            <th class="text-right">61-90 jours</th>
                            <th class="text-right">90+ jours</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" class="text-center">Aucun compte fournisseur en souffrance</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; border-top: 2px solid var(--primary-color);">
                            <td>TOTAUX</td>
                            <td class="text-right">${Transaction.formaterMontant(totalCourant)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ31)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ61)}</td>
                            <td class="text-right">${Transaction.formaterMontant(totalJ91)}</td>
                            <td class="text-right">${Transaction.formaterMontant(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>

                ${totalJ91 > 0 ? `
                    <div class="alert alert-danger" style="margin-top: 20px;">
                        <strong>Attention:</strong> ${Transaction.formaterMontant(totalJ91)} en comptes de plus de 90 jours.
                    </div>
                ` : ''}
                ${totalJ61 > 0 && totalJ91 === 0 ? `
                    <div class="alert alert-warning" style="margin-top: 20px;">
                        <strong>Avertissement:</strong> ${Transaction.formaterMontant(totalJ61)} en comptes de 61 à 90 jours.
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ========== ÉTAT DES RÉSULTATS SIMPLIFIÉ (MODE AUTONOME) ==========

    /**
     * Affiche l'état des résultats simplifié (mode autonome)
     * Revenus par catégorie - Dépenses par catégorie = Profit net
     */
    afficherEtatResultatsSimple() {
        const exercice = Storage.get('exercice');

        App.ouvrirModal('État des résultats', `
            <div class="toolbar" style="margin-bottom: 20px;">
                <label>Du: </label>
                <input type="date" id="ers-date-debut" value="${exercice.debut}" onchange="Rapports.genererEtatResultatsSimple()">
                <label>Au: </label>
                <input type="date" id="ers-date-fin" value="${exercice.fin}" onchange="Rapports.genererEtatResultatsSimple()">
                <button class="btn btn-secondary" onclick="Rapports.imprimerRapport()">Imprimer</button>
            </div>
            <div id="rapport-ers-contenu">
                ${this.genererEtatResultatsSimpleHTML(exercice.debut, exercice.fin)}
            </div>
        `);
    },

    genererEtatResultatsSimple() {
        const debut = document.getElementById('ers-date-debut').value;
        const fin = document.getElementById('ers-date-fin').value;
        document.getElementById('rapport-ers-contenu').innerHTML = this.genererEtatResultatsSimpleHTML(debut, fin);
    },

    genererEtatResultatsSimpleHTML(dateDebut, dateFin) {
        const entreprise = Storage.get('entreprise');
        const revenus = RevenuDepense.getRevenusByPeriode(dateDebut, dateFin);
        const depenses = RevenuDepense.getDepensesByPeriode(dateDebut, dateFin);

        // Agréger par catégorie
        const revenusParCat = {};
        let totalRevenus = 0;
        revenus.forEach(r => {
            if (!revenusParCat[r.categorie]) revenusParCat[r.categorie] = 0;
            revenusParCat[r.categorie] += r.montant;
            totalRevenus += r.montant;
        });

        const depensesParCat = {};
        let totalDepenses = 0;
        depenses.forEach(d => {
            if (!depensesParCat[d.categorie]) depensesParCat[d.categorie] = 0;
            depensesParCat[d.categorie] += d.montant;
            totalDepenses += d.montant;
        });

        const profitNet = totalRevenus - totalDepenses;
        const estProfit = profitNet >= 0;

        const fmt = (v) => (v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
        const fmtDate = (d) => {
            if (!d) return '';
            const parts = d.split('-');
            return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : d;
        };

        let revenusHTML = '';
        Object.keys(revenusParCat).sort().forEach(cat => {
            revenusHTML += `
                <div class="rapport-ligne">
                    <span>${App.escapeHtml(cat)}</span>
                    <span>${fmt(revenusParCat[cat])}</span>
                </div>
            `;
        });

        let depensesHTML = '';
        Object.keys(depensesParCat).sort().forEach(cat => {
            depensesHTML += `
                <div class="rapport-ligne">
                    <span>${App.escapeHtml(cat)}</span>
                    <span>${fmt(depensesParCat[cat])}</span>
                </div>
            `;
        });

        return `
            <div class="rapport-container" id="rapport-a-imprimer">
                <div class="rapport-header">
                    <h2>${App.escapeHtml(entreprise.nomCommercial || entreprise.nom || '')}</h2>
                    <p>État des résultats</p>
                    <p>Du ${fmtDate(dateDebut)} au ${fmtDate(dateFin)}</p>
                </div>

                <div class="rapport-section">
                    <h3>REVENUS</h3>
                    ${revenusHTML || '<div class="rapport-ligne"><span>Aucun revenu</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total des revenus</span>
                        <span>${fmt(totalRevenus)}</span>
                    </div>
                </div>

                <div class="rapport-section">
                    <h3>DÉPENSES</h3>
                    ${depensesHTML || '<div class="rapport-ligne"><span>Aucune dépense</span><span>0,00 $</span></div>'}
                    <div class="rapport-ligne total">
                        <span>Total des dépenses</span>
                        <span>${fmt(totalDepenses)}</span>
                    </div>
                </div>

                <div class="rapport-ligne grand-total" style="color: ${estProfit ? 'var(--success-color)' : 'var(--danger-color)'}">
                    <span>${estProfit ? 'BÉNÉFICE NET' : 'PERTE NETTE'}</span>
                    <span>${fmt(Math.abs(profitNet))}</span>
                </div>
            </div>
        `;
    },

    /**
     * Imprime le rapport courant
     */
    imprimerRapport() {
        const contenu = document.getElementById('rapport-a-imprimer');
        if (!contenu) return;

        const fenetre = window.open('', '_blank');
        fenetre.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Impression</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
                    th { background: #f5f5f5; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .rapport-header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
                    .rapport-header h2 { margin: 0; }
                    .rapport-section { margin-bottom: 20px; }
                    .rapport-section h3 { border-bottom: 1px solid #333; padding-bottom: 5px; }
                    .rapport-ligne { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ccc; }
                    .rapport-ligne.total { font-weight: bold; border-bottom: 2px solid #333; }
                    .rapport-ligne.grand-total { font-weight: bold; font-size: 18px; border-top: 3px double #333; margin-top: 10px; padding-top: 10px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${contenu.innerHTML}
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        fenetre.document.close();
    }
};
