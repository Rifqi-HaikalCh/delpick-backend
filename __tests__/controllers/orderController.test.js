const { Order, DriverRequest, Driver, User, OrderItem, MenuItem, sequelize } = require('../../models');
const { processOrderByStore, updateOrderStatus, cancelOrderRequest } = require('../../controllers/orderController');
const { sendNotification } = require('../../utils/notifications');

// Mock models
jest.mock('../../models', () => ({
    Order: {
        findOne: jest.fn(),
        update: jest.fn(),
        findByPk: jest.fn()
    },
    DriverRequest: {
        findOne: jest.fn(),
        update: jest.fn()
    },
    Driver: {
        update: jest.fn()
    },
    User: {
        findByPk: jest.fn()
    },
    OrderItem: {},
    MenuItem: {
        findOne: jest.fn(),
        update: jest.fn()
    },
    Store: {},
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

// Mock notifications
jest.mock('../../utils/notifications', () => ({
    sendNotification: jest.fn()
}));

describe('Order Controller - Store Reject with Accepted Driver', () => {
    let mockTransaction;

    beforeEach(() => {
        mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn()
        };
        sequelize.transaction.mockResolvedValue(mockTransaction);
        jest.clearAllMocks();
    });

    test('should cancel order and reset driver status when store rejects order with accepted driver', async () => {
        // Setup mock data
        const mockOrder = {
            id: 1,
            customer_id: 1,
            store_id: 1,
            order_status: 'pending',
            items: [],
            store: {
                owner: {
                    fcm_token: 'store_fcm_token'
                }
            },
            update: jest.fn()
        };

        const mockAcceptedDriverRequest = {
            id: 1,
            order_id: 1,
            driver_id: 1,
            status: 'accepted',
            driver: {
                id: 1,
                status: 'busy',
                user: {
                    id: 1,
                    fcm_token: 'driver_fcm_token'
                },
                update: jest.fn()
            },
            update: jest.fn()
        };

        const mockCustomer = {
            id: 1,
            fcm_token: 'customer_fcm_token'
        };

        // Setup mocks
        Order.findOne.mockResolvedValue(mockOrder);
        DriverRequest.findOne.mockResolvedValue(mockAcceptedDriverRequest);
        User.findByPk.mockResolvedValue(mockCustomer);

        // Create mock request and response objects
        const mockReq = {
            params: { id: 1 },
            body: { action: 'reject' }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Execute the function
        await processOrderByStore(mockReq, mockRes);

        // Verify order is updated to rejected
        expect(mockOrder.update).toHaveBeenCalledWith({
            order_status: 'rejected',
            cancellation_reason: 'Ditolak oleh toko'
        }, { transaction: mockTransaction });

        // Verify driver status is reset to active
        expect(mockAcceptedDriverRequest.driver.update).toHaveBeenCalledWith({
            status: 'active'
        }, { transaction: mockTransaction });

        // Verify driver request is rejected
        expect(mockAcceptedDriverRequest.update).toHaveBeenCalledWith({
            status: 'rejected'
        }, { transaction: mockTransaction });

        // Verify transaction is committed
        expect(mockTransaction.commit).toHaveBeenCalled();

        // Verify notifications are sent
        expect(sendNotification).toHaveBeenCalledWith(
            'customer_fcm_token',
            'Order Ditolak',
            'Pesanan Anda ditolak oleh toko.',
            { order_id: 1 }
        );

        expect(sendNotification).toHaveBeenCalledWith(
            'driver_fcm_token',
            'Order Dibatalkan',
            'Pesanan yang Anda terima telah dibatalkan oleh toko.',
            { order_id: 1 }
        );

        // Verify response
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Order berhasil ditolak'
            })
        );
    });

    test('should handle store rejection when no driver has accepted', async () => {
        // Setup mock data
        const mockOrder = {
            id: 1,
            customer_id: 1,
            store_id: 1,
            order_status: 'pending',
            items: [],
            store: {
                owner: {
                    fcm_token: 'store_fcm_token'
                }
            },
            update: jest.fn()
        };

        const mockCustomer = {
            id: 1,
            fcm_token: 'customer_fcm_token'
        };

        // Setup mocks - no accepted driver request
        Order.findOne.mockResolvedValue(mockOrder);
        DriverRequest.findOne.mockResolvedValue(null); // No accepted driver request
        User.findByPk.mockResolvedValue(mockCustomer);

        const mockReq = {
            params: { id: 1 },
            body: { action: 'reject' }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await processOrderByStore(mockReq, mockRes);

        // Verify order is rejected
        expect(mockOrder.update).toHaveBeenCalledWith({
            order_status: 'rejected',
            cancellation_reason: 'Ditolak oleh toko'
        }, { transaction: mockTransaction });

        // Verify transaction is committed
        expect(mockTransaction.commit).toHaveBeenCalled();

        // Verify only customer notification is sent (no driver notification)
        expect(sendNotification).toHaveBeenCalledWith(
            'customer_fcm_token',
            'Order Ditolak',
            'Pesanan Anda ditolak oleh toko.',
            { order_id: 1 }
        );

        // Should not send driver notification since no driver accepted
        expect(sendNotification).toHaveBeenCalledTimes(1);

        // Verify response
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Order berhasil ditolak'
            })
        );
    });

    test('should cancel order and reset driver status when updateOrderStatus sets status to rejected', async () => {
        // Setup mock data
        const mockOrder = {
            id: 1,
            customer_id: 1,
            store_id: 1,
            order_status: 'pending',
            items: [{
                name: 'Test Menu',
                quantity: 2
            }],
            customer: {
                fcm_token: 'customer_fcm_token'
            },
            update: jest.fn()
        };

        const mockAcceptedDriverRequest = {
            id: 1,
            order_id: 1,
            driver_id: 1,
            status: 'accepted',
            driver: {
                id: 1,
                status: 'busy',
                user: {
                    id: 1,
                    fcm_token: 'driver_fcm_token'
                },
                update: jest.fn()
            },
            update: jest.fn()
        };

        const mockMenuItem = {
            quantity: 10,
            update: jest.fn()
        };

        // Setup mocks
        Order.findByPk.mockResolvedValue(mockOrder);
        DriverRequest.findOne.mockResolvedValue(mockAcceptedDriverRequest);
        MenuItem.findOne.mockResolvedValue(mockMenuItem);

        // Create mock request and response objects
        const mockReq = {
            params: { id: 1 },
            body: { order_status: 'rejected' }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Execute the function
        await updateOrderStatus(mockReq, mockRes);

        // Verify inventory is restored
        expect(mockMenuItem.update).toHaveBeenCalledWith({
            quantity: 12 // 10 + 2
        }, { transaction: mockTransaction });

        // Verify driver status is reset to active
        expect(mockAcceptedDriverRequest.driver.update).toHaveBeenCalledWith({
            status: 'active'
        }, { transaction: mockTransaction });

        // Verify driver request is rejected
        expect(mockAcceptedDriverRequest.update).toHaveBeenCalledWith({
            status: 'rejected'
        }, { transaction: mockTransaction });

        // Verify notifications are sent
        expect(sendNotification).toHaveBeenCalledWith(
            'driver_fcm_token',
            'Order Dibatalkan',
            'Pesanan yang Anda terima telah dibatalkan.',
            { order_id: 1 }
        );

        expect(sendNotification).toHaveBeenCalledWith(
            'customer_fcm_token',
            'Pesanan Ditolak',
            'Pesanan Anda ditolak oleh toko.',
            { order_id: 1 }
        );
    });

    test('should cancel order and reset driver status when updateOrderStatus sets status to cancelled', async () => {
        // Setup mock data
        const mockOrder = {
            id: 1,
            customer_id: 1,
            store_id: 1,
            order_status: 'pending',
            items: [{
                name: 'Test Menu',
                quantity: 2
            }],
            customer: {
                fcm_token: 'customer_fcm_token'
            },
            update: jest.fn()
        };

        const mockAcceptedDriverRequest = {
            id: 1,
            order_id: 1,
            driver_id: 1,
            status: 'accepted',
            driver: {
                id: 1,
                status: 'busy',
                user: {
                    id: 1,
                    fcm_token: 'driver_fcm_token'
                },
                update: jest.fn()
            },
            update: jest.fn()
        };

        const mockMenuItem = {
            quantity: 10,
            update: jest.fn()
        };

        // Setup mocks
        Order.findByPk.mockResolvedValue(mockOrder);
        DriverRequest.findOne.mockResolvedValue(mockAcceptedDriverRequest);
        MenuItem.findOne.mockResolvedValue(mockMenuItem);

        // Create mock request and response objects
        const mockReq = {
            params: { id: 1 },
            body: { order_status: 'cancelled' }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Execute the function
        await updateOrderStatus(mockReq, mockRes);

        // Verify inventory is restored
        expect(mockMenuItem.update).toHaveBeenCalledWith({
            quantity: 12 // 10 + 2
        }, { transaction: mockTransaction });

        // Verify driver status is reset to active
        expect(mockAcceptedDriverRequest.driver.update).toHaveBeenCalledWith({
            status: 'active'
        }, { transaction: mockTransaction });

        // Verify driver request is rejected
        expect(mockAcceptedDriverRequest.update).toHaveBeenCalledWith({
            status: 'rejected'
        }, { transaction: mockTransaction });

        // Verify notifications are sent
        expect(sendNotification).toHaveBeenCalledWith(
            'driver_fcm_token',
            'Order Dibatalkan',
            'Pesanan yang Anda terima telah dibatalkan.',
            { order_id: 1 }
        );

        expect(sendNotification).toHaveBeenCalledWith(
            'customer_fcm_token',
            'Pesanan Dibatalkan',
            'Pesanan Anda telah dibatalkan.',
            { order_id: 1 }
        );
    });

    test('should cancel order and reset driver status when cancelOrderRequest is called', async () => {
        // Setup mock data
        const mockOrder = {
            id: 1,
            customer_id: 1,
            store_id: 1,
            order_status: 'pending',
            items: [{
                name: 'Test Menu',
                quantity: 2
            }],
            update: jest.fn()
        };

        const mockAcceptedDriverRequest = {
            id: 1,
            order_id: 1,
            driver_id: 1,
            status: 'accepted',
            driver: {
                id: 1,
                status: 'busy',
                user: {
                    id: 1,
                    fcm_token: 'driver_fcm_token'
                },
                update: jest.fn()
            },
            update: jest.fn()
        };

        const mockMenuItem = {
            quantity: 10,
            update: jest.fn()
        };

        // Setup mocks
        Order.findByPk.mockResolvedValue(mockOrder);
        DriverRequest.findOne.mockResolvedValue(mockAcceptedDriverRequest);
        MenuItem.findOne.mockResolvedValue(mockMenuItem);

        // Create mock request and response objects
        const mockReq = {
            params: { id: 1 }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Execute the function
        await cancelOrderRequest(mockReq, mockRes);

        // Verify inventory is restored
        expect(mockMenuItem.update).toHaveBeenCalledWith({
            quantity: 12 // 10 + 2
        }, { transaction: mockTransaction });

        // Verify driver status is reset to active
        expect(mockAcceptedDriverRequest.driver.update).toHaveBeenCalledWith({
            status: 'active'
        }, { transaction: mockTransaction });

        // Verify driver request is rejected
        expect(mockAcceptedDriverRequest.update).toHaveBeenCalledWith({
            status: 'rejected'
        }, { transaction: mockTransaction });

        // Verify order is cancelled
        expect(mockOrder.update).toHaveBeenCalledWith({
            order_status: 'cancelled'
        }, { transaction: mockTransaction });

        // Verify notification is sent to driver
        expect(sendNotification).toHaveBeenCalledWith(
            'driver_fcm_token',
            'Order Dibatalkan',
            'Pesanan yang Anda terima telah dibatalkan.',
            { order_id: 1 }
        );
    });
}); 