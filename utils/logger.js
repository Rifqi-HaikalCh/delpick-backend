'use strict';
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
    levels,
    format: logFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // File transport for errors
        new DailyRotateFile({
            filename: path.join('logs', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d'
        }),
        // File transport for all logs
        new DailyRotateFile({
            filename: path.join('logs', 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

// Create a stream object for Morgan
const stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
};

// Error logger middleware
const errorLogger = (err, req, res, next) => {
    logger.error({
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            params: req.params,
            query: req.query,
            headers: req.headers
        }
    });
    next(err);
};

// Performance logger
const performanceLogger = {
    start: (operation) => {
        const start = process.hrtime();
        return {
            end: () => {
                const [seconds, nanoseconds] = process.hrtime(start);
                const duration = seconds * 1000 + nanoseconds / 1000000;
                logger.debug({
                    operation,
                    duration: `${duration.toFixed(2)}ms`
                });
                return duration;
            }
        };
    }
};

// Cache logger
const cacheLogger = {
    hit: (key) => {
        logger.debug({
            type: 'cache',
            action: 'hit',
            key
        });
    },
    miss: (key) => {
        logger.debug({
            type: 'cache',
            action: 'miss',
            key
        });
    },
    set: (key, duration) => {
        logger.debug({
            type: 'cache',
            action: 'set',
            key,
            duration
        });
    },
    delete: (key) => {
        logger.debug({
            type: 'cache',
            action: 'delete',
            key
        });
    }
};

// Database logger
const dbLogger = {
    query: (query, duration) => {
        logger.debug({
            type: 'database',
            action: 'query',
            query,
            duration: `${duration}ms`
        });
    },
    error: (error, query) => {
        logger.error({
            type: 'database',
            action: 'error',
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack
            },
            query
        });
    }
};

// Notification logger
const notificationLogger = {
    sent: (type, recipient, success) => {
        logger.info({
            type: 'notification',
            action: 'sent',
            notificationType: type,
            recipient,
            success
        });
    },
    error: (type, recipient, error) => {
        logger.error({
            type: 'notification',
            action: 'error',
            notificationType: type,
            recipient,
            error: {
                message: error.message,
                code: error.code
            }
        });
    }
};

module.exports = {
    logger,
    stream,
    requestLogger,
    errorLogger,
    performanceLogger,
    cacheLogger,
    dbLogger,
    notificationLogger
};