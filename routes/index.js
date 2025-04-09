const express = require('express');
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const driverRoutes = require('./driverRoutes');
const menuItemRoutes = require('./menuItemRoutes');
const orderRoutes = require('./orderRoutes');
const storeRoutes = require('./storeRoutes');
const trackingRoutes = require('./trackingRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);
router.use('/stores', storeRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/orders', orderRoutes);
router.use('/tracking', trackingRoutes);

module.exports = router;