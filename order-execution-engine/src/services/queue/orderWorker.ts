import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { ORDER_QUEUE_NAME } from './orderQueue';
import { query } from '../../db/client';
import { SmartRouter } from '../dex/SmartRouter';
import { connectionManager } from '../websocket/connectionManager';

const smartRouter = new SmartRouter();

export const setupOrderWorker = () => {
    const worker = new Worker(
        ORDER_QUEUE_NAME,
        async (job: Job) => {
            const { orderId, tokenIn, tokenOut, amountIn, userId } = job.data;
            console.log(`Processing order ${orderId}...`);

            try {
                // Update status to processing
                await query('UPDATE orders SET status = $1 WHERE order_id = $2', ['processing', orderId]);

                // WS Update: Processing
                connectionManager.sendUpdate(userId, {
                    type: 'ORDER_UPDATE',
                    orderId,
                    status: 'processing'
                });

                // 1. Get Best Quote
                console.log(`🔍 Finding best route for ${amountIn} ${tokenIn} -> ${tokenOut}...`);
                const bestQuote = await smartRouter.getBestQuote(tokenIn, tokenOut, amountIn);
                console.log(`✅ Best route found: ${bestQuote.dex} @ ${bestQuote.price} (Out: ${bestQuote.amountOut})`);

                // 2. Execute Trade
                const result = await smartRouter.executeTrade(orderId, bestQuote);

                if (result.status === 'success') {
                    // 3. Update DB with success
                    await query(
                        `UPDATE orders 
             SET status = 'completed', execution_price = $1, tx_hash = $2, updated_at = NOW() 
             WHERE order_id = $3`,
                        [bestQuote.price, result.txHash, orderId]
                    );
                    console.log(`🎉 Order ${orderId} completed! Tx: ${result.txHash}`);

                    // WS Update: Completed
                    connectionManager.sendUpdate(userId, {
                        type: 'ORDER_UPDATE',
                        orderId,
                        status: 'completed',
                        txHash: result.txHash,
                        executionPrice: bestQuote.price
                    });
                } else {
                    throw new Error('Trade execution failed');
                }

            } catch (error: any) {
                console.error(`❌ Order ${orderId} failed:`, error);
                await query('UPDATE orders SET status = $1 WHERE order_id = $2', ['failed', orderId]);

                // WS Update: Failed
                connectionManager.sendUpdate(userId, {
                    type: 'ORDER_UPDATE',
                    orderId,
                    status: 'failed',
                    error: error.message
                });
            }
        },
        {
            connection: redis,
            concurrency: 5, // Process 5 orders at once
        }
    );

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed: ${err.message}`);
    });

    console.log('👷 Order Worker started');
};