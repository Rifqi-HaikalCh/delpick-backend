module.exports = {
    openapi: '3.0.0',
    info: {
        title: 'DelPick API',
        version: '1.0.0',
        description: 'API documentation for DelPick food delivery platform',
    },
    servers: [
        { url: 'http://localhost:6100/api/v1', description: 'Development server' },
        { url: 'https://delpick.horas-code.my.id/api/v1', description: 'Production server' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
    }
}; 