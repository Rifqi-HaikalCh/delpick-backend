const { Driver, User, Order } = require('../models');
const { getIO, getDriverSockets } = require('../utils/socketUtils'); // Impor fungsi dari socketUtils
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * Mendapatkan semua driver
 */
const getAllDrivers = async (req, res) => {
    try {
        // const queryOptions = getQueryOptions(req.query, [{ model: User, as: 'user' }]);
        const queryOptions = getQueryOptions(req.query);

        // Include model User dan filter berdasarkan role 'driver'
        queryOptions.include = [
            {
                model: User,
                as: 'user', // Asosiasi ke model User
                where: { role: 'driver' }, // Filter berdasarkan role 'driver' pada tabel User
            },
    ];

        // queryOptions.where = { role: 'driver' };

        // queryOptions.include[0].where = { role: 'driver' };

        const { count, rows: drivers } = await Driver.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data driver',
            data: drivers,
            totalItems: count,
            totalPages: Math.ceil(count / queryOptions.limit),
            currentPage: parseInt(req.query.page) || 1,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data driver',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan driver berdasarkan ID
 */
const getDriverById = async (req, res) => {
    try {
        const driver = await Driver.findByPk(req.params.id, {
            include: [
                { model: User, as: 'user' }, // Include data User
                { model: Order, as: 'orders' }, // Include data Order
            ],
        });

        if (!driver) {
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data driver',
            data: driver,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data driver',
            errors: error.message,
        });
    }
};

/**
 * Menambahkan driver baru
 */
const createDriver = async (req, res) => {
    try {
        const { name, email, password, phone, vehicle_number } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat User terlebih dahulu
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'driver', // Role sebagai driver
        });

        // Buat Driver
        const driver = await Driver.create({
            userId: user.id,
            vehicle_number,
            rating: 0, // Nilai default rating
            reviewsCount: 0, // Nilai default reviewsCount
            latitude: null, // Nilai default latitude
            longitude: null, // Nilai default longitude
            status: 'inactive', // Nilai default status
        });

        return response(res, {
            statusCode: 201,
            message: 'Driver berhasil ditambahkan',
            data: { user, driver },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan driver',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate driver berdasarkan ID
 */
const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone, vehicle_number, latitude, longitude, status } = req.body;

        // Cari driver berdasarkan ID
        const driver = await Driver.findByPk(id, {
            include: [{ model: User, as: 'user' }], // Include data User
        });

        if (!driver) {
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        // Update data User (driver)
        if (name || email || phone || password) {
            const userData = {};
            if (name) userData.name = name;
            if (email) userData.email = email;
            if (phone) userData.phone = phone;
            if (password) userData.password = await bcrypt.hash(password, 10);

            await driver.user.update(userData);
        }

        // Update data Driver
        const driverData = {};
        if (vehicle_number) driverData.vehicle_number = vehicle_number;
        if (latitude) driverData.latitude = latitude;
        if (longitude) driverData.longitude = longitude;
        if (status) driverData.status = status;

        await driver.update(driverData);

        return response(res, {
            statusCode: 200,
            message: 'Driver berhasil diupdate',
            data: driver,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate driver',
            errors: error.message,
        });
    }
};

/**
 * Menghapus driver berdasarkan ID
 */
const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;

        // Cari driver berdasarkan ID
        const driver = await Driver.findByPk(id, {
            include: [{ model: User, as: 'user' }], // Include data User
        });

        if (!driver) {
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        // Hapus data User (driver)
        await driver.user.destroy();

        // Hapus data Driver
        await driver.destroy();

        return response(res, {
            statusCode: 200,
            message: 'Driver berhasil dihapus',
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus driver',
            errors: error.message,
        });
    }
};

/**
 * Update lokasi driver secara realtime
 */
const updateDriverLocation = async (req, res) => {
    try {
        const { id: driverId } = req.user; // Ambil ID driver yang sedang login
        const { latitude, longitude } = req.body;

        // Update lokasi driver di database
        const driver = await Driver.findByPk(driverId);
        if (!driver) {
            return response(res, { statusCode: 404, message: 'Driver tidak ditemukan' });
        }

        await driver.update({ latitude, longitude });

        // Kirim update lokasi ke customer yang memantau driver ini
        const io = getIO();
        const driverSockets = getDriverSockets();
        if (driverSockets[driverId]) {
            io.to(driverSockets[driverId]).emit('updateLocation', { latitude, longitude });
        }

        return response(res, {
            statusCode: 200,
            message: 'Lokasi driver berhasil diperbarui',
            data: { latitude, longitude },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui lokasi driver',
            errors: error.message,
        });
    }
};

/**
 * Mengubah status driver (active/inactive)
 */
const updateDriverStatus = async (req, res) => {
    try {
        const { id: driverId } = req.user; // Ambil ID driver yang sedang login
        const { status } = req.body;

        // Validasi status
        if (!['active', 'inactive'].includes(status)) {
            return response(res, {
                statusCode: 400,
                message: 'Status tidak valid. Harus "active" atau "inactive".',
            });
        }

        // Cari driver berdasarkan ID
        const driver = await Driver.findByPk(driverId);
        if (!driver) {
            return response(res, { statusCode: 404, message: 'Driver tidak ditemukan' });
        }

        // Update status driver
        await driver.update({ status });

        return response(res, {
            statusCode: 200,
            message: 'Status driver berhasil diperbarui',
            data: driver,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui status driver',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate driver oleh driver yang sedang login
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateDriverByDriver = async (req, res) => {
    try {
        const { id: driverId } = req.user; // ID driver yang sedang login
        const { name, email, password, phone, vehicle_number, latitude, longitude } = req.body;

        // Cari driver berdasarkan ID yang sedang login
        const driver = await Driver.findOne({
            where: { userId: driverId },
            include: [{ model: User, as: 'user' }], // Include data User
        });

        if (!driver) {
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan atau Anda tidak memiliki akses',
            });
        }

        // Update data User (driver)
        if (name || email || phone || password) {
            const userData = {};
            if (name) userData.name = name;
            if (email) userData.email = email;
            if (phone) userData.phone = phone;
            if (password) userData.password = await bcrypt.hash(password, 10);

            await driver.user.update(userData);
        }

        // Update data Driver
        const driverData = {};
        if (vehicle_number) driverData.vehicle_number = vehicle_number;
        if (latitude) driverData.latitude = latitude;
        if (longitude) driverData.longitude = longitude;

        await driver.update(driverData);

        return response(res, {
            statusCode: 200,
            message: 'Data driver berhasil diupdate',
            data: driver,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate data driver',
            errors: error.message,
        });
    }
};

module.exports = {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverLocation,
    updateDriverStatus,
    updateDriverByDriver,
};