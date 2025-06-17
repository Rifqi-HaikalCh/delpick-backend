'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const schemas = require('../../validations/schemas');
const {
    placeOrder,
    getOrderById,
    updateOrderStatus,
    getOrdersByUser,
    getOrdersByStore,
    createReview
} = require('../../controllers/orderController');
const trackingController = require('../../controllers/trackingController');
const { trackingLimiter } = require('../../middleware/rateLimiter');
const { requestLogger } = require('../../middleware/requestMiddleware');
const { cache } = require('../../middleware/cache');

// Helper to conditionally apply limiter
const maybeTrackingLimiter = process.env.NODE_ENV === 'development' ? (req, res, next) => next() : trackingLimiter;

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [store_id, items]
 *             properties:
 *               store_id:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [menu_item_id, quantity, notes]
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid input
 */
router.post('/', protect, restrictTo('customer'), validate(schemas.order.create), placeOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order detail
 */
router.get('/:id', protect, cache.middleware(), getOrderById);

/**
 * @swagger
 * /orders/customer/orders:
 *   get:
 *     summary: Get orders for current customer
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customer orders
 */
router.get('/customer/orders', protect, restrictTo('customer'), cache.middleware(), getOrdersByUser);

/**
 * @swagger
 * /orders/store/orders:
 *   get:
 *     summary: Get orders for current store
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of store orders
 */
router.get('/store/orders', protect, restrictTo('store'), cache.middleware(), getOrdersByStore);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
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
 *             required: [order_status]
 *             properties:
 *               order_status:
 *                 type: string
 *                 enum: [pending, approved, preparing, on_delivery, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', protect, restrictTo('store'), updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/review:
 *   post:
 *     summary: Create review for order
 *     tags: [Orders]
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
 *             required: [order_review, driver_review]
 *             properties:
 *               order_review:
 *                 type: object
 *                 properties:
 *                   rating:
 *                     type: number
 *                   comment:
 *                     type: string
 *               driver_review:
 *                 type: object
 *                 properties:
 *                   rating:
 *                     type: number
 *                   comment:
 *                     type: string
 *     responses:
 *       201:
 *         description: Review created
 */
router.post('/:id/review', protect, restrictTo('customer'), validate(schemas.review.combined), createReview);

/**
 * @swagger
 * /orders/{id}/tracking:
 *   get:
 *     summary: Get tracking data for order
 *     tags: [Tracking]
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
 *         description: Tracking data
 */
router.get('/:id/tracking', protect, maybeTrackingLimiter, trackingController.getTrackingData);

/**
 * @swagger
 * /orders/{id}/tracking/start:
 *   post:
 *     summary: Start delivery for order
 *     tags: [Tracking]
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
 *         description: Delivery started
 */
router.post('/:id/tracking/start', protect, restrictTo('driver'), maybeTrackingLimiter, trackingController.startDelivery);

/**
 * @swagger
 * /orders/{id}/tracking/complete:
 *   post:
 *     summary: Complete delivery for order
 *     tags: [Tracking]
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
 *         description: Delivery completed
 */
router.post('/:id/tracking/complete', protect, restrictTo('driver'), maybeTrackingLimiter, trackingController.completeDelivery);

/**
 * @swagger
 * /orders/{id}/tracking/location:
 *   put:
 *     summary: Update driver location for order
 *     tags: [Tracking]
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
router.put('/:id/tracking/location', protect, restrictTo('driver'), maybeTrackingLimiter, validate(schemas.driver.location), trackingController.updateDriverLocation);

/**
 * @swagger
 * /orders/{id}/tracking/history:
 *   get:
 *     summary: Get tracking history for order
 *     tags: [Tracking]
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
 *         description: Tracking history
 */
router.get('/:id/tracking/history', protect, maybeTrackingLimiter, trackingController.getTrackingHistory);

router.use(requestLogger);

module.exports = router; 