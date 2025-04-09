const { Order, OrderItem, Store, User, Driver, DriverReview, OrderReview, MenuItem, sequelize } = require('../models');
const response = require('../utils/response');
const haversine = require('../utils/haversine');
const euclideanDistance = require('../utils/euclideanDistance');
const logger = require('../utils/logger');
const Bull = require('bull');
const orderQueue = new Bull('order-queue');
const { Op } = require('sequelize');

/**
 * Mencari driver terdekat dari toko menggunakan algoritma Euclidean.
 * @param {number} storeLat - Latitude toko.
 * @param {number} storeLon - Longitude toko.
 * @returns {Object} - Driver terdekat.
 */
// const findNearestDriver = async (storeLat, storeLon) => {
//     const drivers = await Driver.findAll({
//         include: [{ model: User, as: 'user' }], // Ambil data lokasi driver dari tabel User
//     });

//     let nearestDriver = null;
//     let minDistance = Infinity;

//     drivers.forEach((driver) => {
//         const driverLat = driver.user.latitude;
//         const driverLon = driver.user.longitude;
//         // Menggunakan Euclidean untuk mencari jarak driver terdekat.
//         const distance = euclideanDistance(storeLat, storeLon, driverLat, driverLon);

//         if (distance < minDistance) {
//             minDistance = distance;
//             nearestDriver = driver;
//         }
//     });

//     return nearestDriver;
// };

// Fungsi untuk membatalkan order
async function cancelOrder(orderId) {
    try {
        const order = await Order.findByPk(orderId);
        if (order && order.order_status === 'mencari driver') {
            await order.update({
                order_status: 'dibatalkan',
                cancellationReason: 'Tidak menemukan driver dalam waktu 5 menit'
            });
            console.log(`Order ${orderId} dibatalkan karena tidak menemukan driver`);
        }
    } catch (error) {
        console.error('Gagal membatalkan order:', error);
    }
}

// Fungsi pencarian driver di background
async function findDriverInBackground(storeId, orderId) {
    try {
        const store = await Store.findByPk(storeId);
        if (!store) {
            console.error(`Store ${storeId} not found`);
            await cancelOrder(orderId);
            return;
        }

        // Set timeout 5 menit untuk pembatalan otomatis
        const timeout = setTimeout(async () => {
            await cancelOrder(orderId);
        }, 20 * 60 * 1000); // 5 menit dalam milidetik

        let driverFound = false;
        const startTime = Date.now();
        const maxSearchTime = 20 * 60 * 1000; // 5 menit maksimal pencarian

        // Loop pencarian driver setiap 30 detik
        while (Date.now() - startTime < maxSearchTime && !driverFound) {
            const drivers = await Driver.findAll({
                include: [{ model: User, as: 'user' }],
                where: {
                    status: 'available',
                    lastActivity: { [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) } // Driver aktif dalam 15 menit terakhir
                }
            });

            let nearestDriver = null;
            let minDistance = Infinity;

            drivers.forEach((driver) => {
                const distance = euclideanDistance(
                    store.latitude,
                    store.longitude,
                    driver.user.latitude,
                    driver.user.longitude
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestDriver = driver;
                }
            });

            if (nearestDriver) {
                clearTimeout(timeout);
                driverFound = true;

                await Order.update(
                    {
                        driverId: nearestDriver.id,
                        order_status: 'menunggu konfirmasi driver'
                    },
                    { where: { id: orderId } }
                );

                console.log(`Driver ${nearestDriver.id} ditemukan untuk order ${orderId}`);
                return;
            }

            // Tunggu 30 detik sebelum mencari lagi
            await new Promise(resolve => setTimeout(resolve, 30000));
        }

        if (!driverFound) {
            await cancelOrder(orderId);
        }
    } catch (error) {
        console.error('Error in findDriverInBackground:', error);
        await cancelOrder(orderId);
    }
}

/**
 * Menghitung estimasi waktu pengiriman menggunakan algoritma Haversine.
 * @param {number} storeLat - Latitude toko.
 * @param {number} storeLon - Longitude toko.
 * @param {number} customerLat - Latitude customer.
 * @param {number} customerLon - Longitude customer.
 * @returns {number} - Estimasi waktu dalam menit.
 */
const calculateEstimatedDeliveryTime = (storeLat, storeLon, customerLat, customerLon) => {
    // Menggunakan Haversine untuk menghitung jarak di permukaan bumi.
    const distance = haversine(storeLat, storeLon, customerLat, customerLon);
    const averageSpeed = 30; // Asumsi kecepatan rata-rata 30 km/jam.
    const estimatedTime = (distance / averageSpeed) * 60; // Konversi ke menit.
    return Math.round(estimatedTime);
};

