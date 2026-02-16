import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettings } from './dataService';

interface InvoiceItem {
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  client: string;
  items: InvoiceItem[];
  total: number;
  emecefCode?: string;
  qrCode?: string;
}

interface SimpleInvoiceData {
  invoiceNumber: string;
  date: string;
  time: string;
  client: string;
  items: InvoiceItem[];
  total: number;
  emecefCode?: string;
  companyInfo?: {
    nom: string;
    adresse: string;
    telephone: string;
    nif?: string;
  };
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = (invoiceData: InvoiceData) => {
  const doc = new jsPDF();

  // Set colors
  const primaryColor = [59, 130, 246]; // Blue
  const secondaryColor = [243, 244, 246]; // Light gray
  const textColor = [31, 41, 55]; // Dark gray

  // Header with company branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  // Company logo area (using text for now)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('GOBEX', 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('GESTION DE BAR', 20, 32);

  // Invoice title
  doc.setTextColor(...textColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 150, 25);

  // Reset text color
  doc.setTextColor(...textColor);

  // Company details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Rue de la Paix, Cotonou', 20, 50);
  doc.text('Tél: +229 12 34 56 78', 20, 55);
  doc.text('Email: contact@gobex.com', 20, 60);

  // Invoice details box
  doc.setFillColor(...secondaryColor);
  doc.rect(120, 45, 70, 25, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(120, 45, 70, 25, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° Facture: ${invoiceData.invoiceNumber}`, 125, 52);
  doc.text(`Date: ${invoiceData.date}`, 125, 58);
  doc.text(`Client: ${invoiceData.client}`, 125, 64);

  // Line separator
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(20, 80, 190, 80);

  // Table headers and data
  const tableHeaders = [['Description', 'Qté', 'Prix Unit.', 'Total']];
  const tableData = invoiceData.items.map(item => [
    item.produitNom,
    item.quantite.toString(),
    `${item.prixUnitaire.toLocaleString()} FCFA`,
    `${item.total.toLocaleString()} FCFA`
  ]);

  // Generate table
  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 90,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10,
      textColor: textColor
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Total section
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Total box
  doc.setFillColor(...primaryColor);
  doc.rect(120, finalY, 70, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: ${invoiceData.total.toLocaleString()} FCFA`, 155, finalY + 10, { align: 'center' });

  // Footer
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Code eMecef si disponible
  let footerY = finalY + 35;
  if (invoiceData.emecefCode) {
    doc.setFillColor(240, 240, 240);
    doc.rect(20, footerY - 5, 170, 20, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, footerY - 5, 170, 20, 'S');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CODE eMECEF (DGI BÉNIN):', 25, footerY + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.emecefCode, 25, footerY + 8);
    
    footerY += 25;
  }
  
  doc.text('Merci pour votre visite !', 105, footerY, { align: 'center' });
  doc.text('GOBEX - Système de Gestion de Bar Professionnel', 105, footerY + 10, { align: 'center' });

  // Terms and conditions
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Conditions de paiement: Paiement à réception', 20, footerY + 25);
  doc.text('TVA incluse - Merci de conserver cette facture', 20, footerY + 30);
  
  if (invoiceData.emecefCode) {
    doc.text('Facture conforme à la réglementation eMecef - DGI Bénin', 20, footerY + 35);
  }

  // Save the PDF
  doc.save(`Facture_${invoiceData.invoiceNumber}.pdf`);
};

// Nouvelle fonction pour générer une facture simple style ticket de caisse
export const generateSimpleInvoicePDF = async (invoiceData: SimpleInvoiceData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // Format ticket de caisse (80mm de large)
  });

  let yPosition = 10;
  const pageWidth = 80;
  const margin = 5;
  const contentWidth = pageWidth - (margin * 2);

  // Fonction helper pour centrer le texte
  const centerText = (text: string, y: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
    return y + (fontSize * 0.5);
  };

  // Fonction helper pour le texte aligné à gauche
  const leftText = (text: string, y: number, fontSize: number = 8) => {
    doc.setFontSize(fontSize);
    doc.text(text, margin, y);
    return y + (fontSize * 0.5);
  };

  // Fonction helper pour ligne avec deux colonnes
  const twoColumnText = (left: string, right: string, y: number, fontSize: number = 8) => {
    doc.setFontSize(fontSize);
    doc.text(left, margin, y);
    const rightWidth = doc.getTextWidth(right);
    doc.text(right, pageWidth - margin - rightWidth, y);
    return y + (fontSize * 0.5);
  };

  // En-tête de l'entreprise
  doc.setFont('helvetica', 'bold');
  yPosition = centerText(invoiceData.companyInfo?.nom || 'GOBEX BAR', yPosition, 12);
  yPosition += 2;
  
