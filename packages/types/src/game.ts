/**
 * Tetromino types
 */
export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/**
 * Represents a position on the game board
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Represents a single cell in the game board
 */
export interface Cell {
  value: 0 | 1;
  color: string | null;
}

/**
 * Represents a Tetris piece
 */
export interface Piece {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  color: string;
  rotation: number;
}

/**
 * Game status values
 */
export enum GameStatus {
  WAITING = "waiting",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

/**
 * Player movement actions
 */
export enum PlayerAction {
  MOVE_LEFT = "move_left",
  MOVE_RIGHT = "move_right",
  ROTATE = "rotate",
  SOFT_DROP = "soft_drop",
  HARD_DROP = "hard_drop",
  HOLD = "hold",
}

/**
 * Simplified piece data for network transfer to opponents
 */
export interface OpponentPiece {
  type: string;
  shape: number[][];
  position: Position;
}

/**
 * Opponent data structure for multiplayer games
 * Contains simplified game state information for rendering opponent boards
 */
export interface OpponentData {
  id: string;
  name: string;
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  board: boolean[][]; // Simplified board representation (filled/empty cells)
  currentPiece: OpponentPiece | null;
}
