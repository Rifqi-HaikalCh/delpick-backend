const express = require('express');
const fs = require('fs');
const yaml = require('yaml');
const swaggerUi = require('swagger-ui-express');

const apiRouter = require('./routes/index');
const requestMiddleware = require('./middlewares/requestMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
// Load Swagger YAML file
const swaggerFile = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = yaml.parse(swaggerFile);

// Create an Express application
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to log each request
app.use(requestMiddleware);

// Routes
app.use('/api/v1', apiRouter);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware to handle errors
app.use(errorMiddleware);

// Export the Express application
module.exports = app;
