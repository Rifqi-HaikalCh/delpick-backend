'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const driverRequestController = require('../../controllers/driverRequestController');
const { requestLogger } = require('../../middleware/requestMiddleware');

/**
 * @swagger
 * /driver-requests:
 *   get:
 *     summary: Get driver requests
 *     tags: [Driver Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of driver requests
 */
router.use(requestLogger);
router.get('/', protect, restrictTo('driver'), driverRequestController.getDriverRequests);

/**
 * @swagger
 * /driver-requests/{id}/respond:
 *   post:
 *     summary: Respond to driver request
 *     tags: [Driver Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *               estimatedPickupTime:
 *                 type: string
 *                 format: date-time
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Responded to driver request
 */
router.post('/:id/respond', protect, restrictTo('driver'), validate(schemas.driver.respondRequest), driverRequestController.respondToDriverRequest);

/**
 * @swagger
 * /driver-requests/{id}:
 *   get:
 *     summary: Get driver request detail
 *     tags: [Driver Requests]
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
 *         description: Driver request detail
 */
router.get('/:id', protect, restrictTo('driver'), driverRequestController.getDriverRequestDetail);

module.exports = router; 