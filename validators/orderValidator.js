const { body, validationResult } = require('express-validator');

/**
 * Validator untuk membuat order baru
 */
const placeOrderValidator = [
    body('deliveryAddress').notEmpty().withMessage('Alamat pengiriman harus diisi'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal harus berupa angka dan minimal 0'),
    body('serviceCharge').isFloat({ min: 0 }).withMessage('Biaya layanan harus berupa angka dan minimal 0'),
    body('total').isFloat({ min: 0 }).withMessage('Total harus berupa angka dan minimal 0'),
    body('status').notEmpty().withMessage('Status harus diisi'),
    body('orderDate').isISO8601().withMessage('Format tanggal order tidak valid'),
    body('notes').optional().isString().withMessage('Catatan harus berupa string'),
    body('driverId').isInt({ min: 1 }).withMessage('ID driver harus berupa angka dan minimal 1'),
    body('storeId').isString().withMessage('ID toko harus berupa string'),
    body('items').isArray().withMessage('Items harus berupa array'),
    body('items.*.name').notEmpty().withMessage('Nama item harus diisi'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Harga item harus berupa angka dan minimal 0'),
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