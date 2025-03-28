import { Server, Socket } from "socket.io";
import {
  Board,
  GameState,
  GameStatus,
  Piece,
  Player,
  TetrominoType,
} from "./types";
import {
  createEmptyBoard,
  isValidMove,
  mergePieceToBoard,
  clearLines,
  spawnPiece,
  movePiece,
  rotatePiece,
  holdPiece,
} from "./index";
import { RoomManager } from "./RoomManager";
import { Bot, BotDifficulty } from "./Bot";
import { v4 as uuidv4 } from "uuid";

// Player action types
export enum PlayerAction {
  MOVE_LEFT = "move_left",
  MOVE_RIGHT = "move_right",
  MOVE_DOWN = "move_down",
  ROTATE = "rotate",
  DROP = "drop",
  HOLD = "hold",
}

interface ActionPayload {
  type: PlayerAction;
}

// Game loop interval in milliseconds (initial speed)
const INITIAL_GAME_SPEED = 800;

// Standard Tetris scoring system
// Points awarded per number of lines cleared, multiplied by level
const SCORE_TABLE = {
  1: 100, // Single - 100 points
  2: 300, // Double - 300 points
  3: 500, // Triple - 500 points
  4: 800, // Tetris - 800 points
};

// Speed curve: maps level to drop interval in milliseconds
const SPEED_CURVE = [
  800, // Level 0
  717, // Level 1
  633, // Level 2
  550, // Level 3
  467, // Level 4
  383, // Level 5
  300, // Level 6
  217, // Level 7
  133, // Level 8
  100, // Level 9
  83, // Level 10
  83, // Level 11
  83, // Level 12
  67, // Level 13
  67, // Level 14
  67, // Level 15
  50, // Level 16
  50, // Level 17
  50, // Level 18
  33, // Level 19
  33, // Level 20+
];

// Lines required to level up
const LINES_PER_LEVEL = 10;

export class GameManager {
  private games: Map<string, GameState>;
  private gameLoops: Map<string, NodeJS.Timeout>;
  private io: Server;
  private roomManager: RoomManager;
  private bots: Map<string, Bot>; // Map of bot IDs to bot instances

  constructor(io: Server) {
    this.games = new Map();
    this.gameLoops = new Map();
    this.io = io;
    this.roomManager = new RoomManager(io);
    this.bots = new Map();
  }

  /**
   * Handles new player connections
   */
  handleConnection(socket: Socket): void {
    console.log(`Player connected: ${socket.id}`);

    // Set up room-related event listeners
    this.setupRoomEventListeners(socket);

    // Set up game event listeners
    this.setupGameEventListeners(socket);
  }

  /**
   * Handles player disconnections
   */
  handleDisconnection(socketId: string): void {
    console.log(`Player disconnected: ${socketId}`);

    // Stop the game loop
    this.stopGameLoop(socketId);

    // Remove game state
    this.games.delete(socketId);

    // Remove from room
    this.roomManager.leaveRoom(socketId);
  }

