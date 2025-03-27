const { body, param, validationResult } = require('express-validator');

/**
 * Validator untuk create user
 */
const createUserValidator = [
    body('name').notEmpty().withMessage('Nama harus diisi'),
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').isIn(['customer', 'store', 'driver', 'admin']).withMessage('Role tidak valid'),
];

/**
 * Validator untuk update user
 */
const updateUserValidator = [
    param('id').isInt().withMessage('ID user harus berupa angka'),
    body('name').optional().notEmpty().withMessage('Nama harus diisi'),
    body('email').optional().isEmail().withMessage('Email tidak valid'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').optional().isIn(['customer', 'store', 'driver', 'admin']).withMessage('Role tidak valid'),
];

/**
 * Validator untuk delete user
 */
const deleteUserValidator = [
    param('id').isInt().withMessage('ID user harus berupa angka'),
];

/**
 * Validator untuk mendapatkan user berdasarkan ID
 */
const getUserByIdValidator = [
    param('id').isInt().withMessage('ID user harus berupa angka'),
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
    createUserValidator,
    updateUserValidator,
    deleteUserValidator,
    getUserByIdValidator,
    validate,
};
