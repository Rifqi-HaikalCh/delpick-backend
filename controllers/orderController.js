const { Order, OrderItem, Store, User, Driver, DriverReview, OrderReview } = require('../models');
const response = require('../utils/response');
const haversine = require('../utils/haversine');
const euclideanDistance = require('../utils/euclideanDistance'); // Asumsi Anda sudah membuat utility ini

/**
 * Mencari driver terdekat dari toko menggunakan algoritma Haversine
 * @param {number} storeLat - Latitude toko
 * @param {number} storeLon - Longitude toko
 * @returns {Object} - Driver terdekat
 */
const findNearestDriver = async (storeLat, storeLon) => {
    const drivers = await Driver.findAll({
        include: [{ model: User, as: 'user' }], // Ambil data lokasi driver dari tabel User
    });

    let nearestDriver = null;
    let minDistance = Infinity;

    drivers.forEach((driver) => {
        const driverLat = driver.user.latitude;
        const driverLon = driver.user.longitude;
        const distance = haversine(storeLat, storeLon, driverLat, driverLon);

        if (distance < minDistance) {
            minDistance = distance;
            nearestDriver = driver;
        }
    });

    return nearestDriver;
};

/**
 * Menghitung estimasi waktu pengiriman menggunakan Euclidean distance
 * @param {number} storeLat - Latitude toko
 * @param {number} storeLon - Longitude toko
 * @param {number} customerLat - Latitude customer
 * @param {number} customerLon - Longitude customer
 * @returns {number} - Estimasi waktu dalam menit
 */
const calculateEstimatedDeliveryTime = (storeLat, storeLon, customerLat, customerLon) => {
    const distance = euclideanDistance(storeLat, storeLon, customerLat, customerLon);
    const averageSpeed = 30; // Asumsi kecepatan rata-rata 30 km/jam
    const estimatedTime = (distance / averageSpeed) * 60; // Konversi ke menit
    return Math.round(estimatedTime);
};

