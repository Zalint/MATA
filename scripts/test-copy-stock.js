#!/usr/bin/env node
/**
 * Script de test pour la copie automatique du stock
 * 
 * Usage: node scripts/test-copy-stock.js [options]
 * Options:
 *   --create-test-data : Créer des données de test
 *   --test-copy : Tester la copie (dry-run)
 *   --test-real-copy : Tester la copie réelle
 *   --clean-test-data : Nettoyer les données de test
 */

const path = require('path');
const fs = require('fs').promises;
const { StockCopyProcessor, DateUtils, FileManager, Logger } = require('./copy-stock-cron');

const logger = new Logger('debug');

class TestDataCreator {
    constructor() {
        this.fileManager = new FileManager();
    }

    async createTestStockSoir(date) {
        const testData = {
            "Mbao-Boeuf": {
                "date": DateUtils.formatDate(date),
                "typeStock": "soir",
                "Point de Vente": "Mbao",
                "Produit": "Boeuf",
                "Nombre": "25.5",
                "PU": "3700",
                "Montant": "94350",
                "Commentaire": "Stock test automatique"
            },
            "O.Foire-Veau": {
                "date": DateUtils.formatDate(date),
                "typeStock": "soir",
                "Point de Vente": "O.Foire",
                "Produit": "Veau",
                "Nombre": "12.0",
                "PU": "3900",
                "Montant": "46800",
                "Commentaire": "Stock test veau"
            },
            "Linguere-Agneau": {
                "date": DateUtils.formatDate(date),
                "typeStock": "soir",
                "Point de Vente": "Linguere",
                "Produit": "Agneau",
                "Nombre": "8.75",
                "PU": "4500",
                "Montant": "39375",
                "Commentaire": "Stock test agneau"
            }
        };

        const stockSoirPath = this.fileManager.getStockSoirPath(date);
        await this.fileManager.writeJsonFile(stockSoirPath, testData);
        
        logger.info(`📝 Données de test créées: ${stockSoirPath}`);
        return testData;
    }

    async cleanTestData(date) {
        const stockSoirPath = this.fileManager.getStockSoirPath(date);
        const stockMatinPath = this.fileManager.getStockMatinPath(DateUtils.addDays(date, 1));

        try {
            await fs.unlink(stockSoirPath);
            logger.info(`🗑️ Supprimé: ${stockSoirPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn(`Erreur suppression ${stockSoirPath}:`, error.message);
            }
        }

        try {
            await fs.unlink(stockMatinPath);
            logger.info(`🗑️ Supprimé: ${stockMatinPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn(`Erreur suppression ${stockMatinPath}:`, error.message);
            }
        }
    }
}

class TestRunner {
    constructor() {
        this.testDataCreator = new TestDataCreator();
        this.results = [];
    }

    async runTest(testName, testFunction) {
        logger.info(`\n🧪 Test: ${testName}`);
        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.results.push({
                name: testName,
                success: true,
                duration,
                result
            });
            
            logger.info(`✅ ${testName} - Succès (${duration}ms)`);
            return result;
        } catch (error) {
            this.results.push({
                name: testName,
                success: false,
                error: error.message
            });
            
            logger.error(`❌ ${testName} - Échec:`, error.message);
            throw error;
        }
    }

    async testCreateData() {
        return this.runTest('Création de données de test', async () => {
            const testDate = DateUtils.getYesterday();
            const data = await this.testDataCreator.createTestStockSoir(testDate);
            
            if (!data || Object.keys(data).length === 0) {
                throw new Error('Aucune donnée créée');
            }
            
            return { itemCount: Object.keys(data).length, date: DateUtils.formatDate(testDate) };
        });
    }

    async testDryRunCopy() {
        return this.runTest('Test copie (dry-run)', async () => {
            // Temporairement activer le dry-run
            const originalDryRun = process.argv.includes('--dry-run');
            if (!originalDryRun) {
                process.argv.push('--dry-run');
            }

            const processor = new StockCopyProcessor();
            const result = await processor.run();

            // Restaurer l'état original
            if (!originalDryRun) {
                const index = process.argv.indexOf('--dry-run');
                if (index > -1) {
                    process.argv.splice(index, 1);
                }
            }

            if (!result.success) {
                throw new Error(result.error || 'Copie dry-run échouée');
            }

            return result;
        });
    }

    async testRealCopy() {
        return this.runTest('Test copie réelle', async () => {
            const processor = new StockCopyProcessor();
            const result = await processor.run();

            if (!result.success) {
                throw new Error(result.error || 'Copie réelle échouée');
            }

            return result;
        });
    }

