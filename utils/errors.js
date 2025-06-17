'use strict';

class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database error') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

class CacheError extends AppError {
    constructor(message = 'Cache error') {
        super(message, 500, 'CACHE_ERROR');
    }
}

class NotificationError extends AppError {
    constructor(message = 'Notification error') {
        super(message, 500, 'NOTIFICATION_ERROR');
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            statusCode: err.statusCode,
            message: err.message,
            code: err.code,
            details: err.details,
            stack: err.stack,
            error: err
        });
    } else {
        // Production error response
        if (err.isOperational) {
            res.status(err.statusCode).json({
                statusCode: err.statusCode,
                message: err.message,
                code: err.code,
                details: err.details
            });
        } else {
            // Programming or unknown errors
            console.error('ERROR 💥', err);
            res.status(500).json({
                statusCode: 500,
                message: 'Something went wrong',
                code: 'INTERNAL_ERROR'
            });
        }
    }
};

// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    CacheError,
    NotificationError,
    BadRequestError,
    errorHandler,
    asyncHandler
}; 