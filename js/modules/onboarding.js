/**
 * Module Onboarding (Tutoriel d'accueil guidé)
 * 7 étapes avec navigation Précédent/Suivant/Passer
 */

const Onboarding = {
    _etapeCourante: 0,
    _etapes: [
        {
            titre: 'Panneau de navigation',
            description: 'Accomplissez plus en moins de temps. Utilisez la barre latérale pour naviguer rapidement d\'un module à l\'autre.',
            cible: '#sidebar',
            position: 'right'
        },
        {
            titre: 'Activités récentes',
            description: 'Cliquez sur une activité récente pour revenir rapidement à votre dernière action.',
            cible: '#activites-recentes-section',
            position: 'top'
        },
        {
            titre: 'Recherche',
            description: 'Trouvez vos enregistrements instantanément. Tapez un mot-clé ou effectuez une recherche avancée avec des filtres.',
            cible: '#menu-search-wrapper',
            position: 'bottom'
        },
        {
            titre: 'Création rapide',
            description: 'Créez plus rapidement. Utilisez l\'icône de création rapide depuis n\'importe quel écran pour créer un nouvel enregistrement.',
            cible: '#menu-creation-rapide',
            position: 'bottom'
        },
        {
            titre: 'Notifications',
            description: 'Restez à jour. Cliquez sur l\'icône cloche pour rester informé de toutes les notifications et annonces.',
            cible: '#menu-notifications',
            position: 'bottom'
        },
        {
            titre: 'Paramètres',
            description: 'Explorez une vaste gamme de paramètres et personnalisez MonBilanFinancier pour votre organisation.',
            cible: '.sidebar-item[data-page="module-parametres"]',
            position: 'right'
        },
        {
            titre: 'Assistance',
            description: 'Nous sommes là pour vous aider. Écrivez-nous pour parler à nos experts et résoudre vos questions.',
            cible: '#menu-support',
            position: 'bottom'
        }
    ],

    /**
     * Vérifie si l'onboarding doit se lancer et le lance si nécessaire
     */
    verifierEtLancer() {
        const mode = Storage.getMode();
        if (mode !== 'complet') return;

        const complet = Storage.get('onboarding_complet');
        if (complet) return;

        // Petit délai pour que le DOM soit prêt
        setTimeout(() => this.lancer(), 500);
    },

    /**
     * Lance le tutoriel
     */
    lancer() {
        this._etapeCourante = 0;
        this._afficherOverlay(true);
        this._afficherEtape();
    },

    /**
     * Passe à l'étape suivante
     */
    suivant() {
        if (this._etapeCourante < this._etapes.length - 1) {
            this._nettoyerHighlight();
            this._etapeCourante++;
            this._afficherEtape();
        } else {
            this.terminer();
        }
    },

    /**
     * Revient à l'étape précédente
     */
    precedent() {
        if (this._etapeCourante > 0) {
            this._nettoyerHighlight();
            this._etapeCourante--;
            this._afficherEtape();
        }
    },

    /**
     * Saute le tutoriel
     */
    passer() {
        this.terminer();
    },

    /**
     * Termine le tutoriel
     */
    terminer() {
        this._nettoyerHighlight();
        this._afficherOverlay(false);
        Storage.set('onboarding_complet', true);
    },

    /**
     * Affiche l'étape courante
     */
    _afficherEtape() {
        const etape = this._etapes[this._etapeCourante];
        if (!etape) return;

        const cible = document.querySelector(etape.cible);
        if (!cible) {
            // Si l'élément cible n'existe pas, passer à la suivante
            if (this._etapeCourante < this._etapes.length - 1) {
                this._etapeCourante++;
                this._afficherEtape();
            } else {
                this.terminer();
            }
            return;
        }

        // Highlight sur l'élément cible
        cible.classList.add('onboarding-highlight');

        // Backdrop avec trou
        this._positionnerBackdrop(cible);

        // Tooltip
        this._positionnerTooltip(cible, etape);

        // Boutons
        this._mettreAJourBoutons();
    },

    /**
     * Positionne le backdrop avec clip-path pour découper un trou
     */
    _positionnerBackdrop(cible) {
        const backdrop = document.getElementById('onboarding-backdrop');
        if (!backdrop) return;

        const rect = cible.getBoundingClientRect();
        const padding = 6;

        const top = rect.top - padding;
        const left = rect.left - padding;
        const right = rect.right + padding;
        const bottom = rect.bottom + padding;

        // Polygon qui découpe un rectangle au centre
        backdrop.style.clipPath = `polygon(
            0% 0%, 0% 100%,
            ${left}px 100%, ${left}px ${top}px,
            ${right}px ${top}px, ${right}px ${bottom}px,
            ${left}px ${bottom}px, ${left}px 100%,
            100% 100%, 100% 0%
        )`;
    },

    /**
     * Positionne le tooltip par rapport à l'élément cible
     */
    _positionnerTooltip(cible, etape) {
        const tooltip = document.getElementById('onboarding-tooltip');
        const arrow = document.getElementById('onboarding-arrow');
        const titre = document.getElementById('onboarding-titre');
        const description = document.getElementById('onboarding-description');
        const indicateur = document.getElementById('onboarding-etape');

        if (!tooltip) return;

        // Contenu
        const num = this._etapeCourante + 1;
        titre.textContent = etape.titre;
        description.textContent = etape.description;
        indicateur.textContent = `${num}/${this._etapes.length}`;

        // Réinitialiser l'animation
        tooltip.style.animation = 'none';
        tooltip.offsetHeight; // Force reflow
        tooltip.style.animation = 'onboardingFadeIn 0.25s ease';

        const rect = cible.getBoundingClientRect();
        const tooltipWidth = 360;
        const gap = 16;

        // Réinitialiser les classes arrow
        arrow.className = 'onboarding-tooltip-arrow';

        let top, left;

        if (etape.position === 'bottom') {
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrow.classList.add('arrow-top');
        } else if (etape.position === 'top') {
            // On positionne d'abord, puis on ajuste après le rendu
            top = rect.top - gap - 200; // estimation
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrow.classList.add('arrow-bottom');
        } else if (etape.position === 'right') {
            top = rect.top + (rect.height / 2) - 100; // estimation centered
            left = rect.right + gap;
            arrow.classList.add('arrow-left');
        }

        // Contraindre dans la fenêtre
        left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.width = tooltipWidth + 'px';

        // Pour position 'top', ajuster après que le tooltip est rendu
        if (etape.position === 'top') {
            requestAnimationFrame(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                tooltip.style.top = (rect.top - gap - tooltipRect.height) + 'px';
            });
        }

        // Positionner la flèche
        if (etape.position === 'right') {
            // Arrow on left side, vertically centered
            arrow.style.left = '-7px';
            arrow.style.top = '40px';
            arrow.style.marginLeft = '0';
        } else {
            const arrowLeft = rect.left + (rect.width / 2) - left - 7;
            arrow.style.left = Math.max(20, Math.min(arrowLeft, tooltipWidth - 20)) + 'px';
            arrow.style.marginLeft = '0';
        }
    },

    /**
     * Met à jour l'affichage des boutons selon l'étape
     */
    _mettreAJourBoutons() {
        const btnPrecedent = document.getElementById('onboarding-btn-precedent');
        const btnPasser = document.getElementById('onboarding-btn-passer');
        const btnSuivant = document.getElementById('onboarding-btn-suivant');

        if (!btnPrecedent || !btnPasser || !btnSuivant) return;

        const estPremier = this._etapeCourante === 0;
        const estDernier = this._etapeCourante === this._etapes.length - 1;

        // Précédent : masqué à l'étape 1
        btnPrecedent.style.display = estPremier ? 'none' : '';

        // Passer : masqué à la dernière étape
        btnPasser.style.display = estDernier ? 'none' : '';

        // Suivant : texte "Commencer" à la dernière étape
        btnSuivant.textContent = estDernier ? 'Commencer' : 'Suivant';
    },

    /**
     * Affiche ou masque l'overlay
     */
    _afficherOverlay(visible) {
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.style.display = visible ? '' : 'none';
        }
    },

    /**
     * Nettoie le highlight de l'élément courant
     */
    _nettoyerHighlight() {
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
    }
};
