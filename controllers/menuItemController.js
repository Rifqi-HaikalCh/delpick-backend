'use strict';

const { MenuItem, Store, User, sequelize } = require('../models');
const response = require('../utils/response');
const { saveBase64Image } = require('../utils/imageHelper');
const { logger } = require('../utils/logger');

/**
 * Helper function to get store by user ID
 */
const getStoreByUserId = async (userId) => {
    const store = await Store.findOne({
        where: { user_id: userId },
        include: [{ model: User, as: 'owner' }]
    });
    return store;
};

/**
 * Helper function to update store's total products
 */
const updateStoreTotalProducts = async (storeId, transaction = null) => {
    const totalProducts = await MenuItem.count({
        where: {
            store_id: storeId,
            is_available: true
        },
        transaction
    });

    await Store.update(
        { total_products: totalProducts },
        {
            where: { id: storeId },
            transaction
        }
    );

    return totalProducts;
};

/**
 * Get all menu items
 */
const getAllMenuItems = async (req, res) => {
    try {
        logger.info('Get all menu items request');
        const menuItems = await MenuItem.findAll({
            include: [{
                model: Store,
                as: 'store',
                attributes: ['name', 'image_url']
            }]
        });

        logger.info('Successfully retrieved menu items');
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan menu items',
            data: menuItems
        });
    } catch (error) {
        logger.error('Error getting menu items:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil menu items',
            errors: error.message
        });
    }
};

/**
 * Get menu items by store
 */
const getMenuItemsByStore = async (req, res) => {
    try {
        logger.info('Get menu items by store request:', { store_id: req.params.store_id });
        const menuItems = await MenuItem.findAll({
            where: { store_id: req.params.store_id },
            include: [{
                model: Store,
                as: 'store',
                attributes: ['name', 'image_url']
            }]
        });

        logger.info('Successfully retrieved menu items for store:', { store_id: req.params.store_id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan menu items',
            data: menuItems
        });
    } catch (error) {
        logger.error('Error getting menu items by store:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil menu items',
            errors: error.message
        });
    }
};

/**
 * Get menu item by ID
 */
const getMenuItemById = async (req, res) => {
    try {
        logger.info('Get menu item by ID request:', { menu_item_id: req.params.id });
        const menuItem = await MenuItem.findByPk(req.params.id, {
            include: [{
                model: Store,
                as: 'store',
                attributes: ['name', 'image_url']
            }]
        });

        if (!menuItem) {
            logger.warn('Menu item not found:', { menu_item_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Menu item tidak ditemukan'
            });
        }

        logger.info('Successfully retrieved menu item:', { menu_item_id: menuItem.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan menu item',
            data: menuItem
        });
    } catch (error) {
        logger.error('Error getting menu item by ID:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil menu item',
            errors: error.message
        });
    }
};

/**
 * Create menu item
 */
const createMenuItem = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Get store from logged in user
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Toko tidak ditemukan untuk user ini'
            });
        }

        const { name, price, description, category, is_available, quantity } = req.body;

        let image_url = null;
        if (req.body.image && req.body.image.startsWith('data:image')) {
            image_url = saveBase64Image(req.body.image, 'menu-items', 'item');
        }

        const menuItem = await MenuItem.create({
            name,
            price,
            description,
            image_url,
            category,
            is_available: is_available ?? true,
            quantity,
            store_id: store.id
        }, { transaction });

        // Update store's total products count
        await updateStoreTotalProducts(store.id, transaction);

        await transaction.commit();

        logger.info('Menu item created successfully:', { menu_item_id: menuItem.id });
        return response(res, {
            statusCode: 201,
            message: 'Menu item berhasil ditambahkan',
            data: menuItem
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error creating menu item:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan menu item',
            errors: error.message
        });
    }
};

/**
 * Update menu item
 */
const updateMenuItem = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Update menu item request:', { menu_item_id: req.params.id });

        // Get store from logged in user
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Toko tidak ditemukan untuk user ini'
            });
        }

        const { name, price, description, category, is_available, quantity } = req.body;
        const menuItem = await MenuItem.findOne({
            where: {
                id: req.params.id,
                store_id: store.id
            },
            transaction
        });

        if (!menuItem) {
            logger.warn('Menu item not found or not owned by store:', { menu_item_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Menu item tidak ditemukan atau bukan milik toko Anda'
            });
        }

        const updateData = {
            name,
            price,
            description,
            category,
            is_available,
            quantity
        };

        if (req.body.image && req.body.image.startsWith('data:image')) {
            updateData.image_url = saveBase64Image(req.body.image, 'menu-items', 'item');
        }

        await menuItem.update(updateData, { transaction });

        // Update store's total products count if availability changed
        if (menuItem.is_available !== is_available) {
            await updateStoreTotalProducts(store.id, transaction);
        }

        await transaction.commit();

        logger.info('Menu item updated successfully:', { menu_item_id: menuItem.id });
        return response(res, {
            statusCode: 200,
            message: 'Menu item berhasil diperbarui',
            data: menuItem
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error updating menu item:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui menu item',
            errors: error.message
        });
    }
};

/**
 * Delete menu item
 */
const deleteMenuItem = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Delete menu item request:', { menu_item_id: req.params.id });

        // Get store from logged in user
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Toko tidak ditemukan untuk user ini'
            });
        }

        const menuItem = await MenuItem.findOne({
            where: {
                id: req.params.id,
                store_id: store.id
            },
            transaction
        });

        if (!menuItem) {
            logger.warn('Menu item not found or not owned by store:', { menu_item_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Menu item tidak ditemukan atau bukan milik toko Anda'
            });
        }

        await menuItem.destroy({ transaction });

        // Update store's total products count
        if (menuItem.is_available) {
            await updateStoreTotalProducts(store.id, transaction);
        }

        await transaction.commit();

        logger.info('Menu item deleted successfully:', { menu_item_id: req.params.id });
        return response(res, {
            statusCode: 200,
            message: 'Menu item berhasil dihapus'
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error deleting menu item:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus menu item',
            errors: error.message
        });
    }
};

/**
 * Update menu item status
 */
const updateMenuItemStatus = async (req, res) => {
    try {
        logger.info('Update menu item status request:', { menu_item_id: req.params.id });
        const { is_available } = req.body;
        const menuItem = await MenuItem.findByPk(req.params.id);

        if (!menuItem) {
            logger.warn('Menu item not found:', { menu_item_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Menu item tidak ditemukan'
            });
        }

        await menuItem.update({ is_available });

        logger.info('Menu item status updated successfully:', { menu_item_id: menuItem.id });
        return response(res, {
            statusCode: 200,
            message: 'Status menu item berhasil diperbarui',
            data: menuItem
        });
    } catch (error) {
        logger.error('Error updating menu item status:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui status menu item',
            errors: error.message
        });
    }
};

module.exports = {
    getAllMenuItems,
    getMenuItemsByStore,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateMenuItemStatus
};