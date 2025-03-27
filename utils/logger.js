const { createLogger, format, transports } = require('winston');
const path = require('path');

// Define log format for console
const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
        ({ timestamp, level, message, ...meta }) =>
            `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
    )
);

// Define log format for files
const fileFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
);

// Initialize logger
const logger = createLogger({
    level: 'info', // Default log level
    format: fileFormat, // Default format for file transports
    transports: [
        // Console transport for colored logs
        new transports.Console({
            format: consoleFormat,
        }),

        // File transport for error logs
        new transports.File({
            filename: path.join(__dirname, '../logs', 'application.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    exitOnError: false, // Do not exit on handled exceptions
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
    new transports.File({
        filename: path.join(__dirname, '../logs', 'exceptions.log'),
    })
);

logger.rejections.handle(
    new transports.File({
        filename: path.join(__dirname, '../logs', 'rejections.log'),
    })
);

module.exports = logger;