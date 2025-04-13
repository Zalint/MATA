module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/styleMock.js'
    },
    testMatch: [
        '**/tests/**/*.test.js',
        '**/local_tests/**/*.test.js'
    ],
    testPathIgnorePatterns: [
        "node_modules/",
        "\\.integration\\.test\\.js$",
        "auth\\.test\\.js$"
    ],
    verbose: true,
    transformIgnorePatterns: [
        "/node_modules/(?!uuid)/"
    ]
}; 