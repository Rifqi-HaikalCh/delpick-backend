const { Order, OrderItem, Store, User, Driver, DriverRequest, DriverReview, OrderReview, MenuItem, sequelize } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const euclideanDistance = require('../utils/euclideanDistance');
const { logger } = require('../utils/logger');
const { sendNotification } = require('../utils/notifications');
// Queue functionality moved to worker.js
const { Op } = require('sequelize');

// Fungsi untuk membatalkan order
async function cancelOrder(id) {
    let transaction;
    try {
        transaction = await sequelize.transaction();

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items'
                }
            ],
            transaction
        });

        if (order && order.order_status === 'pending') {
            // Kembalikan stok jika order dibatalkan
            if (order.items && order.items.length > 0) {
                for (const orderItem of order.items) {
                    const menuItem = await MenuItem.findOne({
                        where: {
                            store_id: order.store_id,
                            name: orderItem.name
                        },
                        transaction
                    });

                    if (menuItem) {
                        await menuItem.update({
                            quantity: menuItem.quantity + orderItem.quantity
                        }, { transaction });
                    }
                }
            }

            await order.update({
                order_status: 'cancelled',
                cancellation_reason: 'Order dibatalkan'
            }, { transaction });

            await transaction.commit();
            logger.info(`Order ${id} dibatalkan dan stok dikembalikan`);
        }
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        logger.error('Gagal membatalkan order:', error);
    }
}

// cleanupQueue function removed - handled by worker.js now

// Fungsi pencarian driver di background
async function findDriverInBackground(store_id, order_id) {
    let timeout;
    let searchInterval;
    let jobCompleted = false;
    let lastSearchTime = 0;
    const SEARCH_COOLDOWN = 30000; // 30 detik cooldown antara pencarian
    const MAX_RETRIES = 30; // Maksimal 30 kali pencarian (15 menit)
    let retryCount = 0;

    try {
        const store = await Store.findByPk(store_id);
        if (!store) {
            console.error(`Store ${store_id} not found`);
            await cancelOrder(order_id);
            return;
        }

        // Set timeout 15 menit untuk pembatalan otomatis
        timeout = setTimeout(async () => {
            if (!jobCompleted) {
                jobCompleted = true;
                clearInterval(searchInterval);
                await cancelOrder(order_id);
                logger.info(`Order ${order_id} dibatalkan karena timeout 15 menit`);
            }
        }, 15 * 60 * 1000);

        const maxDistance = 5;
        const BATCH_SIZE = 10; // Jumlah driver yang diproses per batch

        // Fungsi untuk mencari driver dengan optimisasi
        const searchForDriver = async () => {
            if (jobCompleted) return;

            const now = Date.now();
            if (now - lastSearchTime < SEARCH_COOLDOWN) return;
            lastSearchTime = now;

            if (retryCount >= MAX_RETRIES) {
                jobCompleted = true;
                clearTimeout(timeout);
                clearInterval(searchInterval);
                await cancelOrder(order_id);
                logger.info(`Order ${order_id} dibatalkan karena mencapai batas maksimal pencarian`);
                return;
            }

            retryCount++;

            try {
                // Cek apakah sudah ada driver yang menerima order ini
                const existingAcceptedRequest = await DriverRequest.findOne({
                    where: {
                        order_id: order_id,
                        status: 'accepted'
                    }
                });

                if (existingAcceptedRequest) {
                    jobCompleted = true;
                    clearTimeout(timeout);
                    clearInterval(searchInterval);
                    logger.info(`Order ${order_id} sudah memiliki driver (${existingAcceptedRequest.driver_id}) yang menerima`);
                    return;
                }

                // Optimisasi query dengan batasan dan indeks
                const drivers = await Driver.findAll({
                    where: {
                        latitude: { [Op.not]: null },
                        longitude: { [Op.not]: null },
                        status: 'active',
                        [Op.and]: [
                            sequelize.literal(`ST_Distance_Sphere(
                                point(longitude, latitude),
                                point(${store.longitude}, ${store.latitude})
                            ) <= ${maxDistance * 1000}`)
                        ]
                    },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id'],
                            required: true
                        },
                        {
                            model: DriverRequest,
                            as: 'driverRequests',
                            where: {
                                order_id: order_id,
                                status: { [Op.ne]: 'rejected' }
                            },
                            required: false
                        }
                    ],
                    limit: BATCH_SIZE,
                    order: [
                        sequelize.literal(`ST_Distance_Sphere(
                            point(longitude, latitude),
                            point(${store.longitude}, ${store.latitude})
                        ) ASC`)
                    ]
                });

                if (drivers.length > 0) {
                    // Proses driver dalam batch
                    for (const driver of drivers) {
                        // Skip driver yang sudah menolak order ini
                        if (driver.driverRequests &&
                            driver.driverRequests.some(req => req.status === 'rejected' && req.order_id === order_id)) {
                            continue;
                        }

                        // Cek apakah sudah ada request pending untuk driver ini
                        const existingRequest = await DriverRequest.findOne({
                            where: {
                                order_id: order_id,
                                driver_id: driver.id,
                                status: 'pending'
                            }
                        });

                        if (!existingRequest) {
                            // Buat driver request baru
                            const driverRequest = await DriverRequest.create({
                                order_id: order_id,
                                driver_id: driver.id,
                                status: 'pending'
                            });

                            // Kirim notifikasi ke driver jika ada fcm_token
                            if (driver.user && driver.user.fcm_token) {
                                await sendNotification(
                                    driver.user.fcm_token,
                                    'Pesanan Baru Menunggu',
                                    'Ada pesanan baru yang menunggu konfirmasi Anda.',
                                    { order_id: order_id }
                                );
                            }

                            // Schedule timeout untuk driver request
                            try {
                                const { workerManager } = require('../worker');
                                await workerManager.scheduleDriverRequestTimeout(driverRequest.id, 15);
                                logger.info(`Timeout scheduled for driver request ${driverRequest.id}`);
                            } catch (workerError) {
                                logger.error('Error scheduling driver request timeout:', {
                                    request_id: driverRequest.id,
                                    error: workerError.message
                                });
                            }

                            logger.info(`Driver request created for order ${order_id} with driver ${driver.id}`);
                            break; // Keluar dari loop setelah menemukan driver pertama
                        }
                    }
                } else {
                    logger.info(`Tidak menemukan driver yang tersedia dalam radius ${maxDistance} km untuk order ${order_id}`);
                }
            } catch (error) {
                logger.error(`Error dalam pencarian driver untuk order ${order_id}:`, error);
            }
        };

        // Jalankan pencarian segera
        await searchForDriver();

        // Set interval pencarian dengan cooldown
        searchInterval = setInterval(searchForDriver, SEARCH_COOLDOWN);

    } catch (error) {
        logger.error('Error in findDriverInBackground:', error);
        if (!jobCompleted) {
            jobCompleted = true;
            clearTimeout(timeout);
            clearInterval(searchInterval);
            await cancelOrder(order_id);
        }
    }
}

