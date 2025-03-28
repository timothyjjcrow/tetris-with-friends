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

// Type definition for a board cell
type BoardCell = number;

const OpponentBoard: React.FC<OpponentBoardProps> = ({ opponent }) => {
  const { name, score, level, status, currentPiece } = opponent;

  // Cast board to the right type
  const board = opponent.board as unknown as BoardCell[][];

  // Get cell size based on board dimensions
  const CELL_SIZE = 6; // Small cells for the opponent board

  // Get piece color gradient - defaults to I piece if type not available
  const pieceColor = currentPiece?.type
    ? getPieceGradient(currentPiece.type)
    : COLORS.pieces.I.base;

  // Function to check if a position has the current piece
  const hasPiece = (x: number, y: number): boolean => {
    if (!currentPiece || status !== GameStatus.PLAYING) return false;

    const { shape, position } = currentPiece;
    const pieceX = x - position.x;
    const pieceY = y - position.y;

    if (
      pieceX >= 0 &&
      pieceX < shape[0].length &&
      pieceY >= 0 &&
      pieceY < shape.length
    ) {
      return shape[pieceY][pieceX] !== 0;
    }

    return false;
  };

  // Function to determine cell styling
  const getCellStyle = (cell: BoardCell, x: number, y: number) => {
    const isPieceHere = hasPiece(x, y);
    const isActive = cell !== 0 || isPieceHere;

    return {
      width: CELL_SIZE,
      height: CELL_SIZE,
      background: isActive ? pieceColor : COLORS.board.emptyCell,
      boxShadow: isActive
        ? "inset 1px 1px 1px rgba(255,255,255,0.2), inset -1px -1px 1px rgba(0,0,0,0.2)"
        : "",
    };
  };

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
            gridTemplateColumns: `repeat(${board[0].length}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${board.length}, ${CELL_SIZE}px)`,
          }}
        >
          {board.map((row: BoardCell[], rowIndex: number) =>
            row.map((cell: BoardCell, colIndex: number) => {
              const isActive = cell !== 0 || hasPiece(colIndex, rowIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-full h-full 
                    ${isActive ? "shadow-sm" : "bg-slate-800"}
                  `}
                  style={getCellStyle(cell, colIndex, rowIndex)}
                />
              );
            })
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
