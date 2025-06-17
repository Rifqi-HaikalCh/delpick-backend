'use strict';

const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};

const sanitizeRequest = (req, res, next) => {
    // Remove sensitive data from request body
    if (req.body.password) {
        req.body.password = '[REDACTED]';
    }

    next();
};

module.exports = {
    requestLogger,
    sanitizeRequest
}; 