const getStoreByUserId = async (user_id) => {
    return await Store.findOne({ where: { user_id } });
};

/**
 * Menghitung estimasi waktu pengambilan dan pengiriman berdasarkan lokasi driver dan toko
 */
const calculateEstimatedTimes = async (driver_id, store_id) => {
    try {
        // Ambil data driver dan toko
        const driver = await Driver.findOne({
            where: { id: driver_id },
            include: [{ model: User, as: 'user' }]
        });

        const store = await Store.findByPk(store_id);

        if (!driver || !store) {
            throw new Error('Driver atau toko tidak ditemukan');
        }

        // Hitung jarak dari driver ke toko (dalam km)
        const distanceToStore = euclideanDistance(
            driver.latitude,
            driver.longitude,
            store.latitude,
            store.longitude
        );

        // Estimasi waktu berdasarkan jarak dan kecepatan rata-rata (30 km/jam)
        const averageSpeed = 30; // km/h
        const timeToStore = (distanceToStore / averageSpeed) * 60; // dalam menit

        // Tambahkan waktu buffer untuk persiapan
        const preparationTime = 10; // menit
        const totalPickupTime = Math.ceil(timeToStore + preparationTime);

        // Estimasi waktu pengiriman (asumsi jarak dari toko ke customer 5km)
        const deliveryDistance = 5; // km
        const deliveryTime = Math.ceil((deliveryDistance / averageSpeed) * 60); // dalam menit

        const now = new Date();
        const estimatedPickupTime = new Date(now.getTime() + totalPickupTime * 60000);
        const estimatedDeliveryTime = new Date(estimatedPickupTime.getTime() + deliveryTime * 60000);

        return {
            estimated_pickup_time: estimatedPickupTime,
            estimated_delivery_time: estimatedDeliveryTime,
            distance_to_store: distanceToStore,
            delivery_distance: deliveryDistance
        };
    } catch (error) {
        logger.error('Error calculating estimated times:', error);
        throw error;
    }
};

/**
 * Mendapatkan order berdasarkan user yang sedang login (customer).
 */
