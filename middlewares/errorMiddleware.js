const logger = require('../utils/logger.js')
const response = require('../utils/response.js')

/**
 * Error handling middleware .
 * Captures and logs errors using the Winston logger.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
    // Log the error
    logger.error(`Error occurred: ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        stack: err.stack
    })

    // Send error response
    response(res, {
        statusCode: err.status || 500,
        message: err.message || 'Internal Server Error',
        data: null,
        errors: null
    })
}

module.exports = errorMiddleware