/**
 * Fonction pour ajouter les paiements en espèces à la réconciliation
 * Cette fonction récupère les données de paiement en espèces pour la date sélectionnée
 * et les ajoute au tableau de réconciliation
 */
async function addCashPaymentToReconciliation() {
    console.log("Début de l'intégration des paiements en espèces à la réconciliation");
    
    // Vérifier si le tableau de réconciliation existe
    const reconciliationTable = document.getElementById('reconciliation-table');
    if (!reconciliationTable) {
        console.error("Tableau de réconciliation non trouvé");
        return;
    }
    
    // Vérifier la structure du tableau
    const headerRow = reconciliationTable.querySelector('thead tr');
    if (headerRow) {
        console.log("Structure de l'en-tête du tableau:", 
            Array.from(headerRow.cells).map((cell, idx) => `${idx}: ${cell.textContent.trim()}`));
        console.log("Nombre de cellules dans l'en-tête:", headerRow.cells.length);
    }
    
    const rows = reconciliationTable.querySelectorAll('tbody tr');
    console.log(`Nombre de lignes dans le tableau: ${rows.length}`);
    
    if (rows.length === 0) {
        console.warn("Aucune ligne trouvée dans le tableau de réconciliation");
        return;
    }
    
    // Récupérer la date sélectionnée
    const selectedDate = document.getElementById('date-reconciliation').value;
    console.log("Date sélectionnée pour les paiements en espèces:", selectedDate);
    
    if (!selectedDate) {
        console.warn("Aucune date sélectionnée pour les paiements en espèces");
        return;
    }
    
    // Mapping des références de paiement aux points de vente
    const PAYMENT_REF_MAPPING = {
        'V_TB': 'Touba',
        'V_DHR': 'Dahra', 
        'V_ALS': 'Aliou Sow',
        'V_LGR': 'Linguere',
        'V_MBA': 'Mbao',
        'V_KM': 'Keur Massar',
        'V_OSF': 'O.Foire'
    };
    
    // Récupérer les données de paiement
    try {
        console.log("Récupération des données de paiement depuis l'API...");
        const response = await fetch(`http://localhost:3000/api/cash-payments/aggregated`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        console.log("Réponse de l'API de paiements en espèces:", result);
        
        if (result.success && result.data && Array.isArray(result.data)) {
            // Rechercher les données pour la date sélectionnée
            const dateData = result.data.find(entry => {
                if (!entry.date) return false;
                const parts = entry.date.split('-');
                if (parts.length !== 3) return false;
                
                const formattedEntryDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                return formattedEntryDate === selectedDate;
            });
            
            if (dateData && dateData.points) {
                console.log("Données de paiement trouvées pour la date:", dateData);
                
                // Construire l'objet de données avec le mapping des points de vente
                const cashPaymentData = {};
                dateData.points.forEach(point => {
                    const pointVenteStandard = PAYMENT_REF_MAPPING[point.point] || point.point;
                    cashPaymentData[pointVenteStandard] = point.total;
                });
                
                console.log("Données de paiement en espèces préparées:", cashPaymentData);
                
                // Vérifier si la colonne "Montant Total Cash" existe déjà
                let cashColumnExists = false;
                let ecartCashColumnExists = false;
                
                if (headerRow) {
                    Array.from(headerRow.cells).forEach((cell, index) => {
                        const cellText = cell.textContent.trim();
                        if (cellText === "Montant Total Cash") {
                            cashColumnExists = true;
                            console.log("Colonne 'Montant Total Cash' trouvée à l'index", index);
                        }
                        if (cellText === "Ecart Cash") {
                            ecartCashColumnExists = true;
                            console.log("Colonne 'Ecart Cash' trouvée à l'index", index);
                        }
                    });
                }
                
                // S'il n'y a pas de colonne pour les paiements en espèces, l'ajouter
                if (!cashColumnExists || !ecartCashColumnExists) {
                    // Ajouter les colonnes nécessaires à l'en-tête
                    const ecartColumnIndex = Array.from(headerRow.cells).findIndex(
                        cell => cell.textContent.trim() === "Écart %"
                    );
                    
                    if (ecartColumnIndex !== -1) {
                        if (!cashColumnExists) {
                            const cashHeader = document.createElement('th');
                            cashHeader.textContent = "Montant Total Cash";
                            cashHeader.classList.add('text-end');
                            headerRow.insertBefore(cashHeader, headerRow.cells[ecartColumnIndex + 1]);
                            console.log("Colonne 'Montant Total Cash' ajoutée");
                        }
                        
                        if (!ecartCashColumnExists) {
                            const ecartCashHeader = document.createElement('th');
                            ecartCashHeader.textContent = "Ecart Cash";
                            ecartCashHeader.classList.add('text-end');
                            headerRow.insertBefore(ecartCashHeader, headerRow.cells[ecartColumnIndex + (cashColumnExists ? 2 : 1)]);
                            console.log("Colonne 'Ecart Cash' ajoutée");
                        }
                        
                        // Ajouter une cellule pour chaque ligne
                        rows.forEach(row => {
                            if (!cashColumnExists) {
                                const cashCell = document.createElement('td');
                                cashCell.classList.add('currency');
                                row.insertBefore(cashCell, row.cells[ecartColumnIndex + 1]);
                            }
                            
                            if (!ecartCashColumnExists) {
                                const ecartCashCell = document.createElement('td');
                                ecartCashCell.classList.add('currency');
                                row.insertBefore(ecartCashCell, row.cells[ecartColumnIndex + (cashColumnExists ? 2 : 1)]);
                            }
                        });
                    }
                }
                
                // Maintenant que les colonnes existent, mettre à jour les données
                // Trouver les index des colonnes importantes
                const headerCells = Array.from(headerRow.cells).map(cell => cell.textContent.trim());
                const cashColumnIndex = headerCells.indexOf("Montant Total Cash");
                const ecartCashColumnIndex = headerCells.indexOf("Ecart Cash");
                const ventesSaisiesColumnIndex = headerCells.indexOf("Ventes Saisies");
                
                console.log("Index des colonnes: Cash=", cashColumnIndex, "EcartCash=", ecartCashColumnIndex, "VentesSaisies=", ventesSaisiesColumnIndex);
                
                if (cashColumnIndex === -1 || ecartCashColumnIndex === -1 || ventesSaisiesColumnIndex === -1) {
                    console.error("Impossible de trouver toutes les colonnes nécessaires");
                    return;
                }
                
                // Mettre à jour chaque ligne avec les données de paiement
                rows.forEach(row => {
                    const pointVente = row.getAttribute('data-point-vente');
                    if (!pointVente) {
                        console.warn("Ligne sans attribut data-point-vente");
                        return;
                    }
                    
                    // Obtenir les valeurs
                    const cashValue = cashPaymentData[pointVente] || 0;
                    const ventesCell = row.cells[ventesSaisiesColumnIndex];
                    const ventesSaisies = extractNumericValue(ventesCell.textContent);
                    
                    // Mettre à jour la cellule de cash payment
                    const cashCell = row.cells[cashColumnIndex];
                    if (cashCell) {
                        cashCell.textContent = formatMonetaire(cashValue);
                        cashCell.classList.add('currency');
                    }
                    
                    // Calculer et afficher l'écart cash
                    const ecartCash = cashValue - ventesSaisies;
                    const ecartCashCell = row.cells[ecartCashColumnIndex];
                    if (ecartCashCell) {
                        ecartCashCell.textContent = formatMonetaire(ecartCash);
                        ecartCashCell.classList.add('currency');
                        
                        // Appliquer un style basé sur la valeur
                        if (ecartCash < 0) {
                            ecartCashCell.classList.add('negative');
                        } else if (ecartCash > 0) {
                            ecartCashCell.classList.add('positive');
                        }
                    }
                    
                    console.log(`${pointVente}: Cash=${cashValue}, Ventes=${ventesSaisies}, Ecart=${ecartCash}`);
                });
                
                console.log("Mise à jour des paiements en espèces terminée");
            } else {
                console.log("Aucune donnée de paiement trouvée pour la date:", selectedDate);
            }
        } else {
            console.warn("Réponse API invalide:", result);
        }
    } catch (error) {
        console.error("Erreur lors de la récupération ou de l'affichage des données de paiement:", error);
    }
}

// Fonction utilitaire pour extraire une valeur numérique d'un texte formaté
function extractNumericValue(formattedText) {
    if (!formattedText) return 0;
    
    // Supprimer tous les caractères non numériques sauf le point et la virgule
    const numericString = formattedText.replace(/[^\d.,]/g, '')
        // Remplacer la virgule par un point pour la conversion
        .replace(',', '.');
    
    return parseFloat(numericString) || 0;
}

// Exporter les fonctions pour les tests
module.exports = {
    addCashPaymentToReconciliation,
    extractNumericValue
}; 