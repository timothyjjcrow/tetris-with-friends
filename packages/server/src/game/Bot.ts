import { GameState, Piece, Board, GameStatus } from "./types";
import { PlayerAction } from "./GameManager";

// Bot difficulty levels
export enum BotDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export class Bot {
  private botId: string;
  private botName: string;
  private difficulty: BotDifficulty;
  private moveInterval: NodeJS.Timeout | null = null;
  private actionCallback: (action: PlayerAction) => void;

  constructor(
    botId: string,
    botName: string,
    difficulty: BotDifficulty,
    actionCallback: (action: PlayerAction) => void
  ) {
    this.botId = botId;
    this.botName = botName;
    this.difficulty = difficulty;
    this.actionCallback = actionCallback;
  }

  /**
   * Start the bot's decision making process
   */
  public start(gameState: GameState): void {
    this.stop(); // Clear any existing interval

    // Set decision frequency based on difficulty
    const decisionInterval = this.getDecisionInterval();

    this.moveInterval = setInterval(() => {
      if (gameState.status !== GameStatus.PLAYING) {
        this.stop();
        return;
      }

      this.makeMove(gameState);
    }, decisionInterval);
  }

  /**
   * Stop the bot's decision making process
   */
  public stop(): void {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  /**
   * Get the delay between bot decisions based on difficulty
   */
  private getDecisionInterval(): number {
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return 1000; // Slow decision making
      case BotDifficulty.MEDIUM:
        return 500; // Medium speed
      case BotDifficulty.HARD:
        return 250; // Fast decision making
      default:
        return 500;
    }
  }

  /**
   * Make a move based on the current game state
   */
  private makeMove(gameState: GameState): void {
    if (!gameState.currentPiece) return;

    // Determine the best move
    const action = this.determineBestAction(
      gameState.board,
      gameState.currentPiece
    );

    // Execute the action
    this.actionCallback(action);
  }

  /**
   * Determine the best action to take based on current board and piece
   */
  private determineBestAction(board: Board, piece: Piece): PlayerAction {
    // Simple bot logic - randomly choose actions with different weights based on difficulty
    const random = Math.random();

    // Add randomness to make the bot less predictable
    if (random < 0.4) {
      // 40% chance to move left or right
      return Math.random() < 0.5
        ? PlayerAction.MOVE_LEFT
        : PlayerAction.MOVE_RIGHT;
    } else if (random < 0.6) {
      // 20% chance to rotate
      return PlayerAction.ROTATE;
    } else if (random < 0.8) {
      // 20% chance for soft drop
      return PlayerAction.MOVE_DOWN;
    } else if (random < 0.95) {
      // 15% chance for hard drop
      return PlayerAction.DROP;
    } else {
      // 5% chance to hold
      return PlayerAction.HOLD;
    }
  }

  /**
   * Get the bot's ID
   */
  public getId(): string {
    return this.botId;
  }

  /**
   * Get the bot's name
   */
  public getName(): string {
    return this.botName;
  }
}
