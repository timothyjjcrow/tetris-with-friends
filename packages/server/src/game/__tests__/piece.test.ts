import { spawnPiece, movePiece, rotatePiece } from "../piece";
import { createEmptyBoard } from "../board";
import { TETROMINO_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from "../constants";
import { Board, Piece } from "../types";
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("Piece Functions", () => {
  describe("spawnPiece", () => {
    it("should generate a piece with valid properties", () => {
      const piece = spawnPiece();
      expect(piece).toBeDefined();
      expect(["I", "O", "T", "S", "Z", "J", "L"]).toContain(piece.type);
      expect(piece.position).toBeDefined();
      expect(piece.shape).toBeDefined();
      expect(piece.color).toBeDefined();
      expect(piece.rotation).toBe(0);
    });
  });

  describe("movePiece", () => {
    let piece: Piece;

    beforeEach(() => {
      piece = {
        type: "T",
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        position: { x: 3, y: 0 },
        color: TETROMINO_COLORS.T,
        rotation: 0,
      };
    });

    it("should move piece right by 1", () => {
      const movedPiece = movePiece(piece, 1, 0);
      expect(movedPiece.position.x).toBe(piece.position.x + 1);
      expect(movedPiece.position.y).toBe(piece.position.y);
    });

    it("should move piece left by 2", () => {
      const movedPiece = movePiece(piece, -2, 0);
      expect(movedPiece.position.x).toBe(piece.position.x - 2);
      expect(movedPiece.position.y).toBe(piece.position.y);
    });

    it("should move piece down by 1", () => {
      const movedPiece = movePiece(piece, 0, 1);
      expect(movedPiece.position.x).toBe(piece.position.x);
      expect(movedPiece.position.y).toBe(piece.position.y + 1);
    });

    it("should not modify the original piece", () => {
      const originalX = piece.position.x;
      const originalY = piece.position.y;
      movePiece(piece, 1, 1);
      expect(piece.position.x).toBe(originalX);
      expect(piece.position.y).toBe(originalY);
    });
  });

  describe("rotatePiece", () => {
    let board: Board;
    let piece: Piece;

    beforeEach(() => {
      board = createEmptyBoard();
      piece = {
        type: "T",
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        position: { x: 3, y: 0 },
        color: TETROMINO_COLORS.T,
        rotation: 0,
      };
    });

    it("should rotate the piece clockwise", () => {
      const rotatedPiece = rotatePiece(piece, board);
      expect(rotatedPiece.rotation).toBe(1);

      // Expected shape for T piece after first rotation
      const expectedShape = [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ];

      for (let y = 0; y < rotatedPiece.shape.length; y++) {
        for (let x = 0; x < rotatedPiece.shape[y].length; x++) {
          expect(rotatedPiece.shape[y][x]).toBe(expectedShape[y][x]);
        }
      }
    });

    it("should not modify the original piece", () => {
      const originalRotation = piece.rotation;
      const originalShape = JSON.stringify(piece.shape);
      rotatePiece(piece, board);
      expect(piece.rotation).toBe(originalRotation);
      expect(JSON.stringify(piece.shape)).toBe(originalShape);
    });

    it("should perform wall kick when rotation against wall", () => {
      // Move piece to the right edge
      piece.position.x = BOARD_WIDTH - 2;

      const rotatedPiece = rotatePiece(piece, board);

      // Piece would go out of bounds without wall kick, check if it kicked
      expect(rotatedPiece.position.x).toBeLessThan(piece.position.x);
      expect(rotatedPiece.rotation).toBe(1);
    });

    it("should perform wall kick when rotation against blocks", () => {
      // Place blocks to force a wall kick
      board[0][4] = { value: 1, color: "red" };

      const rotatedPiece = rotatePiece(piece, board);

      // Piece should still be rotated, but possibly in a different position
      expect(rotatedPiece.rotation).toBe(1);
    });

    it("should not rotate if no valid position found after wall kicks", () => {
      // Surround the piece so it can't rotate
      const surroundedPiece = { ...piece, position: { x: 0, y: 0 } };

      // Fill the area around the piece
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (!(x === 1 && y === 0)) {
            // Skip the center top of the T
            board[y][x] = { value: 1, color: "red" };
          }
        }
      }

      const rotatedPiece = rotatePiece(surroundedPiece, board);

      // Should return the original piece
      expect(rotatedPiece.rotation).toBe(surroundedPiece.rotation);
      expect(rotatedPiece.position).toEqual(surroundedPiece.position);
    });
  });
});
