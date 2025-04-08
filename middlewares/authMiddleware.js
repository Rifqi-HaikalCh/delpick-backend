const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const response = require('../utils/response');
const dotenv = require('dotenv');
dotenv.config();


/**
 * Middleware untuk memverifikasi token JWT
 */
// const verifyToken = (req, res, next) => {
//   console.log('Request Headers:', req.headers); // Menampilkan headers request untuk debugging

//   const token = req.headers['authorization'];
//   if (!token) {
//     return response(res, { statusCode: 401, message: 'Token tidak ditemukan' });
//   }

//   const tokenWithoutBearer = token.split(' ')[1];
//   if (!tokenWithoutBearer) {
//     return response(res, { statusCode: 401, message: 'Token tidak valid' });
//   }

//   try {
//     const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return response(res, { statusCode: 401, message: 'Token sudah kedaluwarsa' });
//     }
//     logger.error(error);
//     return response(res, { statusCode: 401, message: 'Token tidak valid' });
//   }
// };

// const verifyToken = (req, res, next) => { //versi 4

//   const token = req.headers['authorization'];

//   if (!token) {

//     return res.status(401).json({ message: 'Token tidak ditemukan' });

//   }

//   // Pastikan token menggunakan format Bearer <token>

//   const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;


//   jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {

//     if (err) {

//       return res.status(401).json({ message: 'Invalid token', error: err.message });

//     }

//     // Mengecek jika token sudah kedaluwarsa

//     const currentTime = Math.floor(Date.now() / 1000); // Waktu saat ini dalam detik (timestamp UNIX)

//     if (decoded.exp < currentTime) {

//       return res.status(401).json({ message: 'Token sudah kedaluwarsa' });

//     }


//     // Menyimpan informasi pengguna yang telah didekodekan di dalam request untuk digunakan di route lainnya

//     req.user = decoded;

//     next(); // Lanjutkan ke route berikutnya

//   });

// };

const verifyToken = (role = null) => {// versi 3
    return (req, res, next) => {
      const token = req.headers['authorization'];
      if (!token) {
        return response(res, { statusCode: 401, message: 'Token tidak ditemukan' });
      }

      const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

  
      try {
        const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
  
        // Cek apakah role yang dimiliki sesuai dengan yang dibutuhkan
        if (role && decoded.role !== role) {
          return response(res, { statusCode: 403, message: 'Access denied: Insufficient permissions' });
        }
  
        req.user = decoded;
        next();
      } catch (error) {
        logger.error(error);
        return response(res, { statusCode: 401, message: 'Token tidak valid' });
      }
    };
  };

// const verifyToken = (req, res, next) => {// version 2
//     // Ambil token dari header 'Authorization'
//     const token = req.headers['authorization'];

//     // Cek jika token tidak ada
//     if (!token) {
//         return response(res, { statusCode: 401, message: 'Token tidak ditemukan' });
//     }

//     // Token Bearer biasanya dikirim dengan format: 'Bearer <token>'
//     // Pisahkan "Bearer" dan token yang sesungguhnya
//     const tokenWithoutBearer = token.split(' ')[1];  // Mengambil bagian token setelah "Bearer"

//     // Jika token tidak ada setelah "Bearer", return error
//     if (!tokenWithoutBearer) {
//         return response(res, { statusCode: 401, message: 'Token tidak valid' });
//     }

//     try {
//         // Verifikasi token menggunakan JWT_SECRET
//         const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
//         req.user = decoded;  // Menyimpan data user ke request untuk digunakan di route selanjutnya
//         next();
//     } catch (error) {
//         // Jika token tidak valid
//         logger.error(error);
//         return response(res, { statusCode: 401, message: 'Token tidak valid' });
//     }
// };

//verison 1
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