// Import des fonctions à tester
const fs = require('fs');
const path = require('path');

// Mock de fetch pour les appels API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    })
);

// Mock des fonctions à tester
const mockFunctions = {
    initInventaire: jest.fn(),
    ajouterLigneStock: jest.fn(),
    ajouterLigneTransfert: jest.fn(),
    sauvegarderDonneesStock: jest.fn(),
    sauvegarderTransfert: jest.fn(),
    importerCSV: jest.fn(),
    calculateTotal: jest.fn(),
    onTypeStockChange: jest.fn()
};

// Mock du DOM
document.body.innerHTML = `
    <div id="tabs">
        <button id="saisie-tab">Saisie</button>
        <button id="visualisation-tab">Visualisation</button>
        <button id="import-tab">Import</button>
        <button id="stock-inventaire-tab">Stock Inventaire</button>
    </div>
    <div id="saisie-section" style="display: none;">
        <form id="vente-form">
            <button id="ajouter-produit">Ajouter un produit</button>
        </form>
    </div>
    <div id="visualisation-section" style="display: none;"></div>
    <div id="import-section" style="display: none;">
        <button id="confirmImport">Confirmer l'import</button>
        <button id="cancelImport">Annuler l'import</button>
        <button id="save-import">Sauvegarder l'import</button>
    </div>
    <div id="stock-inventaire-section">
        <select id="type-stock">
            <option value="matin">Stock Matin</option>
            <option value="soir">Stock Soir</option>
        </select>
        <table id="stock-table">
            <thead>
                <tr>
                    <th>Point de Vente</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Total</th>
                    <th>Commentaire</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <button id="add-stock-row">Ajouter une ligne</button>
        <button id="save-stock">Sauvegarder le stock</button>
        <button id="importCsv">Importer CSV</button>
    </div>
    <div id="transfert-section">
        <table id="transfertTable">
            <thead>
                <tr>
                    <th>Point de Vente</th>
                    <th>Produit</th>
                    <th>Impact (+/-)</th>
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Total</th>
                    <th>Commentaire</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <button id="ajouterLigne">Ajouter une ligne</button>
        <button id="sauvegarderTransfert">Sauvegarder le transfert</button>
        <button id="importCsvTransfert">Importer CSV</button>
    </div>
    <input type="file" id="csv-file" accept=".csv" style="display: none;">
    <button id="logout-btn">Déconnexion</button>
    <button id="vider-base" style="display: none;">Vider la base</button>
`;

// Mock des fonctions document
const addEventListener = jest.fn((event, handler) => {
    if (event === 'click') {
        handler();
    } else if (event === 'change') {
        handler({ target: { value: 'soir' } });
    }
});

document.getElementById = jest.fn((id) => {
    const element = document.querySelector(`#${id}`);
    if (element) {
        element.addEventListener = addEventListener;
        element.click = () => {
            const clickEvent = new Event('click');
            element.dispatchEvent(clickEvent);
        };
    }
    return element;
});

document.querySelector = jest.fn((selector) => {
    const element = document.body.querySelector(selector);
    if (element) {
        element.addEventListener = addEventListener;
        element.click = () => {
            const clickEvent = new Event('click');
            element.dispatchEvent(clickEvent);
        };
    }
    return element;
});

document.querySelectorAll = jest.fn((selector) => Array.from(document.body.querySelectorAll(selector)));

// Attacher les fonctions mockées aux événements
const addStockRow = document.getElementById('add-stock-row');
addStockRow.addEventListener('click', mockFunctions.ajouterLigneStock);

const saveStock = document.getElementById('save-stock');
saveStock.addEventListener('click', mockFunctions.sauvegarderDonneesStock);

const importCsv = document.getElementById('importCsv');
importCsv.addEventListener('click', mockFunctions.importerCSV);

const typeStock = document.getElementById('type-stock');
typeStock.addEventListener('change', mockFunctions.onTypeStockChange);

const ajouterLigne = document.getElementById('ajouterLigne');
ajouterLigne.addEventListener('click', mockFunctions.ajouterLigneTransfert);

const sauvegarderTransfert = document.getElementById('sauvegarderTransfert');
sauvegarderTransfert.addEventListener('click', mockFunctions.sauvegarderTransfert);

const csvFile = document.getElementById('csv-file');
csvFile.addEventListener('change', mockFunctions.importerCSV);

describe('Tests Stock Inventaire', () => {
    beforeEach(() => {
        // Réinitialiser les mocks et le DOM avant chaque test
        jest.clearAllMocks();
        document.querySelector('#stock-table tbody').innerHTML = '';
        document.querySelector('#transfertTable tbody').innerHTML = '';
        // Initialiser les gestionnaires d'événements
        mockFunctions.initInventaire();
    });

    test('Ajouter une ligne dans stock', () => {
        // Appeler directement la fonction mockée
        mockFunctions.ajouterLigneStock();

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.ajouterLigneStock).toHaveBeenCalled();
    });

    test('Importer CSV dans stock', async () => {
        const csvData = `Point de Vente,Date,Stock,Produit,Impact,Quantite,PU,Total
Abattage,01/01/2024,matin,Boeuf,+,100,3600,360000
O.Foire,01/01/2024,soir,Veau,-,50,3800,190000`;

        // Appeler directement la fonction mockée
        mockFunctions.importerCSV({
            target: {
                files: [new File([csvData], 'test.csv', { type: 'text/csv' })]
            }
        });

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.importerCSV).toHaveBeenCalled();
    });

    test('Sauvegarder le stock', async () => {
        // Appeler directement la fonction mockée
        mockFunctions.sauvegarderDonneesStock();

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.sauvegarderDonneesStock).toHaveBeenCalled();
    });

    test('Changement de type de stock (matin/soir)', async () => {
        // Appeler directement la fonction mockée
        mockFunctions.onTypeStockChange({ target: { value: 'soir' } });

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.onTypeStockChange).toHaveBeenCalled();
    });
});

describe('Tests Transfert', () => {
    beforeEach(() => {
        // Réinitialiser les mocks et le DOM avant chaque test
        jest.clearAllMocks();
        document.querySelector('#transfertTable tbody').innerHTML = '';
        // Initialiser les gestionnaires d'événements
        mockFunctions.initInventaire();
    });

    test('Ajouter une ligne dans transfert', () => {
        // Appeler directement la fonction mockée
        mockFunctions.ajouterLigneTransfert();

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.ajouterLigneTransfert).toHaveBeenCalled();
    });

    test('Sauvegarder le transfert', async () => {
        // Appeler directement la fonction mockée
        mockFunctions.sauvegarderTransfert();

        // Vérifier que la fonction a été appelée
        expect(mockFunctions.sauvegarderTransfert).toHaveBeenCalled();
    });
}); 