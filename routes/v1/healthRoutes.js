'use strict';

const express = require('express');
const router = express.Router();
const healthController = require('../../controllers/healthController');
const { requestLogger } = require('../../middleware/requestMiddleware');

// Health check routes
router.use(requestLogger);
router.get('/', healthController.check_health);
router.get('/db', healthController.check_database);
router.get('/cache', healthController.check_cache);
router.get('/storage', healthController.check_storage);

module.exports = router;
