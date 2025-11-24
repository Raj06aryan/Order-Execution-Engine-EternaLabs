export interface Quote {
    dex: string;
    price: number;
    amountOut: number;
}

export interface DexRouter {
    name: string;
    getQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote>;
    executeSwap(orderId: string, quote: Quote): Promise<{ txHash: string; status: 'success' | 'failed' }>;
}