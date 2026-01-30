/**
 * Module Recherche Globale
 * Recherche dans clients, fournisseurs, factures depuis la barre de menu
 */

const RechercheGlobale = {
    _debounceTimer: null,
    DEBOUNCE_MS: 300,

    /**
     * Appelé à chaque frappe dans l'input de recherche
     */
    onKeyup(event) {
        if (event.key === 'Escape') {
            this.fermer();
            return;
        }

        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.rechercher();
        }, this.DEBOUNCE_MS);
    },

    /**
     * Appelé au focus de l'input
     */
    onFocus() {
        const input = document.getElementById('recherche-globale');
        if (input && input.value.trim().length >= 2) {
            this.rechercher();
        }
    },

    /**
     * Effectue la recherche
     */
    rechercher() {
        const input = document.getElementById('recherche-globale');
        const dropdown = document.getElementById('recherche-resultats');
        if (!input || !dropdown) return;

        const terme = input.value.trim().toLowerCase();

        if (terme.length < 2) {
            this.fermer();
            return;
        }

        const resultats = [];
        const mode = Storage.getMode();

        if (mode === 'complet') {
            // Recherche dans les clients
            const clients = Client.getAll();
            clients.forEach(c => {
                if (this._correspond(c.nom, terme) ||
                    this._correspond(c.courriel, terme) ||
                    this._correspond(c.telephone, terme)) {
                    resultats.push({
                        groupe: 'Clients',
                        nom: c.nom,
                        sous: c.courriel || c.telephone || '',
                        action: () => { Ventes.afficher(); setTimeout(() => Ventes.voirClient(c.id), 100); }
                    });
                }
            });

            // Recherche dans les fournisseurs
            const fournisseurs = Fournisseur.getAll();
            fournisseurs.forEach(f => {
                if (this._correspond(f.nom, terme) ||
                    this._correspond(f.courriel, terme) ||
                    this._correspond(f.telephone, terme)) {
                    resultats.push({
                        groupe: 'Fournisseurs',
                        nom: f.nom,
                        sous: f.courriel || f.telephone || '',
                        action: () => { Achats.afficher(); }
                    });
                }
            });

            // Recherche dans les factures
            const factures = Facture.getAll();
            factures.forEach(f => {
                const lignesMatch = Array.isArray(f.lignes) && f.lignes.some(l =>
                    this._correspond(l.description, terme)
                );
                if (this._correspond(f.numero, terme) ||
                    this._correspond(f.clientNom, terme) ||
                    this._correspond(f.fournisseurNom, terme) ||
                    this._correspond(f.notes, terme) ||
                    lignesMatch) {
                    const type = f.type === 'vente' ? 'Vente' : 'Achat';
                    resultats.push({
                        groupe: 'Factures',
                        nom: `${f.numero} — ${f.clientNom || f.fournisseurNom || ''}`,
                        sous: `${type} | ${Transaction.formaterMontant(f.total)}`,
                        action: () => {
                            if (f.type === 'vente') {
                                Ventes.afficher();
                                setTimeout(() => Ventes.voirFacture(f.id), 100);
                            } else {
                                Achats.afficher();
                            }
                        }
                    });
                }
            });
        } else {
            // Mode autonome — recherche simplifiée
            const facturesSimples = Storage.get('factures_simples') || [];
            facturesSimples.forEach(f => {
                const lignesMatch = Array.isArray(f.lignes) && f.lignes.some(l =>
                    this._correspond(l.description, terme)
                );
                if (this._correspond(f.numero, terme) ||
                    this._correspond(f.clientNom, terme) ||
                    this._correspond(f.notes, terme) ||
                    lignesMatch) {
                    resultats.push({
                        groupe: 'Factures',
                        nom: `${f.numero} — ${f.clientNom || ''}`,
                        sous: Transaction.formaterMontant(f.total),
                        action: () => { AutonomeFactures.afficher(); }
                    });
                }
            });
        }

        this._afficherResultats(resultats, dropdown);
    },

    /**
     * Affiche les résultats dans le dropdown
     */
    _afficherResultats(resultats, dropdown) {
        if (resultats.length === 0) {
            dropdown.innerHTML = '<div class="search-no-results">Aucun résultat trouvé</div>';
            dropdown.classList.add('active');
            return;
        }

        // Grouper par catégorie
        const groupes = {};
        resultats.forEach(r => {
            if (!groupes[r.groupe]) groupes[r.groupe] = [];
            groupes[r.groupe].push(r);
        });

        let html = '';
        Object.keys(groupes).forEach(groupe => {
            html += `<div class="search-result-group">`;
            html += `<div class="search-result-group-title">${groupe}</div>`;
            groupes[groupe].slice(0, 5).forEach((r, i) => {
                html += `
                    <div class="search-result-item" data-groupe="${groupe}" data-index="${i}">
                        ${this._escapeHtml(r.nom)}
                        ${r.sous ? `<div class="search-result-sub">${this._escapeHtml(r.sous)}</div>` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        });

        dropdown.innerHTML = html;
        dropdown.classList.add('active');

        // Attacher les événements de clic
        let flatIndex = 0;
        Object.keys(groupes).forEach(groupe => {
            groupes[groupe].slice(0, 5).forEach((r) => {
                const el = dropdown.querySelectorAll('.search-result-item')[flatIndex];
                if (el) {
                    el.addEventListener('click', () => {
                        this.fermer();
                        document.getElementById('recherche-globale').value = '';
                        r.action();
                    });
                }
                flatIndex++;
            });
        });
    },

    /**
     * Ferme le dropdown de résultats
     */
    fermer() {
        const dropdown = document.getElementById('recherche-resultats');
        if (dropdown) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
        }
    },

    /**
     * Vérifie si une chaîne correspond au terme de recherche
     */
    _correspond(chaine, terme) {
        if (!chaine) return false;
        return chaine.toLowerCase().includes(terme);
    },

    /**
     * Échappe le HTML
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
