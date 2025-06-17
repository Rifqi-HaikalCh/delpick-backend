'use strict';
const rateLimit = require('express-rate-limit');
const { default: RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');
const { logger } = require('../utils/logger');

// Initialize Redis client with .env configuration
const redis = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        tls: process.env.REDIS_TLS === 'true'
    },
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined // Fallback if using URL instead
});

redis.on('error', (err) => {
    logger.error('Redis error:', err);
});

// Connect to Redis
redis.connect().catch((err) => {
    logger.error('Redis connection error:', err);
});

// Helper function to create rate limit stores
const createStore = (prefix) => new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix
});

// Rate limiters configuration
const limiters = {
    apiLimiter: rateLimit({
        store: createStore('rl:api:'),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false
    }),
    authLimiter: rateLimit({
        store: createStore('rl:auth:'),
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5,
        message: 'Too many login attempts, please try again later',
        standardHeaders: true,
        legacyHeaders: false
    }),
    trackingLimiter: rateLimit({
        store: createStore('rl:tracking:'),
        windowMs: 60 * 1000, // 1 minute
        max: 30,
        message: 'Too many location updates, please try again later',
        standardHeaders: true,
        legacyHeaders: false
    }),
    uploadLimiter: rateLimit({
        store: createStore('rl:upload:'),
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'Too many file uploads, please try again later',
        standardHeaders: true,
        legacyHeaders: false
    })
};

module.exports = limiters;