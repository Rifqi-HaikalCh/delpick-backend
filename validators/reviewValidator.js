const { body, validationResult } = require('express-validator');

/**
 * Validator untuk membuat review
 */
const createReviewValidator = [
    body('orderId').notEmpty().withMessage('Order ID harus diisi'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating harus berupa angka antara 1 sampai 5'),
    body('comment').optional().isString().withMessage('Komentar harus berupa string'),
];

/**
 * Middleware untuk menangani hasil validasi
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validasi gagal',
            errors: errors.array(),
        });
    }
    next();
};

module.exports = {
    createReviewValidator,
    validate,
};