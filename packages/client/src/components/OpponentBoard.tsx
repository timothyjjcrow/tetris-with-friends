import React from "react";
import { OpponentData } from "@tetris/types";
import { COLORS, getPieceGradient } from "../styles/colors";

// Define GameStatus locally to avoid import issues
enum GameStatus {
  WAITING = "waiting",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

interface OpponentBoardProps {
  opponent: OpponentData;
}

const OpponentBoard: React.FC<OpponentBoardProps> = ({ opponent }) => {
  const { name, score, level, board, status, currentPiece } = opponent;

  // Create a display board by combining the static board and current piece
  const displayBoard = board.map((row) => [...row]);

  // Add current piece to the display board
  if (currentPiece && status === GameStatus.PLAYING) {
    const { shape, position, type } = currentPiece;

    shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;

          // Only place the piece if it's within board boundaries
          if (
            boardY >= 0 &&
            boardY < displayBoard.length &&
            boardX >= 0 &&
            boardX < displayBoard[0].length
          ) {
            displayBoard[boardY][boardX] = true;
          }
        }
      });
    });
  }

  // Get cell size based on board dimensions
  const CELL_SIZE = 6; // Small cells for the opponent board

  // Get piece color gradient - defaults to I piece if type not available
  const pieceColor = currentPiece?.type
    ? getPieceGradient(currentPiece.type)
    : COLORS.pieces.I.base;

  return (
    <div className="bg-slate-800 p-3 rounded-md shadow-md border border-slate-700 hover:scale-105 transition-transform duration-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold truncate max-w-[90px] text-slate-200">
          {name}
        </h3>
        <div className="text-xs font-mono bg-slate-900/60 rounded px-1.5 py-0.5">
          {score.toLocaleString()}
        </div>
      </div>

      {/* Game over overlay */}
      <div className="relative">
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-black bg-opacity-60 z-10 flex items-center justify-center text-red-500 text-xs font-bold animate-pulse-fast rounded overflow-hidden">
            GAME OVER
          </div>
        )}

        {/* Board grid */}
        <div
          className="grid gap-px bg-slate-900 rounded p-1"
          style={{
            gridTemplateColumns: `repeat(${displayBoard[0].length}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${displayBoard.length}, ${CELL_SIZE}px)`,
          }}
        >
          {displayBoard.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-full h-full 
                  ${cell ? "shadow-sm" : "bg-slate-800"}
                `}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: cell ? pieceColor : COLORS.board.emptyCell,
                  boxShadow: cell
                    ? "inset 1px 1px 1px rgba(255,255,255,0.2), inset -1px -1px 1px rgba(0,0,0,0.2)"
                    : "",
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-1.5 text-xs text-slate-400 flex justify-between items-center">
        <span>Lvl: {level}</span>
        <div className="flex items-center">
          <div
            className="w-2 h-2 rounded-full mr-1.5"
            style={{
              backgroundColor:
                status === GameStatus.PLAYING
                  ? COLORS.ui.accent.secondary
                  : COLORS.ui.accent.danger,
            }}
          />
          <span className="text-xs">
            {status === GameStatus.PLAYING ? "Playing" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpponentBoard;
