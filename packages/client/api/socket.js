// This is the API route that will be used by Vercel
import { Server } from "socket.io";

export default function SocketHandler(req, res) {
  // Check if socket.io server already exists
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  console.log("Setting up Socket.IO server...");

  // Create a new Socket.IO server
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Store the io instance on the server
  res.socket.server.io = io;

  // Initialize the game logic - simplified for Vercel
  const initializeGameServer = () => {
    io.on("connection", (socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Simple game state to demonstrate functionality
      let gameState = {
        status: "waiting",
        players: {},
        currentPlayer: null,
      };

      // Send initial game state
      socket.emit("gameStateUpdate", {
        status: "waiting",
        board: Array(20)
          .fill()
          .map(() => Array(10).fill(0)),
        currentPiece: null,
        player: {
          id: socket.id,
          name: "Player",
          score: 0,
          level: 1,
          lines: 0,
        },
      });

      // Handle player actions
      socket.on("playerAction", (action) => {
        console.log(`Player ${socket.id} action:`, action);
        // In production, this would process the action and update game state
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
  };

  // Initialize the Socket.IO server
  initializeGameServer();

  console.log("Socket server initialized");
  res.end();
}
