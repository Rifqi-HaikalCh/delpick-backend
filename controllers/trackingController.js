const { Driver, DriverRequest, Order, User } = require('../models');
const response = require('../utils/response');
const { getIO, getDriverSockets } = require('../utils/socketUtils'); // Impor fungsi dari socketUtils

/**
 * Driver menyetujui permintaan pengantaran
 */
const acceptDriverRequest = async (req, res) => {
    try {
        const { id: driverId } = req.user; // ID driver yang sedang login
        const { orderId } = req.params;

        // Cari permintaan pengantaran
        const driverRequest = await DriverRequest.findOne({
            where: { orderId, driverId, status: 'pending' },
        });
        if (!driverRequest) {
            return response(res, { statusCode: 404, message: 'Permintaan pengantaran tidak ditemukan' });
        }

        // Update status permintaan menjadi accepted
        await driverRequest.update({ status: 'accepted' });

        // Update status order menjadi 'picking_up' (sedang menjemput pesanan)
        const order = await Order.findByPk(orderId);
        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }
        await order.update({ delivery_status: 'picking_up' });

        return response(res, {
            statusCode: 200,
            message: 'Permintaan pengantaran berhasil disetujui. Driver sedang menjemput pesanan.',
            data: {
                driverRequest,
                order,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menyetujui permintaan pengantaran',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan data tracking secara realtime
 */
const getRealtimeTracking = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { id: customerId } = req.user;

        // Cek apakah customer memiliki akses ke order ini
        const order = await Order.findOne({
            where: { id: orderId, customerId },
            include: [
                {
                    model: Driver,
                    as: 'driver', // Include data Driver untuk mendapatkan lokasi
                    include: [{ model: User, as: 'user' }], // Include data User (driver)
                },
            ],
        });
        if (!order) {
            return response(res, { statusCode: 404, message: 'Order tidak ditemukan' });
        }

        // Periksa apakah lokasi driver tersedia
        if (!order.driver || !order.driver.latitude || !order.driver.longitude) {
            return response(res, { statusCode: 404, message: 'Driver location not available' });
        }

        // Kirim data tracking ke customer melalui Socket.IO
        const driverSockets = getDriverSockets();
        if (driverSockets[customerId]) {
            const io = getIO();
            io.to(driverSockets[customerId]).emit('trackingData', {
                orderId,
                latitude: order.driver.latitude, // Lokasi driver
                longitude: order.driver.longitude, // Lokasi driver
                status: order.delivery_status, // Status pengiriman
                driverName: order.driver.user.name, // Nama driver
            });
        }

        return response(res, {
            statusCode: 200,
            message: 'Data tracking berhasil dikirim',
            data: {
                orderId,
                latitude: order.driver.latitude,
                longitude: order.driver.longitude,
                status: order.delivery_status,
                driverName: order.driver.user.name,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data tracking',
            errors: error.message,
        });
    }
};

module.exports = {
    acceptDriverRequest,
    getRealtimeTracking,
};