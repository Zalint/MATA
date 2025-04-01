// Mock des fonctions du navigateur
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock File API
global.File = class {
    constructor(bits, name, options = {}) {
        this.name = name;
        this.size = bits.length;
        this.type = options.type || '';
        this._bits = bits;
    }
};

// Mock FileReader
global.FileReader = class {
    constructor() {
        this.onload = null;
    }

    readAsText(blob) {
        const result = blob._bits.join('');
        setTimeout(() => {
            if (this.onload) {
                this.onload({ target: { result } });
            }
        }, 0);
    }
};

// Mock des fonctions globales
global.alert = jest.fn();
global.confirm = jest.fn();
global.prompt = jest.fn();

// Mock des variables globales
global.POINTS_VENTE_PHYSIQUES = ['Abattage', 'O.Foire', 'Gros Client'];
global.PRODUITS = ['Boeuf', 'Veau', 'Agneau', 'Yell', 'Foie'];
global.PRIX_DEFAUT = {
    'Boeuf': 3600,
    'Veau': 3800,
    'Agneau': 4500,
    'Yell': 2500,
    'Foie': 3400
};

// Mock de flatpickr
global.flatpickr = jest.fn(() => ({
    setDate: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn()
}));

// Mock de document
global.document = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement: jest.fn(),
    createTextNode: jest.fn(),
    body: {
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
}; 