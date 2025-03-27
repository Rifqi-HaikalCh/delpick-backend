const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const response = require('../utils/response');
const dotenv = require('dotenv');
dotenv.config();


/**
 * Middleware untuk memverifikasi token JWT
 */
const verifyToken = (req, res, next) => {
    // Ambil token dari header 'Authorization'
    const token = req.headers['authorization'];

    // Cek jika token tidak ada
    if (!token) {
        return response(res, { statusCode: 401, message: 'Token tidak ditemukan' });
    }

    // Token Bearer biasanya dikirim dengan format: 'Bearer <token>'
    // Pisahkan "Bearer" dan token yang sesungguhnya
    const tokenWithoutBearer = token.split(' ')[1];  // Mengambil bagian token setelah "Bearer"

    // Jika token tidak ada setelah "Bearer", return error
    if (!tokenWithoutBearer) {
        return response(res, { statusCode: 401, message: 'Token tidak valid' });
    }

    try {
        // Verifikasi token menggunakan JWT_SECRET
        const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
        req.user = decoded;  // Menyimpan data user ke request untuk digunakan di route selanjutnya
        next();
    } catch (error) {
        // Jika token tidak valid
        logger.error(error);
        return response(res, { statusCode: 401, message: 'Token tidak valid' });
    }
};
// const verifyToken = (req, res, next) => {
//     const token = req.headers['authorization'];
//     if (!token) {
//         return response(res, { statusCode: 401, message: 'Token tidak ditemukan' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = decoded; // Menyimpan data user di request
//         next();
//     } catch (error) {
//         logger.error(error);
//         return response(res, { statusCode: 401, message: 'Token tidak valid' });
//     }
// };

/**
 * Middleware untuk memeriksa apakah user adalah admin
 */
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return response(res, { statusCode: 403, message: 'Akses ditolak, hanya admin yang dapat mengakses' });
    }
    next();
};

/**
 * Middleware untuk memeriksa apakah user adalah owner (pemilik toko)
 */
const isOwner = (req, res, next) => {
    if (req.user.role !== 'store') {
        return response(res, { statusCode: 403, message: 'Akses ditolak, hanya owner yang dapat mengakses' });
    }
    next();
};

/**
 * Middleware untuk memeriksa apakah user adalah customer
 */
const isCustomer = (req, res, next) => {
    if (req.user.role !== 'customer') {
        return response(res, { statusCode: 403, message: 'Akses ditolak, hanya customer yang dapat mengakses' });
    }
    next();
};

/**
 * Middleware untuk memeriksa apakah user adalah driver
 */
const isDriver = (req, res, next) => {
    if (req.user.role !== 'driver') {
        return response(res, { statusCode: 403, message: 'Akses ditolak, hanya driver yang dapat mengakses' });
    }
    next();
};

module.exports = { verifyToken, isAdmin, isOwner, isCustomer, isDriver };