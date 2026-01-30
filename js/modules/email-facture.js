/**
 * Module Email Facture
 * Envoi de factures par courriel via mailto:
 */

const EmailFacture = {
    /**
     * Ouvre le modal d'envoi par courriel
     * @param {string} factureId - ID de la facture
     */
    envoyerParCourriel(factureId) {
        const facture = Facture.getById(factureId);
        if (!facture) {
            App.notification('Facture introuvable', 'danger');
            return;
        }

        const client = Client.getById(facture.clientId);
        const entreprise = Storage.get('entreprise') || {};

        const destinataire = client ? (client.courriel || '') : '';
        const nomClient = client ? client.nom : facture.clientNom;
        const sujet = 'Facture ' + facture.numero + ' - ' + (entreprise.nomCommercial || 'Mon Entreprise');
        const montantTotal = (facture.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

        const message = 'Bonjour ' + nomClient + ',\n\n' +
            'Veuillez trouver ci-joint la facture ' + facture.numero + ' d\'un montant de ' + montantTotal + '.\n\n' +
            'Date de facturation : ' + facture.date + '\n' +
            'Date d\'échéance : ' + (facture.echeance || 'N/A') + '\n\n' +
            'N\'hésitez pas à nous contacter pour toute question.\n\n' +
            'Cordialement,\n' +
            (entreprise.nomCommercial || 'Mon Entreprise') +
            (entreprise.telephone ? '\nTél: ' + entreprise.telephone : '') +
            (entreprise.courriel ? '\n' + entreprise.courriel : '');

        App.ouvrirModal('Envoyer la facture par courriel', `
            <form onsubmit="EmailFacture.envoyer(event, '${factureId}')">
                <div class="form-group">
                    <label>Destinataire *</label>
                    <input type="email" id="email-destinataire" value="${destinataire}" required placeholder="courriel@exemple.com">
                </div>
                <div class="form-group">
                    <label>Sujet</label>
                    <input type="text" id="email-sujet" value="${this.escapeHtml(sujet)}">
                </div>
                <div class="form-group">
                    <label>Message</label>
                    <textarea id="email-message" rows="10" style="font-family: inherit; white-space: pre-wrap;">${this.escapeHtml(message)}</textarea>
                </div>
                <div class="alert alert-info">
                    Le PDF de la facture sera téléchargé automatiquement et votre client de courriel s'ouvrira avec le message pré-rempli. Vous devrez joindre le PDF manuellement au courriel.
                </div>
                <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-secondary" onclick="App.fermerModal()">Annuler</button>
                    <button type="submit" class="btn btn-primary">Envoyer</button>
                </div>
            </form>
        `);
    },

    /**
     * Télécharge le PDF et ouvre mailto:
     * @param {Event} event
     * @param {string} factureId
     */
    envoyer(event, factureId) {
        event.preventDefault();

        const destinataire = document.getElementById('email-destinataire').value.trim();
        const sujet = document.getElementById('email-sujet').value.trim();
        const message = document.getElementById('email-message').value.trim();

        if (!destinataire) {
            App.notification('Veuillez entrer un destinataire', 'warning');
            return;
        }

        // Télécharger le PDF
        PdfFacture.generer(factureId, 'download');

        // Ouvrir mailto:
        const mailtoUrl = 'mailto:' + encodeURIComponent(destinataire) +
            '?subject=' + encodeURIComponent(sujet) +
            '&body=' + encodeURIComponent(message);

        window.location.href = mailtoUrl;

        App.fermerModal();
        App.notification('PDF téléchargé. Veuillez joindre le fichier au courriel.', 'success');
    },

    /**
     * Échappe le HTML pour les attributs
     */
    escapeHtml(text) {
        return (text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
