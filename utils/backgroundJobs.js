const { DriverRequest, Driver, Order } = require('../models');
const { logger } = require('./logger');
const { Op } = require('sequelize');

// Function to handle request timeouts
const handleRequestTimeout = async (driverRequest) => {
    try {
        logger.info('Handling request timeout:', { requestId: driverRequest.id, orderId: driverRequest.orderId });
        // Update the expired request
        await driverRequest.update({ status: 'expired' });

        // Find other available drivers
        const availableDrivers = await Driver.findAll({
            where: {
                status: 'active',
                id: { [Op.ne]: driverRequest.driverId }
            }
        });

        if (availableDrivers.length > 0) {
            // Create new requests for other drivers
            const newRequests = availableDrivers.map(driver => ({
                orderId: driverRequest.orderId,
                driverId: driver.id,
                status: 'pending'
            }));

            await DriverRequest.bulkCreate(newRequests);
            logger.info(`Reassigned order ${driverRequest.orderId} to ${newRequests.length} new drivers`);
        } else {
            // If no drivers available, mark order as failed
            await Order.update(
                { order_status: 'cancelled', cancellationReason: 'No available drivers' },
                { where: { id: driverRequest.orderId } }
            );
            logger.info(`Order ${driverRequest.orderId} marked as failed - no available drivers`);
        }
    } catch (error) {
        logger.error('Error handling request timeout:', { error: error.message, stack: error.stack });
    }
};

// Function to check for expired requests
const checkExpiredRequests = async () => {
    try {
        logger.info('Checking for expired requests');
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        const expiredRequests = await DriverRequest.findAll({
            where: {
                status: 'pending',
                created_at: { [Op.lt]: fifteenMinutesAgo }
            },
            include: [{
                model: Order,
                as: 'order'
            }]
        });

        logger.info(`Found ${expiredRequests.length} expired requests`);
        for (const request of expiredRequests) {
            await handleRequestTimeout(request);
        }
    } catch (error) {
        logger.error('Error checking expired requests:', { error: error.message, stack: error.stack });
    }
};

module.exports = {
    checkExpiredRequests,
    handleRequestTimeout
}; 