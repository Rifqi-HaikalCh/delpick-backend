'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const errorHandler = require('./middleware/errorMiddleware');
const notFoundHandler = require('./middleware/notFoundMiddleware');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDef = require('./swaggerDef');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(mongoSanitize());
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

if (process.env.NODE_ENV !== 'development') {
    app.use('/api/', limiter);
}

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Mount API routes
app.use('/api', routes);

// Swagger UI
const swaggerOptions = {
    swaggerDefinition: swaggerDef,
    apis: ['./routes/v1/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown & process background handler
const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    // Tutup koneksi database jika ada
    if (app.locals.sequelize) {
        app.locals.sequelize.close().then(() => {
            console.log('Database connection closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Tampilkan log lokasi dokumentasi Swagger saat server dijalankan
if (require.main === module) {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`API server running on http://localhost:${port}`);
        console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
    });
}

module.exports = app;
