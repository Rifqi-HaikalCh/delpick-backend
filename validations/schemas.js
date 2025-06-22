'use strict';

const Joi = require('joi');

// Custom validation messages
const messages = {
    'number.min': '{{#label}} harus lebih besar dari {{#limit}}',
    'number.max': '{{#label}} harus lebih kecil dari {{#limit}}',
    'string.pattern.base': '{{#label}} harus sesuai format yang ditentukan',
    'any.required': '{{#label}} harus diisi',
    'string.email': '{{#label}} harus berupa email yang valid',
    'string.min': '{{#label}} minimal {{#limit}} karakter',
    'string.max': '{{#label}} maksimal {{#limit}} karakter'
};

const schemas = {
    auth: {
        login: Joi.object({
            email: Joi.string().email().required().messages(messages),
            password: Joi.string().min(6).required().messages(messages)
        }),
        register: Joi.object({
            name: Joi.string().min(3).max(50).required().messages(messages),
            email: Joi.string().email().required().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages(messages),
            password: Joi.string().min(6).max(50).required().messages(messages),
            role: Joi.string().valid('customer', 'store', 'driver').required().messages(messages)
        }),
        forgotPassword: Joi.object({
            email: Joi.string().email().required().messages(messages)
        }),
        resetPassword: Joi.object({
            token: Joi.string().required().messages(messages),
            password: Joi.string().min(6).max(50).required().messages(messages)
        })
    },

    user: {
        update: Joi.object({
            name: Joi.string().min(3).max(50).messages(messages),
            email: Joi.string().email().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).messages(messages),
            avatar: Joi.string().messages(messages),
            fcm_token: Joi.string().allow('', null).messages(messages)
        }),
        updateFcmToken: Joi.object({
            fcm_token: Joi.string().required().messages(messages)
        })
    },

    store: {
        create: Joi.object({
            name: Joi.string().min(3).max(100).required().messages(messages),
            address: Joi.string().required().messages(messages),
            description: Joi.string().allow('').messages(messages),
            open_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages(messages),
            close_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages(messages),
            image: Joi.string().uri().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages(messages),
            latitude: Joi.number().min(-90).max(90).messages(messages),
            longitude: Joi.number().min(-180).max(180).messages(messages),
            status: Joi.string().valid('active', 'inactive').default('active').messages(messages),
            password: Joi.string().min(6).max(50).required().messages(messages)
        }),
        update: Joi.object({
            name: Joi.string().min(3).max(100).messages(messages),
            address: Joi.string().messages(messages),
            description: Joi.string().allow('').messages(messages),
            open_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).messages(messages),
            close_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).messages(messages),
            image: Joi.string().uri().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).messages(messages),
            latitude: Joi.number().min(-90).max(90).messages(messages),
            longitude: Joi.number().min(-180).max(180).messages(messages),
            status: Joi.string().valid('active', 'inactive').messages(messages)
        }),
        updateStatus: Joi.object({
            status: Joi.string().valid('active', 'inactive').required().messages(messages)
        })
    },

    driver: {
        create: Joi.object({
            license_number: Joi.string().required().messages(messages),
            vehicle_plate: Joi.string().required().messages(messages),
        }),
        update: Joi.object({
            license_number: Joi.string().messages(messages),
            vehicle_plate: Joi.string().messages(messages),
            status: Joi.string().valid('active', 'inactive', 'busy').messages(messages),
            latitude: Joi.number().min(-90).max(90).messages(messages),
            longitude: Joi.number().min(-180).max(180).messages(messages)
        }),
        location: Joi.object({
            latitude: Joi.number().min(-90).max(90).required().messages(messages),
            longitude: Joi.number().min(-180).max(180).required().messages(messages),
        }),
        respondRequest: Joi.object({
            action: Joi.string().valid('accept', 'reject').required().messages(messages),
        })
    },

    customer: {
        create: Joi.object({
            name: Joi.string().min(3).max(50).required().messages(messages),
            email: Joi.string().email().required().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).required().messages(messages),
            password: Joi.string().min(6).max(50).required().messages(messages),
            avatar: Joi.string().uri().messages(messages),
            address: Joi.string().max(255).messages(messages)
        }),
        update: Joi.object({
            name: Joi.string().min(3).max(50).messages(messages),
            email: Joi.string().email().messages(messages),
            phone: Joi.string().pattern(/^[0-9]{10,13}$/).messages(messages),
            avatar: Joi.string().uri().messages(messages),
            address: Joi.string().max(255).messages(messages)
        })
    },

    order: {
        create: Joi.object({
            store_id: Joi.number().integer().required().messages(messages),
            items: Joi.array().items(
                Joi.object({
                    menu_item_id: Joi.number().integer().required().messages(messages),
                    quantity: Joi.number().integer().min(1).required().messages(messages),
                    notes: Joi.string().allow('').messages(messages)
                })
            ).min(1).required().messages(messages)
        }),
        update: Joi.object({
            order_status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled', 'rejected').messages(messages),
            delivery_status: Joi.string().valid('pending', 'picked_up', 'on_way', 'delivered').messages(messages),
            driverId: Joi.number().integer().messages(messages),
            tracking_updates: Joi.array().messages(messages)
        }),
        item: Joi.object({
            quantity: Joi.number().min(1).max(100).required().messages(messages),
            notes: Joi.string().max(255).messages(messages)
        }),
        review: Joi.object({
            rating: Joi.number().min(1).max(5).required().messages(messages),
            comment: Joi.string().max(500).messages(messages)
        }),
        process: Joi.object({
            action: Joi.string().valid('approve', 'reject').required().messages(messages)
        })
    },

    orderReview: {
        create: Joi.object({
            rating: Joi.number().integer().min(1).max(5).required().messages(messages),
            comment: Joi.string().allow('').messages(messages)
        })
    },

    driverReview: {
        create: Joi.object({
            rating: Joi.number().integer().min(1).max(5).required().messages(messages),
            comment: Joi.string().allow('').messages(messages)
        })
    },

    menu: {
        create: Joi.object({
            name: Joi.string().min(3).max(100).required().messages(messages),
            price: Joi.number().min(0).required().messages(messages),
            description: Joi.string().allow('').messages(messages),
            image: Joi.string().uri().messages(messages),
            quantity: Joi.number().integer().min(0).messages(messages),
            isAvailable: Joi.boolean().required().messages(messages),
            category: Joi.string().required().messages(messages)
        }),
        update: Joi.object({
            name: Joi.string().min(3).max(100).messages(messages),
            price: Joi.number().min(0).messages(messages),
            description: Joi.string().allow('').messages(messages),
            image: Joi.string().uri().messages(messages),
            quantity: Joi.number().integer().min(0).messages(messages),
            isAvailable: Joi.boolean().messages(messages),
            category: Joi.string().messages(messages)
        }),
        updateStatus: Joi.object({
            isAvailable: Joi.boolean().required().messages(messages)
        })
    }
};

// Tambahkan schema gabungan SETELAH schemas selesai
schemas.review = {
    combined: Joi.object({
        order_review: schemas.orderReview.create.required().messages(messages),
        driver_review: schemas.driverReview.create.required().messages(messages)
    })
};

module.exports = schemas; 