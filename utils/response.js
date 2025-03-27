/**
 * Response
 *
 * @param {import('express').Response} res - The Express response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {string} message - The response message.
 * @param {object} data - The response data.
 * @param {object} errors - The response errors.
 *
 * @returns {import('express').Response}
 */
const response = (res, { statusCode, message, data, errors }) =>
    res.status(statusCode).json({
        message,
        data,
        errors
    });

module.exports = response;