const Bull = require('bull');

const { findDriverInBackground } = require('./controllers/orderController');
const orderQueue = new Bull('order-queue', {
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});
orderQueue.process('find-driver', async (job) => {
    const { storeId, orderId } = job.data;
    await findDriverInBackground(storeId, orderId);
});