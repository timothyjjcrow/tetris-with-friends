import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Check which environment we're in
const isVercel = process.env.VERCEL === "1";
const typesPath = isVercel
  ? path.resolve(process.cwd(), "../../node_modules/@tetris/types")
  : path.resolve(__dirname, "../types/dist");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd());

  console.log(`Building with @tetris/types path: ${typesPath}`);
  console.log(`Types exists: ${fs.existsSync(typesPath)}`);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
        "/socket.io": {
          target: "ws://localhost:3001",
          ws: true,
        },
      },
    },
    build: {
      // Enable source maps for better debugging
      sourcemap: mode !== "production",
      // Output to dist folder
      outDir: "dist",
      // Ensure the build is optimized
      minify: mode === "production",
      // Set chunk size to optimize loading
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "socket.io-client"],
            game: [
              "./src/components/GameBoard.tsx",
              "./src/components/PiecePreview.tsx",
            ],
          },
        },
      },
    },
    // Used for resolving modules
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@tetris/types": typesPath,
      },
    },
  };
});
