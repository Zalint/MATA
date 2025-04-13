/**
 * Module contenant des utilitaires généraux 
 */

/**
 * Formate un nombre en valeur monétaire
 * @param {number} valeur - Valeur à formater
 * @returns {string} Valeur formatée
 */
function formatMonetaire(valeur) {
    if (valeur === undefined || valeur === null) return '0';
    return valeur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Extrait la valeur numérique d'un texte formaté en monétaire
 * @param {string} formattedText - Texte formaté
 * @returns {number} Valeur numérique
 */
function extractNumericValue(formattedText) {
    if (!formattedText) return 0;
    
    // Supprimer tous les caractères non numériques sauf le point décimal
    const numericString = formattedText.toString().replace(/[^\d.]/g, '');
    const result = parseFloat(numericString);
    
    // Vérifier si le résultat est un nombre valide
    return isNaN(result) ? 0 : result;
}

/**
 * Standardise le format d'une date
 * @param {string} dateStr - Chaîne de date
 * @returns {string} Date standardisée
 */
function standardiserDate(dateStr) {
    if (!dateStr) return '';
    
    // Si la date est déjà au bon format, la retourner
    const dateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$/;
    if (dateRegex.test(dateStr)) {
        return dateStr.replace(/\//g, '-');
    }
    
    try {
        // Essayer de convertir différents formats
        let date;
        if (dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'string') {
            // Gérer le format ISO
            if (dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }
            
            // Gérer différents séparateurs
            const separators = ['-', '/', '.'];
            let parts = null;
            
            for (const sep of separators) {
                if (dateStr.includes(sep)) {
                    parts = dateStr.split(sep);
                    break;
                }
            }
            
            if (!parts) return dateStr;
            
            // Détecter le format (jour-mois-année ou année-mois-jour)
            if (parts[0].length === 4) {
                // Format année-mois-jour
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                // Format jour-mois-année
                date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }
        
        if (!date || isNaN(date.getTime())) {
            return dateStr;
        }
        
        // Formater en JJ-MM-AAAA
        const jour = date.getDate().toString().padStart(2, '0');
        const mois = (date.getMonth() + 1).toString().padStart(2, '0');
        const annee = date.getFullYear();
        
        return `${jour}-${mois}-${annee}`;
    } catch (error) {
        console.error('Erreur lors de la standardisation de la date:', error);
        return dateStr;
    }
}

/**
 * Génère un intervalle de dates
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 * @returns {Array} Tableau de dates
 */
function generateDateRange(startDate, endDate) {
    const dateArray = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    // Vérifier que les dates sont valides
    if (!start || !end) return dateArray;
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        dateArray.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dateArray;
}

/**
 * Parse une chaîne de date
 * @param {string} dateStr - Chaîne de date au format JJ-MM-AAAA ou JJ/MM/AAAA
 * @returns {Date} Objet Date
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Remplacer les / par des -
    dateStr = dateStr.replace(/\//g, '-');
    
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
}

/**
 * Formate une date
 * @param {Date} date - Objet Date
 * @returns {string} Date formatée
 */
function formatDate(date) {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
}

/**
 * Vérifie si une date correspond à aujourd'hui
 * @param {string} dateStr - Chaîne de date
 * @returns {boolean} Vrai si la date est aujourd'hui
 */
function isToday(dateStr) {
    if (!dateStr) return false;
    
    // Standardiser le format de la date
    const standardDate = standardiserDate(dateStr);
    
    // Obtenir la date actuelle au format JJ-MM-AAAA
    const now = new Date();
    const today = formatDate(now);
    
    return standardDate === today;
}

/**
 * Normalise les dates pour comparaison
 * @param {string} dateStr - Chaîne de date
 * @returns {string} Date normalisée
 */
function normaliserDatePourComparaison(dateStr) {
    if (!dateStr) return '';
    
    // Standardiser d'abord le format
    const standardDate = standardiserDate(dateStr);
    
    // Convertir au format AAAA-MM-JJ pour comparaison
    const [jour, mois, annee] = standardDate.split('-');
    return `${annee}-${mois}-${jour}`;
}

// Exporter les fonctions
export {
    formatMonetaire,
    extractNumericValue,
    standardiserDate,
    generateDateRange,
    parseDate,
    formatDate,
    isToday,
    normaliserDatePourComparaison
}; 