const Redis = require('ioredis');
const logger = require('./logger').logger;

const redis = new Redis({
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

const cache = {
    // Get cached data
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    },

    // Set cache with expiration
    async set(key, value, expireSeconds = 3600) {
        try {
            await redis.setex(key, expireSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    },

    // Delete cache
    async del(key) {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    },

    // Clear all cache
    async clear() {
        try {
            await redis.flushall();
            return true;
        } catch (error) {
            logger.error('Cache clear error:', error);
            return false;
        }
    },

    // Cache middleware for Express
    middleware(expireSeconds = 3600) {
        return async (req, res, next) => {
            if (req.method !== 'GET') {
                return next();
            }

            const key = `cache:${req.originalUrl}`;
            const cachedData = await cache.get(key);

            if (cachedData) {
                return res.json(cachedData);
            }

            // Store original res.json
            const originalJson = res.json;

            // Override res.json method
            res.json = function (data) {
                cache.set(key, data, expireSeconds);
                return originalJson.call(this, data);
            };

            next();
        };
    }
};

module.exports = cache; 