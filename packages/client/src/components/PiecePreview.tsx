import React from "react";
import { getPieceGradient } from "../styles/colors";

// Define types locally to avoid import issues
type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

interface Position {
  x: number;
  y: number;
}

interface Piece {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  color: string;
  rotation: number;
}

interface PiecePreviewProps {
  piece: Piece | null;
  title: string;
  disabled?: boolean;
}

export const PiecePreview: React.FC<PiecePreviewProps> = ({
  piece,
  title,
  disabled = false,
}) => {
  const containerClass = `
    bg-slate-800 p-4 rounded-md shadow-md 
    border border-slate-700 transition-all duration-200
    ${disabled ? "opacity-50" : ""}
  `;

  // Empty preview box
  if (!piece) {
    return (
      <div className={containerClass}>
        <h2 className="text-center text-lg font-medium mb-2 text-slate-200">
          {title}
        </h2>
        <div className="w-20 h-20 grid place-items-center bg-slate-900/50 rounded">
          <div className="text-slate-500 text-sm">Empty</div>
        </div>
      </div>
    );
  }

  // Calculate grid dimensions based on piece shape
  const gridWidth = piece.shape[0].length;
  const gridHeight = piece.shape.length;

  // Calculate cell size to provide consistent sizing regardless of piece dimensions
  const CELL_SIZE = 7; // px

  return (
    <div className={containerClass}>
      <h2 className="text-center text-lg font-medium mb-2 text-slate-200">
        {title}
      </h2>
      <div className="flex justify-center items-center my-1">
        <div
          className="grid gap-[2px] p-2 bg-slate-900/50 rounded"
          style={{
            gridTemplateColumns: `repeat(${gridWidth}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${gridHeight}, ${CELL_SIZE}px)`,
          }}
        >
          {piece.shape.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`
                  w-full h-full rounded-sm
                  ${cell ? "shadow-sm" : "bg-transparent"}
                `}
                style={
                  cell
                    ? {
                        background: getPieceGradient(piece.type),
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        boxShadow:
                          "inset 1px 1px 2px rgba(255,255,255,0.3), inset -1px -1px 2px rgba(0,0,0,0.3)",
                      }
                    : {}
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PiecePreview;