  /**
   * Set up room-related event listeners
   */
  private setupRoomEventListeners(socket: Socket): void {
    // Handle room creation
    socket.on(
      "createRoom",
      (name: string, callback: (roomId: string) => void) => {
        const roomId = this.roomManager.createRoom(name);
        console.log(`Room created: ${roomId} with name: ${name}`);
        callback(roomId);
      }
    );

    // Handle room joining
    socket.on(
      "joinRoom",
      (
        data: { roomId: string; playerName: string },
        callback: (success: boolean) => void
      ) => {
        console.log(
          `Player ${socket.id} joining room ${data.roomId} as ${data.playerName}`
        );
        const success = this.roomManager.joinRoom(
          socket,
          data.roomId,
          data.playerName
        );
        if (success) {
          // Initialize game for the player
          this.initializeGame(socket.id, data.playerName);
          this.startGameLoop(socket.id);
          console.log(
            `Player ${socket.id} successfully joined room ${data.roomId}`
          );
        } else {
          console.log(`Player ${socket.id} failed to join room ${data.roomId}`);
        }
        callback(success);
      }
    );

    // Handle room listing
    socket.on("getRooms", (callback: (rooms: any[]) => void) => {
      const rooms = this.roomManager.getAvailableRooms();
      console.log(
        `Sending ${rooms.length} available rooms to player ${socket.id}`
      );
      callback(rooms);
    });

    // Handle start game request for a room
    socket.on(
      "startGame",
      (roomId: string, callback: (success: boolean) => void) => {
        console.log(`Starting game for room ${roomId}`);
        const room = this.roomManager.getPlayerRoom(socket.id);

        // Check if the player is in the requested room
        if (!room || room.id !== roomId) {
          console.log(`Player ${socket.id} not in room ${roomId}`);
          callback(false);
          return;
        }

        // Check if there are at least 2 players
        if (room.players.length < 2) {
          console.log(`Not enough players in room ${roomId}`);
          callback(false);
          return;
        }

        // Set the room to active
        const success = this.roomManager.setRoomActive(roomId, true);
        if (success) {
          // Notify all players in the room that the game is starting
          this.io.to(roomId).emit("gameStarting", room.players.length);
          console.log(
            `Game started for room ${roomId} with ${room.players.length} players`
          );
        }
        callback(success);
      }
    );
  }

  /**
   * Set up game-related event listeners
   */
  private setupGameEventListeners(socket: Socket): void {
    socket.on("playerAction", (payload: ActionPayload) => {
      this.handlePlayerAction(socket.id, payload);
    });

    // Add bot-related event listeners
    socket.on(
      "addBot",
      (
        options: { difficulty?: BotDifficulty; name?: string },
        callback: (success: boolean) => void
      ) => {
        const success = this.addBot(
          socket.id,
          options.difficulty || BotDifficulty.MEDIUM,
          options.name
        );
        callback(success);
      }
    );

    socket.on(
      "removeBot",
      (botId: string, callback: (success: boolean) => void) => {
        const success = this.removeBot(socket.id, botId);
        callback(success);
      }
    );

    socket.on(
      "startSinglePlayerWithBot",
      (
        options: { difficulty?: BotDifficulty; playerName?: string },
        callback: (success: boolean) => void
      ) => {
        const success = this.startSinglePlayerWithBot(
          socket,
          options.difficulty || BotDifficulty.MEDIUM,
          options.playerName
        );
        callback(success);
      }
    );
  }

  /**
   * Initializes a new game for a player
   */
  private initializeGame(socketId: string, playerName?: string): void {
    console.log(`Initializing game for player: ${socketId}`);

    // Create a completely empty board
    const board = createEmptyBoard();
    console.log(`Creating clean empty board for ${socketId}`);

    // Get first pieces for the game
    const { piece: firstPiece, updatedQueue: queue1 } = spawnPiece();
    const { piece: nextPiece, updatedQueue: queue2 } = spawnPiece(queue1);

    // Create initial game state with clean board
    const gameState: GameState = {
      status: GameStatus.PLAYING,
      board,
      currentPiece: firstPiece,
      nextPiece: nextPiece,
      heldPiece: null,
      canHold: true,
      pieceQueue: queue2,
      player: {
        id: socketId,
        name: playerName || `Player ${socketId.substring(0, 5)}`,
        score: 0,
        level: 0,
        lines: 0,
      },
      lastDropTime: Date.now(),
      dropInterval: INITIAL_GAME_SPEED,
    };

    this.games.set(socketId, gameState);
    console.log(`Game initialized for player ${socketId} with clean board`);

    // Start the game loop
    this.startGameLoop(socketId);

    // Update room state
    this.roomManager.updatePlayerState(socketId, gameState);
  }

