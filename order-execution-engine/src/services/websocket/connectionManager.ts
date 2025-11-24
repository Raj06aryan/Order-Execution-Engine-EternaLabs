import { WebSocket } from 'ws';

class ConnectionManager {
    private connections: Map<string, WebSocket> = new Map();

    addConnection(userId: string, socket: WebSocket) {
        this.connections.set(userId, socket);
        console.log(`🔌 User ${userId} connected via WebSocket`);

        socket.on('close', () => {
            this.connections.delete(userId);
            console.log(`🔌 User ${userId} disconnected`);
        });
    }

    sendUpdate(userId: string, message: any) {
        const socket = this.connections.get(userId);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }
}

export const connectionManager = new ConnectionManager();