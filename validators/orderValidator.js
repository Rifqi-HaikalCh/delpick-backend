const { body, validationResult } = require('express-validator');

/**
 * Validator untuk membuat order baru
 */
const placeOrderValidator = [
    body('storeId').isInt().withMessage('ID toko harus berupa string'),
    body('notes').optional().isString().withMessage('Catatan harus berupa string'),
    body('items').isArray({ min: 1 }).withMessage('Items harus berupa array dengan minimal 1 item'),
    body('items.*.itemId').isFloat({ min: 0 }).withMessage('ID item harus berupa angka dan minimal 1'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Kuantitas item harus berupa angka dan minimal 1'),
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
    placeOrderValidator,
    validate,
};