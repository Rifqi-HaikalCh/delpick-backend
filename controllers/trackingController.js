const { Driver, DriverRequest, Order, User, Store, DriverReview } = require('../models');
const response = require('../utils/response');
const { logger } = require('../utils/logger');
const { calculateEstimatedTimes } = require('./orderController');
const { euclideanDistance } = require('../utils/euclideanDistance');
const { sendNotification } = require('../utils/notifications');

/**
 * Mendapatkan data tracking (untuk dipanggil secara periodik oleh client)
 */
const getTrackingData = async (req, res) => {
    try {
        logger.info('Get tracking data request:', { order_id: req.params.id, user_id: req.user.id });
        const { id } = req.params;
        const user_id = req.user.id;

        // Cek apakah customer memiliki akses ke order ini
        const order = await Order.findOne({
            where: { id: id, customer_id: user_id },
            include: [
                {
                    model: Driver,
                    as: 'driver',
                    attributes: ['id', 'name', 'phone', 'latitude', 'longitude']
                },
                {
                    model: DriverRequest,
                    as: 'driverRequests',
                    where: { status: 'accepted' },
                    required: false
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['name', 'latitude', 'longitude']
                }
            ],
        });

        if (!order) {
            logger.warn('Order not found for tracking:', { order_id: id, user_id });
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }

        // Jika order memiliki driver
        if (order.driver) {
            logger.info('Tracking data retrieved successfully:', { order_id: order.id, has_driver: true });
            return response(res, {
                statusCode: 200,
                message: 'Data tracking berhasil diambil',
                data: {
                    order_id: order.id,
                    order_status: order.order_status,
                    delivery_status: order.delivery_status,
                    store_location: {
                        latitude: order.store.latitude,
                        longitude: order.store.longitude
                    },
                    driver_location: {
                        latitude: order.driver.latitude,
                        longitude: order.driver.longitude
                    },
                    estimated_pickup_time: order.estimated_pickup_time,
                    actual_pickup_time: order.actual_pickup_time,
                    estimated_delivery_time: order.estimated_delivery_time,
                    actual_delivery_time: order.actual_delivery_time,
                    tracking_updates: order.tracking_updates,
                    driver: {
                        id: order.driver.id,
                        name: order.driver.name,
                        phone: order.driver.phone,
                    }
                },
            });
        }

        // Jika order belum memiliki driver, cek status pencarian
        logger.info('Order has no driver yet:', { order_id: order.id });
        return response(res, {
            statusCode: 200,
            message: 'Sedang mencari driver',
            data: {
                order_id: order.id,
                order_status: order.order_status,
                delivery_status: order.delivery_status,
                message: 'Sedang dalam proses pencarian driver',
                estimated_pickup_time: order.estimated_pickup_time,
                estimated_delivery_time: order.estimated_delivery_time,
                tracking_updates: order.tracking_updates
            }
        });
    } catch (error) {
        logger.error('Error getting tracking data:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data tracking',
            errors: error.message,
        });
    }
};

/**
 * Memulai pengantaran oleh driver
 */
