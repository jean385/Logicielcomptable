/**
 * Module PDF Facture
 * Génère des factures PDF professionnelles avec jsPDF + AutoTable
 */

const PdfFacture = {
    /**
     * Génère un PDF de facture
     * @param {string} factureId - ID de la facture
     * @param {string} action - 'download' pour télécharger, 'blob' pour retourner un Blob
     * @returns {Blob|undefined}
     */
    generer(factureId, action = 'download') {
        const facture = Facture.getById(factureId);
        if (!facture) {
            App.notification('Facture introuvable', 'danger');
            return;
        }

        if (!window.jspdf) {
            App.notification('La librairie jsPDF n\'est pas chargée. Vérifiez votre connexion internet.', 'danger');
            return;
        }

        const client = Client.getById(facture.clientId);
        const entreprise = Storage.get('entreprise') || {};
        const taxes = Storage.get('taxes') || {};
        const logo = Storage.get('logo');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'letter'); // 8.5x11 pouces
        const font = 'helvetica';

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;

        // ========== EN-TETE ==========
        const enteteStartY = y;
        let logoEndX = margin;

        // Logo (si présent, avec ratio proportionnel)
        if (logo) {
            try {
                const props = doc.getImageProperties(logo);
                const maxW = 40;
                const maxH = 20;
                const ratio = Math.min(maxW / props.width, maxH / props.height);
                const logoW = props.width * ratio;
                const logoH = props.height * ratio;
                doc.addImage(logo, 'PNG', margin, y, logoW, logoH);
                logoEndX = margin + logoW + 5;
            } catch (e) {
                console.warn('Erreur chargement logo:', e);
                logoEndX = margin;
            }
        }

        // Info entreprise (à droite du logo ou à gauche si pas de logo)
        const infoX = logoEndX;
        doc.setFontSize(14);
        doc.setFont(font, 'bold');
        doc.text(entreprise.nomCommercial || 'Mon Entreprise', infoX, y + 5);
        doc.setFontSize(9);
        doc.setFont(font, 'normal');

        let infoY = y + 10;
        const adresseLigne = [entreprise.adresse, entreprise.ville, entreprise.province, entreprise.codePostal]
            .filter(x => x).join(', ');
        if (adresseLigne) {
            doc.text(adresseLigne, infoX, infoY);
            infoY += 4;
        }
        if (entreprise.telephone) {
            doc.text('Tel: ' + entreprise.telephone, infoX, infoY);
            infoY += 4;
        }
        if (entreprise.courriel) {
            doc.text(entreprise.courriel, infoX, infoY);
            infoY += 4;
        }

        // Numéros de taxes entreprise (alignés à droite)
        let taxeY = y + 5;
        doc.setFontSize(8);
        if (entreprise.tps) {
            doc.text('TPS: ' + entreprise.tps, pageWidth - margin, taxeY, { align: 'right' });
            taxeY += 4;
        }
        if (entreprise.tvq) {
            doc.text('TVQ: ' + entreprise.tvq, pageWidth - margin, taxeY, { align: 'right' });
            taxeY += 4;
        }

        y = Math.max(infoY, taxeY, enteteStartY + 22) + 5;

        // Ligne séparatrice
        doc.setDrawColor(30, 58, 95);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        // ========== BLOC FACTURE ==========
        doc.setFontSize(20);
        doc.setFont(font, 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text('FACTURE', margin, y);

        doc.setFontSize(10);
        doc.setFont(font, 'normal');
        doc.setTextColor(0, 0, 0);

        const factureInfoX = pageWidth - margin - 60;
        doc.setFont(font, 'bold');
        doc.text('Numero:', factureInfoX, y - 5);
        doc.text('Date:', factureInfoX, y);
        doc.text('Echeance:', factureInfoX, y + 5);
        doc.setFont(font, 'normal');
        doc.text(facture.numero, factureInfoX + 30, y - 5);
        doc.text(facture.date, factureInfoX + 30, y);
        doc.text(facture.echeance || '-', factureInfoX + 30, y + 5);

        y += 12;

        // ========== BLOC CLIENT ==========
        doc.setFontSize(10);
        doc.setFont(font, 'bold');
        doc.text('Facturer a:', margin, y);
        doc.setFont(font, 'normal');
        y += 5;

        doc.setFontSize(10);
        doc.text(facture.clientNom || (client ? client.nom : ''), margin, y);
        y += 4;

        if (client) {
            const clientAdresse = [client.adresse, client.ville, client.province, client.codePostal]
                .filter(x => x).join(', ');
            if (clientAdresse) {
                doc.text(clientAdresse, margin, y);
                y += 4;
            }
            if (client.telephone) {
                doc.text('Tel: ' + client.telephone, margin, y);
                y += 4;
            }
            if (client.courriel) {
                doc.text(client.courriel, margin, y);
                y += 4;
            }
        }

        y += 8;

        // ========== TABLEAU DES LIGNES ==========
        const tableColumns = [
            { header: '#', dataKey: 'num' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Qte', dataKey: 'quantite' },
            { header: 'Prix unitaire', dataKey: 'prixUnitaire' },
            { header: 'Montant', dataKey: 'montant' }
        ];

        const tableRows = facture.lignes.map((l, i) => ({
            num: (i + 1).toString(),
            description: l.description,
            quantite: l.quantite.toString(),
            prixUnitaire: this.formaterMontant(l.prixUnitaire),
            montant: this.formaterMontant(l.sousTotal || l.quantite * l.prixUnitaire)
        }));

        doc.autoTable({
            startY: y,
            columns: tableColumns,
            body: tableRows,
            margin: { left: margin, right: margin },
            theme: 'striped',
            headStyles: {
                fillColor: [30, 58, 95],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 9
            },
            columnStyles: {
                num: { cellWidth: 12, halign: 'center' },
                description: { cellWidth: 'auto' },
                quantite: { cellWidth: 20, halign: 'center' },
                prixUnitaire: { cellWidth: 35, halign: 'right' },
                montant: { cellWidth: 35, halign: 'right' }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        // ========== TOTAUX ==========
        const totauxX = pageWidth - margin - 70;
        const totauxValX = pageWidth - margin;
        const solde = facture.total - (facture.montantPaye || 0);

        doc.setFontSize(10);

        // Sous-total
        doc.setFont(font, 'normal');
        doc.text('Sous-total:', totauxX, y, { align: 'right' });
        doc.text(this.formaterMontant(facture.sousTotal), totauxValX, y, { align: 'right' });
        y += 5;

        // TPS
        if (facture.tps > 0) {
            doc.text('TPS (' + (taxes.tps || 5) + '%):', totauxX, y, { align: 'right' });
            doc.text(this.formaterMontant(facture.tps), totauxValX, y, { align: 'right' });
            y += 5;
        }

        // TVQ
        if (facture.tvq > 0) {
            doc.text('TVQ (' + (taxes.tvq || 9.975) + '%):', totauxX, y, { align: 'right' });
            doc.text(this.formaterMontant(facture.tvq), totauxValX, y, { align: 'right' });
            y += 5;
        }

        // Ligne séparatrice totaux
        doc.setLineWidth(0.3);
        doc.line(totauxX - 10, y, totauxValX, y);
        y += 5;

        // Total
        doc.setFontSize(12);
        doc.setFont(font, 'bold');
        doc.text('Total:', totauxX, y, { align: 'right' });
        doc.text(this.formaterMontant(facture.total), totauxValX, y, { align: 'right' });
        y += 6;

        // Montant payé
        doc.setFontSize(10);
        doc.setFont(font, 'normal');
        if (facture.montantPaye > 0) {
            doc.text('Montant paye:', totauxX, y, { align: 'right' });
            doc.text(this.formaterMontant(facture.montantPaye), totauxValX, y, { align: 'right' });
            y += 5;
        }

        // Solde dû
        doc.setFont(font, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(solde > 0 ? 217 : 0, solde > 0 ? 83 : 128, solde > 0 ? 79 : 0);
        doc.text('Solde du:', totauxX, y, { align: 'right' });
        doc.text(this.formaterMontant(solde), totauxValX, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        y += 10;

        // ========== NOTES ==========
        if (facture.notes) {
            doc.setFontSize(9);
            doc.setFont(font, 'bold');
            doc.text('Notes:', margin, y);
            doc.setFont(font, 'normal');
            y += 4;
            const notesLines = doc.splitTextToSize(facture.notes, pageWidth - 2 * margin);
            doc.text(notesLines, margin, y);
        }

        // ========== ACTION ==========
        if (action === 'blob') {
            return doc.output('blob');
        } else {
            doc.save('Facture_' + facture.numero + '.pdf');
        }
    },

    /**
     * Formate un montant en dollars canadien
     */
    formaterMontant(montant) {
        return (montant || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
    }
};
