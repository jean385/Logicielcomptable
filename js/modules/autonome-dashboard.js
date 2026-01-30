/**
 * Dashboard du mode Travailleur autonome
 * 3 cartes sommaire + graphique Chart.js + boutons rapides + tuiles modules
 */

const AutonomeDashboard = {
    _chart: null,

    afficher() {
        App.afficherPage('accueil-autonome');
        this.render();
    },

    render() {
        const container = document.getElementById('accueil-autonome');
        const totalRevenus = RevenuDepense.getTotalRevenus();
        const totalDepenses = RevenuDepense.getTotalDepenses();
        const profitNet = totalRevenus - totalDepenses;
        const estProfit = profitNet >= 0;

        container.innerHTML = `
            <h1>Tableau de Bord</h1>

            <!-- Cartes sommaire -->
            <div class="autonome-summary">
                <div class="summary-card summary-revenus">
                    <h3>Total Revenus</h3>
                    <p class="amount">${RevenuDepense.formaterMontant(totalRevenus)}</p>
                </div>
                <div class="summary-card summary-depenses">
                    <h3>Total Dépenses</h3>
                    <p class="amount">${RevenuDepense.formaterMontant(totalDepenses)}</p>
                </div>
                <div class="summary-card summary-profit ${estProfit ? '' : 'summary-perte'}">
                    <h3>${estProfit ? 'Profit Net' : 'Perte Nette'}</h3>
                    <p class="amount">${RevenuDepense.formaterMontant(Math.abs(profitNet))}</p>
                </div>
            </div>

            <!-- Boutons rapides -->
            <div class="autonome-quick-actions">
                <button class="btn btn-success" onclick="AutonomeRevenus.ajouterRevenu()">+ Ajouter Revenu</button>
                <button class="btn btn-danger" onclick="AutonomeDepenses.ajouterDepense()">+ Ajouter Dépense</button>
                <button class="btn btn-primary" onclick="AutonomeFactures.nouvelleFacture()">+ Nouvelle Facture</button>
            </div>

            <!-- Graphique -->
            <div class="autonome-chart-container">
                <h3>Revenus vs Dépenses par mois</h3>
                <canvas id="chart-autonome" height="250"></canvas>
            </div>

            <!-- Navigation via sidebar -->
        `;

        this.renderChart();
    },

    renderChart() {
        const canvas = document.getElementById('chart-autonome');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }

        const exercice = Storage.get('exercice') || {};
        const annee = exercice.debut ? parseInt(exercice.debut.substring(0, 4)) : new Date().getFullYear();
        const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

        const revenusParMois = new Array(12).fill(0);
        const depensesParMois = new Array(12).fill(0);

        const revenus = RevenuDepense.getRevenus();
        revenus.forEach(r => {
            if (!r.date) return;
            const d = new Date(r.date);
            if (d.getFullYear() === annee) {
                revenusParMois[d.getMonth()] += r.montant || 0;
            }
        });

        const depenses = RevenuDepense.getDepenses();
        depenses.forEach(d => {
            if (!d.date) return;
            const dt = new Date(d.date);
            if (dt.getFullYear() === annee) {
                depensesParMois[dt.getMonth()] += d.montant || 0;
            }
        });

        const ctx = canvas.getContext('2d');
        this._chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: moisLabels,
                datasets: [
                    {
                        label: 'Revenus',
                        data: revenusParMois,
                        backgroundColor: 'rgba(92, 184, 92, 0.7)',
                        borderColor: 'rgba(92, 184, 92, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Dépenses',
                        data: depensesParMois,
                        backgroundColor: 'rgba(217, 83, 79, 0.7)',
                        borderColor: 'rgba(217, 83, 79, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('fr-CA') + ' $';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw.toFixed(2) + ' $';
                            }
                        }
                    }
                }
            }
        });
    }
};
