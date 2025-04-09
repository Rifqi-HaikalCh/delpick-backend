const { User } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * Mendapatkan semua customer
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllCustomers = async (req, res) => {
    try {
        const queryOptions = getQueryOptions(req.query);

        // Filter hanya untuk role 'customer'
        queryOptions.where = { role: 'customer' };

        const { count, rows: customers } = await User.findAndCountAll(queryOptions);

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data customer',
            data: {
                totalItems: count,
                totalPages: Math.ceil(count / queryOptions.limit),
                currentPage: parseInt(req.query.page) || 1,
                customers,
            },
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data customer',
            errors: error.message,
        });
    }
};

/**
 * Mendapatkan customer berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCustomerById = async (req, res) => {
    try {
        const customer = await User.findOne({
            where: {
                id: req.params.id,
                role: 'customer', // Pastikan role adalah 'customer'
            },
        });

        if (!customer) {
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data customer',
            data: customer,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data customer',
            errors: error.message,
        });
    }
};

/**
 * Menambahkan customer baru
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createCustomer = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const customer = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'customer',
        });

        return response(res, {
            statusCode: 201,
            message: 'Customer berhasil ditambahkan',
            data: customer,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan customer',
            errors: error.message,
        });
    }
};

/**
 * Mengupdate customer berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone } = req.body;

        const customer = await User.findOne({
            where: {
                id,
                role: 'customer', // Pastikan role adalah 'customer'
            },
        });

        if (!customer) {
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            customer.password = hashedPassword;
        }

        await customer.update({
            name,
            email,
            phone,
        });

        return response(res, {
            statusCode: 200,
            message: 'Customer berhasil diupdate',
            data: customer,
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengupdate customer',
            errors: error.message,
        });
    }
};

/**
 * Menghapus customer berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await User.findOne({
            where: {
                id,
                role: 'customer', // Pastikan role adalah 'customer'
            },
        });

        if (!customer) {
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        await customer.destroy();

        return response(res, {
            statusCode: 200,
            message: 'Customer berhasil dihapus',
        });
    } catch (error) {
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menghapus customer',
            errors: error.message,
        });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};