const startDelivery = async (req, res) => {
    try {
        logger.info('Start delivery request:', { order_id: req.params.id, user_id: req.user.id });
        const { id } = req.params;
        const user_id = req.user.id;

        // Cek apakah driver memiliki akses
        const driver = await Driver.findOne({ where: { user_id } });
        const driver_id = driver.id;

        // Cek apakah order ada dan driver memiliki akses
        const order = await Order.findOne({
            where: { id, driver_id },
            include: [
                {
                    model: DriverRequest,
                    as: 'driverRequests',
                    where: { status: 'accepted', driver_id },
                    required: true
                },
                {
                    model: Store,
                    as: 'store'
                }
            ]
        });

        if (!order) {
            logger.warn('Order not found or unrestrictTod:', { order_id: id, driver_id });
            return response(res, {
                statusCode: 404,
                message: 'Order tidak ditemukan atau Anda tidak memiliki akses'
            });
        }

        // Cek apakah order dalam status yang sesuai untuk memulai pengantaran
        if (order.order_status !== 'ready_for_pickup') {
            logger.warn('Invalid order status for delivery start:', { order_id: id, status: order.order_status });
            return response(res, {
                statusCode: 400,
                message: 'Order tidak dalam status yang dapat dimulai'
            });
        }

        // Hitung estimasi waktu
        const estimated_times = await calculateEstimatedTimes(driver_id, order.store_id);
        const now = new Date();

        const tracking_update = {
            timestamp: now,
            status: 'on_delivery',
            message: 'Driver mulai mengantar pesanan',
            location: {
                latitude: driver.latitude,
                longitude: driver.longitude
            },
            estimated_times: {
                pickup: estimated_times.estimated_pickup_time,
                delivery: estimated_times.estimated_delivery_time
            }
        };

        // Update status order dan tracking
        await Order.update(
            {
                order_status: 'on_delivery',
                delivery_status: 'on_way',
                actual_pickup_time: now,
                estimated_pickup_time: estimated_times.estimated_pickup_time,
                estimated_delivery_time: estimated_times.estimated_delivery_time,
                tracking_updates: [
                    ...order.tracking_updates,
                    tracking_update
                ]
            },
            { where: { id } }
        );

        // Ambil data order yang telah diperbarui
        const updated_order = await Order.findByPk(id, {
            include: [
                { model: User, as: 'customer', attributes: ['name'] },
                {
                    model: Driver,
                    as: 'driver',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['name']
                    }]
                }
            ]
        });

        logger.info('Delivery started successfully:', {
            order_id: id,
            driver_id,
            estimated_pickup_time: estimated_times.estimated_pickup_time,
            estimated_delivery_time: estimated_times.estimated_delivery_time
        });

        return response(res, {
            statusCode: 200,
            message: 'Pengantaran dimulai',
            data: {
                order_id: updated_order.id,
                order_status: updated_order.order_status,
                delivery_status: updated_order.delivery_status,
                actual_pickup_time: updated_order.actual_pickup_time,
                estimated_pickup_time: updated_order.estimated_pickup_time,
                estimated_delivery_time: updated_order.estimated_delivery_time,
                tracking_updates: updated_order.tracking_updates
            }
        });
    } catch (error) {
        logger.error('Error starting delivery:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memulai pengantaran',
            errors: error.message
        });
    }
};

/**
 * Hitung rating driver berdasarkan akurasi estimasi waktu
 */
const calculateDriverRating = async (driver_id, estimated_time, actual_time) => {
    try {
        const time_diff = Math.abs(actual_time - estimated_time) / 60000; // dalam menit
        let rating = 5; // default rating

        // Kurangi rating berdasarkan selisih waktu
        if (time_diff > 30) { // lebih dari 30 menit
            rating = 1;
        } else if (time_diff > 20) { // 20-30 menit
            rating = 2;
        } else if (time_diff > 10) { // 10-20 menit
            rating = 3;
        } else if (time_diff > 5) { // 5-10 menit
            rating = 4;
        }

        // Update rating driver
        const driver = await Driver.findByPk(driver_id);
        if (driver) {
            const new_review_count = driver.reviews_count + 1;
            const new_rating = ((driver.rating * driver.reviews_count) + rating) / new_review_count;

            await driver.update({
                rating: new_rating,
                reviews_count: new_review_count
            });

            logger.info('Driver rating updated:', {
                driver_id,
                old_rating: driver.rating,
                new_rating,
                time_diff,
                estimated_time,
                actual_time
            });
        }

        return rating;
    } catch (error) {
        logger.error('Error calculating driver rating:', error);
        throw error;
    }
};

/**
 * Menyelesaikan pengantaran oleh driver
 */
