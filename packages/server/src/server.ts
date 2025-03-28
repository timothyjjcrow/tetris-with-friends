import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameManager } from "./game/GameManager";

const PORT = process.env.PORT || 3001;

// Create a function to initialize the socket server
export function initializeSocketServer(io: Server) {
  // Create a new instance of the game manager
  const gameManager = new GameManager(io);

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Initialize game state for this player
    gameManager.handleConnection(socket);

    // Log errors
    socket.on("error", (error) => {
      console.error(`Socket error from ${socket.id}:`, error);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      gameManager.handleDisconnection(socket.id);
    });
  });

  return io;
}

// Only run the server directly if not being imported
if (require.main === module) {
  const app = express();
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? [/\.vercel\.app$/, /localhost/] // Allow all Vercel subdomains and localhost
          : [
              "http://localhost:3000",
              "http://127.0.0.1:3000",
              "http://localhost:3001",
              "http://localhost:3002",
              "http://localhost:3003",
              "http://localhost:3004",
              "http://localhost:3005",
              "http://localhost:3006",
            ],
      methods: ["GET", "POST"],
      credentials: true,
    })
  );

  // Create HTTP server
  const httpServer = createServer(app);

  // Create Socket.IO server with CORS configuration
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? [/\.vercel\.app$/, /localhost/] // Allow all Vercel subdomains and localhost
          : [
              "http://localhost:3000",
              "http://127.0.0.1:3000",
              "http://localhost:3001",
              "http://localhost:3002",
              "http://localhost:3003",
              "http://localhost:3004",
              "http://localhost:3005",
              "http://localhost:3006",
            ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize the Socket.IO server
  initializeSocketServer(io);

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint to get server status - useful for debugging
  app.get("/status", (_req, res) => {
    res.json({
      connections: io.sockets.sockets.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  });

  // Start the server
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
