const { body, param, validationResult } = require('express-validator');

const createStoreValidator = [
    // Validasi untuk User (Owner)
    body('name').notEmpty().withMessage('Nama owner harus diisi'),
    body('email').isEmail().withMessage('Email owner tidak valid'),
    body('password').notEmpty().withMessage('Password owner harus diisi'),
    body('phone').notEmpty().withMessage('Nomor telepon owner harus diisi'),

    // Validasi untuk Store
    body('storeName').notEmpty().withMessage('Nama store harus diisi'),
    body('address').notEmpty().withMessage('Alamat store harus diisi'),
    body('description').notEmpty().withMessage('Deskripsi store harus diisi'),
    body('openTime').notEmpty().withMessage('Waktu buka store harus diisi'),
    body('closeTime').notEmpty().withMessage('Waktu tutup store harus diisi'),
    body('latitude').isFloat().withMessage('Latitude harus berupa angka'),
    body('longitude').isFloat().withMessage('Longitude harus berupa angka'),
    body('image').optional().isString().withMessage('Image harus berupa string (base64)'),
];

const updateStoreValidator = [
    // Validasi untuk User (Owner)
    body('name').optional().notEmpty().withMessage('Nama store harus diisi'),
    body('email').optional().isEmail().withMessage('Email store tidak valid'),
    body('phone').optional().notEmpty().withMessage('Nomor telepon store harus diisi'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),

    // Validasi untuk Store
    body('storeName').optional().notEmpty().withMessage('Nama store harus diisi'),
    body('address').optional().notEmpty().withMessage('Alamat store harus diisi'),
    body('description').optional().notEmpty().withMessage('Deskripsi store harus diisi'),
    body('openTime').optional().notEmpty().withMessage('Waktu buka store harus diisi'),
    body('closeTime').optional().notEmpty().withMessage('Waktu tutup store harus diisi'),
    body('latitude').optional().isFloat().withMessage('Latitude harus berupa angka'),
    body('longitude').optional().isFloat().withMessage('Longitude harus berupa angka'),
    body('image').optional().isString().withMessage('Image harus berupa string (base64)'),
];

const deleteStoreValidator = [
    param('id').isInt().withMessage('ID store harus berupa angka'),
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
    createStoreValidator,
    updateStoreValidator,
    deleteStoreValidator,
    validate
};