const completeDelivery = async (req, res) => {
    try {
        logger.info('Complete delivery request:', { order_id: req.params.id, user_id: req.user.id });
        const { id } = req.params;
        const user_id = req.user.id;

        // Cek apakah driver memiliki akses ke order ini
        const driver = await Driver.findOne({ where: { user_id } });
        const driver_id = driver.id;

        // Cek apakah order ada dan driver memiliki akses
        const order = await Order.findOne({
            where: { id, driver_id },
            include: [
                {
                    model: DriverRequest,
                    as: 'driverRequests',
                    where: { status: 'accepted', driver_id },
                    required: true
                }
            ]
        });

        if (!order) {
            logger.warn('Order not found or unrestrictTod:', { order_id: id, driver_id });
            return response(res, {
                statusCode: 404,
                message: 'Order tidak ditemukan atau Anda tidak memiliki akses'
            });
        }

        // Cek apakah order dalam status on_delivery
        if (order.order_status !== 'on_delivery') {
            logger.warn('Invalid order status for delivery completion:', { order_id: id, status: order.order_status });
            return response(res, {
                statusCode: 400,
                message: 'Order tidak dalam status pengantaran'
            });
        }

        const now = new Date();
        const tracking_update = {
            timestamp: now,
            status: 'delivered',
            message: 'Pesanan telah sampai di tujuan',
            location: {
                latitude: driver.latitude,
                longitude: driver.longitude
            }
        };

        // Hitung rating berdasarkan akurasi estimasi waktu
        const delivery_rating = await calculateDriverRating(
            driver_id,
            order.estimated_delivery_time,
            now
        );

        // Update status order dan tracking
        await Order.update(
            {
                order_status: 'delivered',
                delivery_status: 'delivered',
                actual_delivery_time: now,
                tracking_updates: [
                    ...order.tracking_updates,
                    tracking_update
                ]
            },
            { where: { id } }
        );

        await DriverRequest.update(
            { status: 'completed' },
            { where: { order_id: id, driver_id, status: 'accepted' } }
        );

        // Set driver status back to active
        await driver.update({ status: 'active' });

        // Buat review otomatis berdasarkan akurasi waktu
        await DriverReview.create({
            order_id: order.id,
            driver_id: driver.id,
            customer_id: order.customer_id,
            rating: delivery_rating,
            comment: `Pengiriman ${delivery_rating >= 4 ? 'tepat waktu' : 'terlambat'}. Estimasi: ${order.estimated_delivery_time}, Aktual: ${now}`,
            is_auto_generated: true
        });

        // Ambil customer dan kirim notifikasi jika ada fcm_token
        const customer = await User.findByPk(order.customer_id);
        if (customer && customer.fcm_token) {
            await sendNotification(
                customer.fcm_token,
                'Pesanan Anda telah sampai di tujuan',
                `Pesanan Anda telah diantar oleh ${driver.name}.`,
                {
                    actual_delivery_time: now,
                    driver_name: driver.name,
                    rating: delivery_rating,
                    order_id: order.id
                }
            );
        }

        // Ambil data order yang telah diperbarui
        const updated_order = await Order.findByPk(id, {
            include: [
                { model: User, as: 'customer', attributes: ['name'] },
                {
                    model: Driver,
                    as: 'driver',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['name']
                    }]
                }
            ]
        });

        logger.info('Delivery completed successfully:', {
            order_id: id,
            driver_id,
            delivery_rating
        });

        return response(res, {
            statusCode: 200,
            message: 'Pengantaran berhasil diselesaikan',
            data: {
                order_id: updated_order.id,
                order_status: updated_order.order_status,
                delivery_status: updated_order.delivery_status,
                actual_delivery_time: updated_order.actual_delivery_time,
                tracking_updates: updated_order.tracking_updates,
                delivery_rating
            }
        });
    } catch (error) {
        logger.error('Error completing delivery:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menyelesaikan pengantaran',
            errors: error.message
        });
    }
};

/**
 * Update lokasi driver secara real-time
 */
