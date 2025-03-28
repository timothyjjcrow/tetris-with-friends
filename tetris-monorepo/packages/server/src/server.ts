import express from "express";
import http from "http";
import { Server } from "socket.io";
import { GameState, GameStatus, Player, SocketEvents } from "@tetris/types";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// Initial game state
const gameState: GameState = {
  status: GameStatus.WAITING,
  players: [],
};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle player joining the game
  socket.on(SocketEvents.JOIN_GAME, (playerName: string) => {
    const newPlayer: Player = {
      id: socket.id,
      name: playerName,
      score: 0,
    };

    gameState.players.push(newPlayer);
    io.emit(SocketEvents.GAME_STATE_UPDATE, gameState);
    console.log(`Player joined: ${playerName}`);
  });

  // Handle player leaving the game
  socket.on("disconnect", () => {
    const playerIndex = gameState.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== -1) {
      gameState.players.splice(playerIndex, 1);
      io.emit(SocketEvents.GAME_STATE_UPDATE, gameState);
    }
    console.log(`User disconnected: ${socket.id}`);
  });

  // Handle other game events
  socket.on(SocketEvents.MOVE_PIECE, (data) => {
    // TODO: Implement piece movement logic
    console.log("Move piece:", data);
  });

  socket.on(SocketEvents.ROTATE_PIECE, (data) => {
    // TODO: Implement piece rotation logic
    console.log("Rotate piece:", data);
  });

  socket.on(SocketEvents.DROP_PIECE, (data) => {
    // TODO: Implement piece dropping logic
    console.log("Drop piece:", data);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
