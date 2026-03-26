import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";
import { envVars } from "../config/env";
import { chatService } from "../module/chat/chat.service";
import { jwtUtils } from "../utils/jwt";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        envVars.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5000",
      ],
      credentials: true,
    },
  });

  // Auth middleware — try session token first, then accessToken JWT (same as checkAuth)
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookieStr = socket.handshake.headers?.cookie || "";

      // --- Attempt 1: better-auth.session_token ---
      const sessionMatch = cookieStr.match(
        /better-auth\.session_token=([^;]+)/,
      );
      if (sessionMatch) {
        const sessionToken = decodeURIComponent(sessionMatch[1]);
        const session = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: { gt: new Date() },
          },
          include: { user: true },
        });

        if (session?.user) {
          socket.userId = session.user.id;
          return next();
        }
      }

      // --- Attempt 2: accessToken JWT (fallback for Google login users) ---
      const accessMatch = cookieStr.match(/accessToken=([^;]+)/);
      const accessToken =
        socket.handshake.auth?.token ||
        (accessMatch ? decodeURIComponent(accessMatch[1]) : null);

      if (accessToken) {
        const verified = jwtUtils.verifyToken(
          accessToken,
          envVars.ACCESS_TOKEN_SECRET,
        );

        if (verified.success && verified.data) {
          socket.userId = verified.data.userId as string;
          return next();
        }
      }

      return next(new Error("Authentication required"));
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`User ${userId} connected via socket ${socket.id}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // --- Join conversation room ---
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined room: conversation:${conversationId}`);
    });

    // --- Leave conversation room ---
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // --- Send message ---
    socket.on(
      "send-message",
      async (data: { conversationId: string; content: string }) => {
        try {
          const message = await chatService.sendMessage(
            data.conversationId,
            userId,
            data.content,
          );

          const roomName = `conversation:${data.conversationId}`;
          const room = io.sockets.adapter.rooms.get(roomName);
          console.log(`Room ${roomName} members: ${room?.size || 0}`);

          // Emit to everyone in the conversation room (including sender)
          io.in(roomName).emit("new-message", message);

          // Also notify the other user if they're not in the room
          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
          });

          if (conversation) {
            const recipientId =
              conversation.userId === userId
                ? conversation.organizerId
                : conversation.userId;

            const recipientSockets = onlineUsers.get(recipientId);
            if (recipientSockets) {
              recipientSockets.forEach((socketId) => {
                io.to(socketId).emit("message-notification", {
                  conversationId: data.conversationId,
                  message,
                });
              });
            }
          }
        } catch (error) {
          socket.emit("error", {
            message:
              error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },
    );

    // --- Mark messages as read ---
    socket.on("mark-read", async (conversationId: string) => {
      try {
        await chatService.markMessagesAsRead(conversationId, userId);

        // Notify the other user that messages were read
        io.to(`conversation:${conversationId}`).emit("messages-read", {
          conversationId,
          readBy: userId,
        });
      } catch (error) {
        socket.emit("error", {
          message:
            error instanceof Error
              ? error.message
              : "Failed to mark messages as read",
        });
      }
    });

    // --- Typing indicator (exclude sender — only other person sees it) ---
    socket.on("typing", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId,
      });
    });

    socket.on("stop-typing", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user-stop-typing", {
        conversationId,
        userId,
      });
    });

    // --- Check if user is online ---
    socket.on("check-online", (targetUserId: string) => {
      const isOnline = onlineUsers.has(targetUserId);
      socket.emit("user-online-status", {
        userId: targetUserId,
        isOnline,
      });
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected socket ${socket.id}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
    });
  });

  return io;
};
