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
  connectTimeout: 10000,
  pingTimeout: 5000,
  pingInterval: 10000,
  transports: ["websocket", "polling"],
  allowEIO3: true, // Allow compatibility with older clients
});

// Configure middleware to log socket.io events
io.use((socket, next) => {
  console.log(
    `[${new Date().toISOString()}] Socket ${socket.id} connecting...`
  );

  // Log connection parameters
  console.log(`Connection params: ${JSON.stringify(socket.handshake.query)}`);

  // Add metadata to socket
  socket.metadata = {
    connectTime: new Date(),
    address: socket.handshake.address,
  };

  next();
});

// Store active rooms
const rooms = {};

// Store active game intervals
const gameIntervals = {};

// Store bot states and intervals
const botStates = {};
const botIntervals = {};

// Define tetromino types
const TETROMINO_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

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
    console.log(
      `Join room request: roomId=${roomId}, playerName=${playerName}`
    );

    // Validate parameters
    if (!roomId || !playerName) {
      console.log("Join room failed: Missing roomId or playerName");
      socket.emit("error", { message: "Missing room ID or player name" });
      if (callback) callback(false);
      return;
    }

    const room = rooms[roomId];
    if (!room) {
      console.log(`Join room failed: Room ${roomId} not found`);
      socket.emit("error", { message: "Room not found" });
      if (callback) callback(false);
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      console.log(`Join room failed: Room ${roomId} is full`);
      socket.emit("error", { message: "Room is full" });
      if (callback) callback(false);
      return;
    }

    // Check if player is already in the room
    const existingPlayerIndex = room.players.findIndex(
      (p) => p.id === socket.id
    );
    if (existingPlayerIndex !== -1) {
      console.log(
        `Player ${socket.id} (${playerName}) is already in room ${roomId}`
      );
      // Update player name if changed
      if (room.players[existingPlayerIndex].name !== playerName) {
        room.players[existingPlayerIndex].name = playerName;
      }
      socket.emit("roomJoined", { roomId, players: room.players });
      // Send room update to all players in the room
      io.to(roomId).emit("roomUpdate", room);
      // Update room listing for all clients
      io.emit("roomsUpdate", Object.values(rooms));
      if (callback) callback(true);
      return;
    }

    const playerId = socket.id;
    const player = { id: playerId, name: playerName };

    console.log(`Adding player ${playerId} (${playerName}) to room ${roomId}`);
    try {
      room.players.push(player);
      socket.join(roomId);

      // Emit roomJoined event back to the client
      socket.emit("roomJoined", { roomId, players: room.players });
      // Send room update to all players in the room
      io.to(roomId).emit("roomUpdate", room);
      // Update room listing for all clients
      io.emit("roomsUpdate", Object.values(rooms));

      console.log(
        `Player ${playerId} (${playerName}) successfully joined room ${roomId}`
      );
      if (callback) callback(true);
    } catch (err) {
      console.error(`Error joining room: ${err.message}`);
      socket.emit("error", {
        message: "Failed to join room due to server error",
      });
      if (callback) callback(false);
    }
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

  // Socket.IO event handler for starting a single player game with a bot
  socket.on("startSinglePlayerWithBot", (data, callback) => {
    try {
      console.log(
        `Starting single player game with bot. Player: ${data.playerName}, Difficulty: ${data.difficulty}`
      );

      if (!data || !data.playerName) {
        console.error("Missing player name for single player game");
        if (callback) callback(false, "Missing player name");
        return;
      }

      // Generate a unique room ID for single player
      const roomId = `single_${socket.id}_${Date.now()}`;

      // Create a new room for the single player game
      const room = {
        id: roomId,
        name: `${data.playerName}'s Game`,
        players: [{ id: socket.id, name: data.playerName }],
        maxPlayers: 2, // Player + Bot
        isActive: false,
        isSinglePlayer: true,
        botDifficulty: data.difficulty || "medium",
      };

      rooms[roomId] = room;

      // Join the room
      socket.join(roomId);

      // Emit room update to the player
      socket.emit("roomJoined", { roomId, players: room.players });
      socket.emit("roomUpdate", room);

      console.log(`Created single player room: ${roomId}`);

      // Automatically start the game after 1 second
      setTimeout(() => {
        startGameWithBot(
          roomId,
          socket.id,
          data.playerName,
          data.difficulty || "medium"
        );
        console.log(`Single player game started in room: ${roomId}`);
      }, 1000);

      if (callback) callback(true);
    } catch (error) {
      console.error("Error starting single player game:", error);
      if (callback) callback(false, error.message);
    }
  });

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

