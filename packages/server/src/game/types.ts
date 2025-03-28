/**
 * Cell represents a single cell in the Tetris grid
 */
export type Cell = number;

/**
 * Board is a 2D grid of cells
 */
export type Board = Cell[][];

/**
 * Game status enum
 */
export enum GameStatus {
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

/**
 * Tetromino types
 */
export type TetrominoType = "I" | "O" | "T" | "L" | "J" | "S" | "Z";

/**
 * Position on the board
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Player information
 */
export interface Player {
  id: string;
  name: string;
  score: number;
  level: number;
  lines: number;
}

/**
 * Tetromino piece
 */
export interface Piece {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  rotation: number;
}

/**
 * Complete game state
 */
export interface GameState {
  status: GameStatus;
  board: Board;
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  heldPiece: Piece | null;
  canHold: boolean; // Whether the player can hold a piece (false after holding until piece placement)
  pieceQueue: TetrominoType[]; // Queue of upcoming pieces (7-bag system)
  player: Player;
  lastDropTime: number;
  dropInterval: number;
}

/**
 * Represents a full multiplayer game room
 */
export interface GameRoom {
  /** Unique room identifier */
  id: string;

  /** Room name */
  name: string;

  /** Maximum players allowed */
  maxPlayers: number;

  /** List of players in the room */
  players: Player[];

  /** Individual game states for each player */
  gameStates: Record<string, GameState>;

  /** Whether the game has started */
  isActive: boolean;

  /** Creation timestamp */
  createdAt: number;
}
