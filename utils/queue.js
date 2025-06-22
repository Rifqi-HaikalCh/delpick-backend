require('dotenv').config();
const Queue = require('bull');
const { logger } = require('./logger');

console.log(process.env.REDIS_PORT);
console.log(process.env.REDIS_HOST);
console.log(process.env.REDIS_PASSWORD);
console.log(process.env.REDIS_TLS);

// Redis connection options
const redisConfig = {
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    }
};

// Create queues with authentication
const orderQueue = new Queue('order-processing', redisConfig);
const driverQueue = new Queue('driver-assignment', redisConfig);

// Process order queue
orderQueue.process(async (job) => {
    const { orderId, action } = job.data;
    logger.info(`Processing order ${orderId}: ${action}`);

    try {
        switch (action) {
            case 'find-driver':
                // Logic to find available drivers
                break;
            case 'check-status':
                // Logic to check order status
                break;
            case 'cleanup':
                // Logic to cleanup expired orders
                break;
            default:
                logger.warn(`Unknown order action: ${action}`);
        }
    } catch (error) {
        logger.error(`Error processing order ${orderId}:`, error);
        throw error;
    }
});

// Process driver queue
driverQueue.process(async (job) => {
    const { driverId, action } = job.data;
    logger.info(`Processing driver ${driverId}: ${action}`);

    try {
        switch (action) {
            case 'check-availability':
                // Logic to check driver availability
                break;
            case 'update-location':
                // Logic to update driver location
                break;
            default:
                logger.warn(`Unknown driver action: ${action}`);
        }
    } catch (error) {
        logger.error(`Error processing driver ${driverId}:`, error);
        throw error;
    }
});

// Error handling
orderQueue.on('error', (error) => {
    logger.error('Order queue error:', error);
});

driverQueue.on('error', (error) => {
    logger.error('Driver queue error:', error);
});

// Queue management functions
const queueManager = {
    // Add order job
    async addOrderJob(orderId, action, options = {}) {
        return orderQueue.add({ orderId, action }, options);
    },

    // Add driver job
    async addDriverJob(driverId, action, options = {}) {
        return driverQueue.add({ driverId, action }, options);
    },

    // Get queue status
    async getQueueStatus() {
        const [orderStatus, driverStatus] = await Promise.all([
            orderQueue.getJobCounts(),
            driverQueue.getJobCounts()
        ]);

        return {
            order: orderStatus,
            driver: driverStatus
        };
    }
};

module.exports = {
    orderQueue,
    driverQueue,
    queueManager
};