  doc.setFont('helvetica', 'normal');
  if (invoiceData.companyInfo?.adresse) {
    yPosition = centerText(invoiceData.companyInfo.adresse, yPosition, 8);
  }
  if (invoiceData.companyInfo?.telephone) {
    yPosition = centerText(`Tél: ${invoiceData.companyInfo.telephone}`, yPosition, 8);
  }
  if (invoiceData.companyInfo?.nif) {
    yPosition = centerText(`NIF: ${invoiceData.companyInfo.nif}`, yPosition, 8);
  }

  // Ligne de séparation
  yPosition += 3;
  doc.setLineWidth(0.1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Titre FACTURE
  doc.setFont('helvetica', 'bold');
  yPosition = centerText('FACTURE', yPosition, 14);
  yPosition += 3;

  // Informations de la facture
  doc.setFont('helvetica', 'normal');
  yPosition = twoColumnText(`N°: ${invoiceData.invoiceNumber}`, `Date: ${invoiceData.date}`, yPosition, 8);
  yPosition = twoColumnText(`Heure: ${invoiceData.time}`, `Client: ${invoiceData.client}`, yPosition, 8);

  // Ligne de séparation
  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // En-têtes des colonnes
  doc.setFont('helvetica', 'bold');
  yPosition = leftText('Article', yPosition, 8);
  yPosition = twoColumnText('Qté x Prix', 'Total', yPosition - 3, 8);
  yPosition += 2;

  // Ligne de séparation
  doc.setLineWidth(0.1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  // Articles
  doc.setFont('helvetica', 'normal');
  for (const item of invoiceData.items) {
    // Nom du produit
    yPosition = leftText(item.produitNom, yPosition, 8);
    
    // Quantité x Prix et Total
    const qtyPrice = `${item.quantite} x ${item.prixUnitaire.toLocaleString()}`;
    const total = `${item.total.toLocaleString()} F`;
    yPosition = twoColumnText(qtyPrice, total, yPosition, 8);
    yPosition += 1;
  }

  // Ligne de séparation avant total
  yPosition += 2;
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Total
  doc.setFont('helvetica', 'bold');
  yPosition = twoColumnText('TOTAL:', `${invoiceData.total.toLocaleString()} FCFA`, yPosition, 12);

  // Code eMecef si disponible
  if (invoiceData.emecefCode) {
    yPosition += 5;
    doc.setLineWidth(0.1);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 3;
    
    doc.setFont('helvetica', 'bold');
    yPosition = centerText('CODE eMECEF', yPosition, 8);
    doc.setFont('helvetica', 'normal');
    yPosition = centerText('(DGI BÉNIN)', yPosition, 6);
    yPosition += 1;
    
    // Code eMecef en plusieurs lignes si nécessaire
    const codeLines = invoiceData.emecefCode.match(/.{1,20}/g) || [invoiceData.emecefCode];
    for (const line of codeLines) {
      yPosition = centerText(line, yPosition, 7);
    }
  }

  // Pied de page
  yPosition += 8;
  doc.setLineWidth(0.1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;
  
  doc.setFont('helvetica', 'normal');
  yPosition = centerText('Merci pour votre visite !', yPosition, 8);
  yPosition = centerText('GOBEX - Gestion de Bar', yPosition, 6);
  
  if (invoiceData.emecefCode) {
    yPosition += 2;
    yPosition = centerText('Facture conforme DGI Bénin', yPosition, 6);
  }

  // Sauvegarder le PDF
  doc.save(`Ticket_${invoiceData.invoiceNumber}.pdf`);
};

// Fonction pour générer automatiquement la facture simple après une vente
export const autoGenerateSimpleInvoice = async (saleData: {
  invoiceNumber: string;
  client: string;
  items: InvoiceItem[];
  total: number;
  emecefCode?: string;
}) => {
  try {
    // Récupérer les informations de l'entreprise depuis les paramètres
    const settings = await getSettings();
    
    const now = new Date();
    const invoiceData: SimpleInvoiceData = {
      invoiceNumber: saleData.invoiceNumber,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: saleData.client,
      items: saleData.items,
      total: saleData.total,
      emecefCode: saleData.emecefCode,
      companyInfo: {
        nom: settings.entreprise.nom,
        adresse: settings.entreprise.adresse,
        telephone: settings.entreprise.telephone,
        nif: settings.fiscalite.nif
      }
    };

    await generateSimpleInvoicePDF(invoiceData);
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération automatique de la facture:', error);
    return false;
  }
};
export const generateModernSaleInvoice = async (saleData: {
  invoiceNumber: string;
  client: string;
  items: InvoiceItem[];
  total: number;
  emecefCode?: string;
}) => {
  try {
    console.log('🔄 Début de génération de facture PDF...');

    const settings = await getSettings();
    console.log('📋 Paramètres récupérés:', settings);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const formatNumber = (num: number): string => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const companyName = settings?.entreprise?.nom || 'GOBEX BAR';
    doc.text(companyName, margin, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    let yPos = 35;
    if (settings?.entreprise?.adresse) {
      doc.text(settings.entreprise.adresse, margin, yPos);
      yPos += 5;
    }
    if (settings?.entreprise?.telephone) {
      doc.text(`Tél: ${settings.entreprise.telephone}`, margin, yPos);
      yPos += 5;
    }
    if (settings?.entreprise?.email) {
      doc.text(`Email: ${settings.entreprise.email}`, margin, yPos);
      yPos += 5;
    }
    if (settings?.fiscalite?.nif) {
      doc.text(`NIF: ${settings.fiscalite.nif}`, margin, yPos);
    }

    doc.setFillColor(37, 99, 235);
    doc.rect(pageWidth - margin - 60, 15, 60, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth - margin - 30, 28, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${saleData.invoiceNumber}`, pageWidth - margin - 30, 38, { align: 'center' });

    let currentY = 75;

    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURÉ À', margin, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(saleData.client, margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${date} à ${time}`, margin + 15, currentY);
    currentY += 15;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    const tableHeaders = [['Description', 'Quantité', 'Prix Unit.', 'Total']];
    const tableData = saleData.items.map(item => [
      item.produitNom,
      item.quantite.toString(),
      `${formatNumber(item.prixUnitaire)} FCFA`,
      `${formatNumber(item.total)} FCFA`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: currentY,
      theme: 'plain',
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [75, 85, 99],
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 5
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [31, 41, 55],
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.row.index === tableData.length - 1) {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.table.width,
            data.cell.y + data.cell.height
          );
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    const totalBoxX = pageWidth - margin - 70;
    const totalBoxY = finalY;
    const totalBoxWidth = 70;
    const totalBoxHeight = 15;

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', totalBoxX + 5, totalBoxY + 7);
    doc.text(`${formatNumber(saleData.total)} FCFA`, totalBoxX + totalBoxWidth - 5, totalBoxY + 10, { align: 'right' });

    let footerY = finalY + 35;

    if (saleData.emecefCode) {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin, footerY, contentWidth, 25, 3, 3, 'F');

      doc.setTextColor(146, 64, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CODE eMECEF (DGI BÉNIN)', margin + 5, footerY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(saleData.emecefCode, margin + 5, footerY + 13);

      doc.setFontSize(7);
      doc.setTextColor(120, 113, 108);
      doc.text('Facture électronique conforme à la réglementation fiscale du Bénin', margin + 5, footerY + 20);

      footerY += 35;
    }

    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Merci pour votre confiance !', pageWidth / 2, footerY, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    const bottomY = 280;
    doc.text('Conditions de paiement: Paiement à réception', margin, bottomY);
    doc.text(`Document généré le ${date} à ${time}`, margin, bottomY + 5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, bottomY - 3, pageWidth - margin, bottomY - 3);

    const fileName = `Facture_${saleData.invoiceNumber}.pdf`;
    doc.save(fileName);

    console.log(`✅ Facture ${fileName} générée et téléchargée avec succès`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la facture:', error);
    return false;
  }
};

export const generateStockReportPDF = (products: any[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GOBEX - RAPPORT DE STOCK', 20, 30);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 45);

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Table headers and data
  const tableHeaders = [['Produit', 'Catégorie', 'Stock', 'Prix Achat', 'Prix Vente', 'Valeur']];
  const tableData = products.map(product => [
    product.nom,
    product.categorie,
    product.stockActuel.toString(),
    `${product.prixAchat.toLocaleString()} FCFA`,
    `${product.prixVente.toLocaleString()} FCFA`,
    `${(product.stockActuel * product.prixAchat).toLocaleString()} FCFA`
  ]);

  // Generate table
  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 65,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    }
  });

  // Summary
  const totalValue = products.reduce((sum, product) => sum + (product.stockActuel * product.prixAchat), 0);
  const lowStockCount = products.filter(p => p.seuilAlerte && p.stockActuel <= p.seuilAlerte).length;
  const outOfStockCount = products.filter(p => p.stockActuel === 0).length;

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSUMÉ:', 20, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total produits: ${products.length}`, 20, finalY + 15);
  doc.text(`Valeur totale du stock: ${totalValue.toLocaleString()} FCFA`, 20, finalY + 25);
  doc.text(`Produits en stock faible: ${lowStockCount}`, 20, finalY + 35);
  doc.text(`Produits en rupture: ${outOfStockCount}`, 20, finalY + 45);

  // Save the PDF
  doc.save(`Rapport_Stock_${new Date().toISOString().split('T')[0]}.pdf`);
};