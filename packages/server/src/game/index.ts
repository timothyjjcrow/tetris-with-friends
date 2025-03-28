import { Board, Cell, Piece, Position, TetrominoType } from "./types";

// Board dimensions
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Tetromino shapes and their configurations
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 1,
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 2,
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 3,
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 4,
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 5,
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 6,
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 7,
  },
};

/**
 * Creates an empty Tetris board
 */
export function createEmptyBoard(): Board {
  // Create a completely clean board - all zeros, no exceptions
  const board: Board = Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));

  // Log some info about the board to verify it's clean
  const nonZeroCells = board.flat().filter((cell) => cell !== 0).length;
  console.log(
    `Empty board created: ${BOARD_WIDTH}x${BOARD_HEIGHT}, non-empty cells: ${nonZeroCells}`
  );

  return board;
}

/**
 * Generates a new 7-bag of pieces
 */
function generatePieceBag(): TetrominoType[] {
  const pieces: TetrominoType[] = ["I", "O", "T", "L", "J", "S", "Z"];
  // Fisher-Yates shuffle
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

/**
 * Creates a piece from a tetromino type
 */
export function createPiece(type: TetrominoType): Piece {
  return {
    type,
    shape: TETROMINOES[type].shape,
    position: {
      // Center the piece horizontally
      x: Math.floor((BOARD_WIDTH - TETROMINOES[type].shape[0].length) / 2),
      // Start the piece just above the board
      y: 0,
    },
    rotation: 0,
  };
}

/**
 * Gets the next piece from the queue and refills if necessary
 */
export function getNextPiece(queue: TetrominoType[]): {
  piece: Piece;
  updatedQueue: TetrominoType[];
} {
  // If queue is empty or has only one piece left, add a new bag
  if (queue.length <= 1) {
    queue = [...queue, ...generatePieceBag()];
  }

  // Take the first piece from the queue
  const [nextType, ...remainingQueue] = queue;
  return {
    piece: createPiece(nextType),
    updatedQueue: remainingQueue,
  };
}

/**
 * Spawns a new piece and updates the piece queue
 */
export function spawnPiece(queue: TetrominoType[] = []): {
  piece: Piece;
  updatedQueue: TetrominoType[];
} {
  return getNextPiece(queue);
}

/**
 * Holds a piece and returns a new current piece
 */
export function holdPiece(
  currentPiece: Piece,
  heldPiece: Piece | null,
  queue: TetrominoType[]
): {
  newCurrentPiece: Piece;
  newHeldPiece: Piece;
  updatedQueue: TetrominoType[];
} {
  // Create a new held piece at the standard starting position
  const newHeldPiece = createPiece(currentPiece.type);

  let newCurrentPiece: Piece;
  let updatedQueue = [...queue];

  if (heldPiece) {
    // If there was already a held piece, swap it with the current piece
    newCurrentPiece = createPiece(heldPiece.type);
  } else {
    // If there was no held piece, get the next piece from the queue
    const nextPieceResult = getNextPiece(queue);
    newCurrentPiece = nextPieceResult.piece;
    updatedQueue = nextPieceResult.updatedQueue;
  }

  return {
    newCurrentPiece,
    newHeldPiece,
    updatedQueue,
  };
}

/**
 * Checks if a piece's move is valid
 */
export function isValidMove(piece: Piece, board: Board): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] !== 0) {
        const boardX = piece.position.x + x;
        const boardY = piece.position.y + y;

        // Check if the piece is within the board boundaries
        if (
          boardX < 0 ||
          boardX >= BOARD_WIDTH ||
          boardY < 0 ||
          boardY >= BOARD_HEIGHT ||
          // Check if the position is occupied by another piece
          (boardY >= 0 && board[boardY][boardX] !== 0)
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Moves a piece by the specified offsets
 */
export function movePiece(piece: Piece, dx: number, dy: number): Piece {
  return {
    ...piece,
    position: {
      x: piece.position.x + dx,
      y: piece.position.y + dy,
    },
  };
}

/**
 * Rotates a piece and checks for wall kicks
 */
export function rotatePiece(piece: Piece, board: Board): Piece {
  // Create a new matrix for the rotated shape
  const rotatedShape = rotateMatrix(piece.shape);

  // Create a new piece with the rotated shape
  const rotatedPiece: Piece = {
    ...piece,
    shape: rotatedShape,
    rotation: (piece.rotation + 1) % 4,
  };

  // Check if rotation is valid
  if (isValidMove(rotatedPiece, board)) {
    return rotatedPiece;
  }

  // Try wall kicks (shifting left, right, or up to make the rotation valid)
  const wallKickOffsets = [
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }, // right
    { x: 0, y: -1 }, // up
    { x: -2, y: 0 }, // left x2
    { x: 2, y: 0 }, // right x2
  ];

  for (const offset of wallKickOffsets) {
    const kickedPiece: Piece = {
      ...rotatedPiece,
      position: {
        x: rotatedPiece.position.x + offset.x,
        y: rotatedPiece.position.y + offset.y,
      },
    };

    if (isValidMove(kickedPiece, board)) {
      return kickedPiece;
    }
  }

  // If no valid rotation is found, return the original piece
  return piece;
}

/**
 * Rotates a matrix 90 degrees clockwise
 */
function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result = Array(N)
    .fill(null)
    .map(() => Array(N).fill(0));

  // Transpose the matrix
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      result[j][N - 1 - i] = matrix[i][j];
    }
  }

  return result;
}

