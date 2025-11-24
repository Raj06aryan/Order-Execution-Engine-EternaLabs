import { DexRouter, Quote } from './types';
import { RaydiumMock } from './RaydiumMock';
import { MeteoraMock } from './MeteoraMock';

export class SmartRouter {
    private routers: DexRouter[];

    constructor() {
        this.routers = [new RaydiumMock(), new MeteoraMock()];
    }

    async getBestQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote> {
        const quotes = await Promise.all(
            this.routers.map(router => router.getQuote(tokenIn, tokenOut, amountIn))
        );

        // Sort by amountOut descending (best return)
        quotes.sort((a, b) => b.amountOut - a.amountOut);

        return quotes[0];
    }

    async executeTrade(orderId: string, quote: Quote) {
        const router = this.routers.find(r => r.name === quote.dex);
        if (!router) throw new Error(`Router ${quote.dex} not found`);

        return router.executeSwap(orderId, quote);
    }
}