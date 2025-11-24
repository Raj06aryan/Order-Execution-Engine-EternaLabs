import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { ORDER_QUEUE_NAME } from './orderQueue';
import { query } from '../../db/client';
import { SmartRouter } from '../dex/SmartRouter';
import { connectionManager } from '../websocket/connectionManager';
import { RetryableError, FatalError } from '../../utils/errors';

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
                // Simulate a random network error for testing retry logic
                if (Math.random() < 0.1) { // 10% chance of network failure
                    throw new RetryableError('Network glitch: Failed to fetch quotes');
                }

                console.log(`🔍 Finding best route for ${amountIn} ${tokenIn} -> ${tokenOut}...`);
                const bestQuote = await smartRouter.getBestQuote(tokenIn, tokenOut, amountIn);

                if (!bestQuote) {
                    throw new FatalError('No liquidity found for this pair');
                }

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
                    throw new RetryableError('Trade execution failed on DEX');
                }

            } catch (error: any) {
                console.error(`❌ Order ${orderId} failed:`, error.message);

                const isRetryable = error instanceof RetryableError || error.name === 'RetryableError';
                const status = isRetryable ? 'pending_retry' : 'failed';

                // Update DB with error reason
                await query(
                    'UPDATE orders SET status = $1, error_reason = $2, retry_count = retry_count + 1 WHERE order_id = $3',
                    [status === 'pending_retry' ? 'processing' : 'failed', error.message, orderId]
                );

                // WS Update: Failed
                connectionManager.sendUpdate(userId, {
                    type: 'ORDER_UPDATE',
                    orderId,
                    status: 'failed',
                    error: error.message,
                    isRetryable
                });

                // Re-throw if retryable so BullMQ knows to retry
                if (isRetryable) {
                    throw error;
                }
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