'use strict';

const { User, Notification } = require('../models');
const response = require('../utils/response');
const { saveBase64Image } = require('../utils/imageHelper');
const { logger } = require('../utils/logger');
const { validateFcmToken } = require('../utils/notifications');

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
    try {
        logger.info('Get profile request:', { user_id: req.user.id });
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            logger.warn('Profile not found:', { user_id: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        logger.info('Profile retrieved successfully', { user_id: user.id });
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
        logger.info('Update profile request:', { user_id: req.user.id });
        const { name, email, phone, avatar, fcm_token } = req.body;

        const user = await User.findByPk(req.user.id);

        if (!user) {
            logger.warn('User not found:', { user_id: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return response(res, {
                    statusCode: 400,
                    message: 'Email sudah digunakan'
                });
            }
        }

        const updateData = {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(fcm_token !== undefined && { fcm_token })
        };

        if (avatar && avatar.startsWith('data:image')) {
            try {
                updateData.avatar = saveBase64Image(avatar, 'users', 'avatar');
            } catch (error) {
                logger.error('Avatar save error:', { error: error.message });
                return response(res, {
                    statusCode: 400,
                    message: 'Gagal menyimpan avatar',
                    errors: error.message
                });
            }
        }

        await user.update(updateData);

        logger.info('Profile updated successfully', { user_id: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Profil berhasil diperbarui',
            data: user
        });
    } catch (error) {
        logger.error('Update profile error:', { error: error.message, stack: error.stack });

        // Handle specific validation errors
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return response(res, {
                statusCode: 400,
                message: 'Validasi gagal',
                errors: error.errors.map(e => e.message)
            });
        }

        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui profil',
            errors: error.message
        });
    }
};

/**
 * Delete user profile
 */
const deleteProfile = async (req, res) => {
    try {
        logger.info('Delete profile request:', { user_id: req.user.id });
        const user = await User.findByPk(req.user.id);

        if (!user) {
            logger.warn('User not found:', { user_id: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        await user.destroy();

        logger.info('Profile deleted successfully', { user_id: req.user.id });
        return response(res, {
            statusCode: 200,
            message: 'Profil berhasil dihapus'
        });
    } catch (error) {
        logger.error('Delete profile error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus profil',
            errors: error.message
        });
    }
};

/**
 * Get user notifications
 */
const getNotifications = async (req, res) => {
    try {
        logger.info('Get notifications request:', { user_id: req.user.id });
        const user = await User.findByPk(req.user.id, {
            include: [{
                model: Notification,
                as: 'notifications',
                order: [['created_at', 'DESC']]
            }]
        });

        if (!user) {
            logger.warn('User not found:', { user_id: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        logger.info('Notifications retrieved successfully', { user_id: user.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan notifikasi',
            data: user.notifications
        });
    } catch (error) {
        logger.error('Get notifications error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil notifikasi',
            errors: error.message
        });
    }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (req, res) => {
    try {
        logger.info('Mark notification as read request:', { user_id: req.user.id, notification_id: req.params.id });
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        });

        if (!notification) {
            logger.warn('Notification not found:', { notification_id: req.params.id });
            return response(res, { statusCode: 404, message: 'Notifikasi tidak ditemukan' });
        }

        await notification.update({ read: true });

        logger.info('Notification marked as read successfully', { notification_id: notification.id });
        return response(res, {
            statusCode: 200,
            message: 'Notifikasi berhasil ditandai sebagai telah dibaca'
        });
    } catch (error) {
        logger.error('Mark notification as read error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menandai notifikasi',
            errors: error.message
        });
    }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (req, res) => {
    try {
        logger.info('Mark all notifications as read request:', { user_id: req.user.id });
        await Notification.update(
            { read: true },
            {
                where: {
                    user_id: req.user.id,
                    read: false
                }
            }
        );

        logger.info('All notifications marked as read successfully', { user_id: req.user.id });
        return response(res, {
            statusCode: 200,
            message: 'Semua notifikasi berhasil ditandai sebagai telah dibaca'
        });
    } catch (error) {
        logger.error('Mark all notifications as read error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menandai semua notifikasi',
            errors: error.message
        });
    }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
    try {
        logger.info('Delete notification request:', { user_id: req.user.id, notification_id: req.params.id });
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        });

        if (!notification) {
            logger.warn('Notification not found:', { notification_id: req.params.id });
            return response(res, { statusCode: 404, message: 'Notifikasi tidak ditemukan' });
        }

        await notification.destroy();

        logger.info('Notification deleted successfully', { notification_id: notification.id });
        return response(res, {
            statusCode: 200,
            message: 'Notifikasi berhasil dihapus'
        });
    } catch (error) {
        logger.error('Delete notification error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus notifikasi',
            errors: error.message
        });
    }
};

/**
 * Update FCM token for push notifications
 */
const updateFcmToken = async (req, res) => {
    try {
        logger.info('Update FCM token request:', { user_id: req.user.id });
        const { fcm_token } = req.body;

        // Validate FCM token format if provided
        if (fcm_token && !validateFcmToken(fcm_token)) {
            logger.warn('Invalid FCM token format:', { user_id: req.user.id });
            return response(res, {
                statusCode: 400,
                message: 'Format FCM token tidak valid'
            });
        }

        const user = await User.findByPk(req.user.id);

        if (!user) {
            logger.warn('User not found:', { user_id: req.user.id });
            return response(res, { statusCode: 404, message: 'User tidak ditemukan' });
        }

        await user.update({ fcm_token });

        logger.info('FCM token updated successfully', {
            user_id: user.id,
            has_token: !!fcm_token
        });
        return response(res, {
            statusCode: 200,
            message: 'FCM token berhasil diperbarui',
            data: { fcm_token }
        });
    } catch (error) {
        logger.error('Update FCM token error:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui FCM token',
            errors: error.message
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteProfile,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    updateFcmToken
}; 