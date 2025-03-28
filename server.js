const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { initSocketIO } = require('./utils/socketUtils'); // Impor fungsi inisialisasi Socket.IO

// Get the port from environment variables
const PORT = Number(process.env.APP_PORT);

// Create HTTP server
const server = http.createServer(app);

// Inisialisasi Socket.IO
initSocketIO(server);

// Start the server
server.listen(PORT, () => {
    logger.info(`Server running on https://delpick.fun/${PORT}`);
    logger.info(`Documentation available at https://delpick.fun/${PORT}/api-docs`);
}).on('error', (err) => {
    logger.error(`Failed to start server: ${err.message}`);
});