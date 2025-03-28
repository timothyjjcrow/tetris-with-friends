// This is the standalone API route that will be used by Vercel for WebSocket connections
import { Server } from "socket.io";

// We need to set up a socket.io server on a Next.js or Vercel API Route
// This implementation provides a fallback Socket.IO server for local testing
export default function SocketHandler(req, res) {
  // Check if Socket.IO server already exists
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

  // Initialize the game logic directly in this file
  const initializeGameServer = () => {
    // Game state
    const games = new Map();
    const players = new Map();

    io.on("connection", (socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Add player to our records
      players.set(socket.id, {
        id: socket.id,
        name: "Player",
        score: 0,
        level: 1,
        lines: 0,
      });

      // Emit a welcome message to let them know they've connected
      socket.emit("welcome", { message: "Connected to fallback game server" });

      // Notify that this is a fallback socket server
      socket.emit("notification", {
        type: "warning",
        message:
          "This is a fallback WebSocket server. For multiplayer functionality, please use the deployed server.",
      });

      // Send initial game state
      socket.emit("gameStateUpdate", {
        status: "waiting",
        board: Array(20)
          .fill()
          .map(() => Array(10).fill(0)),
        currentPiece: null,
        player: players.get(socket.id),
        opponents: [],
      });

      // Handle player joining or creating a room
      socket.on("createRoom", (roomName, callback) => {
        const roomId = `room_${Date.now()}`;
        console.log(
          `Player ${socket.id} created room: ${roomId} (${roomName})`
        );
        callback(roomId);
      });

      socket.on("joinRoom", ({ roomId, playerName }, callback) => {
        console.log(
          `Player ${socket.id} (${playerName}) joined room: ${roomId}`
        );

        // Update player name
        if (players.has(socket.id)) {
          players.get(socket.id).name = playerName;
        }

        socket.join(roomId);

        // Send room update
        io.to(roomId).emit("roomUpdate", {
          id: roomId,
          name: roomId,
          players: Array.from(players.values()).filter(
            (p) => p.id === socket.id
          ),
          maxPlayers: 4,
          isActive: false,
        });

        callback(true);
      });

      // Handle singleplayer with bot
      socket.on(
        "startSinglePlayerWithBot",
        ({ playerName, difficulty }, callback) => {
          console.log(
            `Player ${socket.id} (${playerName}) started single player with bot`
          );

          // Update player name
          if (players.has(socket.id)) {
            players.get(socket.id).name = playerName;
          }

          // Start a new game for this player
          const initialGameState = {
            status: "playing",
            board: Array(20)
              .fill()
              .map(() => Array(10).fill(0)),
            currentPiece: getRandomPiece(),
            nextPiece: getRandomPiece(),
            player: players.get(socket.id),
            opponents: [
              {
                id: "bot-player",
                name: "Bot",
                score: 0,
                level: 1,
                lines: 0,
                board: Array(20)
                  .fill()
                  .map(() => Array(10).fill(0)),
              },
            ],
          };

          games.set(socket.id, initialGameState);
          socket.emit("gameStateUpdate", initialGameState);
          callback(true);
        }
      );

      // Handle player actions
      socket.on("playerAction", (action) => {
        console.log(`Player ${socket.id} action:`, action);

        if (games.has(socket.id)) {
          const gameState = games.get(socket.id);

          // In a real implementation, this would update the game state
          // Here we just acknowledge the action
          socket.emit("gameStateUpdate", gameState);
        }
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        players.delete(socket.id);
        games.delete(socket.id);
      });
    });
  };

  // Initialize the Socket.IO server
  initializeGameServer();

  console.log("Socket server initialized");
  res.end();
}

// Helper function to generate a random piece
function getRandomPiece() {
  const pieces = [
    { type: "I", shape: [[1, 1, 1, 1]], color: "#00CFCF", rotation: 0 },
    {
      type: "O",
      shape: [
        [1, 1],
        [1, 1],
      ],
      color: "#FFD500",
      rotation: 0,
    },
    {
      type: "T",
      shape: [
        [0, 1, 0],
        [1, 1, 1],
      ],
      color: "#9E00CF",
      rotation: 0,
    },
    {
      type: "L",
      shape: [
        [1, 0, 0],
        [1, 1, 1],
      ],
      color: "#FF9000",
      rotation: 0,
    },
    {
      type: "J",
      shape: [
        [0, 0, 1],
        [1, 1, 1],
      ],
      color: "#0028CF",
      rotation: 0,
    },
    {
      type: "S",
      shape: [
        [0, 1, 1],
        [1, 1, 0],
      ],
      color: "#00CF2F",
      rotation: 0,
    },
    {
      type: "Z",
      shape: [
        [1, 1, 0],
        [0, 1, 1],
      ],
      color: "#CF0030",
      rotation: 0,
    },
  ];

  const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
  return {
    ...randomPiece,
    position: { x: 3, y: 0 },
  };
}
