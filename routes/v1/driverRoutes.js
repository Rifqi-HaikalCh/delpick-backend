'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    updateDriverLocation,
} = require('../../controllers/driverController');
const { requestLogger } = require('../../middleware/requestMiddleware');

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
 *   post:
 *     summary: Create a new driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone, licenseNumber, vehiclePlate]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 description: base64 image string
 *               license_number:
 *                 type: string
 *               vehicle_plate:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, busy]
 *     responses:
 *       201:
 *         description: Driver created
 *       400:
 *         description: Invalid input
 */
router.use(requestLogger);
router.get('/', protect, getAllDrivers);
router.post('/', protect, restrictTo('admin'), validate(schemas.driver.create), createDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
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
 *         description: Driver detail
 *   put:
 *     summary: Update driver by ID
 *     tags: [Drivers]
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
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 description: base64 image string
 *               license_number:
 *                 type: string
 *               vehicle_plate:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, busy]
 *     responses:
 *       200:
 *         description: Driver updated
 *   delete:
 *     summary: Delete driver by ID
 *     tags: [Drivers]
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
 *         description: Driver deleted
 */
router.get('/:id', protect, getDriverById);
router.put('/:id', protect, restrictTo('admin'), validate(schemas.driver.update), updateDriver);
router.delete('/:id', protect, restrictTo('admin'), deleteDriver);

/**
 * @swagger
 * /drivers/{id}/status:
 *   patch:
 *     summary: Update driver status
 *     tags: [Drivers]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, busy]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', protect, restrictTo('admin'), updateDriverStatus);

/**
 * @swagger
 * /drivers/{id}/location:
 *   patch:
 *     summary: Update driver location
 *     tags: [Drivers]
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
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated
 */
router.patch('/:id/location', protect, restrictTo('driver'), updateDriverLocation);

module.exports = router; 