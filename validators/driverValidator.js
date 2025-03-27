const { body, param, validationResult } = require('express-validator');

const createDriverValidator = [
    body('name').notEmpty().withMessage('Nama driver harus diisi'),
    body('email').isEmail().withMessage('Email driver tidak valid'),
    body('password').notEmpty().withMessage('Password driver harus diisi'),
    body('phone').notEmpty().withMessage('Nomor telepon driver harus diisi'),
    body('vehicle_number').notEmpty().withMessage('Nomor kendaraan harus diisi'),
];

const updateDriverValidator = [
    body('name').optional().notEmpty().withMessage('Nama driver harus diisi'),
    body('email').optional().isEmail().withMessage('Email driver tidak valid'),
    body('password').optional().notEmpty().withMessage('Password driver harus diisi'),
    body('phone').optional().notEmpty().withMessage('Nomor telepon driver harus diisi'),
    body('vehicle_number').optional().notEmpty().withMessage('Nomor kendaraan harus diisi'),
];

const deleteDriverValidator = [
    param('id').isInt().withMessage('ID driver harus berupa angka'),
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
    createDriverValidator,
    updateDriverValidator,
    deleteDriverValidator,
    validate,
};