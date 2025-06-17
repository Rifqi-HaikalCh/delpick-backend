'use strict';

const { sequelize } = require('../models');
const response = require('../utils/response');
const { logger } = require('../utils/logger');
const redis = require('../config/redis');
const { Storage } = require('@google-cloud/storage');

/**
 * Check overall system health
 */
const check_health = async (req, res) => {
    try {
        const health_status = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };

        return response.success(res, 'System is healthy', health_status);
    } catch (error) {
        logger.error('Health check failed:', error);
        return response.error(res, 'Health check failed', 500);
    }
};

/**
 * Check database connection
 */
const check_database = async (req, res) => {
    try {
        await sequelize.authenticate();
        const db_status = {
            status: 'connected',
            timestamp: new Date().toISOString()
        };

        return response.success(res, 'Database is connected', db_status);
    } catch (error) {
        logger.error('Database health check failed:', error);
        return response.error(res, 'Database connection failed', 500);
    }
};

/**
 * Check Redis cache connection
 */
const check_cache = async (req, res) => {
    try {
        await redis.ping();
        const cache_status = {
            status: 'connected',
            timestamp: new Date().toISOString()
        };

        return response.success(res, 'Cache is connected', cache_status);
    } catch (error) {
        logger.error('Cache health check failed:', error);
        return response.error(res, 'Cache connection failed', 500);
    }
};

/**
 * Check cloud storage connection
 */
const check_storage = async (req, res) => {
    try {
        const storage = new Storage();
        const [buckets] = await storage.getBuckets();

        const storage_status = {
            status: 'connected',
            timestamp: new Date().toISOString(),
            buckets: buckets.length
        };

        return response.success(res, 'Storage is connected', storage_status);
    } catch (error) {
        logger.error('Storage health check failed:', error);
        return response.error(res, 'Storage connection failed', 500);
    }
};

module.exports = {
    check_health,
    check_database,
    check_cache,
    check_storage
}; 