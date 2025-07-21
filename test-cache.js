// Script de test pour le système de cache de réconciliation
console.log('=== Test du système de cache de réconciliation ===');

// Simuler le cache
const reconciliationCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fonction de test pour ajouter des données au cache
function testAjouterCache(mois, annee, donnees) {
    const cacheKey = `${mois}-${annee}`;
    const cacheData = {
        data: donnees,
        totaux: {
            ventesTheoriques: 1000000,
            ventesSaisies: 950000,
            versements: 900000,
            estimation: 1100000
        },
        timestamp: Date.now()
    };
    reconciliationCache.set(cacheKey, cacheData);
    console.log(`✅ Données ajoutées au cache pour ${mois}/${annee}`);
}

// Fonction de test pour vérifier le cache
function testVerifierCache(mois, annee) {
    const cacheKey = `${mois}-${annee}`;
    const cachedData = reconciliationCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        console.log(`✅ Cache HIT pour ${mois}/${annee} - Données trouvées`);
        return true;
    } else {
        console.log(`❌ Cache MISS pour ${mois}/${annee} - Données non trouvées ou expirées`);
        return false;
    }
}

// Fonction de test pour forcer le recalcul
function testForcerRecalcul(mois, annee) {
    const cacheKey = `${mois}-${annee}`;
    const wasDeleted = reconciliationCache.delete(cacheKey);
    console.log(`🔄 Recalcul forcé pour ${mois}/${annee} - Cache supprimé: ${wasDeleted}`);
}

// Tests
console.log('\n--- Test 1: Ajout de données au cache ---');
testAjouterCache('07', '2025', [
    { date: '01/07/2025', pointVente: 'Keur Massar', ventesTheoriques: 500000, ventesSaisies: 480000, versements: 450000, estimation: 520000 },
    { date: '02/07/2025', pointVente: 'O.Foire', ventesTheoriques: 300000, ventesSaisies: 290000, versements: 280000, estimation: 310000 }
]);

console.log('\n--- Test 2: Vérification du cache ---');
testVerifierCache('07', '2025');
testVerifierCache('08', '2025'); // Devrait être un MISS

console.log('\n--- Test 3: Forcer le recalcul ---');
testForcerRecalcul('07', '2025');
testVerifierCache('07', '2025'); // Devrait maintenant être un MISS

console.log('\n--- Test 4: État du cache ---');
console.log(`📊 Taille du cache: ${reconciliationCache.size} entrées`);
console.log(`📊 Clés dans le cache: ${Array.from(reconciliationCache.keys()).join(', ')}`);

console.log('\n=== Tests terminés ==='); 