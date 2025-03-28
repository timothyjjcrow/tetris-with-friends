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
    const newRoom = {
      id: roomId,
      name: roomName || `Room ${Object.keys(rooms).length + 1}`,
      players: [],
      maxPlayers: 4,
      isActive: false,
    };

    rooms[roomId] = newRoom;

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

    // Check if player is already in the room
    const existingPlayerIndex = room.players.findIndex(
      (p) => p.id === playerId
    );
    if (existingPlayerIndex === -1) {
      room.players.push(player);
    } else {
      // Update player name if they rejoin
      room.players[existingPlayerIndex].name = playerName;
    }

    socket.join(roomId);

    // Send room info to all clients
    io.to(roomId).emit("roomUpdate", room);

    // Send joined event to the client who joined
    socket.emit("roomJoined", { room });

    // Notify other players about the new player
    socket.to(roomId).emit("playerJoined", { player });

    // Update all clients with the new room list
    io.emit(
      "roomsUpdate",
      Object.values(rooms).filter((r) => !r.isSinglePlayer)
    );

    // Call the callback with success and room data
    if (callback) callback(true, room);
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

    // Create initial game state template
    const createInitialState = (playerId, playerName) => {
      // Generate same pieces for everyone in the same room for fairness
      const currentPiece = generateRandomPiece();
      const nextPiece = generateRandomPiece();
      const pieceQueue = [
        generateRandomPiece(),
        generateRandomPiece(),
        generateRandomPiece(),
      ];

      return {
        status: "playing",
        board: createEmptyBoard(),
        currentPiece: currentPiece,
        nextPiece: nextPiece,
        heldPiece: null,
        canHold: true,
        pieceQueue: pieceQueue,
        dropInterval: 800, // Add drop interval to control game speed
        lastDropTime: Date.now(),
        player: {
          id: playerId,
          name: playerName,
          score: 0,
          level: 1,
          lines: 0,
        },
        opponents: room.players
          .filter((p) => p.id !== playerId)
          .map((opponent) => ({
            id: opponent.id,
            name: opponent.name,
            score: 0,
            level: 1,
            lines: 0,
            board: createEmptyBoard(),
          })),
      };
    };

    // Notify all players in the room that the game is starting
    io.to(roomId).emit("gameStarting", room.players.length);

    // Initialize game state for each player
    room.players.forEach((player) => {
      const socketId = player.id;
      const playerSocket = io.sockets.sockets.get(socketId);

      if (playerSocket) {
        // Store state in room for persistence
        if (!room.gameStates) {
          room.gameStates = {};
        }

        // Create initial state for this player
        const initialState = createInitialState(socketId, player.name);
        room.gameStates[socketId] = initialState;

        // Send initial game state to player
        playerSocket.emit("gameStateUpdate", initialState);
      }
    });

    // Start game gravity for all players in the room
    startGameGravity(roomId);

    if (callback) callback(true);
  });

  // Function to start gravity (automatic piece drops) for all players in a room
  function startGameGravity(roomId) {
    const room = rooms[roomId];
    if (!room || !room.isActive) return;

    // Clear any existing gravity interval
    if (room.gravityInterval) {
      clearInterval(room.gravityInterval);
    }

    // Set up gravity interval - run every 100ms to check if pieces need to drop
    room.gravityInterval = setInterval(() => {
      // Check if room still exists and is active
      if (!rooms[roomId] || !rooms[roomId].isActive) {
        clearInterval(room.gravityInterval);
        return;
      }

      // For each player, apply gravity to their piece
      room.players.forEach((player) => {
        const playerId = player.id;
        // Skip bots - they have their own movement simulation
        if (playerId.startsWith("bot_")) return;

        const gameState = room.gameStates?.[playerId];
        if (!gameState || gameState.status !== "playing") return;

        const now = Date.now();
        // If enough time has passed based on dropInterval, move the piece down
        if (now - gameState.lastDropTime >= gameState.dropInterval) {
          applyGravity(room, playerId);
          // Update last drop time
          gameState.lastDropTime = now;
        }
      });
    }, 100); // Check every 100ms for pieces that need to drop
  }

  // Function to apply gravity to a player's piece
  function applyGravity(room, playerId) {
    if (!room || !room.gameStates || !room.gameStates[playerId]) return;

    const gameState = room.gameStates[playerId];
    if (!gameState.currentPiece) return;

    // Try to move the piece down
    const newPosition = {
      ...gameState.currentPiece.position,
      y: gameState.currentPiece.position.y + 1,
    };

    // Check if the new position would cause a collision
    if (
      checkCollision(gameState.board, gameState.currentPiece.shape, newPosition)
    ) {
      // Collision detected - place piece on board and generate new piece
      placePieceOnBoard(room, playerId);
    } else {
      // No collision - update piece position
      gameState.currentPiece.position = newPosition;

      // Send updated game state to player
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit("gameStateUpdate", gameState);
      }
    }
  }

  // Function to place a piece on the board and generate a new piece
  function placePieceOnBoard(room, playerId) {
    const gameState = room.gameStates[playerId];
    if (!gameState || !gameState.currentPiece) return;

    const { board, currentPiece } = gameState;
    const { shape, position, color } = currentPiece;

    // First, add the piece to the board
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = position.y + y;
          const boardX = position.x + x;

          // Check if valid position
          if (
            boardY >= 0 &&
            boardY < board.length &&
            boardX >= 0 &&
            boardX < board[0].length
          ) {
            // Convert piece type to number (1-7) for the board
            const pieceValue = getPieceValue(currentPiece.type);
            board[boardY][boardX] = pieceValue;
          }
        }
      }
    }

    // Check for completed lines
    const completedLines = checkForCompletedLines(board);
    if (completedLines.length > 0) {
      // Remove completed lines and update score
      removeCompletedLines(gameState, completedLines);
    }

    // Reset can hold flag
    gameState.canHold = true;

    // Game over check - if new piece would immediately collide
    if (isGameOver(gameState)) {
      gameState.status = "game_over";
      const playerSocket = io.sockets.sockets.get(playerId);
      if (playerSocket) {
        playerSocket.emit("gameStateUpdate", gameState);
      }
      return;
    }

    // Get next piece and update queue
    gameState.currentPiece = gameState.nextPiece;
    gameState.nextPiece = gameState.pieceQueue.shift();
    gameState.pieceQueue.push(generateRandomPiece());

    // Update last drop time
    gameState.lastDropTime = Date.now();

    // Send updated game state to player
    const playerSocket = io.sockets.sockets.get(playerId);
    if (playerSocket) {
      playerSocket.emit("gameStateUpdate", gameState);

      // Also send to other players in the room
      if (room.id) {
        const opponentView = {
          ...gameState,
          player: {
            id: playerId,
            name: gameState.player.name,
            score: gameState.player.score,
            level: gameState.player.level,
            lines: gameState.player.lines,
          },
        };

        playerSocket.to(room.id).emit("opponentUpdate", {
          playerId: playerId,
          gameState: opponentView,
        });
      }
    }
  }

  // Helper function to check collision between a piece and the board
  function checkCollision(board, shape, position) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newY = position.y + y;
          const newX = position.x + x;

          // Check if out of bounds (collided with wall or floor)
          if (newY >= board.length || newX < 0 || newX >= board[0].length) {
            return true;
          }

          // Check if collided with another piece on the board
          if (newY >= 0 && board[newY][newX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Function to check for completed lines
  function checkForCompletedLines(board) {
    const completedLines = [];

    for (let y = 0; y < board.length; y++) {
      // A line is complete if every cell has a non-zero value
      if (board[y].every((cell) => cell !== 0)) {
        completedLines.push(y);
      }
    }

    return completedLines;
  }

  // Function to remove completed lines and update the score
  function removeCompletedLines(gameState, completedLines) {
    const { board, player } = gameState;

    // Remove the completed lines
    for (const y of completedLines) {
      // Remove this line
      board.splice(y, 1);
      // Add a new empty line at the top
      board.unshift(Array(board[0].length).fill(0));
    }

    // Update score, lines, and level
    const linesCleared = completedLines.length;
    player.lines += linesCleared;

    // Points per line: 100 for 1 line, 300 for 2, 500 for 3, 800 for 4 (Tetris)
    const pointsPerLine = [0, 100, 300, 500, 800];
    player.score += pointsPerLine[linesCleared] * player.level;

    // Update level every 10 lines
    const newLevel = Math.floor(player.lines / 10) + 1;
    if (newLevel > player.level) {
      player.level = newLevel;
      // Speed up drop interval with higher levels
      gameState.dropInterval = Math.max(100, 800 - (player.level - 1) * 50);
    }
  }

  // Function to check if the game is over
  function isGameOver(gameState) {
    // Game is over if new piece would immediately collide
    if (!gameState.nextPiece) return false;

    // Starting position for new piece
    const position = { x: 3, y: 0 };

    // Check if piece would collide at its starting position
    return checkCollision(gameState.board, gameState.nextPiece.shape, position);
  }

  // Function to convert piece type to a numeric value for the board
  function getPieceValue(type) {
    const pieceValues = {
      I: 1,
      O: 2,
      T: 3,
      L: 4,
      J: 5,
      S: 6,
      Z: 7,
    };
    return pieceValues[type] || 1;
  }

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
        room: rooms[roomId],
        singlePlayer: true,
      });

      // Initialize game state
      const gameState = {
        status: "playing", // Changed from "waiting" to "playing" to start immediately
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
      };

      // Use gameStateUpdate for consistency across all modes
      socket.emit("gameStateUpdate", gameState);

      if (callback) callback(true);

      // Schedule bot moves
      simulateBotMoves(roomId, difficulty);
    }
  );

  // Game state update
  socket.on("gameStateUpdate", ({ roomId, playerName, gameState }) => {
    if (!roomId) return;

    // Send the gameState update to other players in the room
    // Note: directly emit the gameState, not wrapped in another object
    socket.to(roomId).emit("gameStateUpdate", gameState);
  });

  // Send attack to opponents
  socket.on("sendAttack", ({ roomId, playerName, linesCleared }) => {
    if (!roomId) return;

    // Simple logic: send garbage lines equal to linesCleared-1
    const garbageLines = Math.max(0, linesCleared - 1);

    if (garbageLines > 0) {
      socket.to(roomId).emit("receiveGarbage", {
        fromPlayer: playerName,
        lineCount: garbageLines, // Changed to lineCount to match client expectation
        timestamp: Date.now(),
      });
    }
  });

  // Player action
  socket.on("playerAction", (data) => {
    console.log("Player action:", data.type);
    // Find which room this player is in
    let playerRoom = null;
    let roomId = null;

    for (const id in rooms) {
      const room = rooms[id];
      if (room.players.some((p) => p.id === socket.id)) {
        playerRoom = room;
        roomId = id;
        break;
      }
    }

    if (!playerRoom) {
      console.log("Player not in any room, can't process action");
      return;
    }

    // Get the player's current game state if it exists
    if (!playerRoom.gameStates || !playerRoom.gameStates[socket.id]) {
      console.log("No game state found for player");
      return;
    }

    // Get the current game state
    const currentState = playerRoom.gameStates[socket.id];

    // Only process actions if the game is in playing state
    if (currentState.status !== "playing") return;

    // Process the action (simplified for demo - in real implementation,
    // each action would properly update the game state)
    let updatedState = { ...currentState };
    let stateChanged = false;

    switch (data.type) {
      case "move_left":
        if (updatedState.currentPiece) {
          const newPosition = {
            ...updatedState.currentPiece.position,
            x: updatedState.currentPiece.position.x - 1,
          };

          // Check if the move is valid (no collision)
          if (
            !checkCollision(
              updatedState.board,
              updatedState.currentPiece.shape,
              newPosition
            )
          ) {
            updatedState.currentPiece = {
              ...updatedState.currentPiece,
              position: newPosition,
            };
            stateChanged = true;
          }
        }
        break;

      case "move_right":
        if (updatedState.currentPiece) {
          const newPosition = {
            ...updatedState.currentPiece.position,
            x: updatedState.currentPiece.position.x + 1,
          };

          // Check if the move is valid (no collision)
          if (
            !checkCollision(
              updatedState.board,
              updatedState.currentPiece.shape,
              newPosition
            )
          ) {
            updatedState.currentPiece = {
              ...updatedState.currentPiece,
              position: newPosition,
            };
            stateChanged = true;
          }
        }
        break;

      case "move_down":
        if (updatedState.currentPiece) {
          const newPosition = {
            ...updatedState.currentPiece.position,
            y: updatedState.currentPiece.position.y + 1,
          };

          // Check if the move would cause a collision
          if (
            !checkCollision(
              updatedState.board,
              updatedState.currentPiece.shape,
              newPosition
            )
          ) {
            updatedState.currentPiece = {
              ...updatedState.currentPiece,
              position: newPosition,
            };
            stateChanged = true;

            // Reset last drop time when manually moving down
            updatedState.lastDropTime = Date.now();
          }
        }
        break;

      case "rotate":
        if (updatedState.currentPiece) {
          // Get the rotated shape
          const rotatedShape = getRotatedShape(
            updatedState.currentPiece.shape,
            updatedState.currentPiece.type,
            (updatedState.currentPiece.rotation + 1) % 4
          );

          // Check if rotation is valid (no collision)
          if (
            !checkCollision(
              updatedState.board,
              rotatedShape,
              updatedState.currentPiece.position
            )
          ) {
            updatedState.currentPiece = {
              ...updatedState.currentPiece,
              shape: rotatedShape,
              rotation: (updatedState.currentPiece.rotation + 1) % 4,
            };
            stateChanged = true;
          }
        }
        break;

      case "drop":
        if (updatedState.currentPiece) {
          // Find the lowest valid position for the piece
          let newY = updatedState.currentPiece.position.y;
          let collided = false;

          while (!collided) {
            newY++;
            const newPosition = {
              ...updatedState.currentPiece.position,
              y: newY,
            };

            if (
              checkCollision(
                updatedState.board,
                updatedState.currentPiece.shape,
                newPosition
              )
            ) {
              // We've found the collision point, use the position just before
              newY--;
              collided = true;
            }
          }

          // Update the piece position
          updatedState.currentPiece = {
            ...updatedState.currentPiece,
            position: {
              ...updatedState.currentPiece.position,
              y: newY,
            },
          };

          // Store updated state before placing the piece
          playerRoom.gameStates[socket.id] = updatedState;

          // Place the piece on the board and get a new piece
          placePieceOnBoard(playerRoom, socket.id);

          // No need to send state update here as placePieceOnBoard already does it
          return;
        }
        break;

      case "hold":
        if (updatedState.currentPiece && updatedState.canHold) {
          const temp = updatedState.currentPiece;

          if (updatedState.heldPiece) {
            // Swap with held piece
            updatedState.currentPiece = {
              ...updatedState.heldPiece,
              position: { x: 3, y: 0 }, // Reset position to top center
            };
          } else {
            // No held piece yet, get next piece
            updatedState.currentPiece = updatedState.nextPiece;
            updatedState.nextPiece = updatedState.pieceQueue.shift();
            updatedState.pieceQueue.push(generateRandomPiece());
          }

          // Update held piece and disable hold until next piece
          updatedState.heldPiece = {
            ...temp,
            position: { x: 0, y: 0 }, // Position doesn't matter for held piece
          };
          updatedState.canHold = false;
          stateChanged = true;
        }
        break;

      default:
        break;
    }

    // Only update and send state if changes were made
    if (stateChanged) {
      // Store the updated state
      playerRoom.gameStates[socket.id] = updatedState;

      // Send the updated state back to the player
      socket.emit("gameStateUpdate", updatedState);

      // Send updated state to other players
      if (roomId) {
        // Create a version for opponents that includes just what they need to see
        const opponentView = {
          ...updatedState,
          player: {
            id: socket.id,
            name: updatedState.player.name,
            score: updatedState.player.score,
            level: updatedState.player.level,
            lines: updatedState.player.lines,
          },
        };

        socket.to(roomId).emit("opponentUpdate", {
          playerId: socket.id,
          gameState: opponentView,
        });
      }
    }
  });

  // Function to get rotated shape for a piece
  function getRotatedShape(shape, type, rotation) {
    // For O piece, rotation doesn't change the shape
    if (type === "O") return shape;

    // Get all rotation states for the piece type
    const rotationStates = PIECE_ROTATION_STATES[type] || [];

    // Return the requested rotation state or the original shape if not found
    return rotationStates[rotation] || shape;
  }

  // All rotation states for each piece type
  const PIECE_ROTATION_STATES = {
    I: [
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]],
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]],
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [0, 1],
      ],
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 0],
        [1, 1],
      ],
      [
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1],
        [0, 1],
        [0, 1],
      ],
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
      ],
      [
        [1, 1],
        [1, 0],
        [1, 0],
      ],
      [
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1],
        [0, 1],
        [1, 1],
      ],
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 0],
      ],
    ],
  };

  // Leave room
  socket.on("leaveRoom", (roomId, callback) => {
    leaveRoom(socket, roomId);
    if (callback) callback(true);
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

      // Update room info for remaining players
      if (room.players.length > 0) {
        io.to(roomId).emit("roomUpdate", room);
      }

      // Remove empty rooms
      if (room.players.length === 0) {
        delete rooms[roomId];
      }

      io.emit(
        "roomsUpdate",
        Object.values(rooms).filter((r) => !r.isSinglePlayer)
      );
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

// Function to simulate bot moves - completely rewritten for better control
function simulateBotMoves(roomId, difficulty) {
  const room = rooms[roomId];
  if (!room || !room.isActive) return;

  const botPlayer = room.players.find((p) => p.id.startsWith("bot_"));
  if (!botPlayer) return;

  const humanPlayer = room.players.find((p) => !p.id.startsWith("bot_"));
  if (!humanPlayer) return;

  // Define difficulty settings
  let moveInterval; // Time between bot moves in ms
  let progressSpeed; // How quickly the bot "completes" lines

  switch (difficulty) {
    case "easy":
      moveInterval = 2000;
      progressSpeed = 5000; // Slow progress
      break;
    case "hard":
      moveInterval = 600;
      progressSpeed = 1000; // Fast progress
      break;
    default: // medium
      moveInterval = 1000;
      progressSpeed = 2500;
  }

  // Initialize bot state if it doesn't exist
  if (!room.gameStates) {
    room.gameStates = {};
  }

  // Create initial bot state
  const botId = botPlayer.id;
  room.gameStates[botId] = {
    status: "playing",
    board: createEmptyBoard(),
    currentPiece: generateRandomPiece(),
    nextPiece: generateRandomPiece(),
    heldPiece: null,
    canHold: true,
    player: {
      id: botId,
      name: botPlayer.name,
      score: 0,
      level: 1,
      lines: 0,
    },
  };

  // Track state for consistent updates
  let botBoard = createEmptyBoard();
  let botScore = 0;
  let botLines = 0;
  let botLevel = 1;

  // Fill the bottom of the board gradually for visual effect
  let currentFillRow = 19; // Start from the bottom

  // Bot action interval
  const interval = setInterval(() => {
    const room = rooms[roomId];
    if (!room || !room.isActive) {
      clearInterval(interval);
      return;
    }

    // Occasionally clear lines to simulate progress
    if (Math.random() < 0.3) {
      botLines += Math.floor(Math.random() * 2) + 1;
      botScore += botLines * 100;

      // Level up every 10 lines
      botLevel = Math.floor(botLines / 10) + 1;

      // Add some blocks to the bottom of the board
      if (currentFillRow >= 10) {
        // Don't fill the top half
        for (let x = 0; x < 10; x++) {
          if (Math.random() < 0.4) {
            botBoard[currentFillRow][x] = Math.floor(Math.random() * 7) + 1;
          }
        }
        currentFillRow--;
        if (currentFillRow < 10) {
          currentFillRow = 19; // Reset and start filling from bottom again
        }
      }
    }

    // Create a stable bot update
    const botUpdate = {
      status: "playing",
      board: JSON.parse(JSON.stringify(botBoard)),
      currentPiece: generateRandomPiece(),
      nextPiece: generateRandomPiece(),
      heldPiece: null,
      canHold: true,
      player: {
        id: botId,
        name: botPlayer.name,
        score: botScore,
        level: botLevel,
        lines: botLines,
      },
    };

    // Update the stored state
    room.gameStates[botId] = botUpdate;

    // Send to human player
    const humanSocket = io.sockets.sockets.get(humanPlayer.id);
    if (humanSocket) {
      humanSocket.emit("opponentUpdate", {
        playerId: botId,
        gameState: botUpdate,
      });
    }
  }, moveInterval);
}

// Helper to generate a semi-random board for bot
function generateRandomBoard() {
  const board = createEmptyBoard();
  // Add some random filled cells in the bottom half
  for (let y = 10; y < 20; y++) {
    for (let x = 0; x < 10; x++) {
      if (Math.random() < 0.3) {
        board[y][x] = Math.floor(Math.random() * 7) + 1; // Random piece colors
      }
    }
  }
  return board;
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