  /**
   * Handle player actions (movement, rotation, dropping, holding)
   */
  private handlePlayerAction(socketId: string, payload: ActionPayload): void {
    const gameState = this.games.get(socketId);
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;

    let updatedPiece: Piece | null = null;
    const { currentPiece, board } = gameState;

    if (!currentPiece) return;

    console.log(`Player ${socketId} action: ${payload.type}`);

    switch (payload.type) {
      case PlayerAction.MOVE_LEFT:
        updatedPiece = movePiece(currentPiece, -1, 0);
        break;
      case PlayerAction.MOVE_RIGHT:
        updatedPiece = movePiece(currentPiece, 1, 0);
        break;
      case PlayerAction.MOVE_DOWN:
        updatedPiece = movePiece(currentPiece, 0, 1);
        break;
      case PlayerAction.ROTATE:
        updatedPiece = rotatePiece(currentPiece, board);
        break;
      case PlayerAction.DROP:
        // Hard drop - move piece down until collision
        updatedPiece = this.hardDropPiece(currentPiece, board);

        // If the updated piece is valid, update the game state
        if (isValidMove(updatedPiece, board)) {
          gameState.currentPiece = updatedPiece;

          // Always handle landing after a hard drop
          this.handlePieceLanding(socketId);
          return;
        }
        return;
      case PlayerAction.HOLD:
        if (gameState.canHold) {
          const { newCurrentPiece, newHeldPiece, updatedQueue } = holdPiece(
            currentPiece,
            gameState.heldPiece,
            gameState.pieceQueue
          );

          // Update game state with held piece
          gameState.currentPiece = newCurrentPiece;
          gameState.heldPiece = newHeldPiece;
          gameState.canHold = false;
          gameState.pieceQueue = updatedQueue;

          // Get next preview piece
          const { piece: nextPiece, updatedQueue: finalQueue } =
            spawnPiece(updatedQueue);
          gameState.nextPiece = nextPiece;
          gameState.pieceQueue = finalQueue;

          // Update the game state in the room
          this.roomManager.updatePlayerState(socketId, gameState);
          return;
        }
        return;
    }

    if (updatedPiece && isValidMove(updatedPiece, board)) {
      gameState.currentPiece = updatedPiece;

      // If it was a down movement, check if we should trigger landing
      if (payload.type === PlayerAction.MOVE_DOWN) {
        // Check if the piece would collide if moved down one more step
        const oneMoreDown = movePiece(updatedPiece, 0, 1);
        if (!isValidMove(oneMoreDown, board)) {
          // The piece would collide, so handle landing
          this.handlePieceLanding(socketId);
          return;
        }
      }

      // Update the game state in the room
      this.roomManager.updatePlayerState(socketId, gameState);
    } else if (payload.type === PlayerAction.MOVE_DOWN) {
      // If downward movement is blocked, handle landing
      this.handlePieceLanding(socketId);
    }
  }

  /**
   * Hard drop a piece - move it down until collision
   */
  private hardDropPiece(piece: Piece, board: Board): Piece {
    let testPiece = piece;
    let nextPiece = movePiece(testPiece, 0, 1);

    // Keep moving down until collision
    while (isValidMove(nextPiece, board)) {
      testPiece = nextPiece;
      nextPiece = movePiece(testPiece, 0, 1);
    }

    return testPiece;
  }

  /**
   * Gets the drop interval based on current level
   */
  private getDropInterval(level: number): number {
    // Cap at level 20 for the speed curve
    const speedIndex = Math.min(level, SPEED_CURVE.length - 1);
    return SPEED_CURVE[speedIndex];
  }

  /**
   * Starts the game loop for a player
   */
  private startGameLoop(socketId: string): void {
    // Clear any existing game loop
    this.stopGameLoop(socketId);

    const gameState = this.games.get(socketId);
    if (!gameState) return;

    // Get initial speed based on level
    const dropInterval = this.getDropInterval(gameState.player.level);
    gameState.dropInterval = dropInterval;

    // Start a new game loop
    const interval = setInterval(() => {
      this.gameLoopTick(socketId);
    }, dropInterval);

    this.gameLoops.set(socketId, interval);
  }

