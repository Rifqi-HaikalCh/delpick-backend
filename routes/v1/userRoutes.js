'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const {
    getProfile,
    updateProfile,
    deleteProfile,
    getNotifications,
    markNotificationAsRead,
    deleteNotification
} = require('../../controllers/userController');
const { requestLogger } = require('../../middleware/requestMiddleware');

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *   put:
 *     summary: Update user profile
 *     tags: [User]
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
 *         description: Success
 *   delete:
 *     summary: Delete user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 */
router.use(requestLogger);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(schemas.user.update), updateProfile);
router.delete('/profile', protect, deleteProfile);

/**
 * @swagger
 * /users/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/notifications', protect, getNotifications);

/**
 * @swagger
 * /users/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/notifications/:id/read', protect, markNotificationAsRead);

/**
 * @swagger
 * /users/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/notifications/:id', protect, deleteNotification);

module.exports = router; 