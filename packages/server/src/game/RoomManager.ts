import { Server, Socket } from "socket.io";
import { GameRoom, GameState, Player } from "./types";
import { v4 as uuidv4 } from "uuid";
import { createEmptyBoard, spawnPiece, addGarbageLines } from "./index";
import { GameStatus } from "./types";

const MAX_PLAYERS_PER_ROOM = 4;
const INITIAL_DROP_INTERVAL = 800;

/**
 * Simplifies a board for network transfer to reduce payload size
 * Converts the full board to a simplified representation with only filled/empty cells
 */
function simplifyBoardForNetwork(board: number[][]): boolean[][] {
  return board.map((row) => row.map((cell) => cell !== 0));
}

export class RoomManager {
  private rooms: Map<string, GameRoom>;
  private playerRooms: Map<string, string>; // Maps player ID to room ID
  private io: Server;

  constructor(io: Server) {
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.io = io;
  }

  /**
   * Creates a new room and returns its ID
   */
  createRoom(name: string = "Game Room"): string {
    const roomId = uuidv4();
    const room: GameRoom = {
      id: roomId,
      name,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      players: [],
      gameStates: {},
      isActive: false,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return roomId;
  }

  /**
   * Adds a player to a room
   */
  joinRoom(socket: Socket, roomId: string, playerName: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= room.maxPlayers) {
      return false;
    }

    // Create player object
    const player: Player = {
      id: socket.id,
      name: playerName,
      score: 0,
      level: 0,
      lines: 0,
    };

    // Initialize player's game state
    const gameState: GameState = {
      status: GameStatus.PLAYING,
      board: createEmptyBoard(),
      currentPiece: spawnPiece().piece,
      nextPiece: spawnPiece().piece,
      heldPiece: null,
      canHold: true,
      pieceQueue: [],
      player,
      lastDropTime: Date.now(),
      dropInterval: INITIAL_DROP_INTERVAL,
    };

    // Add player to room
    room.players.push(player);
    room.gameStates[socket.id] = gameState;
    this.playerRooms.set(socket.id, roomId);

    // Join the Socket.IO room
    socket.join(roomId);

    // Broadcast room update to all players in the room
    this.broadcastRoomUpdate(roomId);

    return true;
  }

  /**
   * Removes a player from their current room
   */
  leaveRoom(socketId: string): void {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter((p) => p.id !== socketId);
    delete room.gameStates[socketId];
    this.playerRooms.delete(socketId);

    // Delete room if empty
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else {
      // Broadcast room update to remaining players
      this.broadcastRoomUpdate(roomId);
    }
  }

  /**
   * Updates a player's game state and broadcasts it to the room
   */
  updatePlayerState(socketId: string, newState: Partial<GameState>): void {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Update the player's game state
    room.gameStates[socketId] = {
      ...room.gameStates[socketId],
      ...newState,
    };

    // Also update the player object with latest scores
    const playerIndex = room.players.findIndex((p) => p.id === socketId);
    if (playerIndex >= 0 && newState.player) {
      room.players[playerIndex] = {
        ...room.players[playerIndex],
        ...newState.player,
      };
    }

    // Broadcast the updated state to all players in the room
    this.broadcastGameState(roomId);
  }

  /**
   * Broadcasts the current room state to all players in the room
   */
  private broadcastRoomUpdate(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.io.to(roomId).emit("roomUpdate", {
      id: room.id,
      name: room.name,
      players: room.players,
      isActive: room.isActive,
    });
  }

