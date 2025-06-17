'use strict';

const { Driver, User, Order, sequelize } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const bcrypt = require('bcryptjs');
const { saveBase64Image } = require('../utils/imageHelper');
const { logger } = require('../utils/logger');

/**
 * Get all drivers
 */
const getAllDrivers = async (req, res) => {
    try {
        logger.info('Get all drivers request');
        const queryOptions = getQueryOptions(req.query);

        // Include model User dan filter berdasarkan role 'driver'
        queryOptions.include = [
            {
                model: User,
                as: 'user',
                where: { role: 'driver' },
            },
        ];

        const { count, rows: drivers } = await Driver.findAndCountAll(queryOptions);

        logger.info('Successfully retrieved drivers', { count });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data driver',
            data: drivers,
            totalItems: count,
            totalPages: Math.ceil(count / queryOptions.limit),
            currentPage: parseInt(req.query.page) || 1,
        });
    } catch (error) {
        logger.error('Error getting drivers:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data driver',
            errors: error.message,
        });
    }
};

/**
 * Get driver by ID
 */
const getDriverById = async (req, res) => {
    try {
        logger.info('Get driver by ID request:', { driverId: req.params.id });
        const driver = await Driver.findByPk(req.params.id, {
            include: [
                { model: User, as: 'user' },
                { model: Order, as: 'orders' },
            ],
        });

        if (!driver) {
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        logger.info('Successfully retrieved driver:', { driverId: driver.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data driver',
            data: driver,
        });
    } catch (error) {
        logger.error('Error getting driver by ID:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data driver',
            errors: error.message,
        });
    }
};

/**
 * Create new driver
 */
const createDriver = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Create driver request:', {
            email: req.body.email,
            name: req.body.name,
            phone: req.body.phone,
            license_number: req.body.license_number,
            vehicle_plate: req.body.vehicle_plate
        });

        const {
            name,
            email,
            password,
            phone,
            license_number,
            vehicle_plate,
            avatar
        } = req.body;

        // Handle avatar upload (base64)
        let avatarPath = null;
        if (avatar && avatar.startsWith('data:image')) {
            avatarPath = saveBase64Image(avatar, 'drivers', 'driver');
        }

        // Create user first
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'driver',
            avatar: avatarPath,
        }, { transaction });

        // Create driver profile
        const driver = await Driver.create({
            user_id: user.id,
            license_number,
            vehicle_plate,
            status: 'active',
            rating: 5.00,
            reviews_count: 0
        }, { transaction });

        await transaction.commit();

        logger.info('Driver created successfully:', { driverId: driver.id });
        return response(res, {
            statusCode: 201,
            message: 'Driver berhasil ditambahkan',
            data: {
                user,
                driver
            }
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error creating driver:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan driver',
            errors: error.message
        });
    }
};

/**
 * Update driver
 */
const updateDriver = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Update driver request:', { driverId: req.params.id });

        const {
            name,
            email,
            phone,
            license_number,
            vehicle_plate,
            status,
            avatar
        } = req.body;

        const driver = await Driver.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
            transaction
        });

        if (!driver) {
            await transaction.rollback();
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        // Handle avatar upload (base64)
        let avatarPath = driver.user.avatar;
        if (avatar && avatar.startsWith('data:image')) {
            avatarPath = saveBase64Image(avatar, 'drivers', 'driver');
        }

        // Update user data
        await driver.user.update({
            name,
            email,
            phone,
            avatar: avatarPath,
        }, { transaction });

        const updateData = {
            license_number,
            vehicle_plate,
            status
        };

        await driver.update(updateData, { transaction });

        await transaction.commit();

        logger.info('Driver updated successfully:', { driverId: driver.id });
        return response(res, {
            statusCode: 200,
            message: 'Driver berhasil diperbarui',
            data: {
                user: driver.user,
                driver
            }
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error updating driver:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui driver',
            errors: error.message
        });
    }
};

/**
 * Delete driver
 */
const deleteDriver = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Delete driver request:', { driverId: req.params.id });

        const driver = await Driver.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
            transaction
        });

        if (!driver) {
            await transaction.rollback();
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        // Delete driver profile first
        await driver.destroy({ transaction });
        // Then delete user account
        await driver.user.destroy({ transaction });

        await transaction.commit();

        logger.info('Driver deleted successfully:', { driverId: req.params.id });
        return response(res, {
            statusCode: 200,
            message: 'Driver berhasil dihapus'
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error deleting driver:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus driver',
            errors: error.message
        });
    }
};