/**
 * Mendapatkan order berdasarkan user yang sedang login (customer).
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const getOrdersByUser = async (req, res) => {
    try {
        const { id: customerId } = req.user; // Ambil ID user yang sedang login.
        const orders = await Order.findAll({
            where: { customerId },
            include: [
                { model: OrderItem, as: 'items' },  // Relasi ke OrderItem
                { model: Store, as: 'store' }, // Relasi ke Store
                { model: User, as: 'driver' }, // Relasi ke Driver
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
 * Mendapatkan order berdasarkan store yang dimiliki oleh owner yang sedang login.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const getOrdersByStore = async (req, res) => {
    try {
        const { id: ownerId } = req.user; // Ambil ID owner yang sedang login.

        // Cari store yang dimiliki oleh owner
        const store = await Store.findOne({ where: { ownerId } });
        if (!store) {
            return response(res, {
                statusCode: 404,
                message: 'Toko tidak ditemukan',
            });
        }

        const orders = await Order.findAll({
            where: { storeId: store.id },  // Filter berdasarkan storeId
            include: [
                { model: OrderItem, as: 'items' }, // Relasi ke OrderItem
                { model: User, as: 'customer' }, // Relasi ke Customer
                { model: User, as: 'driver' }, // Relasi ke Driver
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
 * Membuat order baru dengan request body sederhana (hanya items id)
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
// const placeOrder = async (req, res) => {

//     try {
//         const { notes, items: requestedItems, storeId } = req.body;
//         const { id: customerId } = req.user;

//         // Validasi
//         if (!requestedItems?.length) {
//             return response(res, { statusCode: 400, message: 'Items harus diisi' });
//         }

//         // Validasi storeId sebagai integer
//         if (!Number.isInteger(storeId)) {
//             return response(res, { statusCode: 400, message: 'Store ID harus berupa angka' });
//         }

//         const [store, menuItems] = await Promise.all([
//             Store.findByPk(storeId),
//             MenuItem.findAll({
//                 where: {
//                     id: requestedItems.map(item => item.itemId),
//                     storeId // Pastikan item berasal dari store yang benar
//                 }
//             })
//         ]);

//         if (!store) {
//             return response(res, { statusCode: 404, message: 'Toko tidak ditemukan' });
//         }

//         if (menuItems.length !== requestedItems.length) {
//             const missingItems = requestedItems
//                 .filter(item => !menuItems.some(mi => mi.id === item.itemId))
//                 .map(item => item.itemId);
//             return response(res, {
//                 statusCode: 400,
//                 message: `Menu item dengan ID ${missingItems.join(', ')} tidak ditemukan`
//             });
//         }

//         // Persiapkan order items
//         const orderItems = menuItems.map(menuItem => {
//             const reqItem = requestedItems.find(item => item.itemId === menuItem.id);
//             return {
//                 name: menuItem.name,
//                 price: menuItem.price,
//                 quantity: reqItem.quantity || 1,
//                 imageUrl: menuItem.imageUrl
//             };
//         });

//         // Hitung total
//         const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//         const serviceCharge = subtotal * 0.1;
//         const total = subtotal + serviceCharge;

//         // Buat order
//         const order = await Order.create({
//             code: `ORD-${Date.now()}`,
//             deliveryAddress: "Institut Teknologi Del",
//             subtotal,
//             serviceCharge,
//             total,
//             orderDate: new Date(),
//             notes: notes || null,
//             customerId,
//             storeId,
//         });

//         console.log(order.id);
//         // Pastikan order.id tersedia
//         if (!order.id) {
//             throw new Error('Gagal mendapatkan ID order');
//         }

//         // Simpan items ke OrderItem
//         await OrderItem.bulkCreate(
//             orderItems.map(item => ({
//                 ...item,
//                 orderId: order.id
//             }))
//         );

//         // Proses pencarian driver di background
//         orderQueue.add('find-driver', {
//             storeId: store.id,
//             orderId: order.id
//         });

//         return response(res, {
//             statusCode: 201,
//             message: 'Order berhasil dibuat',
//             data: order,
//         });
//     } catch (error) {
//         logger.error(error);
//         return response(res, {
//             statusCode: 500,
//             message: 'Terjadi kesalahan saat membuat order',
//             errors: error.message,
//         });
//     }
// };

const placeOrder = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();

        const { notes, items: requestedItems, storeId } = req.body;
        const { id: customerId } = req.user;

        // Validasi
        if (!requestedItems?.length) {
            await transaction.rollback();
            return response(res, { statusCode: 400, message: 'Items harus diisi' });
        }

        // Validasi storeId sebagai integer
        if (!Number.isInteger(storeId)) {
            await transaction.rollback();
            return response(res, { statusCode: 400, message: 'Store ID harus berupa angka' });
        }

        const [store, menuItems] = await Promise.all([
            Store.findByPk(storeId, { transaction }),
            MenuItem.findAll({
                where: {
                    id: requestedItems.map(item => item.itemId),
                    storeId
                },
                transaction
            })
        ]);

        if (!store) {
            await transaction.rollback();
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan' });
        }

        if (menuItems.length !== requestedItems.length) {
            const missingItems = requestedItems
                .filter(item => !menuItems.some(mi => mi.id === item.itemId))
                .map(item => item.itemId);
            await transaction.rollback();
            return response(res, {
                statusCode: 400,
                message: `Menu item dengan ID ${missingItems.join(', ')} tidak ditemukan`
            });
        }

        // Persiapkan order items
        const orderItems = menuItems.map(menuItem => {
            const reqItem = requestedItems.find(item => item.itemId === menuItem.id);
            return {
                name: menuItem.name,
                price: menuItem.price,
                quantity: reqItem.quantity || 1,
                imageUrl: menuItem.imageUrl
            };
        });

        // Hitung total
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const serviceCharge = subtotal * 0.1;
        const total = subtotal + serviceCharge;

        // Buat order dalam transaction
        const order = await Order.create({
            code: `ORD-${Date.now()}`,
            deliveryAddress: "Institut Teknologi Del",
            subtotal,
            serviceCharge,
            total,
            orderDate: new Date(),
            notes: notes || null,
            customerId,
            storeId,
            order_status: 'pending',
        }, { transaction });

        // find order by order code
        const orderCode = order.code;
        const orderResult = await Order.findOne({
            where: { code: orderCode },
            transaction
        });

        if (!orderResult?.id) {
            await transaction.rollback();
            throw new Error('Gagal mendapatkan ID order');
        }

        // Buat order items
        const orderItemsData = orderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            imageUrl: item.imageUrl || null,
            orderId: orderResult.id,
        }));

        await OrderItem.bulkCreate(orderItemsData, { transaction });

        // Commit transaction jika semua berhasil
        await transaction.commit();

        // Proses background
        orderQueue.add('find-driver', {
            storeId: store.id,
            orderId: orderResult.id
        });

        return response(res, {
            statusCode: 201,
            message: 'Order berhasil dibuat',
            order
        });

    } catch (error) {
        // Rollback hanya jika transaction masih aktif
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        logger.error('Order creation failed:', error);
        return response(res, { statusCode: 500, message: 'Terjadi kesalahan saat membuat order', data: null, errors: error.message });
    }
};

/**
 * Approve order oleh toko.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const approveOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log(orderId);

        const order = await Order.findByPk(orderId, {
            include: [
                { model: Store, as: 'store' },
                { model: User, as: 'customer' },
            ],
        });
        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }
        const destinationLatitude = 2.38349390603264; // Koordinat tujuan (contoh).
        const destinationLongitude = 99.14866498216043;

        // Hitung estimasi pengiriman menggunakan algoritma Haversine.
        const estimatedDeliveryTime = calculateEstimatedDeliveryTime(
            order.store.latitude,
            order.store.longitude,
            destinationLatitude,
            destinationLongitude
        );

        // Update status order dan tambahkan estimasi waktu pengiriman.
        await order.update({
            order_status: 'approved',
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
 * Mendapatkan detail order berdasarkan ID.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const getOrderDetail = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const order = await Order.findOne({
            where: { id: orderId },
            include: [
                { model: OrderItem, as: 'items' },
                { model: Store, as: 'store' },
                { model: User, as: 'customer' },
                { model: User, as: 'driver' },
                { model: OrderReview, as: 'orderReviews' },
                { model: DriverReview, as: 'driverReviews' },
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


// Fungsi untuk memperbarui status order
/**
 * Mengupdate status order berdasarkan ID.
 * @param {Object} req - Request object. Harus berisi parameter `orderId` dalam URL atau body.
 * @param {Object} res - Response object. Akan mengirimkan hasil atau error message.
 * 
 * @body {Object} req.body - Body request yang berisi data untuk update status.
 * @body {string} req.body.status - Status baru yang akan diterapkan pada order.
 * 
 * @param {string} req.params.orderId - ID dari order yang ingin diperbarui (jika menggunakan URL parameter).
 * 
 * @returns {Object} - Response object dengan status pengupdatean dan data order yang telah diperbarui.
 */