  /**
   * Broadcasts all players' game states to the room
   */
  private broadcastGameState(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Send each player their own game state and a simplified version of other players' states
    room.players.forEach((player) => {
      const playerSocket = this.io.sockets.sockets.get(player.id);
      if (!playerSocket) return;

      const playerState = room.gameStates[player.id];

      // Create simplified opponent data for each other player in the room
      const opponents = room.players
        .filter((p) => p.id !== player.id)
        .map((p) => {
          const opponentState = room.gameStates[p.id];

          // Skip if the opponent doesn't have a valid game state
          if (!opponentState) return null;

          return {
            id: p.id,
            name: p.name,
            score: p.score,
            level: p.level,
            lines: p.lines,
            status: opponentState.status,
            // Simplified board representation - just filled/empty cells
            board: simplifyBoardForNetwork(opponentState.board),
            // Include current piece data for visualization
            currentPiece: opponentState.currentPiece
              ? {
                  type: opponentState.currentPiece.type,
                  position: opponentState.currentPiece.position,
                  shape: opponentState.currentPiece.shape,
                }
              : null,
          };
        })
        .filter(Boolean); // Remove any null entries

      // Send the complete state to the player
      playerSocket.emit("gameStateUpdate", {
        ...playerState,
        opponents,
      });
    });
  }

  /**
   * Gets a player's current room
   */
  getPlayerRoom(socketId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * Gets all available rooms
   */
  getAvailableRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
      .filter((room) => room.players.length < room.maxPlayers)
      .map((room) => ({
        ...room,
        gameStates: {}, // Don't send game states in room list
      }));
  }

  /**
   * Sends garbage lines to all opponents in a room except the sender
   * @param roomId The ID of the room
   * @param senderId The ID of the player who cleared lines
   * @param lineCount The number of lines cleared
   */
  public sendGarbageToOpponents(
    roomId: string,
    senderId: string,
    lineCount: number
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Calculate garbage lines to send based on lines cleared
    const garbageToSend = this.calculateGarbageLines(lineCount);
    if (garbageToSend === 0) return;

    // For each opponent in the room, add garbage lines to their board
    room.players.forEach((player) => {
      // Skip the sender
      if (player.id === senderId) return;

      // Get the opponent's game state
      const opponentState = room.gameStates[player.id];
      if (!opponentState || opponentState.status !== GameStatus.PLAYING) return;

      // Add garbage lines to the opponent's board
      const updatedBoard = addGarbageLines(opponentState.board, garbageToSend);

      // Update the opponent's game state
      opponentState.board = updatedBoard;

      // Update the player's game state in the room
      this.updatePlayerState(player.id, { board: updatedBoard });

      // Notify the opponent that they received garbage lines
      this.io.to(player.id).emit("receiveGarbage", {
        lineCount: garbageToSend,
        fromPlayer:
          room.players.find((p) => p.id === senderId)?.name || "Opponent",
      });
    });
  }

  /**
   * Calculates how many garbage lines to send based on lines cleared
   * @param linesCleared Number of lines cleared
   * @returns Number of garbage lines to send
   */
  private calculateGarbageLines(linesCleared: number): number {
    switch (linesCleared) {
      case 1:
        return 0; // Single line clear sends no garbage
      case 2:
        return 1; // Double sends 1 line
      case 3:
        return 2; // Triple sends 2 lines
      case 4:
        return 4; // Tetris sends 4 lines
      default:
        return 0;
    }
  }

  /**
   * Adds a bot player to a room (without a socket connection)
   */
  addBotToRoom(roomId: string, botPlayer: Player): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= room.maxPlayers) {
      return false;
    }

    // Initialize bot's game state
    const gameState: GameState = {
      status: GameStatus.PLAYING,
      board: createEmptyBoard(),
      currentPiece: spawnPiece().piece,
      nextPiece: spawnPiece().piece,
      heldPiece: null,
      canHold: true,
      pieceQueue: [],
      player: botPlayer,
      lastDropTime: Date.now(),
      dropInterval: INITIAL_DROP_INTERVAL,
    };

    // Add bot to room
    room.players.push(botPlayer);
    room.gameStates[botPlayer.id] = gameState;
    this.playerRooms.set(botPlayer.id, roomId);

    // Broadcast room update to all players in the room
    this.broadcastRoomUpdate(roomId);

    return true;
  }

  /**
   * Sets a room's active status
   * @param roomId The ID of the room to update
   * @param isActive Whether the room is active
   * @returns Whether the update was successful
   */
  setRoomActive(roomId: string, isActive: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.isActive = isActive;

    // Broadcast room update to all players in the room
    this.broadcastRoomUpdate(roomId);

    return true;
  }
}