// Function to start a single player game with a bot
function startGameWithBot(roomId, playerId, playerName, difficulty = "medium") {
  const room = rooms[roomId];
  if (!room) {
    console.error(`Room ${roomId} not found when starting game with bot`);
    return;
  }

  console.log(`Starting game with bot in room ${roomId}`);

  // Add bot player if not already present
  const botName = getBotName(difficulty);
  const botId = `bot_${playerId}`;

  if (!room.players.find((p) => p.id === botId)) {
    room.players.push({ id: botId, name: botName, isBot: true });
  }

  // Mark room as active
  room.isActive = true;

  // Update room data
  io.to(roomId).emit("roomUpdate", room);

  // Emit game starting event
  io.to(roomId).emit("gameStarting", room.players.length);

  // Initialize game state for the player
  const playerGameState = createInitialGameState(playerId, playerName, roomId);

  // Add bot opponent to the game state
  playerGameState.opponents = [
    {
      id: botId,
      name: botName,
      score: 0,
      level: 1,
      lines: 0,
      board: createEmptyBoard(),
    },
  ];

  // Set game status to playing
  playerGameState.status = "playing";

  // Send initial game state to player
  io.to(playerId).emit("gameState", playerGameState);

  // Start game loop for the player
  startGameLoop(roomId, playerId);

  // Start bot game logic
  startBotGameLogic(roomId, botId, difficulty);

  console.log(`Game with bot started successfully in room ${roomId}`);
}

// Function to get a bot name based on difficulty
function getBotName(difficulty) {
  const botNames = {
    easy: ["EasyBot", "Beginner", "Rookie", "Newbie"],
    medium: ["MediumBot", "Challenger", "Competitor", "Rival"],
    hard: ["HardBot", "Expert", "Master", "Champion"],
  };

  const names = botNames[difficulty] || botNames.medium;
  return names[Math.floor(Math.random() * names.length)];
}

// Function to create initial game state for a player
function createInitialGameState(playerId, playerName, roomId) {
  // Create the initial queue of pieces
  const pieceQueue = generatePieceQueue(5);

  // Get the first and second pieces from the queue
  const currentPiece = generateNewPiece(
    TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)]
  );
  const nextPiece = pieceQueue[0];

  // Initial game state
  return {
    roomId,
    status: "waiting",
    board: createEmptyBoard(),
    currentPiece,
    nextPiece,
    heldPiece: null,
    canHold: true,
    pieceQueue: pieceQueue.slice(1), // Remove the next piece from the queue
    player: {
      id: playerId,
      name: playerName,
      score: 0,
      level: 1,
      lines: 0,
    },
    opponents: [],
    lastDropTime: Date.now(),
    dropInterval: 800, // Initial drop interval (milliseconds)
  };
}

// Function to start bot gameplay logic
function startBotGameLogic(roomId, botId, difficulty = "medium") {
  console.log(
    `Starting bot gameplay logic for ${botId} with difficulty ${difficulty}`
  );

  // Create initial bot game state (for server-side logic, not sent to clients)
  const botState = {
    id: botId,
    board: createEmptyBoard(),
    currentPiece: generateNewPiece(
      TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)]
    ),
    pieceQueue: generatePieceQueue(5),
    score: 0,
    level: 1,
    lines: 0,
    lastMoveTime: Date.now(),
    lastDropTime: Date.now(),
  };

  // Define move intervals based on difficulty
  const moveIntervals = {
    easy: 1500, // Slow moves every 1.5 seconds
    medium: 800, // Medium moves every 0.8 seconds
    hard: 400, // Fast moves every 0.4 seconds
  };

  const moveInterval = moveIntervals[difficulty] || moveIntervals.medium;

  // Store bot state for later reference
  botStates[botId] = botState;

  // Start bot move interval
  const botIntervalId = setInterval(() => {
    // Make sure the room still exists
    const room = rooms[roomId];
    if (!room || !room.isActive) {
      console.log(
        `Stopping bot ${botId} because room no longer exists or is inactive`
      );
      clearInterval(botIntervalId);
      return;
    }

    // Update bot state
    updateBotState(roomId, botId, difficulty);

    // Send updated bot state to player(s) in the room
    const playerIds = Object.keys(
      io.sockets.adapter.rooms.get(roomId) || {}
    ).filter((id) => id !== botId);

    playerIds.forEach((playerId) => {
      const socket = io.sockets.sockets.get(playerId);
      if (socket) {
        // Send updated opponent data
        socket.emit("opponentUpdate", {
          id: botId,
          board: botState.board,
          score: botState.score,
          level: botState.level,
          lines: botState.lines,
        });
      }
    });
  }, moveInterval);

  // Store interval ID for cleanup
  botIntervals[botId] = botIntervalId;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
