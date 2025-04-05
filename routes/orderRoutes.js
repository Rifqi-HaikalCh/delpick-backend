const express = require('express');
const router = express.Router();
const { verifyToken, isCustomer, isOwner } = require('../middlewares/authMiddleware');
const { getOrdersByUser, getOrdersByStore, placeOrder, approveOrder, getOrderDetail, updateOrderStatus, createReview } = require('../controllers/orderController');
const { placeOrderValidator, validate } = require('../validators/orderValidator');
const { createReviewValidator } = require('../validators/reviewValidator');

router.get('/user', verifyToken, isCustomer, getOrdersByUser);
router.get('/store', verifyToken, isOwner, getOrdersByStore);
router.post('/', verifyToken, isCustomer, placeOrderValidator, validate, placeOrder, );
router.put('/:orderId/approve', verifyToken, isOwner, approveOrder);
router.get('/:id', verifyToken, getOrderDetail);
router.post('/review', verifyToken, isCustomer, createReviewValidator, validate, createReview);
// **Menambahkan route untuk update status order**
router.put('/:orderId/status', verifyToken, updateOrderStatus);
module.exports = router;