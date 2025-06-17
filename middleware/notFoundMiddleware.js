'use strict';

const response = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * Middleware to handle 404 Not Found errors
 * This middleware should be placed after all routes
 */
const notFoundHandler = (req, res, next) => {
    logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    return response(res, {
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
};

module.exports = notFoundHandler; 