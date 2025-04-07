const { Order, OrderItem, Store, User, Driver, DriverReview, OrderReview } = require('../models');
const response = require('../utils/response');
const haversine = require('../utils/haversine');
const euclideanDistance = require('../utils/euclideanDistance');

/**
 * Mencari driver terdekat dari toko menggunakan algoritma Euclidean.
 * @param {number} storeLat - Latitude toko.
 * @param {number} storeLon - Longitude toko.
 * @returns {Object} - Driver terdekat.
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
        // Menggunakan Euclidean untuk mencari jarak driver terdekat.
        const distance = euclideanDistance(storeLat, storeLon, driverLat, driverLon);

        if (distance < minDistance) {
            minDistance = distance;
            nearestDriver = driver;
        }
    });

    return nearestDriver;
};

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
 * Membuat order baru.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const placeOrder = async (req, res) => {
    try {
        const { deliveryAddress, subtotal, serviceCharge, total, orderDate, notes, storeId, items } = req.body;
        const { id: customerId } = req.user; // Ambil ID customer yang sedang login.

        // Ambil data toko.
        const store = await Store.findByPk(storeId);
        if (!store) {
            return response(res, { statusCode: 404, message: 'Toko tidak ditemukan' });
        }

        // Cari driver terdekat menggunakan algoritma Euclidean.
        const nearestDriver = await findNearestDriver(store.latitude, store.longitude);
        if (!nearestDriver) {
            return response(res, { statusCode: 404, message: 'Driver tidak ditemukan' });
        }

        // Buat order baru dengan status pending.
        const order = await Order.create({
            id: `ORD-${Date.now()}`, // Generate ID unik untuk order.
            deliveryAddress,
            subtotal,
            serviceCharge,
            total,
            order_status: 'mencari driver', //Status Awal
            orderDate,
            notes,
            customerId,
            driverId: nearestDriver.id, // Assign driver terdekat.
            storeId,
        });

        // Tambahkan items ke order.
        if (items && items.length > 0) {
            const orderItems = items.map((item) => ({
                ...item,
                orderId: order.id,  // Hubungkan item dengan order yang baru dibuat
            }));
            await OrderItem.bulkCreate(orderItems);
        }

         // Panggil fungsi updateOrderStatus untuk memperbarui status jika diperlukan
         await updateOrderStatus({
            body: { orderId: order.id, status: 'mencari driver' }, // Status pertama
            user: req.user, // Admin atau role yang berwenang
        }, res);

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
 * Approve order oleh toko.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 */
const approveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, {
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

// //Membuat pesanan
// const createOrder = async (req, res) => {
//     try {
//       const { customerId, storeId, products } = req.body;
  
//       // Membuat pesanan baru dengan status "mencari driver"
//       const order = await Order.create({
//         customerId,
//         storeId,
//         status: 'mencari driver',  // Status awal "mencari driver"
//       });
  
//       // Setelah pesanan dibuat, proses pencarian driver terdekat (algoritma Euclidean)
//       // Misalnya menggunakan fungsi 'findNearestDriver' yang sudah ada
//       const driver = await findNearestDriver(order.store.latitude, order.store.longitude);
  
//       // Jika driver ditemukan, perbarui status menjadi "diambil" (misalnya)
//       if (driver) {
//         order.status = 'diambil';  // Status berubah ke "diambil" setelah driver ditemukan
//         order.driverId = driver.id;
//         await order.save();
//       }
  
//       return res.status(200).json({ message: 'Order created and driver found', order });
//     } catch (error) {
//       return res.status(500).json({ message: 'Error creating order', error: error.message });
//     }
//   };
  
  
// const updateOrderStatus2 = async (req, res) => {
//     try {
//       const { orderId, status } = req.body;
  
//       // Validasi status order
//       const validStatuses = ['menunggu driver', 'diambil', 'diantar', 'selesai'];
//       if (!validStatuses.includes(status)) {
//         return res.status(400).json({ message: 'Status tidak valid' });
//       }
  
//       const order = await Order.findByPk(orderId, {
//         include: [
//           { model: User, as: 'customer' },  // Dapatkan data customer
//           { model: Driver, as: 'driver' },  // Dapatkan data driver
//           { model: Store, as: 'store' }     // Dapatkan data store
//         ]
//       });
  
//       if (!order) {
//         return res.status(404).json({ message: 'Order not found' });
//       }
  
//       // Menjaga agar status order tidak bisa diubah jika sudah selesai
//       if (order.status === 'selesai') {
//         return res.status(400).json({ message: 'Status sudah selesai, tidak bisa diubah lagi' });
//       }
  
//       // Update status order
//       order.status = status;
//       await order.save();
  
//       // Log aktivitas perubahan status
//       console.log(`Order ID: ${orderId} - Status updated to: ${status}`);
  
//       // Kirim pemberitahuan ke customer dan driver
//       if (order.customer) {
//         // Implementasikan pemberitahuan ke customer, misalnya melalui email atau push notification
//         console.log(`Notification sent to customer: ${order.customer.name}`);
//       }
//       if (order.driver) {
//         // Implementasikan pemberitahuan ke driver, misalnya melalui email atau push notification
//         console.log(`Notification sent to driver: ${order.driver.name}`);
//       }
  
//       // Jika status adalah "selesai", kirim notifikasi ke store
//       if (status === 'selesai' && order.store) {
//         console.log(`Store ${order.store.name} notified about order completion`);
//       }
  
//       return res.status(200).json({ message: 'Order status updated successfully', order });
  
//     } catch (error) {
//       console.error('Error updating order status:', error);
//       return res.status(500).json({ message: 'Internal Server Error', error: error.message });
//     }
//   }; //versi 2
  
 

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
    updateOrderStatus,
    createReview
};
