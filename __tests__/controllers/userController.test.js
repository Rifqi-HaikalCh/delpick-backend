'use strict';

// Mock Firebase configuration first
jest.mock('../../config/firebase', () => ({
    admin: {
        messaging: () => ({
            send: jest.fn(),
            sendMulticast: jest.fn(),
            subscribeToTopic: jest.fn(),
            unsubscribeFromTopic: jest.fn()
        })
    }
}));

// Mock Firebase service account
jest.mock('../../config/firebase-service-account.json', () => ({}), { virtual: true });

// Mock Redis
jest.mock('../../config/redis', () => ({
    connect: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
}));

const { User } = require('../../models');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const userController = require('../../controllers/userController');
const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

// Mock User model
jest.mock('../../models', () => ({
    User: {
        create: jest.fn(),
        findByPk: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
    },
    Notification: {
        findOne: jest.fn(),
        update: jest.fn()
    }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('User Controller', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            user: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should create a new user successfully', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            mockReq.body = userData;
            const mockUser = { id: 1, ...userData };
            User.create.mockResolvedValue(mockUser);

            await userController.register(mockReq, mockRes, mockNext);

            expect(User.create).toHaveBeenCalledWith(userData);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        id: 1,
                        name: userData.name,
                        email: userData.email
                    })
                })
            });
        });

        it('should handle validation error', async () => {
            const userData = {
                name: 'Test User',
                email: 'invalid-email',
                password: '123'
            };

            mockReq.body = userData;
            User.create.mockRejectedValue(new ValidationError('Invalid input'));

            await userController.register(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockUser = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com'
            };

            mockReq.user = { id: 1 };
            User.findByPk.mockResolvedValue(mockUser);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(User.findByPk).toHaveBeenCalledWith(1);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: expect.objectContaining({
                    user: mockUser
                })
            });
        });

        it('should handle user not found', async () => {
            mockReq.user = { id: 999 };
            User.findByPk.mockResolvedValue(null);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('updateProfile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                name: 'Updated Name',
                phone: '1234567890'
            };

            mockReq.user = { id: 1 };
            mockReq.body = updateData;
            const mockUpdatedUser = { id: 1, ...updateData };
            User.update.mockResolvedValue([1]);
            User.findByPk.mockResolvedValue(mockUpdatedUser);

            await userController.updateProfile(mockReq, mockRes, mockNext);

            expect(User.update).toHaveBeenCalledWith(updateData, {
                where: { id: 1 }
            });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: expect.objectContaining({
                    user: mockUpdatedUser
                })
            });
        });

        it('should handle validation error', async () => {
            const updateData = {
                email: 'invalid-email'
            };

            mockReq.user = { id: 1 };
            mockReq.body = updateData;
            User.update.mockRejectedValue(new ValidationError('Invalid email'));

            await userController.updateProfile(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
        });
    });
});

describe('User Controller - FCM Token', () => {
    let mockUser;
    let authToken;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'customer',
            fcm_token: null,
            update: jest.fn()
        };

        // Generate a test token
        authToken = jwt.sign(
            { id: mockUser.id, role: mockUser.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    describe('PUT /api/v1/users/fcm-token', () => {
        test('should update FCM token successfully', async () => {
            const fcmToken = 'test-fcm-token-123';

            User.findByPk.mockResolvedValue(mockUser);
            mockUser.update.mockResolvedValue({ ...mockUser, fcm_token: fcmToken });

            const response = await request(app)
                .put('/api/v1/users/fcm-token')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ fcm_token: fcmToken });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('FCM token berhasil diperbarui');
            expect(response.body.data.fcm_token).toBe(fcmToken);
            expect(mockUser.update).toHaveBeenCalledWith({ fcm_token: fcmToken });
        });

        test('should return 400 for missing FCM token', async () => {
            const response = await request(app)
                .put('/api/v1/users/fcm-token')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        test('should return 404 if user not found', async () => {
            User.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/v1/users/fcm-token')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ fcm_token: 'test-token' });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('User tidak ditemukan');
        });

        test('should return 401 without authentication', async () => {
            const response = await request(app)
                .put('/api/v1/users/fcm-token')
                .send({ fcm_token: 'test-token' });

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/v1/users/profile (with FCM token)', () => {
        test('should update profile including FCM token', async () => {
            const updateData = {
                name: 'Updated Name',
                fcm_token: 'updated-fcm-token'
            };

            User.findByPk.mockResolvedValue(mockUser);
            mockUser.update.mockResolvedValue({ ...mockUser, ...updateData });

            const response = await request(app)
                .put('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(mockUser.update).toHaveBeenCalledWith({
                name: updateData.name,
                fcm_token: updateData.fcm_token
            });
        });

        test('should handle empty FCM token (remove token)', async () => {
            const updateData = {
                name: 'Updated Name',
                fcm_token: ''
            };

            User.findByPk.mockResolvedValue(mockUser);
            mockUser.update.mockResolvedValue({ ...mockUser, ...updateData });

            const response = await request(app)
                .put('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(mockUser.update).toHaveBeenCalledWith({
                name: updateData.name,
                fcm_token: updateData.fcm_token
            });
        });
    });
}); 