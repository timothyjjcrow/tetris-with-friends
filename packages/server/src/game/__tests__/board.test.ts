import {
  createEmptyBoard,
  isValidMove,
  mergePieceToBoard,
  clearLines,
} from "../board";
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINO_COLORS } from "../constants";
import { Board, Piece } from "../types";
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("Board Functions", () => {
  describe("createEmptyBoard", () => {
    it("should create a board with correct dimensions", () => {
      const board = createEmptyBoard();
      expect(board.length).toBe(BOARD_HEIGHT);
      expect(board[0].length).toBe(BOARD_WIDTH);
    });

    it("should initialize all cells as empty", () => {
      const board = createEmptyBoard();
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          expect(board[y][x]).toEqual({ value: 0, color: null });
        }
      }
    });
  });

  describe("isValidMove", () => {
    let board: Board;
    let piece: Piece;

    beforeEach(() => {
      board = createEmptyBoard();
      // Create a simple piece (I piece shape)
      piece = {
        type: "I",
        shape: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        position: { x: 3, y: 0 },
        color: TETROMINO_COLORS.I,
        rotation: 0,
      };
    });

    it("should return true for a valid position", () => {
      expect(isValidMove(piece, board)).toBe(true);
    });

    it("should return false when piece is out of bounds (left)", () => {
      piece.position.x = -1;
      expect(isValidMove(piece, board)).toBe(false);
    });

    it("should return false when piece is out of bounds (right)", () => {
      piece.position.x = BOARD_WIDTH - 2;
      expect(isValidMove(piece, board)).toBe(false);
    });

    it("should return false when piece is out of bounds (bottom)", () => {
      piece.position.y = BOARD_HEIGHT;
      expect(isValidMove(piece, board)).toBe(false);
    });

    it("should return false when colliding with existing blocks", () => {
      // Place a block where piece would go
      board[1][3] = { value: 1, color: "red" };
      expect(isValidMove(piece, board)).toBe(false);
    });
  });

  describe("mergePieceToBoard", () => {
    let board: Board;
    let piece: Piece;

    beforeEach(() => {
      board = createEmptyBoard();
      // Create a simple piece (I piece shape)
      piece = {
        type: "I",
        shape: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        position: { x: 3, y: 0 },
        color: TETROMINO_COLORS.I,
        rotation: 0,
      };
    });

    it("should correctly merge piece onto the board", () => {
      const newBoard = mergePieceToBoard(piece, board);

      // Check that each cell of the piece is properly placed on the board
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x] === 1) {
            const boardX = piece.position.x + x;
            const boardY = piece.position.y + y;
            expect(newBoard[boardY][boardX]).toEqual({
              value: 1,
              color: piece.color,
            });
          }
        }
      }
    });

    it("should not modify cells that are not part of the piece", () => {
      // Mark a cell that won't be affected by the merge
      const testX = 0;
      const testY = 5;
      board[testY][testX] = { value: 1, color: "red" };

      const newBoard = mergePieceToBoard(piece, board);
      expect(newBoard[testY][testX]).toEqual({ value: 1, color: "red" });
    });

    it("should not modify the original board", () => {
      const originalBoard = JSON.parse(JSON.stringify(board));
      mergePieceToBoard(piece, board);
      expect(board).toEqual(originalBoard);
    });
  });

  describe("clearLines", () => {
    let board: Board;

    beforeEach(() => {
      board = createEmptyBoard();
    });

    it("should not clear any lines when no lines are complete", () => {
      const { newBoard, linesCleared } = clearLines(board);
      expect(linesCleared).toBe(0);
      expect(newBoard).toEqual(board);
    });

    it("should clear a single complete line", () => {
      // Fill a line at y=18 (second from bottom)
      for (let x = 0; x < BOARD_WIDTH; x++) {
        board[18][x] = { value: 1, color: "red" };
      }

      const { newBoard, linesCleared } = clearLines(board);
      expect(linesCleared).toBe(1);

      // Check if the line was cleared
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(newBoard[19][x]).toEqual({ value: 0, color: null });
      }
    });

    it("should clear multiple complete lines", () => {
      // Fill lines at y=17 and y=19 (bottom line)
      for (let x = 0; x < BOARD_WIDTH; x++) {
        board[17][x] = { value: 1, color: "red" };
        board[19][x] = { value: 1, color: "blue" };
      }

      const { newBoard, linesCleared } = clearLines(board);
      expect(linesCleared).toBe(2);

      // Check top two rows which should now be empty
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(newBoard[0][x]).toEqual({ value: 0, color: null });
        expect(newBoard[1][x]).toEqual({ value: 0, color: null });
      }
    });

    it("should shift blocks down after clearing lines", () => {
      // Create a block at y=16
      board[16][5] = { value: 1, color: "green" };

      // Fill line at y=18
      for (let x = 0; x < BOARD_WIDTH; x++) {
        board[18][x] = { value: 1, color: "red" };
      }

      const { newBoard, linesCleared } = clearLines(board);

      // Block should have moved down one row (from 16 to 17)
      expect(newBoard[17][5]).toEqual({ value: 1, color: "green" });
    });
  });
});
