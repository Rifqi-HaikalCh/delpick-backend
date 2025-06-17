require('dotenv').config({ path: '.env.test' });

// Mock Redis client
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        connect: jest.fn(),
        on: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        quit: jest.fn()
    }))
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    messaging: () => ({
        send: jest.fn(),
        sendMulticast: jest.fn(),
        subscribeToTopic: jest.fn(),
        unsubscribeFromTopic: jest.fn()
    })
}));

// Mock Sequelize
jest.mock('sequelize', () => {
    const actualSequelize = jest.requireActual('sequelize');
    return {
        ...actualSequelize,
        Sequelize: jest.fn(() => ({
            define: jest.fn(),
            authenticate: jest.fn(),
            sync: jest.fn()
        }))
    };
});

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
}); 