const getOrdersByUser = async (req, res) => {
    try {
        const queryOptions = getQueryOptions(req.query);
        const customer_id = req.user.id;

        if (!customer_id) {
            return response(res, {
                statusCode: 400,
                message: 'User ID tidak ditemukan',
            });
        }

        queryOptions.where = { customer_id };

        const { count, rows: orders } = await Order.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                orders
            },
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
 * Mendapatkan order berdasarkan store yang dimiliki oleh owner yang sedang login.
 */
const getOrdersByStore = async (req, res) => {
    try {
        const queryOptions = getQueryOptions(req.query);
        const store = await getStoreByUserId(req.user.id);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan untuk user ini' });
        }

        queryOptions.where = { store_id: store.id };

        const { count, rows: orders } = await Order.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                orders
            }
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
 * Membuat order baru dengan request body sederhana (hanya items id)
 */
const placeOrder = async (req, res) => {
    try {
        logger.info('Place order request:', { customer_id: req.user.id });
        const { store_id, items } = req.body;

        const transaction = await sequelize.transaction();

        try {
            // Calculate total amount
            let total_amount = 0;
            const orderItems = [];

            for (const item of items) {
                const menuItem = await MenuItem.findOne({
                    where: {
                        id: item.menu_item_id,
                        store_id: store_id,
                        is_available: true
                    },
                    transaction
                });

                if (!menuItem) {
                    throw new Error(`Menu item ${item.menu_item_id} tidak ditemukan atau tidak tersedia`);
                }

                const itemTotal = menuItem.price * item.quantity;
                total_amount += itemTotal;

                orderItems.push({
                    menu_item_id: menuItem.id,
                    name: menuItem.name,
                    description: menuItem.description,
                    image_url: menuItem.image_url,
                    category: menuItem.category,
                    quantity: item.quantity,
                    price: menuItem.price,
                    notes: item.notes
                });
            }

            // Calculate estimated times
            const now = new Date();
            const estimated_pickup_time = new Date(now.getTime() + 15 * 60000); // 15 minutes from now
            // Titik pengantaran statis
            const destination_latitude = 2.3834831864787818;
            const destination_longitude = 99.14857915147614;
            // Ambil lokasi store
            const store = await Store.findByPk(store_id);
            if (!store) {
                throw new Error('Store tidak ditemukan');
            }
            // Hitung jarak (dalam km) dari store ke tujuan
            const distance_km = euclideanDistance(
                Number(store.latitude),
                Number(store.longitude),
                destination_latitude,
                destination_longitude
            ) * 111; // 1 derajat ~ 111 km
            // Hitung delivery_fee (dibulatkan ke atas)
            const delivery_fee = Math.ceil(distance_km * 2000);
            // Estimasi waktu pengantaran: 1.5 menit/km, minimal 5 menit
            const delivery_minutes = Math.max(5, Math.ceil(distance_km * 1.5));
            const estimated_delivery_time = new Date(estimated_pickup_time.getTime() + delivery_minutes * 60000);

            // Create order
            const order = await Order.create({
                customer_id: req.user.id,
                store_id: store_id,
                order_status: 'pending',
                delivery_status: 'pending',
                total_amount,
                delivery_fee,
                destination_latitude,
                destination_longitude,
                estimated_pickup_time: estimated_pickup_time,
                estimated_delivery_time: estimated_delivery_time,
                tracking_updates: [{
                    timestamp: now,
                    status: 'pending',
                    message: 'Order telah dibuat'
                }]
            }, { transaction });

            // Create order items
            for (const item of orderItems) {
                await OrderItem.create({
                    order_id: order.id,
                    ...item
                }, { transaction });
            }

            await transaction.commit();

            // Start driver search in background
            findDriverInBackground(store_id, order.id);

            // Kirim notifikasi ke customer jika ada fcm_token
            const customer = await User.findByPk(req.user.id);
            if (customer && customer.fcm_token) {
                await sendNotification(
                    customer.fcm_token,
                    'Order Berhasil Dibuat',
                    'Pesanan Anda telah berhasil dibuat dan sedang diproses.',
                    { order_id: order.id }
                );
            }

            logger.info('Order placed successfully:', { order_id: order.id });
            return response(res, {
                statusCode: 201,
                message: 'Order berhasil dibuat',
                data: order
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        logger.error('Error placing order:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat membuat order',
            errors: error.message
        });
    }
};

/**
 * Memproses order oleh toko
 */
const processOrderByStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        let transaction;

        try {
            transaction = await sequelize.transaction();

            const order = await Order.findOne({
                where: { id },
                include: [
                    {
                        model: OrderItem,
                        as: 'items'
                    },
                    {
                        model: Store,
                        as: 'store',
                        include: [{ model: User, as: 'user' }]
                    }
                ],
                transaction
            });

            if (!order) {
                await transaction.rollback();
                return response(res, {
                    statusCode: 404,
                    message: 'Order tidak ditemukan'
                });
            }

            if (action === 'approve') {
                // Cek dan kurangi stok menu saat order akan diproses
                for (const orderItem of order.items) {
                    const menuItem = await MenuItem.findOne({
                        where: {
                            store_id: order.store_id,
                            name: orderItem.name
                        },
                        transaction
                    });

                    if (!menuItem) {
                        await transaction.rollback();
                        return response(res, {
                            statusCode: 400,
                            message: `Menu ${orderItem.name} tidak ditemukan`
                        });
                    }

                    if (menuItem.quantity < orderItem.quantity) {
                        await transaction.rollback();
                        return response(res, {
                            statusCode: 400,
                            message: `Stok tidak mencukupi untuk menu ${menuItem.name}. Tersedia: ${menuItem.quantity}, Diminta: ${orderItem.quantity}`
                        });
                    }

                    // Kurangi stok
                    await menuItem.update({
                        quantity: menuItem.quantity - orderItem.quantity
                    }, { transaction });
                }

                // Update status order
                await order.update({
                    order_status: 'preparing'
                }, { transaction });

                await transaction.commit();

                // Kirim notifikasi ke store jika ada fcm_token
                if (order.store && order.store.user && order.store.user.fcm_token) {
                    await sendNotification(
                        order.store.user.fcm_token,
                        'Order Baru Masuk',
                        'Ada pesanan baru yang perlu diproses.',
                        { order_id: order.id }
                    );
                }

                return response(res, {
                    statusCode: 200,
                    message: 'Order berhasil disetujui. Status order sekarang: preparing.',
                    data: order,
                });
            } else { // action === 'reject'
                await order.update({
                    order_status: 'cancelled',
                    cancellation_reason: 'Ditolak oleh toko'
                }, { transaction });

                await transaction.commit();

                // Kirim notifikasi ke customer jika order ditolak
                const customer = await User.findByPk(order.customer_id);
                if (customer && customer.fcm_token) {
                    await sendNotification(
                        customer.fcm_token,
                        'Order Ditolak',
                        'Pesanan Anda ditolak oleh toko.',
                        { order_id: order.id }
                    );
                }

                return response(res, {
                    statusCode: 200,
                    message: 'Order berhasil ditolak',
                    data: order,
                });
            }
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    } catch (error) {
        logger.error('Error processing order:', error);
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memproses order',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate status order berdasarkan ID.
 */
const updateOrderStatus = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Update order status request:', { order_id: req.params.id });

        const { order_status, delivery_status, estimated_pickup_time, estimated_delivery_time } = req.body;
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: Store, as: 'store' },
                { model: User, as: 'customer' }
            ],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            logger.warn('Order not found:', { order_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Order tidak ditemukan'
            });
        }

        const updateData = {
            order_status,
            delivery_status
        };

        if (estimated_pickup_time) {
            updateData.estimated_pickup_time = estimated_pickup_time;
        }

        if (estimated_delivery_time) {
            updateData.estimated_delivery_time = estimated_delivery_time;
        }

        // Update actual times based on status
        if (order_status === 'ready_for_pickup') {
            updateData.actual_pickup_time = new Date();
        } else if (order_status === 'delivered') {
            updateData.actual_delivery_time = new Date();
        }

        // If order is cancelled, return items to inventory
        if (order_status === 'cancelled' && order.order_status !== 'cancelled') {
            for (const orderItem of order.items) {
                const menuItem = await MenuItem.findOne({
                    where: {
                        store_id: order.store_id,
                        name: orderItem.name
                    },
                    transaction
                });

                if (menuItem) {
                    await menuItem.update({
                        quantity: menuItem.quantity + orderItem.quantity
                    }, { transaction });
                }
            }
        }

        await order.update(updateData, { transaction });

        // Send notifications based on status changes
        if (order.customer && order.customer.fcm_token) {
            let notificationTitle = '';
            let notificationBody = '';

            switch (order_status) {
                case 'confirmed':
                    notificationTitle = 'Pesanan Dikonfirmasi';
                    notificationBody = 'Pesanan Anda telah dikonfirmasi oleh toko.';
                    break;
                case 'preparing':
                    notificationTitle = 'Pesanan Sedang Diproses';
                    notificationBody = 'Pesanan Anda sedang diproses oleh toko.';
                    break;
                case 'ready_for_pickup':
                    notificationTitle = 'Pesanan Siap Diambil';
                    notificationBody = 'Pesanan Anda siap untuk diambil oleh driver.';
                    break;
                case 'delivered':
                    notificationTitle = 'Pesanan Selesai';
                    notificationBody = 'Pesanan Anda telah selesai diantar.';
                    break;
                case 'cancelled':
                    notificationTitle = 'Pesanan Dibatalkan';
                    notificationBody = 'Pesanan Anda telah dibatalkan.';
                    break;
            }

            if (notificationTitle && notificationBody) {
                await sendNotification(
                    order.customer.fcm_token,
                    notificationTitle,
                    notificationBody,
                    { order_id: order.id }
                );
            }
        }

        await transaction.commit();

        logger.info('Order status updated successfully:', { order_id: order.id });
        return response(res, {
            statusCode: 200,
            message: 'Status order berhasil diperbarui',
            data: order
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error updating order status:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui status order',
            errors: error.message
        });
    }
};

