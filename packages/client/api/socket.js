import { Server } from "socket.io";

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  const io = new Server(res.socket.server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  res.socket.server.io = io;

  // Import the server-side game logic
  const { initializeSocketServer } = require("../../server/dist/server");

  // Initialize the Socket.IO server with our game logic
  initializeSocketServer(io);

  console.log("Socket server initialized");
  res.end();
}
