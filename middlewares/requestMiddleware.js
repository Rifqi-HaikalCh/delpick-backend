const logger = require('../utils/logger.js')

/**
 * Request handler middleware.
 * Logs incoming requests using the Winston logger.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 *
 */
const requestMiddleware = (req, res, next) => {
    // Log the request
    logger.info(`Incoming request: ${req.method} ${req.url}`)

    // Continue to the next middleware
    next()
}

module.exports = requestMiddleware