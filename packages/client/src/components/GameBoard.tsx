import React, { useEffect, useState } from "react";

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  shape: number[][];
  position: Position;
  color: string;
  rotation: number;
  type: "I" | "O" | "T" | "L" | "J" | "S" | "Z"; // Be specific about piece types
}

interface GameBoardProps {
  board: number[][]; // Changed to number[][] to match server data
  currentPiece: Piece | null;
  ghostPiecePosition?: Position;
  clearedLines?: number[];
}

const EMPTY_CELL_COLOR = "#0A1022"; // Dark blue/black for empty cells

// Define bright colors for each piece type
const PIECE_COLORS = {
  I: "#00CFCF", // Cyan
  O: "#FFD500", // Yellow
  T: "#9E00CF", // Purple
  L: "#FF9000", // Orange
  J: "#0028CF", // Blue
  S: "#00CF2F", // Green
  Z: "#CF0030", // Red
};

// Map numeric values from server to piece types
const PIECE_TYPE_MAP: Record<number, string> = {
  1: "I",
  2: "O",
  3: "T",
  4: "L",
  5: "J",
  6: "S",
  7: "Z",
  8: "GARBAGE", // For garbage lines
};

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  ghostPiecePosition,
  clearedLines = [],
}) => {
  const [showClearAnimation, setShowClearAnimation] = useState(false);
  const [animatingLines, setAnimatingLines] = useState<number[]>([]);

  // For debugging
  useEffect(() => {
    console.log("Board data received:", board);
    console.log("Current piece:", currentPiece);
    if (clearedLines.length > 0) {
      console.log("Cleared lines:", clearedLines);
      // When new lines are cleared, start animation
      setShowClearAnimation(true);
      setAnimatingLines(clearedLines);

      // Reset animation after it completes
      const timer = setTimeout(() => {
        setShowClearAnimation(false);
        setAnimatingLines([]);
      }, 600); // Animation takes 500ms, add a little buffer

      return () => clearTimeout(timer);
    }
  }, [board, currentPiece, clearedLines]);

  return (
    <div className="w-full">
      <div
        className="border-4 rounded-md overflow-hidden mx-auto"
        style={{
          borderColor: "#1e293b",
          backgroundColor: "#020617",
          boxShadow: "0 0 20px rgba(0,0,0,0.5)",
          width: "300px",
          height: "600px",
        }}
      >
        <div
          className="grid gap-[1px] bg-slate-900 w-full h-full"
          style={{
            gridTemplateColumns: "repeat(10, 1fr)",
            gridTemplateRows: "repeat(20, 1fr)",
          }}
        >
          {/* Render the board */}
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isCleared = animatingLines.includes(rowIndex);

              // Check if this position has the current piece
              let hasPiece = false;
              let pieceType = null;

              if (currentPiece) {
                const { shape, position, type } = currentPiece;
                const pieceX = colIndex - position.x;
                const pieceY = rowIndex - position.y;

                if (
                  pieceX >= 0 &&
                  pieceX < shape[0].length &&
                  pieceY >= 0 &&
                  pieceY < shape.length &&
                  shape[pieceY][pieceX] !== 0
                ) {
                  hasPiece = true;
                  pieceType = type;
                }
              }

              // Check if this position has the ghost piece
              let hasGhost = false;

              if (!hasPiece && ghostPiecePosition && currentPiece) {
                const { shape, type } = currentPiece;
                const ghostX = colIndex - ghostPiecePosition.x;
                const ghostY = rowIndex - ghostPiecePosition.y;

                if (
                  ghostX >= 0 &&
                  ghostX < shape[0].length &&
                  ghostY >= 0 &&
                  ghostY < shape.length &&
                  shape[ghostY][ghostX] !== 0
                ) {
                  hasGhost = true;
                  pieceType = type;
                }
              }

              // Check if this cell has a placed piece from the board
              const cellValue = cell; // Now it's a numeric value directly
              const hasPlacedPiece = cellValue > 0;
              const placedPieceType = hasPlacedPiece
                ? PIECE_TYPE_MAP[cellValue]
                : null;
              const isGarbage = placedPieceType === "GARBAGE";

              // Get colors based on piece type
              const activePieceColor = pieceType
                ? PIECE_COLORS[pieceType as keyof typeof PIECE_COLORS]
                : "#AAA";
              const placedPieceColor =
                placedPieceType && !isGarbage
                  ? PIECE_COLORS[placedPieceType as keyof typeof PIECE_COLORS]
                  : isGarbage
                  ? "#666"
                  : "#AAA";

              // Determine final color with bright colors
              const backgroundColor = hasPiece
                ? activePieceColor // Active piece
                : hasGhost
                ? `${activePieceColor}33` // Ghost piece - translucent
                : hasPlacedPiece
                ? placedPieceColor // Placed piece
                : EMPTY_CELL_COLOR; // Empty cell

              const border = hasGhost
                ? `1px dashed ${activePieceColor}`
                : hasPiece || hasPlacedPiece
                ? "none"
                : "1px solid #1e293b";

              const boxShadow =
                hasPiece || hasPlacedPiece
                  ? "inset 2px 2px 3px rgba(255,255,255,0.3), inset -2px -2px 3px rgba(0,0,0,0.3)"
                  : hasGhost
                  ? "none"
                  : "inset 1px 1px 2px rgba(0,0,0,0.3)";

              // Apply gradient effect for filled cells
              const backgroundImage =
                hasPiece || hasPlacedPiece
                  ? `linear-gradient(135deg, ${backgroundColor} 0%, ${adjustBrightness(
                      backgroundColor,
                      1.2
                    )} 50%, ${backgroundColor} 100%)`
                  : "none";

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="relative"
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* Base cell */}
                  <div
                    className={`w-full h-full ${isCleared ? "z-0" : "z-10"}`}
                    style={{
                      backgroundColor,
                      backgroundImage,
                      boxShadow,
                      border,
                      position: "relative",
                    }}
                  />

                  {/* Line clear effect overlay */}
                  {isCleared && showClearAnimation && (
                    <div
                      className="absolute inset-0 z-20 animate-glow"
                      style={{
                        backgroundColor: "rgba(59, 130, 246, 0.3)",
                        boxShadow: "0 0 10px rgba(59, 130, 246, 0.7)",
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to adjust color brightness
function adjustBrightness(color: string, factor: number): string {
  // Simple implementation for hex colors
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.substring(1, 3), 16);
      g = parseInt(color.substring(3, 5), 16);
      b = parseInt(color.substring(5, 7), 16);
    } else {
      r = parseInt(color.substring(1, 2), 16) * 17;
      g = parseInt(color.substring(2, 3), 16) * 17;
      b = parseInt(color.substring(3, 4), 16) * 17;
    }

    r = Math.min(255, Math.round(r * factor));
    g = Math.min(255, Math.round(g * factor));
    b = Math.min(255, Math.round(b * factor));

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return color;
}

export default GameBoard;
