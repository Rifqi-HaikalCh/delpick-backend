'use strict';
const { admin } = require('../config/firebase');
const { logger } = require('./logger');

/**
 * Send notification to a single device
 * @param {string} token - FCM token of the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 * @returns {Promise<Object>} - Response from FCM
 */
const sendNotification = async (token, title, body, data = {}) => {
    if (!token) {
        logger.warn('No FCM token provided, skipping notification');
        return false;
    }

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            token
        };

        const response = await admin.messaging().send(message);
        logger.info('Notification sent successfully:', { token, title, response });
        return response;
    } catch (error) {
        logger.error('Error sending notification:', { error: error.message, token, title });
        return false;
    }
};

/**
 * Send notification to multiple devices
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 * @returns {Promise<Object>} - Response from FCM
 */
const sendMulticastNotification = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) {
        logger.warn('No FCM tokens provided, skipping multicast notification');
        return { successCount: 0, failureCount: 0 };
    }

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            tokens
        };

        const response = await admin.messaging().sendMulticast(message);
        logger.info('Multicast notification sent:', {
            successCount: response.successCount,
            failureCount: response.failureCount,
            title
        });
        return response;
    } catch (error) {
        logger.error('Error sending multicast notification:', { error: error.message, title });
        return { successCount: 0, failureCount: tokens.length };
    }
};

/**
 * Send notification to a topic
 * @param {string} topic - Topic name
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 * @returns {Promise<Object>} - Response from FCM
 */
const sendTopicNotification = async (topic, title, body, data = {}) => {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            topic
        };

        const response = await admin.messaging().send(message);
        logger.info('Topic notification sent successfully:', { topic, title, response });
        return response;
    } catch (error) {
        logger.error('Error sending topic notification:', { error: error.message, topic, title });
        return false;
    }
};

/**
 * Subscribe device tokens to a topic
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} - Response from FCM
 */
const subscribeToTopic = async (tokens, topic) => {
    if (!tokens || tokens.length === 0) {
        logger.warn('No FCM tokens provided, skipping topic subscription');
        return false;
    }

    try {
        const response = await admin.messaging().subscribeToTopic(tokens, topic);
        logger.info('Topic subscription successful:', response);
        return response;
    } catch (error) {
        logger.error('Error subscribing to topic:', { error: error.message, topic });
        return false;
    }
};

/**
 * Unsubscribe device tokens from a topic
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} - Response from FCM
 */
const unsubscribeFromTopic = async (tokens, topic) => {
    if (!tokens || tokens.length === 0) {
        logger.warn('No FCM tokens provided, skipping topic unsubscription');
        return false;
    }

    try {
        const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
        logger.info('Topic unsubscription successful:', response);
        return response;
    } catch (error) {
        logger.error('Error unsubscribing from topic:', { error: error.message, topic });
        return false;
    }
};

/**
 * Validate FCM token format
 * @param {string} token - FCM token to validate
 * @returns {boolean} - Whether token is valid
 */
const validateFcmToken = (token) => {
    if (!token || typeof token !== 'string') {
        return false;
    }

    // Basic FCM token validation - should be a long string with specific characters
    const fcmTokenPattern = /^[A-Za-z0-9:_-]+$/;
    return fcmTokenPattern.test(token) && token.length > 50;
};

/**
 * Clean up invalid FCM tokens from user records
 * @param {Object} User - User model
 * @returns {Promise<number>} - Number of tokens cleaned up
 */
const cleanupInvalidFcmTokens = async (User) => {
    try {
        const result = await User.update(
            { fcm_token: null },
            {
                where: {
                    fcm_token: {
                        [require('sequelize').Op.or]: [
                            { [require('sequelize').Op.eq]: '' },
                            { [require('sequelize').Op.like]: '%invalid%' },
                            { [require('sequelize').Op.like]: '%expired%' }
                        ]
                    }
                }
            }
        );

        logger.info(`Cleaned up ${result[0]} invalid FCM tokens`);
        return result[0];
    } catch (error) {
        logger.error('Error cleaning up FCM tokens:', { error: error.message });
        return 0;
    }
};

module.exports = {
    sendNotification,
    sendMulticastNotification,
    sendTopicNotification,
    subscribeToTopic,
    unsubscribeFromTopic,
    validateFcmToken,
    cleanupInvalidFcmTokens
}; 