const updateDriverLocation = async (req, res) => {
    try {
        logger.info('Update driver location request:', { user_id: req.user.id });
        const user_id = req.user.id;
        const { latitude, longitude } = req.body;

        // Validasi koordinat
        if (!latitude || !longitude ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180) {
            logger.warn('Invalid coordinates:', { latitude, longitude });
            return response(res, {
                statusCode: 400,
                message: 'Koordinat tidak valid. Latitude harus antara -90 dan 90, longitude harus antara -180 dan 180'
            });
        }

        // Update lokasi driver
        const driver = await Driver.findOne({
            where: { user_id }
        });

        if (!driver) {
            logger.warn('Driver not found for location update:', { user_id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        // Update lokasi di tabel Driver
        await driver.update({
            latitude,
            longitude
        });

        // Cari order aktif yang sedang diantar oleh driver ini
        const active_order = await Order.findOne({
            where: {
                driver_id: driver.id,
                order_status: 'on_delivery',
                delivery_status: 'on_delivery'
            },
            include: [
                { model: Store, as: 'store' },
                { model: User, as: 'customer' }
            ]
        });

        if (active_order) {
            // Hitung jarak ke toko
            const distance_to_store = euclideanDistance(
                latitude,
                longitude,
                active_order.store.latitude,
                active_order.store.longitude
            );

            // Update tracking dengan lokasi baru
            const tracking_update = {
                timestamp: new Date(),
                status: 'on_delivery',
                message: 'Update lokasi driver',
                location: {
                    latitude,
                    longitude
                },
                distances: {
                    to_store: distance_to_store,
                }
            };

            await Order.update(
                {
                    tracking_updates: [
                        ...active_order.tracking_updates,
                        tracking_update
                    ]
                },
                { where: { id: active_order.id } }
            );

            logger.info('Driver location updated with active order:', {
                driver_id: driver.id,
                order_id: active_order.id,
                distance_to_store
            });
        }

        return response(res, {
            statusCode: 200,
            message: 'Lokasi driver berhasil diupdate',
            data: {
                driver_id: driver.id,
                location: { latitude, longitude },
                has_active_order: !!active_order,
                active_order_id: active_order?.id
            }
        });
    } catch (error) {
        logger.error('Error updating driver location:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate lokasi driver',
            errors: error.message
        });
    }
};

/**
 * Mendapatkan riwayat tracking order
 */
const getTrackingHistory = async (req, res) => {
    try {
        logger.info('Get tracking history request:', { order_id: req.params.id, user_id: req.user.id });
        const { id } = req.params;
        const user_id = req.user.id;

        // Cek apakah user memiliki akses ke order ini
        const order = await Order.findOne({
            where: { id },
            include: [
                {
                    model: User,
                    as: 'customer',
                    where: { id: user_id },
                    required: false
                },
                {
                    model: Driver,
                    as: 'driver',
                    include: [{
                        model: User,
                        as: 'user'
                    }],
                    required: false
                }
            ]
        });

        if (!order) {
            logger.warn('Order not found for tracking history:', { order_id: id, user_id });
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }

        // Cek apakah user adalah customer atau driver dari order ini
        const is_customer = order.customer && order.customer.id === user_id;
        const is_driver = order.driver && order.driver.user.id === user_id;

        if (!is_customer && !is_driver) {
            logger.warn('UnrestrictTod access to tracking history:', { order_id: id, user_id });
            return response(res, { statusCode: 403, message: 'Anda tidak memiliki akses ke riwayat tracking ini' });
        }

        // Format tracking history
        const tracking_history = order.tracking_updates.map(update => ({
            timestamp: update.timestamp,
            status: update.status,
            message: update.message,
            location: update.location,
            estimated_times: update.estimated_times,
            distances: update.distances
        }));

        logger.info('Tracking history retrieved successfully:', { order_id: order.id });
        return response(res, {
            statusCode: 200,
            message: 'Riwayat tracking berhasil diambil',
            data: {
                order_id: order.id,
                order_status: order.order_status,
                delivery_status: order.delivery_status,
                estimated_pickup_time: order.estimated_pickup_time,
                actual_pickup_time: order.actual_pickup_time,
                estimated_delivery_time: order.estimated_delivery_time,
                actual_delivery_time: order.actual_delivery_time,
                tracking_history
            }
        });
    } catch (error) {
        logger.error('Error getting tracking history:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil riwayat tracking',
            errors: error.message
        });
    }
};

module.exports = {
    getTrackingData,
    startDelivery,
    completeDelivery,
    updateDriverLocation,
    getTrackingHistory
};