'use strict';

const express = require('express');
const router = express.Router();

// Import v1 routes
const authRoutes = require('./v1/authRoutes');
const userRoutes = require('./v1/userRoutes');
const storeRoutes = require('./v1/storeRoutes');
const driverRoutes = require('./v1/driverRoutes');
const driverRequestRoutes = require('./v1/driverRequestRoutes');
const customerRoutes = require('./v1/customerRoutes');
const menuRoutes = require('./v1/menuRoutes');
const orderRoutes = require('./v1/orderRoutes');
const healthRoutes = require('./v1/healthRoutes');

// Mount v1 routes
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/stores', storeRoutes);
router.use('/v1/drivers', driverRoutes);
router.use('/v1/driver-requests', driverRequestRoutes);
router.use('/v1/customers', customerRoutes);
router.use('/v1/menu', menuRoutes);
router.use('/v1/orders', orderRoutes);
router.use('/v1/health', healthRoutes);

module.exports = router; 