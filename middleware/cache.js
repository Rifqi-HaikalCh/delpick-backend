'use strict';

const Redis = require('redis');
const { logger } = require('../utils/logger');
const { CacheError } = require('../utils/errors');

// Initialize Redis client
const client = Redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        tls: process.env.REDIS_TLS === 'true'
    },
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined // Fallback if using URL instead
});

// Connect to Redis
client.connect().catch(err => {
    logger.error('Redis connection error:', err);
    process.exit(1);
});

// Cache configuration
const CACHE_CONFIG = {
    TTL: {
        SHORT: 300, // 5 minutes
        MEDIUM: 3600, // 1 hour
        LONG: 86400, // 24 hours
        VERY_LONG: 604800 // 1 week
    },
    PREFIX: {
        USER: 'user:',
        STORE: 'store:',
        ORDER: 'order:',
        PRODUCT: 'product:',
        LIST: 'list:'
    }
};

// Cache tags for invalidation
const CACHE_TAGS = {
    USER: 'user',
    STORE: 'store',
    ORDER: 'order',
    PRODUCT: 'product'
};

// Cache operations
const cache = {
    // Get cache with key
    async get(key) {
        try {
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error);
            throw new CacheError('Failed to get cache');
        }
    },

    // Set cache with key, value and TTL
    async set(key, value, ttl = CACHE_CONFIG.TTL.MEDIUM) {
        try {
            await client.set(key, JSON.stringify(value), {
                EX: ttl
            });
            logger.debug('Cache set:', { key, ttl });
        } catch (error) {
            logger.error('Cache set error:', error);
            throw new CacheError('Failed to set cache');
        }
    },

    // Delete cache by key
    async del(key) {
        try {
            await client.del(key);
            logger.debug('Cache deleted:', key);
        } catch (error) {
            logger.error('Cache delete error:', error);
            throw new CacheError('Failed to delete cache');
        }
    },

    // Clear all cache
    async clear() {
        try {
            await client.flushAll();
            logger.info('All cache cleared');
        } catch (error) {
            logger.error('Cache clear error:', error);
            throw new CacheError('Failed to clear cache');
        }
    },

    // Invalidate cache by tag
    async invalidateByTag(tag) {
        try {
            const keys = await client.keys(`${tag}:*`);
            if (keys.length > 0) {
                await client.del(keys);
                logger.info(`Cache invalidated for tag: ${tag}`);
            }
        } catch (error) {
            logger.error('Cache invalidation error:', error);
            throw new CacheError('Failed to invalidate cache');
        }
    },

    // Cache middleware
    middleware: (ttl = CACHE_CONFIG.TTL.MEDIUM) => {
        return async (req, res, next) => {
            if (req.method !== 'GET') {
                return next();
            }

            const key = `${req.originalUrl || req.url}`;

            try {
                const cachedResponse = await cache.get(key);
                if (cachedResponse) {
                    logger.debug('Cache hit:', key);
                    return res.json(cachedResponse);
                }

                // Store original json method
                const originalJson = res.json;

                // Override json method
                res.json = function (data) {
                    cache.set(key, data, ttl).catch(err => {
                        logger.error('Cache set error in middleware:', err);
                    });
                    return originalJson.call(this, data);
                };

                next();
            } catch (error) {
                logger.error('Cache middleware error:', error);
                next();
            }
        };
    },

    // Cache performance monitoring
    async getStats() {
        try {
            const info = await client.info();
            const memory = await client.info('memory');
            const stats = await client.info('stats');

            return {
                info: parseRedisInfo(info),
                memory: parseRedisInfo(memory),
                stats: parseRedisInfo(stats)
            };
        } catch (error) {
            logger.error('Cache stats error:', error);
            throw new CacheError('Failed to get cache stats');
        }
    }
};

// Helper function to parse Redis INFO command output
function parseRedisInfo(info) {
    return info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
            acc[key] = value;
        }
        return acc;
    }, {});
}

// Cache warmup function
async function warmupCache() {
    try {
        // Add your cache warmup logic here
        logger.info('Cache warmup completed');
    } catch (error) {
        logger.error('Cache warmup error:', error);
    }
}

// Export cache utilities
module.exports = {
    cache,
    CACHE_CONFIG,
    CACHE_TAGS,
    warmupCache
}; 