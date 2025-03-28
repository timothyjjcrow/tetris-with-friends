const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store active rooms
const rooms = {};

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Tetris server is running");
});

// List all rooms
app.get("/rooms", (req, res) => {
  res.json(
    Object.values(rooms).map((room) => ({
      id: room.id,
      name: room.name,
      players: room.players.length,
      maxPlayers: room.maxPlayers,
    }))
  );
});

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Send welcome message
  socket.emit("welcome", { message: "Connected to Tetris server" });

  // Send current rooms to the newly connected client
  socket.emit(
    "roomsUpdate",
    Object.values(rooms).filter((room) => !room.isSinglePlayer)
  );

  // Socket.IO event handler for creating room
  socket.on("createRoom", (roomName, callback) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      id: roomId,
      name: roomName || `Room ${Object.keys(rooms).length + 1}`,
      players: [],
      maxPlayers: 4,
      isActive: false,
    };

    console.log(`Room created: ${roomId}, ${roomName}`);

    // Call the callback with the roomId
    if (callback) callback(roomId);
  });

  // Socket.IO event handler for joining room
  socket.on("joinRoom", ({ roomId, playerName }, callback) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      if (callback) callback(false);
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit("error", { message: "Room is full" });
      if (callback) callback(false);
      return;
    }

    const playerId = socket.id;
    const player = { id: playerId, name: playerName };

    room.players.push(player);
    socket.join(roomId);

    socket.emit("roomJoined", { roomId, players: room.players });
    io.to(roomId).emit("playerJoined", { player });
    io.emit("roomsUpdate", Object.values(rooms));

    // Call the callback with success
    if (callback) callback(true);
  });

  // Handler for getting rooms
  socket.on("getRooms", (callback) => {
    console.log("Client requesting rooms list");
    // Filter out single player rooms and format for client
    const availableRooms = Object.values(rooms)
      .filter((room) => !room.isSinglePlayer)
      .map((room) => ({
        id: room.id,
        name: room.name,
        players: room.players,
        maxPlayers: room.maxPlayers,
        isActive: room.isActive,
      }));

    if (callback) callback(availableRooms);
  });

  // Handler for starting game
  socket.on("startGame", (roomId, callback) => {
    console.log(`Request to start game in room ${roomId}`);
    const room = rooms[roomId];

    if (!room) {
      console.log(`Room ${roomId} not found`);
      if (callback) callback(false);
      return;
    }

    if (room.players.length < 1) {
      // Changed from 2 to 1 to allow single player testing
      console.log(`Not enough players in room ${roomId}`);
      if (callback) callback(false);
      return;
    }

    // Mark room as active
    room.isActive = true;

    // Notify all players in the room that the game is starting
    io.to(roomId).emit("gameStarting", room.players.length);

    // Initialize game state for all players
    io.to(roomId).emit("gameState", {
      status: "playing",
      board: createEmptyBoard(),
      currentPiece: generateRandomPiece(),
      nextPiece: generateRandomPiece(),
      heldPiece: null,
      canHold: true,
      pieceQueue: [
        generateRandomPiece(),
        generateRandomPiece(),
        generateRandomPiece(),
      ],
      player: {
        id: socket.id,
        name: room.players.find((p) => p.id === socket.id)?.name || "Player",
        score: 0,
        level: 1,
        lines: 0,
      },
      opponents: room.players
        .filter((p) => p.id !== socket.id)
        .map((player) => ({
          id: player.id,
          name: player.name,
          score: 0,
          level: 1,
          lines: 0,
          board: createEmptyBoard(),
        })),
    });

    if (callback) callback(true);
  });

  // Handle single player mode with bot
  socket.on(
    "startSinglePlayerWithBot",
    ({ difficulty, playerName }, callback) => {
      console.log(
        `Starting single player game for ${playerName} with difficulty ${difficulty}`
      );

      // Create a virtual room for single player
      const roomId = `single_${socket.id}`;
      const botName = getBotName(difficulty);

      rooms[roomId] = {
        id: roomId,
        name: `${playerName}'s Game`,
        players: [
          { id: socket.id, name: playerName },
          { id: `bot_${socket.id}`, name: botName, isBot: true },
        ],
        maxPlayers: 2,
        isActive: true,
        isSinglePlayer: true,
      };

      socket.join(roomId);

      // Send room joined event
      socket.emit("roomJoined", {
        roomId,
        players: rooms[roomId].players,
        singlePlayer: true,
      });

      // Initialize game state
      socket.emit("gameState", {
        status: "waiting",
        board: createEmptyBoard(),
        currentPiece: null,
        nextPiece: null,
        heldPiece: null,
        canHold: true,
        pieceQueue: [],
        player: {
          id: socket.id,
          name: playerName,
          score: 0,
          level: 1,
          lines: 0,
        },
        opponents: [
          {
            id: `bot_${socket.id}`,
            name: botName,
            score: 0,
            level: 1,
            lines: 0,
            board: createEmptyBoard(),
          },
        ],
      });

      if (callback) callback(true);
    }
  );

  // Game state update
  socket.on("gameStateUpdate", ({ roomId, playerName, gameState }) => {
    if (!roomId) return;

    socket.to(roomId).emit("gameStateUpdate", {
      playerId: socket.id,
      playerName,
      gameState,
    });
  });

  // Send attack to opponents
  socket.on("sendAttack", ({ roomId, playerName, linesCleared }) => {
    if (!roomId) return;

    // Simple logic: send garbage lines equal to linesCleared-1
    const garbageLines = Math.max(0, linesCleared - 1);

    if (garbageLines > 0) {
      socket.to(roomId).emit("receiveGarbage", {
        fromPlayer: playerName,
        amount: garbageLines,
        timestamp: Date.now(),
      });
    }
  });

  // Player action (for future use)
  socket.on("playerAction", (data) => {
    console.log("Player action:", data);
  });

  // Leave room
  socket.on("leaveRoom", ({ roomId }) => {
    leaveRoom(socket, roomId);
  });

  // Disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Leave all rooms
    for (const roomId in rooms) {
      leaveRoom(socket, roomId);
    }
  });

  // Helper function to leave room
  function leaveRoom(socket, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);

      socket.leave(roomId);
      io.to(roomId).emit("playerLeft", { playerId: player.id });

      // Remove empty rooms
      if (room.players.length === 0) {
        delete rooms[roomId];
      }

      io.emit("roomsUpdate", Object.values(rooms));
    }
  }
});

