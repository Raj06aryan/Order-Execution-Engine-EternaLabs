import { DexRouter, Quote } from './types';

export class RaydiumMock implements DexRouter {
    name = 'Raydium';

    async getQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));

        // Mock price: 1 SOL = 145 USDC (with some random variance)
        const basePrice = 145;
        const variance = (Math.random() * 2 - 1); // +/- 1
        const price = basePrice + variance;

        return {
            dex: this.name,
            price: price,
            amountOut: amountIn * price
        };
    }

    async executeSwap(orderId: string, quote: Quote): Promise<{ txHash: string; status: 'success' | 'failed' }> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            txHash: `raydium_tx_${Math.random().toString(36).substring(7)}`,
            status: 'success'
        };
    }
}