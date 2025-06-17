const { User } = require('../../models');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const userController = require('../../controllers/userController');

// Mock User model
jest.mock('../../models', () => ({
    User: {
        create: jest.fn(),
        findByPk: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
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