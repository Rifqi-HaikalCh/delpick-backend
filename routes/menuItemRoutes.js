const express = require('express');
const { verifyToken, isOwner } = require('../middlewares/authMiddleware');
const {
    getAllMenuItems,
    getMenuItemById,
    getMenuItemsByStoreId,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
} = require('../controllers/menuItemController');
const {
    createMenuItemValidator,
    updateMenuItemValidator,
    deleteMenuItemValidator,
    validate,
} = require('../validators/menuItemValidator');

const router = express.Router();

router.get('/', verifyToken(), getAllMenuItems);
router.get('/:id', verifyToken(), getMenuItemById);
router.get('/store/:id', verifyToken(), getMenuItemsByStoreId);
router.post('/', verifyToken(), isOwner, createMenuItemValidator, validate, createMenuItem);
router.put('/:id', verifyToken(), isOwner, updateMenuItemValidator, validate, updateMenuItem);
router.delete('/:id', verifyToken(), isOwner, deleteMenuItemValidator, validate, deleteMenuItem);

module.exports = router;
