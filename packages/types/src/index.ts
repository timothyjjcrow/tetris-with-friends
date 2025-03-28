// Socket event types
export enum SocketEvents {
  JOIN_GAME = "join_game",
  LEAVE_GAME = "leave_game",
  GAME_STATE_UPDATE = "game_state_update",
  WELCOME = "welcome",
  PLAYER_ACTION = "player_action",
  CREATE_GAME = "create_game",
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_UPDATE = "room_update",
  START_GAME = "start_game",
  GAME_OVER = "game_over",
}

// Player types
export interface Player {
  id: string;
  name: string;
  score: number;
  level?: number;
  lines?: number;
}

// Export all game-specific types
// This will export everything including GameStatus, OpponentData, etc.
export * from "./game";

// Game state interface that depends on types from game.ts
import { GameStatus, OpponentData } from "./game";
export interface GameState {
  status: GameStatus;
  players: Player[];
  opponents?: OpponentData[]; // List of opponent states for multiplayer mode
}
