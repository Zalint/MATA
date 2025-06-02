// Utility function for processing stock data
function processStockData(stockData, sheetName) {
    const rows = [];
    rows.push(['Point de Vente', 'Produit', 'Quantité', 'Prix Unitaire', 'Total', 'Commentaire']);

    if (stockData && Object.keys(stockData).length > 0) {
        Object.entries(stockData).forEach(([key, item]) => {
            // Try multiple possible property names for quantity and price
            const quantite = parseFloat(
                item.Nombre ||
                item.quantite || 
                item.Quantite || 
                item.quantity || 
                item.Quantity ||
                item.qte ||
                item.Qte ||
                0
            );
            
            const prixUnitaire = parseFloat(
                item.PU ||
                item.prixUnitaire || 
                item['Prix Unitaire'] || 
                item.prixUnit ||
                item.prix_unitaire ||
                item.price ||
                item.prix ||
                0
            );
            
            const total = quantite * prixUnitaire;

            // Debug log for problematic entries
            if (quantite === 0 && (item.Nombre || item.quantite || item.Quantite || item.quantity)) {
                console.log(`Quantité zéro détectée pour ${sheetName}:`, key, item);
            }

            rows.push([
                item['Point de Vente'] || item.pointVente || item.point_vente || '',
                item.Produit || item.produit || item.product || '',
                quantite,
                prixUnitaire,
                total,
                item.Commentaire || item.commentaire || item.comment || ''
            ]);
        });
    } else {
        rows.push(['Aucune donnée disponible', '', '', '', '', '']);
    }
    
    return rows;
}

