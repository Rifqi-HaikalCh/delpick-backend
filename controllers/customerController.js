'use strict';

const { User } = require('../models');
const { getQueryOptions } = require('../utils/queryHelper');
const response = require('../utils/response');
const bcrypt = require('bcryptjs');
const { saveBase64Image } = require('../utils/imageHelper');
const { logger } = require('../utils/logger');

/**
 * Get all customers
 */
const getAllCustomers = async (req, res) => {
    try {
        logger.info('Get all customers request');
        const queryOptions = getQueryOptions(req.query);

        // Filter hanya untuk role 'customer'
        queryOptions.where = { role: 'customer' };

        const { count, rows: customers } = await User.findAndCountAll(queryOptions);

        logger.info('Successfully retrieved customers', { count });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data customer',
            data: {
                total_items: count,
                total_pages: Math.ceil(count / queryOptions.limit),
                current_page: parseInt(req.query.page) || 1,
                customers,
            },
        });
    } catch (error) {
        logger.error('Error getting customers:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data customer',
            errors: error.message,
        });
    }
};

/**
 * Get customer by ID
 */
const getCustomerById = async (req, res) => {
    try {
        logger.info('Get customer by ID request:', { customer_id: req.params.id });
        const customer = await User.findOne({
            where: {
                id: req.params.id,
                role: 'customer',
            },
        });

        if (!customer) {
            logger.warn('Customer not found:', { customer_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        logger.info('Successfully retrieved customer:', { customer_id: customer.id });
        return response(res, {
            statusCode: 200,
            message: 'Berhasil mendapatkan data customer',
            data: customer,
        });
    } catch (error) {
        logger.error('Error getting customer by ID:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat mengambil data customer',
            errors: error.message,
        });
    }
};

/**
 * Create new customer
 */
const createCustomer = async (req, res) => {
    try {
        logger.info('Create customer request:', { email: req.body.email });
        const { name, email, password, phone, image } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        let imagePath = null;
        if (image && image.startsWith('data:image')) {
            imagePath = saveBase64Image(image, 'users', 'avatar');
        }

        const customer = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'customer',
            avatar: imagePath
        });

        logger.info('Customer created successfully:', { customer_id: customer.id });
        return response(res, {
            statusCode: 201,
            message: 'Customer berhasil ditambahkan',
            data: customer,
        });
    } catch (error) {
        logger.error('Error creating customer:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat menambahkan customer',
            errors: error.message,
        });
    }
};

/**
 * Update customer
 */
const updateCustomer = async (req, res) => {
    try {
        logger.info('Update customer request:', { customer_id: req.params.id });
        const { name, email, phone, image } = req.body;
        const customer = await User.findOne({
            where: {
                id: req.params.id,
                role: 'customer',
            },
        });

        if (!customer) {
            logger.warn('Customer not found:', { customer_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        const updateData = { name, email, phone };

        if (image && image.startsWith('data:image')) {
            updateData.avatar = saveBase64Image(image, 'users', 'avatar');
        }

        await customer.update(updateData);

        logger.info('Customer updated successfully:', { customer_id: customer.id });
        return response(res, {
            statusCode: 200,
            message: 'Customer berhasil diperbarui',
            data: customer,
        });
    } catch (error) {
        logger.error('Error updating customer:', { error: error.message, stack: error.stack });
        return response(res, {
            statusCode: 500,
            message: 'Terjadi kesalahan saat memperbarui customer',
            errors: error.message,
        });
    }
};

/**
 * Delete customer
 */
const deleteCustomer = async (req, res) => {
    try {
        logger.info('Delete customer request:', { customer_id: req.params.id });
        const customer = await User.findOne({
            where: {
                id: req.params.id,
                role: 'customer',
            },
        });

        if (!customer) {
            logger.warn('Customer not found:', { customer_id: req.params.id });
            return response(res, {
                statusCode: 404,
                message: 'Customer tidak ditemukan',
            });
        }

        await customer.destroy();

        logger.info('Customer deleted successfully:', { customer_id: req.params.id });
        return response(res, {
            statusCode: 200,
            message: 'Customer berhasil dihapus',
        });
    } catch (error) {
        logger.error('Error deleting customer:', { error: error.message, stack: error.stack });
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
    deleteCustomer
};