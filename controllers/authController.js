'use strict';

require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Driver, Store } = require('../models');
const nodemailer = require('nodemailer');
const response = require('../utils/response');
const { saveBase64Image } = require('../utils/imageHelper');
const { logger } = require('../utils/logger');

/**
 * Generate JWT token
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
 * Login user
 */
const login = async (req, res) => {
    try {
        logger.info('Login attempt:', { email: req.body.email });
        const { email, password } = req.body;
        const user = await User.findOne({
            where: { email },
            include: [
                {
                    model: Driver,
                    as: 'driver',
                    required: false,
                    attributes: { exclude: ['created_at', 'updated_at'] }
                },
                {
                    model: Store,
                    as: 'owner',
                    required: false,
                    attributes: { exclude: ['created_at', 'updated_at'] }
                }
            ]
        });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            logger.warn('Login failed: Invalid credentials', { email });
            return response(res, { statusCode: 401, message: 'Email atau password salah' });
        }

        const token = generateToken(user);
        const userData = user.get({ plain: true });
        delete userData.password;

        let responseData = { token, user: userData };

        if (user.role === 'driver' && user.driver) {
            responseData.driver = user.driver;
        } else if (user.role === 'store' && user.owner) {
            responseData.store = user.owner;
        }

        logger.info('Login successful', { userId: user.id, role: user.role });
        return response(res, {
            statusCode: 200,
            message: 'Login berhasil',
            data: responseData
        });
    } catch (error) {
        logger.error('Login error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat login',
            errors: error.message
        });
    }
};

/**
 * Register new user
 */
const register = async (req, res) => {
    try {
        logger.info('Registration attempt:', { email: req.body.email, role: req.body.role });
        const { name, email, phone, password, role } = req.body;
        const validRole = ['customer', 'store', 'driver'];

        if (!validRole.includes(role)) {
            logger.warn('Registration failed: Invalid role', { role });
            return response(res, { statusCode: 400, message: 'Role tidak valid' });
        }

        const userRole = validRole.includes(role) ? role : 'customer';
        const hashedPassword = bcrypt.hashSync(password, 10);
        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: userRole
        });

        logger.info('Registration successful', { userId: user.id, role: user.role });
        return response(res, {
            statusCode: 201,
            message: 'User berhasil didaftarkan',
            data: user
        });
    } catch (error) {
        logger.error('Registration error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat registrasi',
            errors: error.message
        });
    }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
    try {
        logger.info('Logout request:', { userId: req.user.id });
        // In a real application, you might want to invalidate the token
        // For now, we'll just return a success message
        return response(res, {
            statusCode: 200,
            message: 'Logout berhasil'
        });
    } catch (error) {
        logger.error('Logout error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat logout',
            errors: error.message
        });
    }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
    try {
        logger.info('Get profile request:', { userId: req.user.id });
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Driver,
                    as: 'driver',
                    required: false,
                    attributes: { exclude: ['created_at', 'updated_at'] }
                },
                {
                    model: Store,
                    as: 'owner',
                    required: false,
                    attributes: { exclude: ['created_at', 'updated_at'] }
                }
            ]
        });

        if (!user) {
            logger.warn('Profile not found:', { userId: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        logger.info('Profile retrieved successfully', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan profil',
            data: user
        });
    } catch (error) {
        logger.error('Get profile error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil profil',
            errors: error.message
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        logger.info('Update profile request:', { userId: req.user.id });
        const { name, email, phone, avatar } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            logger.warn('User not found:', { userId: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        const updateData = { name, email, phone };

        if (avatar && avatar.startsWith('data:image')) {
            updateData.avatar = saveBase64Image(avatar, 'users', 'avatar');
        }

        await user.update(updateData);

        logger.info('Profile updated successfully', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Profil berhasil diperbarui',
            data: user
        });
    } catch (error) {
        logger.error('Update profile error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui profil',
            errors: error.message
        });
    }
};

/**
 * Forgot password
 */
const forgotPassword = async (req, res) => {
    try {
        logger.info('Forgot password request:', { email: req.body.email });
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            logger.warn('User not found for password reset:', { email });
            return response(res, { statusCode: 404, message: 'Email tidak ditemukan' });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // In a real application, you would send this token via email
        // For now, we'll just return it in the response
        logger.info('Password reset token generated', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Token reset password telah dikirim ke email',
            data: { token }
        });
    } catch (error) {
        logger.error('Forgot password error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memproses permintaan',
            errors: error.message
        });
    }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
    try {
        logger.info('Reset password request:', { token: req.params.token });
        const { token } = req.params;
        const { password } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            logger.warn('User not found for password reset:', { token });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        await user.update({ password: hashedPassword });

        logger.info('Password reset successful', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Password berhasil direset'
        });
    } catch (error) {
        logger.error('Reset password error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat reset password',
            errors: error.message
        });
    }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
    try {
        logger.info('Email verification request:', { token: req.params.token });
        const { token } = req.params;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            logger.warn('User not found for email verification:', { token });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        await user.update({ emailVerified: true });

        logger.info('Email verification successful', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Email berhasil diverifikasi'
        });
    } catch (error) {
        logger.error('Email verification error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat verifikasi email',
            errors: error.message
        });
    }
};

/**
 * Resend verification email
 */
const resendVerification = async (req, res) => {
    try {
        logger.info('Resend verification request:', { email: req.body.email });
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            logger.warn('User not found for verification resend:', { email });
            return response(res, { statusCode: 404, message: 'Email tidak ditemukan' });
        }

        if (user.emailVerified) {
            logger.warn('Email already verified:', { email });
            return response(res, { statusCode: 400, message: 'Email sudah diverifikasi' });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // In a real application, you would send this token via email
        // For now, we'll just return it in the response
        logger.info('Verification token generated', { userId: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Email verifikasi telah dikirim',
            data: { token }
        });
    } catch (error) {
        logger.error('Resend verification error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengirim ulang email verifikasi',
            errors: error.message
        });
    }
};

module.exports = {
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification
};