/**
 * Merges a piece into the board
 */
export function mergePieceToBoard(piece: Piece, board: Board): Board {
  const { shape, position, type } = piece;
  const newBoard = [...board.map((row) => [...row])];

  // Get color information for the piece
  const pieceTypeValue = getPieceTypeValue(type);

  // Loop through the piece shape
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const boardY = position.y + y;
        const boardX = position.x + x;

        // Only place if within bounds
        if (
          boardY >= 0 &&
          boardY < newBoard.length &&
          boardX >= 0 &&
          boardX < newBoard[0].length
        ) {
          // Store the piece type value on the board
          newBoard[boardY][boardX] = pieceTypeValue;
        }
      }
    }
  }

  return newBoard;
}

/**
 * Get a numeric value for piece type to store on the board
 * This preserves piece type information for rendering
 */
function getPieceTypeValue(type: string): number {
  switch (type) {
    case "I":
      return 1;
    case "O":
      return 2;
    case "T":
      return 3;
    case "L":
      return 4;
    case "J":
      return 5;
    case "S":
      return 6;
    case "Z":
      return 7;
    default:
      return 1;
  }
}

/**
 * Clears completed lines from the board and returns the new board and number of lines cleared
 */
export function clearLines(board: Board): {
  newBoard: Board;
  linesCleared: number;
} {
  let linesCleared = 0;
  const newBoard = board.map((row) => [...row]);

  // Check each row from bottom to top
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    // Check if the row is completely filled
    if (newBoard[y].every((cell) => cell !== 0)) {
      linesCleared++;

      // Move all rows above this one down
      for (let row = y; row > 0; row--) {
        newBoard[row] = [...newBoard[row - 1]];
      }

      // Add an empty row at the top
      newBoard[0] = Array(BOARD_WIDTH).fill(0);

      // Stay on the same row index to check the new row that dropped down
      y++;
    }
  }

  return { newBoard, linesCleared };
}

/**
 * Creates a garbage line with a single hole at a random position
 */
export function createGarbageLine(): number[] {
  const holePosition = Math.floor(Math.random() * BOARD_WIDTH);
  return Array(BOARD_WIDTH)
    .fill(8)
    .map((value, index) => (index === holePosition ? 0 : value));
}

/**
 * Adds garbage lines to the bottom of a board, pushing existing content upward
 * @param board The current game board
 * @param lineCount The number of garbage lines to add
 * @returns The updated board with garbage lines
 */
export function addGarbageLines(board: Board, lineCount: number): Board {
  // Create a new board to avoid mutation
  const newBoard = [...board];

  // Remove top rows to make space for garbage lines
  newBoard.splice(0, lineCount);

  // Generate garbage lines and add them to the bottom
  const garbageLines: number[][] = [];
  for (let i = 0; i < lineCount; i++) {
    garbageLines.push(createGarbageLine());
  }

  // Return the new board with top rows removed and garbage lines added at the bottom
  return [...newBoard, ...garbageLines];
}
