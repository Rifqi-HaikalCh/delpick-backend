const { body, param, validationResult } = require('express-validator');

/**
 * Validator untuk create menu item
 */
const createMenuItemValidator = [
    body('name').notEmpty().withMessage('Nama menu harus diisi'),
    body('price').isFloat({ min: 0 }).withMessage('Harga harus berupa angka dan minimal 0'),
    body('description').optional().isString().withMessage('Deskripsi harus berupa string'),
    body('image').optional().isString().withMessage('Gambar harus berupa string base64'),
    body('quantity').isInt({ min: 0 }).withMessage('Kuantitas harus berupa angka dan minimal 0'),
];

/**
 * Validator untuk update menu item
 */
const updateMenuItemValidator = [
    param('id').isInt().withMessage('ID menu item harus berupa angka'),
    body('name').optional().notEmpty().withMessage('Nama menu harus diisi'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Harga harus berupa angka dan minimal 0'),
    body('description').optional().isString().withMessage('Deskripsi harus berupa string'),
    body('image').optional().isString().withMessage('Gambar harus berupa string base64'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Kuantitas harus berupa angka dan minimal 0'),
];

/**
 * Validator untuk delete menu item
 */
const deleteMenuItemValidator = [
    param('id').isInt().withMessage('ID menu item harus berupa angka'),
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
    createMenuItemValidator,
    updateMenuItemValidator,
    deleteMenuItemValidator,
    validate,
};