require('dotenv').config();
const Queue = require('bull');
const { logger } = require('./utils/logger');
const { checkExpiredRequests, handleRequestTimeout } = require('./utils/backgroundJobs');
const { DriverRequest, Driver, Order } = require('./models');
const { Op } = require('sequelize');

// Redis connection options with optimized settings
const redisConfig = {
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        connectTimeout: 10000
    },
    limiter: {
        max: 1000, // Maximum number of jobs processed
        duration: 5000 // Per 5 seconds
    }
};

// Create background jobs queue with optimized settings
const backgroundJobsQueue = new Queue('background-jobs', {
    ...redisConfig,
    defaultJobOptions: {
        removeOnComplete: 100, // Keep only last 100 completed jobs
        removeOnFail: 50, // Keep only last 50 failed jobs
        attempts: 3, // Maximum retry attempts
        backoff: {
            type: 'exponential',
            delay: 1000 // Start with 1 second delay
        }
    }
});

const driverRequestQueue = new Queue('driver-requests', {
    ...redisConfig,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

// Process background jobs queue with optimized batch processing
backgroundJobsQueue.process('check-expired-requests', async (job) => {
    try {
        logger.info('Processing expired requests check job');
        await checkExpiredRequests();
        logger.info('Completed expired requests check job');
        return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
        logger.error('Error in expired requests check job:', { error: error.message, stack: error.stack });
        throw error;
    }
});

// Process driver request queue with optimized timeout handling
driverRequestQueue.process('handle-timeout', async (job) => {
    try {
        const { requestId } = job.data;
        logger.info('Processing driver request timeout:', { requestId });

        const driverRequest = await DriverRequest.findByPk(requestId, {
            include: [{ model: Order, as: 'order' }]
        });

        if (driverRequest && driverRequest.status === 'pending') {
            await handleRequestTimeout(driverRequest);
            logger.info('Completed driver request timeout handling:', { requestId });
            return { success: true, requestId, processedAt: new Date().toISOString() };
        } else {
            logger.info('Driver request already processed or not found:', { requestId });
            return { success: true, skipped: true, requestId };
        }
    } catch (error) {
        logger.error('Error in driver request timeout job:', { error: error.message, stack: error.stack });
        throw error;
    }
});

// Error handling with rate limiting
backgroundJobsQueue.on('error', (error) => {
    logger.error('Background jobs queue error:', error);
});

driverRequestQueue.on('error', (error) => {
    logger.error('Driver request queue error:', error);
});

backgroundJobsQueue.on('failed', (job, err) => {
    logger.error('Background job failed:', { jobId: job.id, jobData: job.data, error: err.message });
});

driverRequestQueue.on('failed', (job, err) => {
    logger.error('Driver request job failed:', { jobId: job.id, jobData: job.data, error: err.message });
});

// Success logging with cleanup
backgroundJobsQueue.on('completed', async (job, result) => {
    logger.info('Background job completed:', { jobId: job.id, result });
    // Cleanup old jobs
    await backgroundJobsQueue.clean(3600000, 'completed'); // Clean jobs older than 1 hour
});

driverRequestQueue.on('completed', async (job, result) => {
    logger.info('Driver request job completed:', { jobId: job.id, result });
    // Cleanup old jobs
    await driverRequestQueue.clean(3600000, 'completed'); // Clean jobs older than 1 hour
});

// Worker management functions with optimized scheduling
const workerManager = {
    // Schedule recurring expired requests check with optimized interval
    async scheduleExpiredRequestsCheck() {
        try {
            // Remove existing scheduled jobs to avoid duplicates
            await backgroundJobsQueue.clean(0, 'delayed');

            // Schedule to run every 5 minutes instead of every minute
            const job = await backgroundJobsQueue.add(
                'check-expired-requests',
                {},
                {
                    repeat: { cron: '*/5 * * * *' }, // Every 5 minutes
                    removeOnComplete: 10,
                    removeOnFail: 5
                }
            );

            logger.info('Scheduled expired requests check job:', { jobId: job.id });
            return job;
        } catch (error) {
            logger.error('Error scheduling expired requests check:', error);
            throw error;
        }
    },

    // Schedule driver request timeout with optimized settings
    async scheduleDriverRequestTimeout(requestId, delayMinutes = 15) {
        try {
            const job = await driverRequestQueue.add(
                'handle-timeout',
                { requestId },
                {
                    delay: delayMinutes * 60 * 1000,
                    removeOnComplete: 5,
                    removeOnFail: 3,
                    jobId: `timeout-${requestId}` // Add jobId for better tracking
                }
            );

            logger.info('Scheduled driver request timeout:', { requestId, delayMinutes, jobId: job.id });
            return job;
        } catch (error) {
            logger.error('Error scheduling driver request timeout:', { requestId, error: error.message });
            throw error;
        }
    },

    // Cancel driver request timeout with optimized cleanup
    async cancelDriverRequestTimeout(requestId) {
        try {
            const jobs = await driverRequestQueue.getJobs(['delayed', 'waiting']);
            const targetJob = jobs.find(job =>
                job.data.requestId === requestId &&
                job.opts.jobId === `timeout-${requestId}`
            );

            if (targetJob) {
                await targetJob.remove();
                logger.info('Cancelled driver request timeout:', { requestId, jobId: targetJob.id });
                return true;
            }

            logger.info('No timeout job found to cancel:', { requestId });
            return false;
        } catch (error) {
            logger.error('Error cancelling driver request timeout:', { requestId, error: error.message });
            throw error;
        }
    },

    // Get worker status with optimized querying
    async getWorkerStatus() {
        try {
            const [backgroundStatus, driverRequestStatus] = await Promise.all([
                backgroundJobsQueue.getJobCounts(),
                driverRequestQueue.getJobCounts()
            ]);

            return {
                backgroundJobs: backgroundStatus,
                driverRequests: driverRequestStatus,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting worker status:', error);
            throw error;
        }
    },

    // Initialize all background jobs with optimized settings
    async initializeBackgroundJobs() {
        try {
            logger.info('Initializing background jobs with optimized queue system...');

            // Clean up any stale jobs
            await Promise.all([
                backgroundJobsQueue.clean(3600000, 'completed'),
                backgroundJobsQueue.clean(3600000, 'failed'),
                driverRequestQueue.clean(3600000, 'completed'),
                driverRequestQueue.clean(3600000, 'failed')
            ]);

            // Schedule expired requests check
            await this.scheduleExpiredRequestsCheck();

            logger.info('Background jobs initialized successfully with optimized queues');
            return true;
        } catch (error) {
            logger.error('Error initializing background jobs:', error);
            throw error;
        }
    },

    // Graceful shutdown with cleanup
    async shutdown() {
        try {
            logger.info('Shutting down worker queues...');

            // Clean up before shutting down
            await Promise.all([
                backgroundJobsQueue.clean(0, 'completed'),
                backgroundJobsQueue.clean(0, 'failed'),
                driverRequestQueue.clean(0, 'completed'),
                driverRequestQueue.clean(0, 'failed')
            ]);

            await Promise.all([
                backgroundJobsQueue.close(),
                driverRequestQueue.close()
            ]);

            logger.info('Worker queues shut down successfully');
        } catch (error) {
            logger.error('Error shutting down worker queues:', error);
            throw error;
        }
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down worker gracefully...');
    await workerManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down worker gracefully...');
    await workerManager.shutdown();
    process.exit(0);
});

// Export for use in other files
module.exports = {
    backgroundJobsQueue,
    driverRequestQueue,
    workerManager
};

// If this file is run directly, start the worker
if (require.main === module) {
    logger.info('Starting DelPick background worker with optimized settings...');

    workerManager.initializeBackgroundJobs()
        .then(() => {
            logger.info('DelPick background worker started successfully');
        })
        .catch((error) => {
            logger.error('Failed to start background worker:', error);
            process.exit(1);
        });
}