/**
 * Get driver location
 */
const getDriverLocation = async (req, res) => {
    try {
        logger.info('Get driver location request:', { driverId: req.params.id });
        const driver = await Driver.findByPk(req.params.id, {
            attributes: ['id', 'latitude', 'longitude']
        });

        if (!driver) {
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        logger.info('Successfully retrieved driver location:', { driverId: driver.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan lokasi driver',
            data: {
                latitude: driver.latitude,
                longitude: driver.longitude,
            },
        });
    } catch (error) {
        logger.error('Error getting driver location:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil lokasi driver',
            errors: error.message,
        });
    }
};

/**
 * Update driver status
 */
const updateDriverStatus = async (req, res) => {
    try {
        logger.info('Update driver status request:', { driverId: req.params.id });
        const { status } = req.body;
        const validStatuses = ['active', 'inactive', 'busy'];

        if (!validStatuses.includes(status)) {
            logger.warn('Invalid status:', { status });
            return response(res, {
                statusCode: 400,
                message: 'Status tidak valid',
            });
        }

        const driver = await Driver.findByPk(req.params.id);

        if (!driver) {
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        await driver.update({ status });

        logger.info('Driver status updated successfully:', { driverId: driver.id, status });
        return response(res, {
            statusCode: 200,
            message: 'Status driver berhasil diperbarui',
            data: driver,
        });
    } catch (error) {
        logger.error('Error updating driver status:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui status driver',
            errors: error.message,
        });
    }
};

/**
 * Update driver profile
 */
const updateProfileDriver = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        logger.info('Update driver profile request:', { driverId: req.params.id });

        const { name, email, phone, license_number, vehicle_plate } = req.body;
        const driver = await Driver.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
            transaction
        });

        if (!driver) {
            await transaction.rollback();
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan'
            });
        }

        // Update user data
        await driver.user.update({
            name,
            email,
            phone
        }, { transaction });

        const updateData = {
            license_number,
            vehicle_plate
        };

        await driver.update(updateData, { transaction });

        await transaction.commit();

        logger.info('Driver profile updated successfully:', { driverId: driver.id });
        return response(res, {
            statusCode: 200,
            message: 'Profil driver berhasil diperbarui',
            data: {
                user: driver.user,
                driver
            }
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        logger.error('Error updating driver profile:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui profil driver',
            errors: error.message
        });
    }
};

/**
 * Get driver orders
 */
const getDriverOrders = async (req, res) => {
    try {
        logger.info('Get driver orders request:', { driverId: req.params.id });
        const driver = await Driver.findByPk(req.params.id, {
            include: [{
                model: Order,
                as: 'orders',
                order: [['created_at', 'DESC']]
            }]
        });

        if (!driver) {
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        logger.info('Successfully retrieved driver orders:', { driverId: driver.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data order driver',
            data: driver.orders,
        });
    } catch (error) {
        logger.error('Error getting driver orders:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data order driver',
            errors: error.message,
        });
    }
};

/**
 * Update driver location
 */
const updateDriverLocation = async (req, res) => {
    try {
        logger.info('Update driver location request:', { driverId: req.params.id });
        const { latitude, longitude } = req.body;

        const driver = await Driver.findByPk(req.params.id);

        if (!driver) {
            logger.warn('Driver not found:', { driverId: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Driver tidak ditemukan',
            });
        }

        // Update location data
        await driver.update({
            latitude,
            longitude
        });

        logger.info('Driver location updated successfully:', {
            driverId: driver.id,
            latitude,
            longitude
        });

        return response(res, {
            statusCode: 200,
            message: 'Lokasi driver berhasil diperbarui',
            data: {
                latitude,
                longitude
            }
        });
    } catch (error) {
        logger.error('Error updating driver location:', {
            error: error.message,
            stack: error.stack,
            driverId: req.params.id
        });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui lokasi driver',
            errors: error.message
        });
    }
};

module.exports = {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    getDriverLocation,
    updateDriverStatus,
    updateProfileDriver,
    getDriverOrders,
    updateDriverLocation
};