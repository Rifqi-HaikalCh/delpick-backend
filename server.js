const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { initSocketIO } = require('./utils/socketUtils');

// Get the port and URLs from environment variables
const PORT = Number(process.env.APP_PORT);
const APP_URL = process.env.APP_URL;
const APP_DOCS_URL = process.env.APP_DOCS_URL;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Start the server
server.listen(PORT, () => {
    logger.info(`Server running on ${APP_URL}`);
    logger.info(`Documentation available at ${APP_DOCS_URL}`);
}).on('error', (err) => {
    logger.error(`Failed to start server: ${err.message}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
});