// Function to export stock inventaire data to Excel (Stock Matin, Stock Soir, Transferts)
async function exportStockInventaireToExcel() {
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            console.error("Erreur: La bibliothèque XLSX n'est pas chargée.");
            alert("Erreur: La bibliothèque XLSX n'est pas chargée. Veuillez rafraîchir la page.");
            return;
        }

        // Get the selected date
        const dateInventaire = document.getElementById('date-inventaire');
        if (!dateInventaire || !dateInventaire.value) {
            alert('Veuillez sélectionner une date avant d\'exporter.');
            return;
        }

        const date = dateInventaire.value;
        console.log('Début de l\'export Excel pour la date:', date);

        // Show loading indicator
        const loadingHtml = `
            <div id="export-loading" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                 background: white; padding: 20px; border: 2px solid #007bff; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2 mb-0">Export des données en cours...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);

        // Get base URL from environment or default to current origin
        const baseUrl = window.location.origin;

        // Fetch data from the APIs
        const [stockMatinResponse, stockSoirResponse, transfertsResponse] = await Promise.all([
            fetch(`${baseUrl}/api/stock/matin?date=${encodeURIComponent(date)}`),
            fetch(`${baseUrl}/api/stock/soir?date=${encodeURIComponent(date)}`),
            fetch(`${baseUrl}/api/transferts?date=${encodeURIComponent(date)}`)
        ]);

        // Parse responses
        const stockMatinData = await stockMatinResponse.json();
        const stockSoirData = await stockSoirResponse.json();
        const transfertsData = await transfertsResponse.json();

        console.log('Données récupérées:', { stockMatinData, stockSoirData, transfertsData });

        // Debug: Log the structure of the first item to understand the data format
        if (stockMatinData && Object.keys(stockMatinData).length > 0) {
            const firstKey = Object.keys(stockMatinData)[0];
            console.log('Structure du premier item Stock Matin:', stockMatinData[firstKey]);
        }
        if (stockSoirData && Object.keys(stockSoirData).length > 0) {
            const firstKey = Object.keys(stockSoirData)[0];
            console.log('Structure du premier item Stock Soir:', stockSoirData[firstKey]);
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // === SHEET 1: STOCK MATIN ===
        const stockMatinRows = processStockData(stockMatinData, 'Stock Matin');
        const wsStockMatin = XLSX.utils.aoa_to_sheet(stockMatinRows);
        XLSX.utils.book_append_sheet(workbook, wsStockMatin, 'Stock Matin');

        // === SHEET 2: STOCK SOIR ===
        const stockSoirRows = processStockData(stockSoirData, 'Stock Soir');
        const wsStockSoir = XLSX.utils.aoa_to_sheet(stockSoirRows);
        XLSX.utils.book_append_sheet(workbook, wsStockSoir, 'Stock Soir');

        // === SHEET 3: TRANSFERTS ===
        const transfertsRows = [];
        transfertsRows.push(['Point de Vente', 'Produit', 'Impact (+/-)', 'Quantité', 'Prix Unitaire', 'Total', 'Commentaire']);

        if (transfertsData && transfertsData.length > 0) {
            transfertsData.forEach(transfert => {
                const quantite = parseFloat(transfert.quantite || 0);
                const prixUnitaire = parseFloat(transfert.prixUnitaire || 0);
                const impact = parseInt(transfert.impact || 1);
                const total = quantite * prixUnitaire * impact;

                transfertsRows.push([
                    transfert.pointVente || '',
                    transfert.produit || '',
                    impact > 0 ? '+' : '-',
                    quantite,
                    prixUnitaire,
                    total,
                    transfert.commentaire || ''
                ]);
            });
        } else {
            transfertsRows.push(['Aucune donnée disponible', '', '', '', '', '', '']);
        }

        const wsTransferts = XLSX.utils.aoa_to_sheet(transfertsRows);
        XLSX.utils.book_append_sheet(workbook, wsTransferts, 'Transferts');

        // Format columns for all sheets
        const formatWorksheet = (ws, rows) => {
            // Format currency columns (Prix Unitaire, Total)
            const currencyFormat = '#,##0 FCFA';
            
            for (let R = 1; R < rows.length; ++R) { // Skip header
                // For stock sheets (6 columns): Prix Unitaire = column 3, Total = column 4
                // For transferts sheet (7 columns): Prix Unitaire = column 4, Total = column 5
                const prixUnitaireCol = rows[0].length === 7 ? 4 : 3; // Check if transferts sheet
                const totalCol = rows[0].length === 7 ? 5 : 4;
                const quantiteCol = rows[0].length === 7 ? 3 : 2;

                // Format currency columns
                [prixUnitaireCol, totalCol].forEach(C => {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (ws[cell_ref] && typeof ws[cell_ref].v === 'number') {
                        ws[cell_ref].t = 'n';
                        ws[cell_ref].z = currencyFormat;
                    }
                });

                // Format quantity column
                const qty_cell_address = { c: quantiteCol, r: R };
                const qty_cell_ref = XLSX.utils.encode_cell(qty_cell_address);
                if (ws[qty_cell_ref] && typeof ws[qty_cell_ref].v === 'number') {
                    ws[qty_cell_ref].t = 'n';
                }
            }

            // Set column widths
            let colWidths;
            if (rows[0].length === 7) { // Transferts sheet
                colWidths = [
                    { wch: 15 }, // Point de Vente
                    { wch: 18 }, // Produit
                    { wch: 8 },  // Impact
                    { wch: 10 }, // Quantité
                    { wch: 12 }, // Prix Unitaire
                    { wch: 15 }, // Total
                    { wch: 25 }  // Commentaire
                ];
            } else { // Stock sheets
                colWidths = [
                    { wch: 15 }, // Point de Vente
                    { wch: 18 }, // Produit
                    { wch: 10 }, // Quantité
                    { wch: 12 }, // Prix Unitaire
                    { wch: 15 }, // Total
                    { wch: 25 }  // Commentaire
                ];
            }

            ws['!cols'] = colWidths;
        };

        formatWorksheet(wsStockMatin, stockMatinRows);
        formatWorksheet(wsStockSoir, stockSoirRows);
        formatWorksheet(wsTransferts, transfertsRows);

        // Generate filename with proper sanitization
        const sanitizedDate = date.replace(/[^a-zA-Z0-9\-_]/g, '_');
        const filename = `Stock_Inventaire_${sanitizedDate}.xlsx`;

        // Write file
        XLSX.writeFile(workbook, filename);

        // Remove loading indicator
        const loadingElement = document.getElementById('export-loading');
        if (loadingElement) {
            loadingElement.remove();
        }

        // Show success message
        const totalStockMatin = Object.keys(stockMatinData).length;
        const totalStockSoir = Object.keys(stockSoirData).length;
        const totalTransferts = transfertsData.length;

        alert(`Export Excel réussi !\n\nDonnées exportées pour le ${date}:\n- Stock Matin: ${totalStockMatin} entrées\n- Stock Soir: ${totalStockSoir} entrées\n- Transferts: ${totalTransferts} entrées\n\nFichier: ${filename}`);

        console.log('Export Excel terminé avec succès:', filename);

    } catch (error) {
        // Remove loading indicator in case of error
        const loadingElement = document.getElementById('export-loading');
        if (loadingElement) {
            loadingElement.remove();
        }

        console.error('Erreur lors de l\'export Excel:', error);
        alert('Erreur lors de l\'export Excel : ' + error.message);
    }
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const exportStockExcelBtn = document.getElementById('export-stock-excel');
    if (exportStockExcelBtn) {
        exportStockExcelBtn.addEventListener('click', exportStockInventaireToExcel);
        console.log('Event listener added to export-stock-excel button');
    } else {
        console.log('export-stock-excel button not found yet');
        
        // Try again after a delay in case the button is added dynamically
        setTimeout(function() {
            const btn = document.getElementById('export-stock-excel');
            if (btn) {
                btn.addEventListener('click', exportStockInventaireToExcel);
                console.log('Event listener added to export-stock-excel button (delayed)');
            }
        }, 1000);
    }
}); 