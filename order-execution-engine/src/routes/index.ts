import { FastifyInstance } from 'fastify';
import { createOrder, getOrders } from '../controllers/orderController';

export default async function routes(fastify: FastifyInstance) {
    fastify.post('/orders', createOrder);
    fastify.get('/orders', getOrders);
}