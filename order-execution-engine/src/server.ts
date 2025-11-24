import Fastify from 'fastify';
import dotenv from 'dotenv';
import { pool } from './db/client';
import { redis } from './config/redis';
import fs from 'fs';
import path from 'path';
import routes from './routes';
import { setupOrderWorker } from './services/queue/orderWorker';
import websocket from '@fastify/websocket';
import { connectionManager } from './services/websocket/connectionManager';

dotenv.config();

const server = Fastify({
    logger: true
});

server.register(websocket);
server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        // Simple auth: expect ?userId=123 in query params
        const query = req.query as { userId?: string };
        const userId = query.userId;

        if (!userId) {
            connection.close();
            return;
        }

        connectionManager.addConnection(userId, connection);
    });
});

server.register(routes);

server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
}); const start = async () => {
    try {
        // Test DB Connection
        const dbRes = await pool.query('SELECT NOW()');
        console.log('Connected to PostgreSQL (Neon):', dbRes.rows[0].now);

        // Run Migration
        const migrationPath = path.join(__dirname, 'db/migrations/001_create_orders_table.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        await pool.query(migrationSql);
        console.log('Database migrations applied');

        // Test Redis Connection
        await redis.ping();
        console.log('✅ Connected to Redis');

        // Start Worker
        setupOrderWorker();

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on port ${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();