#!/usr/bin/env node
/**
 * Script de copie automatique du stock soir vers stock matin
 * 
 * Copie le stock soir du jour J vers le stock matin du jour J+1
 * Exécution programmée à 5h00 UTC via cron scheduler
 * 
 * Usage: node scripts/copy-stock-cron.js [--dry-run] [--date=YYYY-MM-DD]
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    DRY_RUN: process.argv.includes('--dry-run'),
    OVERRIDE_EXISTING: true,
    TIMEZONE_OFFSET: 0, // UTC
    LOG_LEVEL: 'info',
    BACKUP_BEFORE_COPY: true
};

// Classe pour la gestion des logs
class Logger {
    constructor(level = 'info') {
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.level = this.levels[level] || 1;
    }

    log(level, message, data = null) {
        if (this.levels[level] >= this.level) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            console.log(logMessage);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    }

    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

const logger = new Logger(CONFIG.LOG_LEVEL);

// Utilitaires de date
class DateUtils {
    static formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    static formatDateForPath(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }

    static getToday() {
        return new Date();
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}

// Gestionnaire de fichiers
class FileManager {
    constructor(baseDataPath = './data/by-date') {
        this.baseDataPath = path.resolve(baseDataPath);
    }

    getStockSoirPath(date) {
        const dateStr = DateUtils.formatDateForPath(date);
        return path.join(this.baseDataPath, dateStr, 'stock-soir.json');
    }

    getStockMatinPath(date) {
        const dateStr = DateUtils.formatDateForPath(date);
        return path.join(this.baseDataPath, dateStr, 'stock-matin.json');
    }

    async ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        try {
            await fs.access(dir);
        } catch (error) {
            logger.info(`Création du répertoire: ${dir}`);
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async readJsonFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // Fichier n'existe pas
            }
            throw error;
        }
    }

    async writeJsonFile(filePath, data) {
        await this.ensureDirectoryExists(filePath);
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf8');
    }

    async backupFile(filePath) {
        if (await this.fileExists(filePath)) {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            await fs.copyFile(filePath, backupPath);
            logger.info(`Backup créé: ${backupPath}`);
            return backupPath;
        }
        return null;
    }
}

// Transformateur de données
class StockTransformer {
    static transformSoirToMatin(stockSoirData, targetDate) {
        if (!stockSoirData || typeof stockSoirData !== 'object') {
            return {};
        }

        const targetDateStr = DateUtils.formatDate(targetDate);
        const transformedData = {};

        Object.keys(stockSoirData).forEach(key => {
            const item = stockSoirData[key];
            
            // Créer une nouvelle clé pour le stock matin
            const newKey = key.replace(/stock-soir/i, 'stock-matin');
            
            // Transformer l'item
            transformedData[newKey] = {
                ...item,
                date: targetDateStr,
                typeStock: 'matin',
                Commentaire: `Copié automatiquement du stock soir du ${item.date}`
            };
        });

        return transformedData;
    }

    static validateStockData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, message: 'Données invalides: pas un objet' };
        }

        const keys = Object.keys(data);
        if (keys.length === 0) {
            return { valid: false, message: 'Données vides' };
        }

        // Vérifier la structure des éléments
        for (const key of keys) {
            const item = data[key];
            if (!item.date || !item['Point de Vente'] || !item.Produit) {
                return { 
                    valid: false, 
                    message: `Structure invalide pour l'élément ${key}` 
                };
            }
        }

        return { valid: true, itemCount: keys.length };
    }
}

// Classe principale du processus de copie
class StockCopyProcessor {
    constructor() {
        this.fileManager = new FileManager();
        this.stats = {
            startTime: new Date(),
            itemsCopied: 0,
            errors: [],
            sourceDate: null,
            targetDate: null
        };
    }

    async run(sourceDate = null, targetDate = null) {
        try {
            logger.info('🚀 Début de la copie automatique du stock');
            logger.info(`Configuration: DRY_RUN=${CONFIG.DRY_RUN}, OVERRIDE=${CONFIG.OVERRIDE_EXISTING}`);

            // Déterminer les dates
            this.stats.sourceDate = sourceDate || DateUtils.getYesterday();
            this.stats.targetDate = targetDate || DateUtils.getToday();

            const sourceDateStr = DateUtils.formatDate(this.stats.sourceDate);
            const targetDateStr = DateUtils.formatDate(this.stats.targetDate);

            logger.info(`📅 Copie: Stock soir du ${sourceDateStr} → Stock matin du ${targetDateStr}`);

            // 1. Charger le stock soir source
            const stockSoirData = await this.loadSourceStock();
            if (!stockSoirData) {
                logger.warn('❌ Aucun stock soir trouvé pour la date source');
                return { success: false, message: 'Stock soir source introuvable' };
            }

            // 2. Transformer les données
            const stockMatinData = StockTransformer.transformSoirToMatin(stockSoirData, this.stats.targetDate);
            
            // 3. Valider les données transformées
            const validation = StockTransformer.validateStockData(stockMatinData);
            if (!validation.valid) {
                throw new Error(`Validation échouée: ${validation.message}`);
            }

            this.stats.itemsCopied = validation.itemCount;
            logger.info(`✅ ${this.stats.itemsCopied} éléments à copier`);

            // 4. Sauvegarder le stock matin
            await this.saveTargetStock(stockMatinData);

            // 5. Finaliser
            const duration = Date.now() - this.stats.startTime.getTime();
            logger.info(`🎉 Copie terminée avec succès en ${duration}ms`);

            return {
                success: true,
                itemsCopied: this.stats.itemsCopied,
                sourceDate: sourceDateStr,
                targetDate: targetDateStr,
                duration
            };

        } catch (error) {
            logger.error('❌ Erreur lors de la copie:', error.message);
            this.stats.errors.push(error.message);
            return { 
                success: false, 
                error: error.message, 
                stats: this.stats 
            };
        }
    }

    async loadSourceStock() {
        const stockSoirPath = this.fileManager.getStockSoirPath(this.stats.sourceDate);
        logger.debug(`Chargement: ${stockSoirPath}`);

        const exists = await this.fileManager.fileExists(stockSoirPath);
        if (!exists) {
            logger.warn(`Stock soir introuvable: ${stockSoirPath}`);
            return null;
        }

        const data = await this.fileManager.readJsonFile(stockSoirPath);
        logger.info(`📊 Stock soir chargé: ${Object.keys(data || {}).length} éléments`);
        
        return data;
    }

    async saveTargetStock(stockMatinData) {
        const stockMatinPath = this.fileManager.getStockMatinPath(this.stats.targetDate);
        logger.debug(`Sauvegarde vers: ${stockMatinPath}`);

        // Vérifier si le fichier existe déjà
        const targetExists = await this.fileManager.fileExists(stockMatinPath);
        
        if (targetExists) {
            if (CONFIG.OVERRIDE_EXISTING) {
                logger.info('📁 Stock matin existant détecté - écrasement autorisé');
                
                if (CONFIG.BACKUP_BEFORE_COPY) {
                    await this.fileManager.backupFile(stockMatinPath);
                }
            } else {
                throw new Error('Stock matin existant et OVERRIDE_EXISTING=false');
            }
        }

        // Mode dry-run
        if (CONFIG.DRY_RUN) {
            logger.info('🧪 MODE DRY-RUN: Aucune écriture effectuée');
            logger.debug('Données qui auraient été écrites:', stockMatinData);
            return;
        }

        // Écriture effective
        await this.fileManager.writeJsonFile(stockMatinPath, stockMatinData);
        logger.info(`💾 Stock matin sauvegardé: ${stockMatinPath}`);
    }
}

// Fonction principale
async function main() {
    let customDate = null;
    
    // Gestion de l'argument --date
    const dateArg = process.argv.find(arg => arg.startsWith('--date='));
    if (dateArg) {
        const dateStr = dateArg.split('=')[1];
        customDate = new Date(dateStr);
        if (isNaN(customDate.getTime())) {
            logger.error('❌ Format de date invalide. Utilisez --date=YYYY-MM-DD');
            process.exit(1);
        }
    }

    const processor = new StockCopyProcessor();
    
    let sourceDate = null;
    let targetDate = null;
    
    if (customDate) {
        sourceDate = customDate;
        targetDate = DateUtils.addDays(customDate, 1);
    }

    const result = await processor.run(sourceDate, targetDate);
    
    if (result.success) {
        logger.info('✅ Processus terminé avec succès');
        process.exit(0);
    } else {
        logger.error('❌ Processus échoué');
        process.exit(1);
    }
}

// Point d'entrée
if (require.main === module) {
    main().catch(error => {
        logger.error('💥 Erreur fatale:', error.message);
        process.exit(1);
    });
}

module.exports = {
    StockCopyProcessor,
    DateUtils,
    FileManager,
    StockTransformer,
    Logger
};
