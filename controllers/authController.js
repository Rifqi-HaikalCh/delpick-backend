const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
// const { Driver } = require('../models');
const nodemailer = require('nodemailer');
const response = require('../utils/response');
const { saveBase64Image } = require('../utils/imageHelper');

/**
 * Fungsi untuk menghasilkan token JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Objek untuk menyimpan token reset password
 */
const resetTokens = {};

/**
 * Fungsi untuk melakukan login
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return response(res, { statusCode: 401, message: 'Email atau password salah' });
        }
        const token = generateToken(user);
        return response(res, { statusCode: 200, message: 'Login berhasil', data: { token, user } });
    } catch (error) {
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan saat login', errors: error.message });
    }
};

/**
 * Fungsi untuk melakukan registrasi
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        // const { name, email, phone, password } = req.body;
        const validRole = ['customer', 'owner', 'driver', 'admin'];
        if (!validRole.includes(role)) {
            return response(res, { statusCode: 400, message: 'Role tidak valid' });
        }
        const userRole = validRole.includes(role) ? role : 'customer';
        const hashedPassword = bcrypt.hashSync(password, 10);
        const user = await User.create({ name, email, phone, password: hashedPassword, role: userRole });

    
        // // If the user role is 'driver', create the corresponding Driver record
        // if (userRole === 'driver') {
        //     await Driver.create({
        //         userId: user.id,
        //         vehicle_number: vehicle_number || 'TBD', // Default or passed vehicle number
        //         rating: 0, // Default rating
        //         reviewsCount: 0, // Default reviews count
        //         latitude: null, // Default latitude
        //         longitude: null, // Default longitude
        //         status: 'inactive', // Default status
        //     });
        // }

        //new

        // const { name, email, phone, password, role, vehicle_number } = req.body;

        // // Validate role
        // const validRoles = ['customer', 'store', 'driver', 'admin'];
        // const userRole = validRoles.includes(role) ? role : 'customer'; // Set default role as 'customer' if invalid role is provided

        // const hashedPassword = bcrypt.hashSync(password, 10);

        // // Create User
        // const user = await User.create({
        //     name,
        //     email,
        //     phone,
        //     password: hashedPassword,
        //     role: userRole,
        // });

        // // let driver = null;

        // // If the user role is 'driver', create the corresponding Driver record
        // if (userRole === 'driver') {
        //     if (!vehicle_number) {
        //         return response(res, { statusCode: 400, message: 'Vehicle number is required for drivers' });
        //     }

        //     // Create Driver record, linked to the User by userId
        //     await Driver.create({
        //         userId: user.id,
        //         vehicle_number: 0,
        //         rating: 0, // Default rating
        //         reviewsCount: 0, // Default reviews count
        //         latitude: null, // Default latitude
        //         longitude: null, // Default longitude
        //         status: 'inactive', // Default status
        //         });
        //     }

        return response(res, { statusCode: 201, message: 'User berhasil didaftarkan', data: user });
    } catch (error) {
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan saat registrasi', errors: error.message });
    }
};

/**
 * Lupa Password - Mengirim email dengan token reset password
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return response(res, { statusCode: 404, message: 'Email tidak terdaftar' });
        }

        // Generate token reset password (berlaku 1 jam)
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        resetTokens[user.id] = resetToken; // Simpan sementara

        // Kirim email reset password (gunakan nodemailer)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Password',
            text: `Gunakan link berikut untuk reset password: ${process.env.FRONTEND_URL}/reset-password/${resetToken}`
        };

        await transporter.sendMail(mailOptions);

        return response(res, { statusCode: 200, message: 'Email reset password telah dikirim' });
    } catch (error) {
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan', errors: error.message });
    }
};

/**
 * Reset Password - Memproses token dan mengubah password
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!resetTokens[decoded.id] || resetTokens[decoded.id] !== token) {
            return response(res, { statusCode: 400, message: 'Token tidak valid atau kadaluarsa' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.update({ password: hashedPassword }, { where: { id: decoded.id } });

        delete resetTokens[decoded.id]; // Hapus token setelah digunakan

        return response(res, { statusCode: 200, message: 'Password berhasil diubah' });
    } catch (error) {
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan', errors: error.message });
    }
};

/**
 * Update Profil - User dapat mengubah nama, email, password, dan avatar
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateProfile = async (req, res) => {
    try {
        const { name, email, password, avatar } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        const updateData = { name, email };

        // Jika ada password, hash terlebih dahulu
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Jika ada avatar dalam format Base64, simpan sebagai file
        if (avatar) {
            const avatarPath = saveBase64Image(avatar, 'avatars', 'avatar');
            updateData.avatar = avatarPath;
        }

        await user.update(updateData);

        return response(res, { statusCode: 200, message: 'Profil berhasil diperbarui', data: user });
    } catch (error) {
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan', errors: error.message });
    }
};

/**
 * Logout - Menghapus token dari frontend (hanya hapus di sisi frontend)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const logout = async (req, res) => {
    return response(res, { statusCode: 200, message: 'Logout berhasil, hapus token di frontend' });
};

module.exports = {
    login,
    register,
    forgotPassword,
    resetPassword,
    updateProfile,
    logout
};