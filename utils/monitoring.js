'use strict';

const { logger } = require('./logger');
const { cache } = require('../middleware/cache');
const { sequelize } = require('../config/database');

// Performance metrics
const metrics = {
    requests: {
        total: 0,
        success: 0,
        failed: 0,
        byEndpoint: new Map()
    },
    responseTime: {
        total: 0,
        count: 0,
        max: 0,
        min: Infinity
    },
    errors: {
        total: 0,
        byType: new Map()
    },
    cache: {
        hits: 0,
        misses: 0
    },
    database: {
        queries: 0,
        slowQueries: 0
    }
};

// Alert thresholds
const ALERT_THRESHOLDS = {
    ERROR_RATE: 0.1, // 10% error rate
    RESPONSE_TIME: 1000, // 1 second
    MEMORY_USAGE: 0.8, // 80% memory usage
    CPU_USAGE: 0.8, // 80% CPU usage
    CACHE_HIT_RATE: 0.5 // 50% cache hit rate
};

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
    const start = Date.now();
    const path = req.path;

    // Track request
    metrics.requests.total++;
    if (!metrics.requests.byEndpoint.has(path)) {
        metrics.requests.byEndpoint.set(path, 0);
    }
    metrics.requests.byEndpoint.set(path, metrics.requests.byEndpoint.get(path) + 1);

    // Track response
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Update response time metrics
        metrics.responseTime.total += duration;
        metrics.responseTime.count++;
        metrics.responseTime.max = Math.max(metrics.responseTime.max, duration);
        metrics.responseTime.min = Math.min(metrics.responseTime.min, duration);

        // Track success/failure
        if (res.statusCode >= 200 && res.statusCode < 400) {
            metrics.requests.success++;
        } else {
            metrics.requests.failed++;
            const errorType = res.statusCode >= 500 ? 'server' : 'client';
            metrics.errors.byType.set(errorType, (metrics.errors.byType.get(errorType) || 0) + 1);
            metrics.errors.total++;
        }

        // Check for alerts
        checkAlerts();
    });

    next();
};

// Cache monitoring
const monitorCache = {
    hit: () => {
        metrics.cache.hits++;
    },
    miss: () => {
        metrics.cache.misses++;
    }
};

// Database monitoring
const monitorDatabase = {
    query: (duration) => {
        metrics.database.queries++;
        if (duration > ALERT_THRESHOLDS.RESPONSE_TIME) {
            metrics.database.slowQueries++;
            logger.warn('Slow database query detected:', { duration });
        }
    }
};

// System health check
const checkSystemHealth = async () => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            metrics: {
                requests: {
                    total: metrics.requests.total,
                    success: metrics.requests.success,
                    failed: metrics.requests.failed,
                    successRate: metrics.requests.total > 0 ?
                        metrics.requests.success / metrics.requests.total : 0
                },
                responseTime: {
                    avg: metrics.responseTime.count > 0 ?
                        metrics.responseTime.total / metrics.responseTime.count : 0,
                    max: metrics.responseTime.max,
                    min: metrics.responseTime.min
                },
                errors: {
                    total: metrics.errors.total,
                    byType: Object.fromEntries(metrics.errors.byType)
                },
                cache: {
                    hits: metrics.cache.hits,
                    misses: metrics.cache.misses,
                    hitRate: (metrics.cache.hits + metrics.cache.misses) > 0 ?
                        metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses) : 0
                },
                database: {
                    queries: metrics.database.queries,
                    slowQueries: metrics.database.slowQueries
                }
            }
        };

        // Check database connection
        try {
            await sequelize.authenticate();
            health.database = 'connected';
        } catch (error) {
            health.database = 'disconnected';
            health.status = 'unhealthy';
        }

        // Check cache connection
        try {
            const cacheStats = await cache.getStats();
            health.cache = {
                status: 'connected',
                memory: cacheStats.memory
            };
        } catch (error) {
            health.cache = {
                status: 'disconnected'
            };
            health.status = 'unhealthy';
        }

        return health;
    } catch (error) {
        logger.error('Health check error:', error);
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

// Alert checking
const checkAlerts = () => {
    const errorRate = metrics.requests.total > 0 ?
        metrics.errors.total / metrics.requests.total : 0;

    const avgResponseTime = metrics.responseTime.count > 0 ?
        metrics.responseTime.total / metrics.responseTime.count : 0;

    const cacheHitRate = (metrics.cache.hits + metrics.cache.misses) > 0 ?
        metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses) : 0;

    // Check error rate
    if (errorRate > ALERT_THRESHOLDS.ERROR_RATE) {
        logger.error('High error rate detected:', { errorRate });
    }

    // Check response time
    if (avgResponseTime > ALERT_THRESHOLDS.RESPONSE_TIME) {
        logger.error('High response time detected:', { avgResponseTime });
    }

    // Check cache hit rate
    if (cacheHitRate < ALERT_THRESHOLDS.CACHE_HIT_RATE) {
        logger.warn('Low cache hit rate detected:', { cacheHitRate });
    }
};

// Reset metrics
const resetMetrics = () => {
    Object.keys(metrics).forEach(key => {
        if (typeof metrics[key] === 'number') {
            metrics[key] = 0;
        } else if (metrics[key] instanceof Map) {
            metrics[key].clear();
        } else if (typeof metrics[key] === 'object') {
            Object.keys(metrics[key]).forEach(subKey => {
                if (typeof metrics[key][subKey] === 'number') {
                    metrics[key][subKey] = 0;
                }
            });
        }
    });
};

// Export monitoring utilities
module.exports = {
    monitoringMiddleware,
    monitorCache,
    monitorDatabase,
    checkSystemHealth,
    resetMetrics
};