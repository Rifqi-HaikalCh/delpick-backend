const express = require('express');
const { verifyToken, isDriver } = require('../middlewares/authMiddleware');
const { acceptDriverRequest, getRealtimeTracking } = require('../controllers/trackingController');

const router = express.Router();
router.put('/driver-requests/:orderId/accept', verifyToken, isDriver, acceptDriverRequest);
router.get('/tracking/:orderId', getRealtimeTracking);

module.exports = router;