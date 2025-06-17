'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const authController = require('../../controllers/authController');
const { authLimiter } = require('../../middleware/rateLimiter');
const { requestLogger } = require('../../middleware/requestMiddleware');

const maybeAuthLimiter = process.env.NODE_ENV === 'development' ? (req, res, next) => next() : authLimiter;

router.use(requestLogger);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', maybeAuthLimiter, validate(schemas.auth.login), authController.login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone, role]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [customer, store, driver]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post('/register', maybeAuthLimiter, validate(schemas.auth.register), authController.register);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token reset password dikirim
 *       404:
 *         description: Email tidak ditemukan
 */
router.post('/forgot-password', validate(schemas.auth.forgotPassword), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *       400:
 *         description: Invalid token
 */
router.post('/reset-password', validate(schemas.auth.resetPassword), authController.resetPassword);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   post:
 *     summary: Verify email
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email berhasil diverifikasi
 *       400:
 *         description: Invalid token
 */
router.post('/verify-email/:token', authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verifikasi dikirim
 *       404:
 *         description: Email tidak ditemukan
 */
router.post('/resend-verification', protect, authController.resendVerification);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan profil
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, validate(schemas.user.update), authController.updateProfile);

module.exports = router; 