  /**
   * Updates the game loop speed based on current level
   */
  private updateGameSpeed(socketId: string): void {
    const gameState = this.games.get(socketId);
    if (!gameState) return;

    // Calculate new drop interval based on level
    const newDropInterval = this.getDropInterval(gameState.player.level);

    // Only update if the speed has changed
    if (newDropInterval !== gameState.dropInterval) {
      gameState.dropInterval = newDropInterval;

      // Restart the game loop with new speed
      this.stopGameLoop(socketId);
      const interval = setInterval(() => {
        this.gameLoopTick(socketId);
      }, newDropInterval);

      this.gameLoops.set(socketId, interval);
    }
  }

  /**
   * Stops the game loop for a player
   */
  private stopGameLoop(socketId: string): void {
    const interval = this.gameLoops.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(socketId);
    }
  }

  /**
   * One tick of the game loop
   */
  private gameLoopTick(socketId: string): void {
    const gameState = this.games.get(socketId);
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;

    // Try to move the current piece down
    this.tryMoveDown(socketId);
  }

  /**
   * Tries to move the current piece down by one step
   */
  private tryMoveDown(socketId: string): void {
    const gameState = this.games.get(socketId);
    if (!gameState || !gameState.currentPiece) return;

    const { currentPiece, board } = gameState;
    const nextPiece = movePiece(currentPiece, 0, 1);

    if (isValidMove(nextPiece, board)) {
      // Move down is valid
      gameState.currentPiece = nextPiece;
      this.roomManager.updatePlayerState(socketId, gameState);
    } else {
      // Move down is invalid (collision) - handle piece landing
      this.handlePieceLanding(socketId);
    }
  }

  /**
   * Handles the landing of a piece
   */
  private handlePieceLanding(socketId: string): void {
    const gameState = this.games.get(socketId);
    if (!gameState || !gameState.currentPiece) return;

    const { board, currentPiece } = gameState;
    console.log(`Piece landing for player ${socketId}`);

    // Merge the piece into the board
    const updatedBoard = this.mergePieceIntoBoard(board, currentPiece);
    gameState.board = updatedBoard;

    // Check for completed lines
    const { newBoard, linesCleared } = this.clearLines(updatedBoard);
    gameState.board = newBoard;

    // Update scores and level
    if (linesCleared > 0) {
      gameState.player.lines += linesCleared;

      // Update score based on level and lines cleared
      const scoreMultiplier = this.getScoreMultiplier(linesCleared);
      gameState.player.score += scoreMultiplier * (gameState.player.level + 1);

      // Update level (every LINES_PER_LEVEL lines)
      const newLevel = Math.floor(gameState.player.lines / LINES_PER_LEVEL);
      if (newLevel > gameState.player.level) {
        gameState.player.level = newLevel;
        this.updateGameSpeed(socketId);
      }

      console.log(`Lines cleared: ${linesCleared}`);

      // If lines were cleared, send garbage to opponents
      if (linesCleared > 1) {
        const garbageLines = linesCleared - 1;
        // Get the player's room ID
        const roomId = this.roomManager.getPlayerRoom(socketId)?.id;
        if (roomId) {
          this.roomManager.sendGarbageToOpponents(
            roomId,
            socketId,
            garbageLines
          );
        }
      }
    }

    // Get the next piece
    const { piece: nextPiece, updatedQueue } = spawnPiece(gameState.pieceQueue);
    gameState.currentPiece = gameState.nextPiece;
    gameState.nextPiece = nextPiece;
    gameState.pieceQueue = updatedQueue;
    gameState.canHold = true;

    // Check if the game is over
    if (this.checkGameOver(socketId)) {
      return;
    }

    // Update the game state
    this.roomManager.updatePlayerState(socketId, gameState);
  }

  /**
   * Merges a piece into the board
   */
  private mergePieceIntoBoard(board: Board, piece: Piece): Board {
    // Use the mergePieceToBoard function from index.ts which properly preserves piece type
    return mergePieceToBoard(piece, board);
  }

  /**
   * Adds a bot to an existing room
   */
  private addBot(
    playerId: string,
    difficulty: BotDifficulty,
    customName?: string
  ): boolean {
    // Get the player's room
    const playerRoom = this.roomManager.getPlayerRoom(playerId);
    if (!playerRoom) return false;

    // Create a bot ID
    const botId = `bot-${uuidv4()}`;
    const botName =
      customName || `Bot ${this.getNameForDifficulty(difficulty)}`;

    // Create bot instance with a callback for actions
    const bot = new Bot(botId, botName, difficulty, (action: PlayerAction) =>
      this.handlePlayerAction(botId, { type: action })
    );

    // Register the bot
    this.bots.set(botId, bot);

    // Initialize a game state for the bot
    this.initializeGame(botId, botName);

    // Add the bot to the room
    this.roomManager.addBotToRoom(playerRoom.id, {
      id: botId,
      name: botName,
      score: 0,
      level: 0,
      lines: 0,
    });

    // Start the bot's game loop
    this.startGameLoop(botId);

    // Start the bot's decision making process
    const botGameState = this.games.get(botId);
    if (botGameState) {
      bot.start(botGameState);
    }

    return true;
  }

  /**
   * Removes a bot from a room
   */
  private removeBot(playerId: string, botId: string): boolean {
    // Get the player's room
    const playerRoom = this.roomManager.getPlayerRoom(playerId);
    if (!playerRoom) return false;

    // Get the bot
    const bot = this.bots.get(botId);
    if (!bot) return false;

    // Stop the bot
    bot.stop();

    // Stop the game loop
    this.stopGameLoop(botId);

    // Remove the bot from the room
    this.roomManager.leaveRoom(botId);

    // Remove the bot's game state
    this.games.delete(botId);

    // Remove the bot instance
    this.bots.delete(botId);

    return true;
  }

  /**
   * Creates a single player game with a bot
   */
  private startSinglePlayerWithBot(
    socket: Socket,
    difficulty: BotDifficulty,
    playerName?: string
  ): boolean {
    // Create a room for the player
    const roomId = this.roomManager.createRoom("Single Player Game");

    // Join the player to the room
    const joinSuccess = this.roomManager.joinRoom(
      socket,
      roomId,
      playerName || `Player ${socket.id.substring(0, 5)}`
    );

    if (!joinSuccess) return false;

    // Initialize the player's game
    this.initializeGame(socket.id, playerName);

    // Start the player's game loop
    this.startGameLoop(socket.id);

    // Add a bot to the room
    return this.addBot(socket.id, difficulty);
  }

  /**
   * Get a name suffix based on bot difficulty
   */
  private getNameForDifficulty(difficulty: BotDifficulty): string {
    switch (difficulty) {
      case BotDifficulty.EASY:
        return "Easy";
      case BotDifficulty.MEDIUM:
        return "Medium";
      case BotDifficulty.HARD:
        return "Hard";
      default:
        return "Medium";
    }
  }

  /**
   * Check if the game is over for a player
   */
  private checkGameOver(socketId: string): boolean {
    const gameState = this.games.get(socketId);
    if (!gameState || !gameState.currentPiece) return false;

    // Game is over if the new piece overlaps with existing blocks
    if (!isValidMove(gameState.currentPiece, gameState.board)) {
      console.log(`Game over for player ${socketId}`);
      gameState.status = GameStatus.GAME_OVER;
      this.stopGameLoop(socketId);
      this.roomManager.updatePlayerState(socketId, gameState);
      return true;
    }

    return false;
  }

  /**
   * Clears completed lines and returns updated board + lines cleared
   */
  private clearLines(board: Board): { newBoard: Board; linesCleared: number } {
    return clearLines(board);
  }

  /**
   * Gets score multiplier based on lines cleared
   */
  private getScoreMultiplier(linesCleared: number): number {
    // Standard scoring system
    switch (linesCleared) {
      case 1:
        return 40; // Single
      case 2:
        return 100; // Double
      case 3:
        return 300; // Triple
      case 4:
        return 1200; // Tetris
      default:
        return 0;
    }
  }
}
