'use strict';

const Joi = require('joi');
const { BadRequestError } = require('../utils/errors');

/**
 * Validates request data against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: true
        });

        if (!error) {
            return next();
        }

        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return next(new BadRequestError(errorMessage));
    };
};

/**
 * Validates request data against multiple Joi schemas
 * @param {Object} schemas - Object containing Joi validation schemas
 * @returns {Function} Express middleware
 */
const validateMultiple = (schemas) => {
    return (req, res, next) => {
        const errors = [];

        Object.entries(schemas).forEach(([property, schema]) => {
            const { error } = schema.validate(req[property], {
                abortEarly: false,
                stripUnknown: true,
                allowUnknown: true
            });

            if (error) {
                errors.push(...error.details.map(detail => detail.message));
            }
        });

        if (errors.length === 0) {
            return next();
        }

        return next(new BadRequestError(errors.join(', ')));
    };
};

/**
 * Validates file upload
 * @param {Object} options - File validation options
 * @returns {Function} Express middleware
 */
const validateFile = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        required = false
    } = options;

    return (req, res, next) => {
        if (!req.file && required) {
            return next(new BadRequestError('File is required'));
        }

        if (req.file) {
            if (!allowedTypes.includes(req.file.mimetype)) {
                return next(new BadRequestError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
            }

            if (req.file.size > maxSize) {
                return next(new BadRequestError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`));
            }
        }

        next();
    };
};

/**
 * Validates query parameters for pagination
 * @returns {Function} Express middleware
 */
const validatePagination = () => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().pattern(/^[a-zA-Z0-9_]+(?:,[a-zA-Z0-9_]+)*$/),
        order: Joi.string().valid('asc', 'desc').default('desc')
    });

    return validate(schema, 'query');
};

/**
 * Validates query parameters for search
 * @returns {Function} Express middleware
 */
const validateSearch = () => {
    const schema = Joi.object({
        q: Joi.string().min(1).max(100),
        fields: Joi.string().pattern(/^[a-zA-Z0-9_]+(?:,[a-zA-Z0-9_]+)*$/),
        exact: Joi.boolean()
    });

    return validate(schema, 'query');
};

/**
 * Validates query parameters for filtering
 * @param {Object} allowedFilters - Object containing allowed filter fields and their types
 * @returns {Function} Express middleware
 */
const validateFilters = (allowedFilters) => {
    const schema = Joi.object(
        Object.entries(allowedFilters).reduce((acc, [field, type]) => {
            acc[field] = Joi[type]();
            return acc;
        }, {})
    );

    return validate(schema, 'query');
};

/**
 * Validates location data
 * @returns {Function} Express middleware
 */
const validateLocation = () => {
    const schema = Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        heading: Joi.number().min(0).max(360),
        speed: Joi.number().min(0),
        accuracy: Joi.number().min(0)
    });

    return validate(schema, 'body');
};

module.exports = {
    validate,
    validateMultiple,
    validateFile,
    validatePagination,
    validateSearch,
    validateFilters,
    validateLocation
}; 