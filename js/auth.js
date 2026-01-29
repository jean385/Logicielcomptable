/**
 * Module d'authentification Firebase
 * Gère la connexion, l'inscription et la déconnexion
 */

const EMAIL_PROPRIETAIRE = 'jmarc_roussel@hotmail.com';
const DUREE_ESSAI_JOURS = 14;

const Auth = {
    utilisateur: null,

    /**
     * Initialise Firebase et écoute les changements d'état d'authentification
     * @param {Function} onConnecte - Callback quand l'utilisateur est connecté
     * @param {Function} onDeconnecte - Callback quand l'utilisateur est déconnecté
     */
    init(onConnecte, onDeconnecte) {
        const firebaseConfig = {
            apiKey: "AIzaSyBQTjA2u4638AOVeC-Ad9hUELmY6azKHLY",
            authDomain: "logicielcomptable-6487c.firebaseapp.com",
            projectId: "logicielcomptable-6487c"
        };

        // Initialiser Firebase si pas déjà fait
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Écouter les changements d'état d'authentification
        firebase.auth().onAuthStateChanged((utilisateur) => {
            this.utilisateur = utilisateur;
            if (utilisateur) {
                console.log('Utilisateur connecté:', utilisateur.email);
                if (onConnecte) onConnecte(utilisateur);
            } else {
                console.log('Utilisateur déconnecté');
                if (onDeconnecte) onDeconnecte();
            }
        });
    },

    /**
     * Connexion avec email et mot de passe
     * @param {string} email
     * @param {string} motDePasse
     * @returns {Promise}
     */
    async connecter(email, motDePasse) {
        try {
            const resultat = await firebase.auth().signInWithEmailAndPassword(email, motDePasse);
            return resultat.user;
        } catch (erreur) {
            throw this._traduireErreur(erreur);
        }
    },

    /**
     * Inscription avec email et mot de passe
     * @param {string} email
     * @param {string} motDePasse
     * @returns {Promise}
     */
    async inscrire(email, motDePasse) {
        try {
            const resultat = await firebase.auth().createUserWithEmailAndPassword(email, motDePasse);
            return resultat.user;
        } catch (erreur) {
            throw this._traduireErreur(erreur);
        }
    },

    /**
     * Déconnexion
     * @returns {Promise}
     */
    async reinitialiserMotDePasse(email) {
        try {
            await firebase.auth().sendPasswordResetEmail(email);
        } catch (erreur) {
            throw this._traduireErreur(erreur);
        }
    },

    async deconnecter() {
        try {
            await firebase.auth().signOut();
        } catch (erreur) {
            throw this._traduireErreur(erreur);
        }
    },

    /**
     * Retourne l'utilisateur courant
     * @returns {Object|null}
     */
    getUtilisateur() {
        return this.utilisateur;
    },

    /**
     * Vérifie si l'utilisateur courant est le propriétaire
     * @returns {boolean}
     */
    estProprietaire() {
        return this.utilisateur && this.utilisateur.email === EMAIL_PROPRIETAIRE;
    },

    /**
     * Vérifie si l'essai gratuit est encore actif
     * @returns {boolean}
     */
    essaiActif() {
        if (!this.utilisateur || !this.utilisateur.metadata.creationTime) return false;
        const creation = new Date(this.utilisateur.metadata.creationTime);
        const maintenant = new Date();
        const diffMs = maintenant - creation;
        const diffJours = diffMs / (1000 * 60 * 60 * 24);
        return diffJours < DUREE_ESSAI_JOURS;
    },

    /**
     * Retourne le nombre de jours restants dans l'essai
     * @returns {number}
     */
    joursRestants() {
        if (!this.utilisateur || !this.utilisateur.metadata.creationTime) return 0;
        const creation = new Date(this.utilisateur.metadata.creationTime);
        const maintenant = new Date();
        const diffMs = maintenant - creation;
        const diffJours = diffMs / (1000 * 60 * 60 * 24);
        const restants = Math.ceil(DUREE_ESSAI_JOURS - diffJours);
        return Math.max(0, restants);
    },

    /**
     * Traduit les codes d'erreur Firebase en messages français
     * @param {Object} erreur - Erreur Firebase
     * @returns {string} Message d'erreur traduit
     */
    _traduireErreur(erreur) {
        const messages = {
            'auth/invalid-email': 'Adresse courriel invalide.',
            'auth/user-disabled': 'Ce compte a été désactivé.',
            'auth/user-not-found': 'Aucun compte trouvé avec ce courriel.',
            'auth/wrong-password': 'Mot de passe incorrect.',
            'auth/email-already-in-use': 'Ce courriel est déjà utilisé par un autre compte.',
            'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
            'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard.',
            'auth/network-request-failed': 'Erreur de connexion réseau. Vérifiez votre connexion Internet.',
            'auth/invalid-credential': 'Courriel ou mot de passe incorrect.'
        };
        return messages[erreur.code] || erreur.message;
    }
};
