const express = require('express');
const { verifyToken, isAdmin, isDriver } = require('../middlewares/authMiddleware');
const {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverLocation,
    updateDriverStatus,
    updateDriverByDriver
} = require('../controllers/driverController');
const {
    createDriverValidator,
    updateDriverValidator,
    deleteDriverValidator,
    validate,
} = require('../validators/driverValidator');

const router = express.Router();

// Admin routes
router.get('/', verifyToken(), isAdmin, getAllDrivers);
router.get('/:id', verifyToken(), isAdmin, getDriverById); // Hanya admin
router.post('/', verifyToken(), isAdmin, createDriverValidator, validate, createDriver); // Hanya admin
router.put('/:id', verifyToken(), isAdmin, updateDriverValidator, validate, updateDriver); // Hanya admin
router.delete('/:id', verifyToken(), isAdmin, deleteDriverValidator, validate, deleteDriver); // Hanya admin

// Driver routes
router.put('/location', verifyToken(), isDriver, updateDriverLocation); // Hanya driver
router.put('/status', verifyToken(), isDriver, updateDriverStatus); // Hanya driver
router.put('/updateProfileDriver', verifyToken(), isDriver, updateDriverByDriver);

module.exports = router;