/**
 * Cancel order.
 */
const cancelOrderRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByPk(id);
        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }

        await order.update({ order_status: 'cancelled' });  // Update status order menjadi 'cancelled'

        return response(res, {
            statusCode: 200,
            message: 'Order berhasil dibatalkan',
            data: order,
        });

    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat membatalkan order',
            errors: error.message,
        });
    }
}

/**
 * Membuat review untuk store atau driver.
 */
const createReview = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const order_id = req.params.id;
        const { order_review, driver_review } = req.body;
        let storeData = null;
        let driverData = null;

        // Cek apakah order sudah selesai.
        const order = await Order.findOne({
            where: { id: order_id, order_status: 'delivered' },
        });
        if (!order) {
            return response(res, {
                statusCode: 400,
                message: 'Hanya order dengan status delivered yang bisa direview'
            });
        }

        // Cek apakah review sudah ada untuk order ini.
        const existingOrderReview = await OrderReview.findOne({
            where: { order_id: order_id, customer_id: user_id },
        });

        if (existingOrderReview) {
            return response(res, {
                statusCode: 400,
                message: 'Anda sudah memberikan review untuk order ini'
            });
        }

        // Review untuk store.
        if (order_review?.rating && order.store_id) {
            await OrderReview.create({
                order_id: order_id,
                customer_id: user_id,
                rating: order_review.rating,
                comment: order_review.comment || null,
            });

            storeData = await Store.findByPk(order.store_id);
            if (storeData) {
                const totalRating = storeData.rating * storeData.review_count + order_review.rating;
                const newReviewCount = storeData.review_count + 1;
                const newRating = totalRating / newReviewCount;

                await storeData.update({
                    rating: newRating,
                    review_count: newReviewCount,
                });
            }
        }

        // Review untuk driver.
        if (driver_review?.rating && order.driver_id) {
            await DriverReview.create({
                order_id: order_id,
                driver_id: order.driver_id,
                customer_id: user_id,
                rating: driver_review.rating,
                comment: driver_review.comment || null,
            });

            driverData = await Driver.findByPk(order.driver_id);
            if (driverData) {
                const totalRating = driverData.rating * driverData.reviews_count + driver_review.rating;
                const newReviewsCount = driverData.reviews_count + 1;
                const newRating = totalRating / newReviewsCount;

                await driverData.update({
                    rating: newRating,
                    reviews_count: newReviewsCount,
                });
            }
        }

        return response(res, {
            statusCode: 201,
            message: 'Review berhasil dibuat',
            data: {
                order_id,
                order_review: order_review ? {
                    rating: order_review.rating,
                    comment: order_review.comment || null
                } : null,
                driver_review: driver_review ? {
                    rating: driver_review.rating,
                    comment: driver_review.comment || null
                } : null,
                store_rating: storeData ? storeData.rating : null,
                driver_rating: driverData ? driverData.rating : null
            }
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat membuat review',
            errors: error.message,
        });
    }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
    try {
        logger.info('Get order by ID request:', { order_id: req.params.id });
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: Store, as: 'store', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
                { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
                { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] }
            ]
        });

        if (!order) {
            logger.warn('Order not found:', { order_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Order tidak ditemukan',
            });
        }

        logger.info('Successfully retrieved order:', { order_id: order.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order',
            data: order,
        });
    } catch (error) {
        logger.error('Error getting order by ID:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data order',
            errors: error.message,
        });
    }
};

module.exports = {
    findDriverInBackground,
    getOrdersByUser,
    getOrdersByStore,
    placeOrder,
    cancelOrder,
    processOrderByStore,
    updateOrderStatus,
    cancelOrderRequest,
    createReview,
    getOrderById,
    calculateEstimatedTimes
};