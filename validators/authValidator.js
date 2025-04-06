const { body, validationResult } = require('express-validator');

/**
 * Validator untuk login
 */
const loginValidator = [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password harus diisi'),
];

/**
 * Validator untuk register
 */
const registerValidator = [
    body('name').notEmpty().withMessage('Nama harus diisi'),
    body('email').isEmail().withMessage('Email tidak valid'),
    body('phone').notEmpty().withMessage('Nomor telepon harus diisi'),
    body('password').notEmpty().withMessage('Password harus diisi'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
];

/**
 * Validator untuk forgot password
 */
const forgotPasswordValidator = [
    body('email').isEmail().withMessage('Email tidak valid'),
];

/**
 * Validator untuk reset password
 */
const resetPasswordValidator = [
    body('token').notEmpty().withMessage('Token harus diisi'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
];

/**
 * Validator untuk update profile
 */
const updateProfileValidator = [
    body('name').optional().notEmpty().withMessage('Nama harus diisi'),
    body('email').optional().isEmail().withMessage('Email tidak valid'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('avatar').optional().isString().withMessage('Avatar harus berupa string base64'),
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
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    validate,
};