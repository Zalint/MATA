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
    verbose: true
}; 