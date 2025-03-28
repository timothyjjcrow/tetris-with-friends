// Color palette for Tetris game
export const COLORS = {
  // Piece colors with gradient capability (base, light, dark)
  pieces: {
    I: { base: "#00CFCF", light: "#66F9F9", dark: "#00A5A5" }, // Cyan
    O: { base: "#FFD500", light: "#FFEB80", dark: "#CCAA00" }, // Yellow
    T: { base: "#9E00CF", light: "#CF66F9", dark: "#7400A5" }, // Purple
    L: { base: "#FF9000", light: "#FFCB80", dark: "#CC7300" }, // Orange
    J: { base: "#0028CF", light: "#667DF9", dark: "#001EA5" }, // Blue
    S: { base: "#00CF2F", light: "#66F989", dark: "#00A525" }, // Green
    Z: { base: "#CF0030", light: "#F9667D", dark: "#A50025" }, // Red
  },

  // UI theme colors
  ui: {
    background: {
      dark: "#0F172A", // Background color
      medium: "#1E293B", // Secondary background
      light: "#334155", // Light background elements
    },
    accent: {
      primary: "#3B82F6", // Primary accent color
      secondary: "#10B981", // Secondary accent color
      danger: "#EF4444", // Error/dangerous actions
      warning: "#F59E0B", // Warning color
    },
    text: {
      primary: "#F8FAFC",
      secondary: "#94A3B8",
      disabled: "#64748B",
    },
    border: {
      light: "#475569",
      dark: "#334155",
    },
  },

  // Game board specific colors
  board: {
    background: "#020617", // Darkest blue for clear contrast
    gridLines: "#1E293B",
    emptyCell: "#0f172a", // Darker empty cells for better contrast with pieces
    ghostPiece: "rgba(255, 255, 255, 0.25)", // More visible ghost piece
  },

  // Garbage line color
  garbage: "#64748B",
};

// Helper function to get piece color based on type
export function getPieceColorObject(type: string) {
  const key = type as keyof typeof COLORS.pieces;
  return COLORS.pieces[key] || COLORS.pieces.I;
}

// Function to get a CSS gradient for piece
export function getPieceGradient(type: string) {
  const color = getPieceColorObject(type);
  return `linear-gradient(135deg, ${color.light} 0%, ${color.base} 50%, ${color.dark} 100%)`;
}