/**
 * Mendapatkan order berdasarkan user yang sedang login (customer)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getOrdersByUser = async (req, res) => {
    try {
        const { id: customerId } = req.user; // Ambil ID user yang sedang login

        const orders = await Order.findAll({
            where: { customerId }, // Filter berdasarkan customerId
            include: [
                {
                    model: OrderItem,
                    as: 'items', // Relasi ke OrderItem
                },
                {
                    model: Store,
                    as: 'store', // Relasi ke Store
                },
                {
                    model: User,
                    as: 'driver', // Relasi ke Driver
                },
            ],
        });

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order',
            data: orders,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data order',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan order berdasarkan store yang dimiliki oleh owner yang sedang login
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getOrdersByStore = async (req, res) => {
    try {
        const { id: ownerId } = req.user; // Ambil ID owner yang sedang login

        // Cari store yang dimiliki oleh owner
        const store = await Store.findOne({ where: { ownerId } });
        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Toko tidak ditemukan',
            });
        }

        const orders = await Order.findAll({
            where: { storeId: store.id }, // Filter berdasarkan storeId
            include: [
                {
                    model: OrderItem,
                    as: 'items', // Relasi ke OrderItem
                },
                {
                    model: User,
                    as: 'customer', // Relasi ke Customer
                },
                {
                    model: User,
                    as: 'driver', // Relasi ke Driver
                },
            ],
        });

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order',
            data: orders,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data order',
            errors: error.message,
        });
    }
};

/**
 * Membuat order baru
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const placeOrder = async (req, res) => {
    try {
        const { deliveryAddress, subtotal, serviceCharge, total, orderDate, notes, storeId, items } = req.body;
        const { id: customerId } = req.user; // Ambil ID user yang sedang login

        // Ambil data toko
        const store = await Store.findByPk(storeId);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan' });
        }

        // Cari driver terdekat
        const nearestDriver = await findNearestDriver(store.latitude, store.longitude);
        if (!nearestDriver) {
            return response(res, { statusCode: 404, message: 'Driver tidak ditemukan' });
        }

        // Buat order baru dengan status pending
        const order = await Order.create({
            id: `ORD-${Date.now()}`, // Generate ID unik untuk order
            deliveryAddress,
            subtotal,
            serviceCharge,
            total,
            status: 'pending', // Status awal
            orderDate,
            notes,
            customerId,
            driverId: nearestDriver.id, // Assign driver terdekat
            storeId,
        });

        // Tambahkan items ke order
        if (items && items.length > 0) {
            const orderItems = items.map((item) => ({
                ...item,
                orderId: order.id, // Hubungkan item dengan order yang baru dibuat
            }));
            await OrderItem.bulkCreate(orderItems);
        }

        return response(res, {
            statusCode: 201,
            message: 'Order berhasil dibuat. Menunggu persetujuan toko.',
            data: order,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat membuat order',
            errors: error.message,
        });
    }
};

/**
 * Approve order oleh toko
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const approveOrder = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil data order
        const order = await Order.findByPk(id, {
            include: [
                { model: Store, as: 'store' }, // Ambil data toko
                { model: User, as: 'customer' }, // Ambil data customer
            ],
        });
        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }
        const destinationLatitude = 2.38349390603264; // Koordinat IT Del
        const destinationLongitude = 99.14866498216043;
        // Hitung estimasi waktu pengiriman
        const estimatedDeliveryTime = calculateEstimatedDeliveryTime(
            order.store.latitude,
            order.store.longitude,
            destinationLatitude,
            destinationLongitude
        );

        // Update status order dan tambahkan estimasi waktu pengiriman
        await order.update({
            status: 'approved',
            estimatedDeliveryTime,
        });

        return response(res, {
            statusCode: 200,
            message: 'Order berhasil di-approve. Driver sedang menuju ke toko.',
            data: order,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat meng-approve order',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan detail order berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getOrderDetail = async (req, res) => {
    try {
        const { id: orderId } = req.params;

        // Ambil detail order beserta relasinya
        const order = await Order.findOne({
            where: { id: orderId },
            include: [
                {
                    model: OrderItem,
                    as: 'items', // Relasi ke OrderItem
                },
                {
                    model: Store,
                    as: 'store', // Relasi ke Store
                },
                {
                    model: User,
                    as: 'customer', // Relasi ke Customer
                },
                {
                    model: User,
                    as: 'driver', // Relasi ke Driver
                },
                {
                    model: OrderReview,
                    as: 'orderReviews', // Relasi ke OrderReviews
                },
                {
                    model: DriverReview,
                    as: 'driverReviews', // Relasi ke DriverReviews
                },
            ],
        });

        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan detail order',
            data: order,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil detail order',
            errors: error.message,
        });
    }
};

/**
 * Membuat review untuk store atau driver
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createReview = async (req, res) => {
    try {
        const { id: userId } = req.user; // ID customer yang memberikan review
        const { orderId, store, driver } = req.body;

        // Cek apakah order sudah selesai
        const order = await Order.findOne({
            where: { id: orderId, status: 'delivered' }, // Hanya order yang sudah selesai bisa direview
        });
        if (!order) {
            return response(res, { statusCode: 400, message: 'Order belum selesai atau tidak ditemukan' });
        }

        // Cek apakah review sudah ada untuk order ini
        const existingOrderReview = await OrderReview.findOne({
            where: { orderId, userId },
        });
        if (existingOrderReview) {
            return response(res, { statusCode: 400, message: 'Anda sudah memberikan review untuk order ini' });
        }

        // Buat review untuk store (jika ada)
        if (store?.rating && order.storeId) {
            // Simpan review ke tabel OrderReviews
            await OrderReview.create({
                orderId,
                userId,
                rating: store.rating,
                comment: store.comment || null,
            });

            // Akumulasikan review ke Store
            const storeData = await Store.findByPk(order.storeId);
            if (storeData) {
                const totalRating = storeData.rating * storeData.reviewsCount + store.rating;
                const newReviewsCount = storeData.reviewsCount + 1;
                const newRating = totalRating / newReviewsCount;

                await storeData.update({
                    rating: newRating,
                    reviewsCount: newReviewsCount,
                });
            }
        }

        // Buat review untuk driver (jika ada)
        if (driver?.rating && order.driverId) {
            // Simpan review ke tabel DriverReviews
            await DriverReview.create({
                driverId: order.driverId,
                userId,
                rating: driver.rating,
                comment: driver.comment || null,
            });

            // Akumulasikan review ke Driver
            const driverData = await Driver.findByPk(order.driverId);
            if (driverData) {
                const totalRating = driverData.rating * driverData.reviewsCount + driver.rating;
                const newReviewsCount = driverData.reviewsCount + 1;
                const newRating = totalRating / newReviewsCount;

                await driverData.update({
                    rating: newRating,
                    reviewsCount: newReviewsCount,
                });
            }
        }

        return response(res, {
            statusCode: 201,
            message: 'Review berhasil dibuat',
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat membuat review',
            errors: error.message,
        });
    }
};

module.exports = {
    getOrdersByUser,
    getOrdersByStore,
    placeOrder,
    approveOrder,
    getOrderDetail,
    createReview
};