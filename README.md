# Order Execution Engine

### 🚀 Live Deployment

**Base URL:** `https://order-execution-engine-eternalabs-production.up.railway.app`

A high-frequency trading (HFT) style order execution engine built with Node.js, Fastify, BullMQ, and PostgreSQL. This system simulates routing orders to Solana DEXs (Raydium and Meteora) to find the best price execution.

## 🚀 Features

- **High Performance API**: Built with Fastify for low overhead.
- **Asynchronous Processing**: Uses BullMQ (Redis) to decouple order ingestion from execution.
- **Smart Routing**: "Mock" router compares prices across multiple DEXs and executes on the best one.
- **Real-time Updates**: WebSocket streaming for instant order status feedback (Pending -> Processing -> Completed).
- **Reliability**: Automatic retries with exponential backoff for failed trades.
- **Persistence**: PostgreSQL storage for order history and audit trails.

## 🛠 Tech Stack

- **Language**: TypeScript
- **Server**: Fastify
- **Queue**: BullMQ + Redis (Upstash)
- **Database**: PostgreSQL (Neon)
- **Deployment**: Docker ready

## 🏗 Architecture

1. **Ingestion**: User submits an order via HTTP POST.
2. **Queueing**: Order is validated, saved to DB, and pushed to Redis Queue.
3. **Processing**: Worker picks up the job.
4. **Routing**: Smart Router queries "Mock" DEXs for quotes.
5. **Execution**: Trade is executed on the best DEX.
6. **Notification**: Status updates are pushed to the user via WebSockets.

## 📦 Setup & Run

1. **Install Dependencies**

   ```bash
   cd order-execution-engine
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in `order-execution-engine/`:

   ```env
   PORT=3000
   DATABASE_URL=postgres://... (Neon URL)
   REDIS_HOST=... (Upstash URL)
   REDIS_PASSWORD=... (Upstash Token)
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🧪 API Documentation

### 1. Create Order

- **Endpoint**: `POST /orders`
- **Body**:
  ```json
  {
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 10,
    "userId": "user_123"
  }
  ```

### 2. WebSocket Updates

- **URL**: `ws://localhost:3000/ws?userId=user_123`
- **Events**:
  - `ORDER_UPDATE`: Contains `status` (processing, completed, failed), `txHash`, and `executionPrice`.

## 💡 Design Decisions

### Why Market Orders?

I chose to implement **Market Orders** for this MVP because they represent the core "atomic" unit of any trading system. Limit and Sniper orders ultimately resolve into Market orders once their trigger conditions are met. By perfecting the immediate execution flow (Routing -> Execution -> Settlement), we build a solid foundation for more complex order types.

### Extensibility: Adding Limit & Sniper Orders

This engine is designed to be easily extended:

1.  **Limit Orders**: We would add a `targetPrice` field to the Order model. Instead of processing immediately, the worker would check the current price. If `current < target`, it would re-queue the job with a delay (or use a separate "Price Watcher" service) until the condition is met.
2.  **Sniper Orders**: Similar to Limit orders, but triggered by an on-chain event (like a `LiquidityAdded` event). We would add a listener service that watches the blockchain and injects the order into the high-priority queue the moment the event is detected.

## 🛡 Error Handling

- **Retryable Errors** (e.g., Network Glitch): Automatically retried up to 3 times with exponential backoff.
- **Fatal Errors** (e.g., No Liquidity): Marked as failed immediately.
- **Post-Mortem**: All failure reasons are logged to the `error_reason` column in the database.
