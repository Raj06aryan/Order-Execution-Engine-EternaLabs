import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { ORDER_QUEUE_NAME } from './orderQueue';
import { query } from '../../db/client';

export const setupOrderWorker = () => {
  const worker = new Worker(
    ORDER_QUEUE_NAME,
    async (job: Job) => {
      console.log(`Processing order ${job.data.orderId}...`);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update status in DB to 'processing'
      await query('UPDATE orders SET status = $1 WHERE order_id = $2', ['processing', job.data.orderId]);

      // TODO: Call DEX Router here (Task 5)
      console.log(`Order ${job.data.orderId} processed successfully (Mock)`);

      // Update status in DB to 'completed'
      await query('UPDATE orders SET status = $1 WHERE order_id = $2', ['completed', job.data.orderId]);
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