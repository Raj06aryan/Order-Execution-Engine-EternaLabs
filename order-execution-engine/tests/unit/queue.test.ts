import { Worker } from 'bullmq';
import { redis } from '../../src/config/redis';
import { addOrderToQueue, orderQueue, ORDER_QUEUE_NAME } from '../../src/services/queue/orderQueue';
import { setupOrderWorker } from '../../src/services/queue/orderWorker';
import { query } from '../../src/db/client';

// Mock DB and Redis
jest.mock('../../src/db/client');
jest.mock('../../src/config/redis', () => ({
    redis: {
        on: jest.fn(),
        quit: jest.fn(),
        duplicate: jest.fn(() => ({
            on: jest.fn(),
            quit: jest.fn(),
            connect: jest.fn(),
        })),
    }
}));

// Mock BullMQ
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
        })),
        Worker: jest.fn().mockImplementation(() => {
            return {
                on: jest.fn(),
                close: jest.fn(),
                run: jest.fn(),
            };
        }),
    };
});

describe('Queue Behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should add order to queue', async () => {
        await addOrderToQueue('order-123', { tokenIn: 'SOL', amountIn: 10 });

        const mockQueueInstance = (orderQueue as any);
        expect(mockQueueInstance.add).toHaveBeenCalledWith(
            'execute-order',
            expect.objectContaining({ orderId: 'order-123' }),
            expect.objectContaining({ attempts: 3 })
        );
    });

    test('should configure worker with concurrency of 10', () => {
        setupOrderWorker();
        expect(Worker).toHaveBeenCalledWith(
            ORDER_QUEUE_NAME,
            expect.any(Function),
            expect.objectContaining({
                connection: expect.anything(),
                concurrency: 10
            })
        );

        const workerInstance = (Worker as unknown as jest.Mock).mock.results[0].value;
        expect(workerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
        expect(workerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
});