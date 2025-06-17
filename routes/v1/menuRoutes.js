'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const {
    getAllMenuItems,
    getMenuItemsByStore,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateMenuItemStatus
} = require('../../controllers/menuItemController');
const { requestLogger } = require('../../middleware/requestMiddleware');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const { cache } = require('../../middleware/cache');

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of menu items
 *   post:
 *     summary: Create a new menu item
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, storeId, category]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: base64 image string
 *               storeId:
 *                 type: integer
 *               category:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Menu item created
 *       400:
 *         description: Invalid input
 */
router.use(requestLogger);
router.get('/', protect, cache.middleware(), getAllMenuItems);
router.post('/', protect, restrictTo('store'), validate(schemas.menu.create), createMenuItem);

/**
 * @swagger
 * /menu/store/{store_id}:
 *   get:
 *     summary: Get menu items by store
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: store_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of menu items for store
 */
router.get('/store/:store_id', protect, cache.middleware(), getMenuItemsByStore);

/**
 * @swagger
 * /menu/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     tags: [Menu]
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
 *         description: Menu item detail
 *   put:
 *     summary: Update menu item by ID
 *     tags: [Menu]
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
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: base64 image string
 *               category:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu item updated
 *   delete:
 *     summary: Delete menu item by ID
 *     tags: [Menu]
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
 *         description: Menu item deleted
 */
router.get('/:id', protect, cache.middleware(), getMenuItemById);
router.put('/:id', protect, restrictTo('store'), validate(schemas.menu.update), updateMenuItem);
router.delete('/:id', protect, restrictTo('store'), deleteMenuItem);

/**
 * @swagger
 * /menu/{id}/status:
 *   patch:
 *     summary: Update menu item status
 *     tags: [Menu]
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
 *                 enum: [available, unavailable]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', protect, restrictTo('store'), updateMenuItemStatus);

module.exports = router; 