    async testDataValidation() {
        return this.runTest('Validation des données copiées', async () => {
            const targetDate = DateUtils.getToday();
            const fileManager = new FileManager();
            const stockMatinPath = fileManager.getStockMatinPath(targetDate);

            const exists = await fileManager.fileExists(stockMatinPath);
            if (!exists) {
                throw new Error('Fichier stock matin non trouvé');
            }

            const data = await fileManager.readJsonFile(stockMatinPath);
            if (!data || Object.keys(data).length === 0) {
                throw new Error('Données stock matin vides');
            }

            // Vérifier la structure des données
            for (const [key, item] of Object.entries(data)) {
                if (!item.date || !item['Point de Vente'] || !item.Produit) {
                    throw new Error(`Structure invalide pour ${key}`);
                }

                if (item.typeStock !== 'matin') {
                    throw new Error(`Type stock incorrect pour ${key}: ${item.typeStock}`);
                }

                if (!item.Commentaire || !item.Commentaire.includes('Copié automatiquement')) {
                    throw new Error(`Commentaire de copie manquant pour ${key}`);
                }
            }

            return { 
                itemCount: Object.keys(data).length,
                sampleItem: Object.keys(data)[0],
                targetDate: DateUtils.formatDate(targetDate)
            };
        });
    }

    async testCleanup() {
        return this.runTest('Nettoyage des données de test', async () => {
            const testDate = DateUtils.getYesterday();
            await this.testDataCreator.cleanTestData(testDate);
            return { cleaned: true };
        });
    }

    async runAllTests() {
        logger.info('🚀 Début des tests de copie automatique');
        
        try {
            // 1. Créer des données de test
            await this.testCreateData();

            // 2. Tester en mode dry-run
            await this.testDryRunCopy();

            // 3. Tester la copie réelle
            await this.testRealCopy();

            // 4. Valider les données copiées
            await this.testDataValidation();

            // 5. Nettoyer
            await this.testCleanup();

            this.printSummary();
            return true;

        } catch (error) {
            logger.error('❌ Tests échoués:', error.message);
            this.printSummary();
            return false;
        }
    }

    printSummary() {
        logger.info('\n📊 Résumé des tests:');
        logger.info('═'.repeat(50));

        let totalSuccess = 0;
        let totalTests = this.results.length;

        this.results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            logger.info(`${status} ${result.name}${duration}`);
            
            if (result.success) {
                totalSuccess++;
                if (result.result) {
                    logger.debug('  Résultat:', result.result);
                }
            } else {
                logger.error(`  Erreur: ${result.error}`);
            }
        });

        logger.info('═'.repeat(50));
        logger.info(`Total: ${totalSuccess}/${totalTests} tests réussis`);
        
        if (totalSuccess === totalTests) {
            logger.info('🎉 Tous les tests sont passés !');
        } else {
            logger.error('❌ Certains tests ont échoué');
        }
    }
}

// Fonctions utilitaires pour les tests individuels
async function createTestData() {
    const creator = new TestDataCreator();
    const testDate = DateUtils.getYesterday();
    await creator.createTestStockSoir(testDate);
    logger.info('✅ Données de test créées');
}

async function testCopyDryRun() {
    process.argv.push('--dry-run');
    const processor = new StockCopyProcessor();
    const result = await processor.run();
    logger.info('✅ Test dry-run terminé:', result);
}

async function testRealCopy() {
    const processor = new StockCopyProcessor();
    const result = await processor.run();
    logger.info('✅ Test copie réelle terminé:', result);
}

async function cleanTestData() {
    const creator = new TestDataCreator();
    const testDate = DateUtils.getYesterday();
    await creator.cleanTestData(testDate);
    logger.info('✅ Données de test nettoyées');
}

// Point d'entrée
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--create-test-data')) {
        await createTestData();
    } else if (args.includes('--test-copy')) {
        await testCopyDryRun();
    } else if (args.includes('--test-real-copy')) {
        await testRealCopy();
    } else if (args.includes('--clean-test-data')) {
        await cleanTestData();
    } else {
        // Exécuter tous les tests
        const runner = new TestRunner();
        const success = await runner.runAllTests();
        process.exit(success ? 0 : 1);
    }
}

if (require.main === module) {
    main().catch(error => {
        logger.error('💥 Erreur fatale:', error.message);
        process.exit(1);
    });
}

module.exports = {
    TestDataCreator,
    TestRunner
};
