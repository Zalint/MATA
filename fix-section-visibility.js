// Script pour corriger l'affichage des sections de réconciliation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script de correction d\'affichage chargé');
    
    // Fonction pour cacher correctement toutes les sections puis afficher uniquement celle sélectionnée
    function correctSectionVisibility() {
        console.log('Correction de la visibilité des sections');
        
        // 1. D'abord, masquer toutes les sections de contenu
        const allSections = [
            'saisie-section',
            'visualisation-section',
            'import-section',
            'stock-inventaire-section',
            'copier-stock-section',
            'reconciliation-section',
            'reconciliation-mois-section',
            'stock-alerte-section',
            'cash-payment-section',
            'suivi-achat-boeuf-section',
            'estimation-section'
        ];
        
        allSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // 2. Déterminer l'onglet actif
        const activeTab = document.querySelector('.nav-link.active');
        if (!activeTab) {
            // Si aucun onglet n'est actif, afficher la section saisie par défaut
            document.getElementById('saisie-section').style.display = 'block';
            return;
        }
        
        // 3. Afficher la section correspondant à l'onglet actif
        const tabId = activeTab.id;
        const sectionId = tabId.replace('-tab', '-section');
        const sectionToShow = document.getElementById(sectionId);
        
        if (sectionToShow) {
            console.log(`Affichage de la section: ${sectionId}`);
            sectionToShow.style.display = 'block';

            // Si c'est la section estimation qui est active, ajouter une vérification différée
            if (sectionId === 'estimation-section') {
                // Vérifier à nouveau après un court délai pour s'assurer que la section reste visible
                setTimeout(function() {
                    if (document.getElementById('estimation-section').style.display !== 'block') {
                        document.getElementById('estimation-section').style.display = 'block';
                        console.log('Affichage forcé de estimation-section (vérification différée)');
                    }
                }, 100);
            }
        }
        
        // 4. Protection spécifique: s'assurer que les sections de réconciliation ne sont pas visibles quand l'onglet saisie est actif
        if (tabId === 'saisie-tab') {
            const reconciliationSection = document.getElementById('reconciliation-section');
            const reconciliationMoisSection = document.getElementById('reconciliation-mois-section');
            const estimationSection = document.getElementById('estimation-section');
            
            if (reconciliationSection) {
                reconciliationSection.style.display = 'none';
                console.log('Masquage forcé de reconciliation-section');
            }
            
            if (reconciliationMoisSection) {
                reconciliationMoisSection.style.display = 'none';
                console.log('Masquage forcé de reconciliation-mois-section');
            }

            if (estimationSection) {
                estimationSection.style.display = 'none';
                console.log('Masquage forcé de estimation-section');
            }
        }

        // 5. Protection spécifique: s'assurer que la section estimation est visible quand l'onglet estimation est actif
        if (tabId === 'estimation-tab') {
            const estimationSection = document.getElementById('estimation-section');
            if (estimationSection) {
                estimationSection.style.display = 'block';
                console.log('Affichage forcé de estimation-section');
            }
        }
    }
    
    // Appliquer la correction immédiatement après le chargement de la page
    correctSectionVisibility();
    
    // Ajouter une observation des changements de classe sur les onglets pour maintenir la bonne visibilité
    const navTabs = document.querySelectorAll('.nav-link');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Petit délai pour s'assurer que les classes active sont bien mises à jour
            setTimeout(correctSectionVisibility, 50);
        });
    });
    
    // Surveiller également les modifications du DOM qui pourraient affecter la visibilité
    // Utiliser un MutationObserver pour détecter les changements de style
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                // Vérifier si c'est une section de réconciliation ou estimation qui est modifiée
                if (mutation.target.id === 'reconciliation-section' || 
                    mutation.target.id === 'reconciliation-mois-section') {
                    
                    // Vérifier si l'onglet saisie est actif
                    if (document.getElementById('saisie-tab').classList.contains('active')) {
                        // Forcer le masquage
                        mutation.target.style.display = 'none';
                        console.log(`Correction automatique: masquage de ${mutation.target.id}`);
                    }
                }

                // Vérifier si c'est la section estimation qui est modifiée
                if (mutation.target.id === 'estimation-section') {
                    // Vérifier si l'onglet estimation est actif
                    if (document.getElementById('estimation-tab').classList.contains('active')) {
                        // Forcer l'affichage
                        mutation.target.style.display = 'block';
                        console.log('Correction automatique: affichage de estimation-section');
                    } else if (document.getElementById('saisie-tab').classList.contains('active')) {
                        // Forcer le masquage si l'onglet saisie est actif
                        mutation.target.style.display = 'none';
                        console.log('Correction automatique: masquage de estimation-section');
                    }
                }
            }
        });
    });
    
    // Observer les changements de style sur les sections de réconciliation et estimation
    const reconciliationSection = document.getElementById('reconciliation-section');
    const reconciliationMoisSection = document.getElementById('reconciliation-mois-section');
    const estimationSection = document.getElementById('estimation-section');
    
    if (reconciliationSection) {
        observer.observe(reconciliationSection, { attributes: true });
    }
    
    if (reconciliationMoisSection) {
        observer.observe(reconciliationMoisSection, { attributes: true });
    }

    // Ajouter l'observation pour la section d'estimation
    if (estimationSection) {
        observer.observe(estimationSection, { attributes: true });
        console.log('Observation activée pour estimation-section');
    }
    
    // Ajouter une protection pour la fonction hideAllSections existante
    const originalHideAllSections = window.hideAllSections;
    if (typeof originalHideAllSections === 'function') {
        window.hideAllSections = function() {
            // Appeler la fonction originale
            originalHideAllSections.apply(this, arguments);
            
            // Ajouter une protection supplémentaire pour les sections de réconciliation et estimation
            if (document.getElementById('saisie-tab').classList.contains('active')) {
                if (reconciliationSection) reconciliationSection.style.display = 'none';
                if (reconciliationMoisSection) reconciliationMoisSection.style.display = 'none';
                if (estimationSection) estimationSection.style.display = 'none';
            }

            // Si l'onglet estimation est actif, s'assurer que la section estimation est visible
            if (document.getElementById('estimation-tab').classList.contains('active')) {
                if (estimationSection) estimationSection.style.display = 'block';
            }
        };
        console.log('Fonction hideAllSections surchargée avec protection supplémentaire');
    }

    // Écouteur d'événement spécifique pour l'onglet estimation
    const estimationTab = document.getElementById('estimation-tab');
    if (estimationTab) {
        estimationTab.addEventListener('click', function() {
            // Forcer l'affichage de la section estimation
            if (estimationSection) {
                estimationSection.style.display = 'block';
                console.log('Affichage forcé de estimation-section (depuis l\'écouteur d\'événement)');
            }
        });
    }
});

// Ajouter un style CSS pour forcer le masquage des sections de réconciliation et estimation lorsque l'onglet Saisie est actif
const styleElement = document.createElement('style');
styleElement.textContent = `
    #saisie-section:not([style*="none"]) ~ #reconciliation-section,
    #saisie-section:not([style*="none"]) ~ #reconciliation-mois-section,
    #saisie-section:not([style*="none"]) ~ #estimation-section {
        display: none !important;
    }

    /* S'assurer que la section estimation est visible quand l'onglet estimation est actif */
    .nav-link#estimation-tab.active ~ #content-container #estimation-section {
        display: block !important;
    }
`;
document.head.appendChild(styleElement); 