import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/client';
import { OrderRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addOrderToQueue } from '../services/queue/orderQueue';

export const createOrder = async (request: FastifyRequest<{ Body: OrderRequest }>, reply: FastifyReply) => {
    const { tokenIn, tokenOut, amountIn, userId } = request.body;

    if (!tokenIn || !tokenOut || !amountIn || !userId) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    const orderId = uuidv4();

    try {
        // 1. Save to Database
        const result = await query(
            `INSERT INTO orders (order_id, user_id, token_in, token_out, amount_in, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
            [orderId, userId, tokenIn, tokenOut, amountIn]
        );

        const order = result.rows[0];

        // 2. Add to BullMQ Queue
        await addOrderToQueue(orderId, {
            tokenIn,
            tokenOut,
            amountIn,
            userId
        });

        console.log(`Order received: ${orderId}`);

        return reply.status(201).send({
            message: 'Order received',
            orderId: order.order_id,
            status: order.status
        });

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
}; export const getOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const result = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
        return reply.send(result.rows);
    } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to fetch orders' });
    }
};