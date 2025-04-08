/**
 * Script pour configurer DeepSeek-Local
 * 
 * Ce script configure l'environnement pour l'analyse locale des données
 * en utilisant des techniques de traitement du langage naturel et d'analyse statistique.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

// Configuration
const MODEL_DIR = path.join(__dirname, 'models', 'deepseek-local');
const CONFIG_FILE = path.join(MODEL_DIR, 'config.json');
const KEYWORDS_FILE = path.join(MODEL_DIR, 'keywords.json');

// Fonction principale
async function setupDeepSeekLocal() {
    console.log('Configuration de DeepSeek-Local pour l\'analyse en local...');
    
    // Vérifier si le dossier existe
    if (!fs.existsSync(MODEL_DIR)) {
        console.log('Création du dossier pour les modèles locaux...');
        fs.mkdirSync(MODEL_DIR, { recursive: true });
    }
    
    console.log('Installation des dépendances pour l\'analyse locale...');
    
    // Installer les dépendances nécessaires
    exec('npm install natural ml-regression-simple-linear', (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'installation des dépendances: ${error.message}`);
            return;
        }
        
        console.log('Dépendances installées avec succès!');
        console.log('Configuration des modèles locaux...');
        
        // Créer le fichier de configuration
        if (!fs.existsSync(CONFIG_FILE)) {
            // Créer une configuration par défaut
            const defaultConfig = {
                model_name: "deepseek-local",
                version: "1.0.0",
                description: "Configuration pour l'analyse locale des données de réconciliation",
                settings: {
                    language: "french",
                    sensitivity: 0.7,
                    threshold: 0.3,
                    maxResults: 5
                },
                prompt_template: "Analyser les données de réconciliation pour identifier les anomalies et suggérer des actions correctives."
            };
            
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 4));
        }

        // Créer un fichier de mots-clés et termes pour l'analyse
        if (!fs.existsSync(KEYWORDS_FILE)) {
            const keywords = {
                positif: [
                    "équilibre", "précision", "exactitude", "correspondance", "maîtrise", 
                    "contrôle", "efficacité", "gestion", "organisation", "rigueur"
                ],
                negatif: [
                    "écart", "erreur", "perte", "manque", "anomalie", 
                    "discordance", "incohérence", "fuite", "déficit", "désorganisation"
                ],
                causes_ecart_positif: [
                    "vente non enregistrée", "stock soir surestimé", "perte non documentée",
                    "vol", "détérioration", "transfert non enregistré", "erreur de comptage"
                ],
                causes_ecart_negatif: [
                    "double saisie", "stock soir sous-estimé", "transfert entrant non enregistré",
                    "stock matin surestimé", "erreur de saisie", "erreur d'inventaire"
                ],
                recommandations: [
                    "formation du personnel", "procédure de contrôle", "double vérification", 
                    "audit régulier", "système de validation", "amélioration des outils", 
                    "documentation rigoureuse", "contrôle croisé", "standardisation des procédures"
                ]
            };
            
            fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(keywords, null, 4));
        }
        
        console.log('Configuration terminée!');
        console.log('DeepSeek-Local est prêt à être utilisé.');
        console.log('Pour l\'utiliser, démarrez l\'application avec "npm start".');
    });
}

// Exécuter la fonction principale
setupDeepSeekLocal().catch(error => {
    console.error('Erreur lors de la configuration:', error);
    process.exit(1);
});