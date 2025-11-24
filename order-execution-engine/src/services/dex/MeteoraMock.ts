import { DexRouter, Quote } from './types';

export class MeteoraMock implements DexRouter {
    name = 'Meteora';

    async getQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote> {
        await new Promise(resolve => setTimeout(resolve, 200));

        // Mock price: slightly different from Raydium
        const basePrice = 145;
        const variance = (Math.random() * 4 - 2); // +/- 2 (higher volatility)
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
            txHash: `meteora_tx_${Math.random().toString(36).substring(7)}`,
            status: 'success'
        };
    }
}