const { MenuItem, Store } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const { saveBase64Image } = require('../utils/imageHelper');

/** 
 * Helper untuk ambil store berdasarkan user
 * */
const getStoreByUserId = async (userId) => {
    return await Store.findOne({ where: { userId } });
};

/**
 * Mendapatkan semua menu item
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllMenuItems = async (req, res) => {
    try {
        const queryOptions = getQueryOptions(req.query);
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan untuk user ini' });
        }

        // Hanya ambil menu item dari toko milik owner
        queryOptions.where = { storeId: store.id };

        const { count, rows: menuItems } = await MenuItem.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data menu item',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                menuItems,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data menu item',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan menu item berdasarkan storeId
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getMenuItemsByStoreId = async (req, res) => {
    try {
        const { storeId } = req.params;
        const queryOptions = getQueryOptions(req.query);

        // Filter berdasarkan storeId
        queryOptions.where = { storeId };

        const { count, rows: menuItems } = await MenuItem.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data menu item',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                menuItems,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data menu item',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan menu item berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByPk(req.params.id);
        if (!menuItem) {
            return response(res, { statusCode: 404, message: 'Menu item tidak ditemukan' });
        }

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data menu item',
            data: menuItem,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data menu item',
            errors: error.message,
        });
    }
};

/**
 * Menambahkan menu item baru
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createMenuItem = async (req, res) => {
    try {
        const { name, price, description, image, quantity } = req.body;

        // Simpan gambar jika image berupa base64
        let imageUrl = null;
        if (image && image.startsWith('data:image')) {
            imageUrl = saveBase64Image(image, 'menu-items', 'menu');
        }

        // get storeId from user
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan untuk user ini' });
        }

        const menuItem = await MenuItem.create({
            storeId: store.id,
            name,
            price,
            description,
            imageUrl,
            quantity,
        });

        return response(res, {
            statusCode: 201,
            message: 'Menu item berhasil ditambahkan',
            data: menuItem,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan menu item',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate menu item berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, image, quantity } = req.body;

        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan untuk user ini' });
        }

        const menuItem = await MenuItem.findOne({
            where: { id, storeId: store.id }, // Hanya owner yang bisa mengupdate
        });

        if (!menuItem) {
            return response(res, { statusCode: 404, message: 'Menu item tidak ditemukan' });
        }

        // Simpan gambar jika image berupa base64
        let imageUrl = menuItem.imageUrl;
        if (image && image.startsWith('data:image')) {
            imageUrl = saveBase64Image(image, 'menu-items', 'menu');
        }

        await menuItem.update({
            name,
            price,
            description,
            imageUrl,
            quantity,
        });

        return response(res, {
            statusCode: 200,
            message: 'Menu item berhasil diupdate',
            data: menuItem,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate menu item',
            errors: error.message,
        });
    }
};

/**
 * Menghapus menu item berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan untuk user ini' });
        }

        const menuItem = await MenuItem.findOne({
            where: { id, storeId: store.id },
        });

        if (!menuItem) {
            return response(res, { statusCode: 404, message: 'Menu item tidak ditemukan' });
        }

        await menuItem.destroy();

        return response(res, {
            statusCode: 200,
            message: 'Menu item berhasil dihapus',
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus menu item',
            errors: error.message,
        });
    }
};

module.exports = {
    getAllMenuItems,
    getMenuItemById,
    getMenuItemsByStoreId,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
};