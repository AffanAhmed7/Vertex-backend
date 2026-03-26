import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io: SocketServer;
const userSockets = new Map<string, string[]>(); // userId -> socketIds[]

export function initSocket(server: HttpServer) {
    io = new SocketServer(server, {
        cors: {
            origin: config.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;
            (socket as any).user = decoded;
            next();
        } catch {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const user = (socket as any).user;
        const userId = user.id;
        const role = user.role;

        logger.info({ userId, role, socketId: socket.id }, 'User connected');

        // Join room based on role
        if (role === 'ADMIN') {
            socket.join('admins');
        }

        // Track user socket
        const existing = userSockets.get(userId) || [];
        userSockets.set(userId, [...existing, socket.id]);

        socket.on('disconnect', () => {
            logger.info({ userId, socketId: socket.id }, 'User disconnected');
            const updated = (userSockets.get(userId) || []).filter(id => id !== socket.id);
            if (updated.length > 0) {
                userSockets.set(userId, updated);
            } else {
                userSockets.delete(userId);
            }
        });
    });

    return io;
}

/**
 * Send notification to a specific user
 */
export function sendUserNotification(userId: string, event: string, payload: any) {
    if (!io) return;
    const socketIds = userSockets.get(userId);
    if (socketIds) {
        socketIds.forEach(id => {
            io.to(id).emit(event, { success: true, type: event, data: payload });
        });
    }
}

/**
 * Send notification to all connected admins
 */
export function sendAdminNotification(event: string, payload: any) {
    if (!io) return;
    io.to('admins').emit(event, { success: true, type: event, data: payload });
}
