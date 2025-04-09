const express = require('express');
const {
    login,
    register,
    forgotPassword,
    resetPassword,
    updateProfile,
    logout
} = require('../controllers/authController');

const { 
    verifyToken,
    // validateInput
 } = require('../middlewares/authMiddleware');

const {
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    validate
} = require('../validators/authValidator');


const router = express.Router();

router.post('/login', loginValidator, validate, login);
router.post('/register', registerValidator, validate, register);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, resetPassword);
router.put('/update-profile', verifyToken, updateProfileValidator, validate, updateProfile);
router.post('/logout', verifyToken, logout);

module.exports = router;
