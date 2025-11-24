import axios from 'axios';

// 🚀 CHANGE THIS TO YOUR DEPLOYED URL FOR THE VIDEO
const API_URL = 'https://order-execution-engine-eternalabs-production.up.railway.app/orders';
// const API_URL = 'http://localhost:3000/orders'; 

const TOTAL_ORDERS = 10;

async function sendOrder(i: number) {
    try {
        const payload = {
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amountIn: 1 + i, // Different amount for each order
            userId: `user_${i}`
        };

        const start = Date.now();
        const response = await axios.post(API_URL, payload);
        const duration = Date.now() - start;

        console.log(`[Order ${i}] Sent! Status: ${response.status} (Took ${duration}ms) - ID: ${response.data.orderId}`);
    } catch (error: any) {
        console.error(`[Order ${i}] Failed:`, error.message);
    }
}

async function run() {
    console.log(`🚀 Starting concurrency test with ${TOTAL_ORDERS} orders against ${API_URL}...`);

    const promises = [];
    for (let i = 0; i < TOTAL_ORDERS; i++) {
        promises.push(sendOrder(i));
    }

    await Promise.all(promises);
    console.log('✅ All orders submitted!');
}

run();
