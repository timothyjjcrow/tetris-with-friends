// Player types
export interface Player {
  id: string;
  name: string;
  score: number;
}

// Game state types
export enum GameStatus {
  WAITING = "waiting",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

export interface GameState {
  status: GameStatus;
  players: Player[];
}

// Tetris piece types
export type TetrisPieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface TetrisPiece {
  type: TetrisPieceType;
  position: { x: number; y: number };
  rotation: number;
}

// Socket event types
export enum SocketEvents {
  JOIN_GAME = "join_game",
  LEAVE_GAME = "leave_game",
  GAME_STATE_UPDATE = "game_state_update",
  MOVE_PIECE = "move_piece",
  ROTATE_PIECE = "rotate_piece",
  DROP_PIECE = "drop_piece",
}
