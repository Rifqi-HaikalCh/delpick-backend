'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const {
    getAllStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
} = require('../../controllers/storeController');
const { requestLogger } = require('../../middleware/requestMiddleware');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');

/**
 * @swagger
 * /stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stores
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone, address, openTime, closeTime, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               open_time:
 *                 type: string
 *               close_time:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Store created
 *       400:
 *         description: Invalid input
 */
router.use(requestLogger);
router.get('/', protect, getAllStores);
router.get('/:id', protect, getStoreById);

/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     summary: Get store by ID
 *     tags: [Stores]
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
 *         description: Store detail
 *   put:
 *     summary: Update store by ID
 *     tags: [Stores]
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
 *             required: [name, phone, address, open_time, close_time, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               open_time:
 *                 type: string
 *               close_time:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store updated
 *   delete:
 *     summary: Delete store by ID
 *     tags: [Stores]
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
 *         description: Store deleted
 */
router.post('/', protect, restrictTo('admin'), validate(schemas.store.create), createStore);
router.put('/:id', protect, restrictTo('admin'), validate(schemas.store.update), updateStore);
router.delete('/:id', protect, restrictTo('admin'), deleteStore);

module.exports = router; 