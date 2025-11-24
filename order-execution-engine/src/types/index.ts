export interface OrderRequest {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    userId: string;
}

export interface Order extends OrderRequest {
    id: number;
    orderId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
}