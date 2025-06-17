'use strict';

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errors');
const { User } = require('../models');
const { logger } = require('../utils/logger');

const protect = async (req, res, next) => {
    try {
        // 1) Get token and check if it exists
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AuthenticationError('You are not logged in'));
        }

        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return next(new AuthenticationError('User no longer exists'));
        }

        // 4) Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        next(new AuthenticationError('Invalid token'));
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AuthenticationError('You do not have permission to perform this action'));
        }
        next();
    };
};

module.exports = {
    protect,
    restrictTo
}; 