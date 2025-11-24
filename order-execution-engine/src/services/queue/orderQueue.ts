import { Queue } from 'bullmq';
import { redis } from '../../config/redis';

export const ORDER_QUEUE_NAME = 'order-execution-queue';

export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
    connection: redis,
});

export const addOrderToQueue = async (orderId: string, orderData: any) => {
    await orderQueue.add('execute-order', { orderId, ...orderData }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    });
    console.log(`Job added to queue for order: ${orderId}`);
};