// const updateOrderStatus = async (req, res) => {//version 1
//     try {
//       const { orderId, status } = req.body;

//       // Validasi status order
//       const validStatuses = ['menunggu driver', 'diambil', 'diantar', 'selesai'];
//       if (!validStatuses.includes(status)) {
//         return response(res, { statusCode: 400, message: 'Status tidak valid' });
//       }

//       const order = await Order.findByPk(orderId);
//       if (!order) {
//         return response(res, { statusCode: 404, message: 'Order not found' });
//       }

//       // Update status order
//       order.status = status;
//       await order.save();

//       return response(res, { statusCode: 200, message: 'Order status updated', data: order });
//     } catch (error) {
//       return response(res, { statusCode: 500, message: 'Error updating order status' });
//     }
//   };
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const { role } = req.user;  // Role dari pengguna yang terautentikasi (admin, driver, atau store)

        // Validasi status order
        const validStatuses = ['mencari driver', 'diambil', 'diantar', 'selesai'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid' });
        }

        const order = await Order.findByPk(orderId, {
            include: [
                { model: User, as: 'customer' },
                { model: Driver, as: 'driver' },
                { model: Store, as: 'store' }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Logika untuk memeriksa hak akses berdasarkan role
        if (status === 'diambil' && role === 'store' && order.order_status === 'mencari driver') {
            // Store dapat mengupdate status ke 'diambil' jika pesanan sudah diambil oleh driver
            order.status = status;
        } else if (status === 'diantar' && role === 'driver' && order.order_status === 'diambil') {
            // Driver dapat mengupdate status ke 'diantar' jika barang sudah diambil dan driver sedang dalam perjalanan
            order.status = status;
        } else if (status === 'selesai' && role === 'driver' && order.order_status === 'diantar') {
            // Driver dapat mengupdate status ke 'selesai' jika barang sudah sampai tujuan
            order.status = status;
        } else if (status === 'menunggu driver' && role === 'admin') {
            // Admin dapat mengupdate status ke 'menunggu driver'
            order.status = status;
        } else {
            return res.status(403).json({ message: 'Akses ditolak: Role tidak sesuai untuk status ini' });
        }

        // Simpan perubahan status
        await order.save();

        // Log aktivitas perubahan status
        console.log(`Order ID: ${orderId} - Status updated to: ${status}`);

        // Kirim pemberitahuan ke customer dan driver
        if (order.customer) {
            // Implementasikan pemberitahuan ke customer
            console.log(`Notification sent to customer: ${order.customer.name}`);
        }
        if (order.driver) {
            // Implementasikan pemberitahuan ke driver
            console.log(`Notification sent to driver: ${order.driver.name}`);
        }

        return res.status(200).json({ message: 'Order status updated successfully', order });

    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

/**
 * Membuat review untuk store atau driver.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const createReview = async (req, res) => {
    try {
        const { id: userId } = req.user; // ID customer yang memberikan review.
        const { orderId, store, driver } = req.body;

        // Cek apakah order sudah selesai.
        const order = await Order.findOne({
            where: { id: orderId, order_status: 'delivered' },
        });
        if (!order) {
            return response(res, { statusCode: 400, message: 'Order belum selesai atau tidak ditemukan' });
        }

        // Cek apakah review sudah ada untuk order ini.
        const existingOrderReview = await OrderReview.findOne({
            where: { orderId, userId },
        });
        if (existingOrderReview) {
            return response(res, { statusCode: 400, message: 'Anda sudah memberikan review untuk order ini' });
        }

        // Review untuk store.
        if (store?.rating && order.storeId) {
            await OrderReview.create({
                orderId,
                userId,
                rating: store.rating,
                comment: store.comment || null,
            });

            const storeData = await Store.findByPk(order.storeId);
            if (storeData) {
                const totalRating = storeData.rating * storeData.reviewCount + store.rating;
                const newReviewCount = storeData.reviewCount + 1;
                const newRating = totalRating / newReviewCount;

                await storeData.update({
                    rating: newRating,
                    reviewCount: newReviewCount,
                });
            }
        }

        // Review untuk driver.
        if (driver?.rating && order.driverId) {
            await DriverReview.create({
                driverId: order.driverId,
                userId,
                rating: driver.rating,
                comment: driver.comment || null,
            });

            const driverData = await Driver.findByPk(order.driverId);
            if (driverData) {
                const totalRating = driverData.rating * driverData.reviews_count + driver.rating;
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
    findDriverInBackground,
    getOrdersByUser,
    getOrdersByStore,
    placeOrder,
    approveOrder,
    getOrderDetail,
    updateOrderStatus,
    createReview
};