// Function to create an empty board
function createEmptyBoard() {
  return Array(20)
    .fill()
    .map(() => Array(10).fill(0));
}

// Function to generate a random Tetris piece
function generateRandomPiece() {
  const pieces = [
    { type: "I", color: "#00CFCF" }, // Cyan
    { type: "O", color: "#FFD500" }, // Yellow
    { type: "T", color: "#9E00CF" }, // Purple
    { type: "L", color: "#FF9000" }, // Orange
    { type: "J", color: "#0028CF" }, // Blue
    { type: "S", color: "#00CF2F" }, // Green
    { type: "Z", color: "#CF0030" }, // Red
  ];

  const piece = pieces[Math.floor(Math.random() * pieces.length)];

  // Define shape based on type
  let shape;
  switch (piece.type) {
    case "I":
      shape = [[1, 1, 1, 1]];
      break;
    case "O":
      shape = [
        [1, 1],
        [1, 1],
      ];
      break;
    case "T":
      shape = [
        [0, 1, 0],
        [1, 1, 1],
      ];
      break;
    case "L":
      shape = [
        [0, 0, 1],
        [1, 1, 1],
      ];
      break;
    case "J":
      shape = [
        [1, 0, 0],
        [1, 1, 1],
      ];
      break;
    case "S":
      shape = [
        [0, 1, 1],
        [1, 1, 0],
      ];
      break;
    case "Z":
      shape = [
        [1, 1, 0],
        [0, 1, 1],
      ];
      break;
    default:
      shape = [[1]];
  }

  return {
    type: piece.type,
    shape: shape,
    position: { x: 3, y: 0 },
    color: piece.color,
    rotation: 0,
  };
}

// Function to get a random bot name based on difficulty
function getBotName(difficulty) {
  const easyBots = ["Rookie Bot", "Beginner Bot", "Novice Bot"];
  const mediumBots = ["Advanced Bot", "Skilled Bot", "Expert Bot"];
  const hardBots = ["Master Bot", "Champion Bot", "Tetris Lord"];

  let botList;

  switch (difficulty) {
    case "easy":
      botList = easyBots;
      break;
    case "hard":
      botList = hardBots;
      break;
    case "medium":
    default:
      botList = mediumBots;
      break;
  }

  return botList[Math.floor(Math.random() * botList.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
