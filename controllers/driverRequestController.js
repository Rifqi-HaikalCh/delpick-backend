const { DriverRequest, Driver, DriverReview, Order, User, Store, OrderItem } = require('../models');
const response = require('../utils/response');
const { logger } = require('../utils/logger');
const { getQueryOptions } = require('../utils/queryHelper');
const { Op } = require('sequelize');

// Background job functions moved to utils/backgroundJobs.js

const getDriverRequests = async (req, res) => {
    try {
        logger.info('Get driver requests request:', { userId: req.user.id });
        const queryOptions = getQueryOptions(req.query);

        const userId = req.user.id;

        const driver = await Driver.findOne({
            where: { user_id: userId }
        });

        if (!driver) {
            logger.warn('Driver not found:', { userId });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        const driver_id = driver.id;

        queryOptions.where = { driver_id };

        queryOptions.include = [
            {
                model: Order,
                as: 'order',
                include: [
                    {
                        model: User,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone']
                    }
                ]
            }
        ];

        queryOptions.order = [['created_at', 'DESC']];

        const { count, rows: requests } = await DriverRequest.findAndCountAll(queryOptions);

        logger.info('Successfully retrieved driver requests:', { driver_id, count });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan permintaan pengantaran',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                requests
            }
        });
    } catch (error) {
        logger.error('Error getting driver requests:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Gagal mendapatkan permintaan pengantaran',
            errors: error.message
        });
    }
};

/**
 * Get detailed driver request
 */
const getDriverRequestDetail = async (req, res) => {
    try {
        logger.info('Get driver request detail request:', { userId: req.user.id, id: req.params.id });
        const userId = req.user.id;

        const driver = await Driver.findOne({
            where: { user_id: userId }
        });

        if (!driver) {
            logger.warn('Driver not found:', { userId });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        const driver_id = driver.id;
        const { id } = req.params;

        const driverRequest = await DriverRequest.findOne({
            where: {
                id: id,
                driver_id
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'customer',
                            attributes: ['id', 'name', 'phone', 'address']
                        },
                        {
                            model: Store,
                            as: 'store',
                            attributes: ['id', 'name', 'address', 'phone']
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                        },
                        {
                            model: DriverReview,
                            as: 'driverReviews',
                        }
                    ]
                }
            ]
        });

        if (!driverRequest) {
            logger.warn('Driver request not found:', { id, driver_id });
            return response(res, {
                statusCode: 404,
                message: 'Permintaan pengantaran tidak ditemukan'
            });
        }

        logger.info('Successfully retrieved driver request detail:', { id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan detail permintaan pengantaran',
            data: driverRequest
        });
    } catch (error) {
        logger.error('Error getting driver request detail:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Gagal mendapatkan detail permintaan pengantaran',
            error: error.message
        });
    }
};

/**
 * Driver merespon permintaan pengantaran (menerima/menolak)
 */
const respondToDriverRequest = async (req, res) => {
    try {
        logger.info('Respond to driver request:', { userId: req.user.id, id: req.params.id, action: req.body.action });
        const userId = req.user.id;
        const driver = await Driver.findOne({
            where: { user_id: userId }
        });

        if (!driver) {
            logger.warn('Driver not found:', { userId });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        const driver_id = driver.id;
        const { id } = req.params;
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            logger.warn('Invalid action:', { action });
            return response(res, {
                statusCode: 400,
                message: 'Action harus berupa "accept" atau "reject"'
            });
        }

        const driverRequest = await DriverRequest.findOne({
            where: {
                id: id,
                driver_id
            },
            include: [{
                model: Order,
                as: 'order'
            }]
        });

        if (!driverRequest) {
            logger.warn('Driver request not found:', { id, driver_id });
            return response(res, {
                statusCode: 404,
                message: 'Permintaan pengantaran tidak ditemukan'
            });
        }

        if (driverRequest.status !== 'pending') {
            return response(res, {
                statusCode: 400,
                message: `Permintaan pengantaran sudah di-${driverRequest.status} sebelumnya`
            });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        const updateData = { status: newStatus };

        if (action === 'accept') {
            updateData.estimated_pickup_time = driverRequest.order.estimated_pickup_time;
            updateData.estimated_delivery_time = driverRequest.order.estimated_delivery_time;
        }

        await driverRequest.update(updateData);

        // Cancel scheduled timeout untuk request ini karena sudah direspon
        try {
            const { workerManager } = require('../worker');
            await workerManager.cancelDriverRequestTimeout(driverRequest.id);
            logger.info(`Cancelled timeout for driver request ${driverRequest.id}`);
        } catch (workerError) {
            logger.error('Error cancelling driver request timeout:', {
                id: driverRequest.id,
                error: workerError.message
            });
        }

        if (action === 'accept') {
            // Check if order is already taken
            const existingAcceptedRequest = await DriverRequest.findOne({
                where: {
                    id: { [Op.ne]: driverRequest.id },
                    order_id: driverRequest.order_id,
                    status: 'accepted'
                }
            });

            if (existingAcceptedRequest) {
                await driverRequest.update({ status: 'pending' });
                return response(res, {
                    statusCode: 400,
                    message: 'Order sudah diambil oleh driver lain'
                });
            }

            // Update driver status to busy
            await driver.update({ status: 'busy' });

            // Update order status
            await Order.update(
                {
                    driver_id,
                    delivery_status: 'picked_up',
                    estimated_pickup_time: driverRequest.order.estimated_pickup_time,
                    estimated_delivery_time: driverRequest.order.estimated_delivery_time
                },
                { where: { id: driverRequest.order_id } }
            );
        }

        logger.info('Driver request response processed successfully:', { id, action });
        return response(res, {
            statusCode: 200,
            message: `Permintaan pengantaran berhasil di-${action === 'accept' ? 'terima' : 'tolak'}`,
            data: driverRequest
        });
    } catch (error) {
        logger.error('Error responding to driver request:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat merespon permintaan pengantaran',
            errors: error.message
        });
    }
};

module.exports = {
    getDriverRequests,
    getDriverRequestDetail,
    respondToDriverRequest
};