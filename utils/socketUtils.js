const { Server } = require('socket.io');

// Simpan instance io dan driverSockets
let io = null;
const driverSockets = {}; // { driverId: socketId }

/**
 * Inisialisasi Socket.IO
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} - Socket.IO instance
 */
const initSocketIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Izinkan semua origin (sesuaikan dengan kebutuhan produksi)
            methods: ['GET', 'POST'],
        },
    });

    // Handle koneksi Socket.IO
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);

        // Simpan socket ID berdasarkan driverId
        socket.on('registerDriver', (driverId) => {
            driverSockets[driverId] = socket.id;
            console.log(`Driver ${driverId} registered with socket ID ${socket.id}`);
        });

        // Update lokasi driver
        socket.on('updateLocation', (data) => {
            const { driverId, latitude, longitude, orderId } = data;

            // Kirim update lokasi ke customer yang memantau order ini
            if (driverSockets[orderId]) {
                io.to(driverSockets[orderId]).emit('locationUpdate', {
                    orderId,
                    latitude,
                    longitude,
                    status: 'on_way', // Sesuaikan dengan status yang sesuai
                });
            }

            console.log(`Driver ${driverId} location updated: ${latitude}, ${longitude}`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`A user disconnected: ${socket.id}`);
            // Hapus dari daftar koneksi
            for (const [driverId, socketId] of Object.entries(driverSockets)) {
                if (socketId === socket.id) {
                    delete driverSockets[driverId];
                    console.log(`Driver ${driverId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};

/**
 * Dapatkan instance io
 * @returns {Server} - Socket.IO instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO belum diinisialisasi');
    }
    return io;
};

/**
 * Dapatkan driverSockets
 * @returns {Object} - Daftar koneksi driver
 */
const getDriverSockets = () => {
    return driverSockets;
};

module.exports = {
    initSocketIO,
    getIO,
    getDriverSockets,
};