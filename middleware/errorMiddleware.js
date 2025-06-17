'use strict';

const { logger } = require('../utils/logger');

/**
 * Global error handler middleware
 * Harus diletakkan paling akhir di app.js
 */
const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        status: err.status
    });

    // Default status code
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_SERVER_ERROR',
        errors: err.errors || undefined
    });
};

module.exports = errorHandler;