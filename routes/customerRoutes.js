const express = require('express');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
} = require('../controllers/customerController');
const {
    createCustomerValidator,
    updateCustomerValidator,
    deleteCustomerValidator,
    validate,
} = require('../validators/customerValidator');

const router = express.Router();

// User routes
router.get('/', verifyToken, isAdmin, getAllCustomers); // Hanya admin
router.get('/:id', verifyToken, isAdmin, getCustomerById); // Hanya admin
router.post('/', verifyToken, isAdmin, createCustomerValidator, validate, createCustomer); // Hanya admin
router.put('/:id', verifyToken, isAdmin, updateCustomerValidator, validate, updateCustomer); // Hanya admin
router.delete('/:id', verifyToken, isAdmin, deleteCustomerValidator, validate, deleteCustomer); // Hanya admin

module.exports = router;