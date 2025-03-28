// Board dimensions
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Tetromino colors
export const TETROMINO_COLORS = {
  I: "#00f0f0", // Cyan
  O: "#f0f000", // Yellow
  T: "#a000f0", // Purple
  S: "#00f000", // Green
  Z: "#f00000", // Red
  J: "#0000f0", // Blue
  L: "#f0a000", // Orange
} as const;

// Types
export type TetrominoType = keyof typeof TETROMINO_COLORS;

export interface Cell {
  value: 0 | 1;
  color: string | null;
  isGarbage?: boolean;
  isGhost?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  color: string;
  rotation: number;
}

// Tetromino shapes with all rotation states
export const SHAPES = {
  // I-piece: ████
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],

    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],

    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],

    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],

  // O-piece: ██
  //          ██
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],

  // T-piece: ███
  //           █
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],

    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],

    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],

    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],

  // S-piece:  ██
  //          ██
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],

    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],

    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],

    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],

  // Z-piece: ██
  //           ██
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],

    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],

    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],

    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],

  // J-piece: ███
  //          █
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],

    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],

    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],

    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],

  // L-piece: ███
  //             █
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],

    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],

    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],

    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
};

/**
 * Creates an empty game board filled with zeros
 */
export function createEmptyBoard(): number[][] {
  // Create a completely empty board with numeric values
  const board: number[][] = Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));

  console.log(`Created empty client board: ${BOARD_WIDTH}x${BOARD_HEIGHT}`);
  return board;
}

/**
 * Creates a piece with a specific type at the starting position
 */
export function createPiece(type: TetrominoType): Piece {
  return {
    type,
    shape: SHAPES[type][0].map((row) => [...row]), // Create a copy of the shape
    position: {
      // Center the piece horizontally
      x: Math.floor((BOARD_WIDTH - SHAPES[type][0][0].length) / 2),
      y: 0, // Start at the top
    },
    color: TETROMINO_COLORS[type],
    rotation: 0,
  };
}
