import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { initializeSocketServer } from "./server";

// This is a modified entry point specifically for Vercel
const app = express();

// Apply CORS middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*",
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
    env: process.env.NODE_ENV || "development",
  });
});

// Start the server if not being imported
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
export default app;
