const { body, param, validationResult } = require('express-validator');

const createCustomerValidator = [
    body('name').notEmpty().withMessage('Nama customer harus diisi'),
    body('email').isEmail().withMessage('Email customer tidak valid'),
    body('password').notEmpty().withMessage('Password customer harus diisi'),
    body('phone').notEmpty().withMessage('Nomor telepon customer harus diisi'),
];

const updateCustomerValidator = [
    body('name').optional().notEmpty().withMessage('Nama customer harus diisi'),
    body('email').optional().isEmail().withMessage('Email customer tidak valid'),
    body('password').optional().notEmpty().withMessage('Password customer harus diisi'),
    body('phone').optional().notEmpty().withMessage('Nomor telepon customer harus diisi'),
];

const deleteCustomerValidator = [
    param('id').isInt().withMessage('ID customer harus berupa angka'),
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
    createCustomerValidator,
    updateCustomerValidator,
    deleteCustomerValidator,
    validate,
};