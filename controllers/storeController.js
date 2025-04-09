const { User, Store } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const haversine = require('../utils/haversine');
const bcrypt = require('bcryptjs');
const { saveBase64Image } = require('../utils/imageHelper');


/**
 * Mendapatkan semua store beserta ownernya
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllStores = async (req, res) => {
    try {
        const queryOptions = getQueryOptions(req.query, [{ model: User, as: 'user' }]);

        const { count, rows: stores } = await Store.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data store',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                stores,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data store',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan store berdasarkan ID beserta ownernya
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getStoreById = async (req, res) => {
    try {
        const store = await Store.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }], // Include data User (owner)
        });

        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Store tidak ditemukan',
            });
        }

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data store',
            data: store,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data store',
            errors: error.message,
        });
    }
};

/**
 * Membuat store baru beserta ownernya
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createStore = async (req, res) => {
    try {
        const { name, email, password, phone, storeName, address, description, openTime, closeTime, image, latitude, longitude } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        // 1. Buat User (Owner) dengan role 'store'
        const owner = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'store', // Role sebagai store owner
        });

        // 2. Hitung jarak menggunakan Haversine method
        const destinationLatitude = 2.38349390603264; // Koordinat IT Del
        const destinationLongitude = 99.14866498216043;
        const distance = haversine(latitude, longitude, destinationLatitude, destinationLongitude);

        // 3. Simpan gambar jika imageUrl berupa base64
        let imagePath = null;
        if (image && image.startsWith('data:image')) {
            imagePath = saveBase64Image(image, 'stores', 'store');
        }

        // 4. Buat Store dan hubungkan dengan User (Owner)
        const store = await Store.create({
            userId: owner.id, // Hubungkan store dengan owner
            name: storeName,
            address,
            description,
            openTime,
            closeTime,
            imageUrl: imagePath,
            phone,
            latitude,
            longitude,
            distance, // Simpan jarak ke database
        });

        return response(res, {
            statusCode: 201,
            message: 'Store dan owner berhasil ditambahkan',
            data: {
                owner,
                store,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan store dan owner',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate store berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone, storeName, address, description, openTime, closeTime, image, latitude, longitude } = req.body;

        const store = await Store.findByPk(id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Store tidak ditemukan' });
        }

        // Update data User (owner)
        await store.user.update({ name, email, phone });

        // Update data store
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            store.user.password = hashedPassword;
        }

        // Jika latitude atau longitude diubah, hitung ulang jarak
        let distance = store.distance;
        if (latitude && longitude) {
            const destinationLatitude = 2.38349390603264;
            const destinationLongitude = 99.14866498216043;
            distance = haversine(latitude, longitude, destinationLatitude, destinationLongitude);
        }

        // Simpan gambar jika imageUrl berupa base64
        let imagePath = store.imageUrl;
        if (image && image.startsWith('data:image')) {
            imagePath = saveBase64Image(image, 'stores', 'store');
        }

        await store.update({
            name: storeName,
            address,
            description,
            openTime,
            closeTime,
            imageUrl: imagePath,
            phone,
            latitude,
            longitude,
            distance,
        });

        return response(res, {
            statusCode: 200,
            message: 'Store berhasil diupdate',
            data: store,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate store',
            errors: error.message,
        });
    }
};

/**
 * Menghapus store berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteStore = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findByPk(id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Store tidak ditemukan' });
        }

        // Hapus juga owner (User) yang terkait dengan store
        const owner = await User.findByPk(store.userId);
        if (owner) {
            await owner.destroy();
        }

        await store.destroy();

        return response(res, {
            statusCode: 200,
            message: 'Store dan owner berhasil dihapus',
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus store dan owner',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate store oleh owner yang sedang login
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateStoreByOwner = async (req, res) => {
    try {
        const { id: userId } = req.user; // ID owner yang sedang login
        const { storeName, address, description, openTime, closeTime, image, latitude, longitude } = req.body;

        // Cari store yang dimiliki oleh owner yang sedang login
        const store = await Store.findOne({
            where: { userId },
        });
        if (!store) {
            return response(res, { statusCode: 404, message: 'Store tidak ditemukan atau Anda bukan pemilik store ini' });
        }

        // Jika latitude atau longitude diubah, hitung ulang jarak
        let distance = store.distance;
        if (latitude && longitude) {
            const destinationLatitude = 2.38349390603264; // Koordinat IT Del
            const destinationLongitude = 99.14866498216043;
            distance = haversine(latitude, longitude, destinationLatitude, destinationLongitude);
        }

        // Simpan gambar jika imageUrl berupa base64
        let imagePath = store.imageUrl;
        if (image && image.startsWith('data:image')) {
            imagePath = saveBase64Image(image, 'stores', 'store');
        }

        // Update data store
        await store.update({
            name: storeName,
            address,
            description,
            openTime,
            closeTime,
            imageUrl: imagePath,
            latitude,
            longitude,
            distance,
        });

        return response(res, {
            statusCode: 200,
            message: 'Store berhasil diupdate',
            data: store,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate store',
            errors: error.message,
        });
    }
};

module.exports = {
    getAllStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
    updateStoreByOwner
};