import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const getRedisConfig = () => {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.log('Using Upstash Redis credentials');
        try {
            const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
            return {
                host: url.hostname,
                port: 6379, 
                password: process.env.UPSTASH_REDIS_REST_TOKEN,
                tls: {} 
            };
        } catch (e) {
            console.error('Failed to parse Upstash URL, falling back to standard config');
        }
    }

    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined
    };
};

const config = getRedisConfig();

export const redis = new Redis({
    ...config,
    maxRetriesPerRequest: null, 
});