import { useState, useEffect, useCallback } from "react";
import { Manager, Socket } from "socket.io-client";
import GameBoard from "./components/GameBoard";
import { PiecePreview } from "./components/PiecePreview";
import ScoreDisplay from "./components/ScoreDisplay";
import LevelDisplay from "./components/LevelDisplay";
import ScoringInfo from "./components/ScoringInfo";
import OpponentBoard from "./components/OpponentBoard";
import RoomInfo from "./components/RoomInfo";
import MultiplayerMenu from "./components/MultiplayerMenu";
import { createEmptyBoard } from "./utils/boardUtils";
import { COLORS } from "./styles/colors";
import { GameState, OpponentData } from "@tetris/types";

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

// Define GameStatus locally to avoid import issues
enum GameStatus {
  WAITING = "waiting",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

// Define PlayerAction locally to avoid import issues
enum PlayerAction {
  MOVE_LEFT = "move_left",
  MOVE_RIGHT = "move_right",
  MOVE_DOWN = "move_down",
  ROTATE = "rotate",
  DROP = "drop",
  HOLD = "hold",
}

// Lines required to level up
const LINES_PER_LEVEL = 10;

// Room information interface
interface RoomData {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
  maxPlayers: number;
  isActive: boolean;
}

interface ExtendedGameState extends GameState {
  board: number[][];
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  heldPiece: Piece | null;
  canHold: boolean;
  pieceQueue: Piece[];
  players: any[];
  player: {
    id: string;
    name: string;
    score: number;
    level: number;
    lines: number;
  };
  lastDropTime: number;
  dropInterval: number;
}

// The colors for each tetromino type
const PIECE_COLORS: Record<TetrominoType, string> = {
  I: "#00CFCF", // Cyan
  O: "#FFD500", // Yellow
  T: "#9E00CF", // Purple
  L: "#FF9000", // Orange
  J: "#0028CF", // Blue
  S: "#00CF2F", // Green
  Z: "#CF0030", // Red
};

function App() {
  // Socket connection
  const [socket, setSocket] = useState<typeof Socket | null>(null);

  // Room information
  const [roomInfo, setRoomInfo] = useState<RoomData | null>(null);

  // Garbage notification state
  const [garbageNotification, setGarbageNotification] = useState<{
    lineCount: number;
    fromPlayer: string;
    timestamp: number;
  } | null>(null);

  // Track cleared lines for animation
  const [clearedLines, setClearedLines] = useState<number[]>([]);

  // Game state from server
  const [gameState, setGameState] = useState<ExtendedGameState>({
    status: GameStatus.WAITING, // Start with WAITING instead of PLAYING
    board: createEmptyBoard() as unknown as number[][], // Cast to number[][] to satisfy TypeScript
    currentPiece: null,
    nextPiece: null,
    heldPiece: null,
    canHold: true,
    pieceQueue: [],
    players: [],
    player: {
      id: "",
      name: "",
      score: 0,
      level: 0,
      lines: 0,
    },
    lastDropTime: Date.now(),
    dropInterval: 800,
  });

  // Add a state to track connection attempt status
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Add a state to track the current view/mode
  const [gameMode, setGameMode] = useState<
    "menu" | "singleplayer" | "multiplayer"
  >("menu");
  const [playerName, setPlayerName] = useState<string>("");

  // Initialize Socket.IO connection
  const initializeConnection = useCallback(() => {
    setConnecting(true);
    setConnectionError(null);

    // Determine the appropriate server URL based on environment
    const isProduction = window.location.hostname !== "localhost";
    let serverUrl = "http://localhost:3001";

    if (isProduction) {
      // Use relative URL in production which will be handled by our API route
      serverUrl = window.location.origin;
    }

    console.log(`Connecting to server at: ${serverUrl}`);

    // Connect to the Socket.IO server
    const manager = new Manager(serverUrl, {
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
      path: isProduction ? "/api/socket" : undefined,
    });
    const newSocket = manager.socket("/");

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to server with ID:", newSocket.id);
      setConnecting(false);
      setConnectionError(null);
    });

    newSocket.on("connect_error", (error: Error) => {
      console.error("Connection error:", error);
      setConnectionError(`Connection error: ${error.message}`);
      setConnecting(false);
    });

    newSocket.on("disconnect", (reason: string) => {
      console.log("Disconnected from server:", reason);
      setRoomInfo(null);
      setConnectionError(`Disconnected: ${reason}`);
    });

    // Listen for game state updates
    newSocket.on("gameStateUpdate", (newGameState: ExtendedGameState) => {
      console.log("Received game state update", newGameState.status);

      // Log the board for debugging
      console.log("Board state from server:", newGameState.board?.slice(0, 3));

      // Check if there are lines cleared to animate
      if (newGameState.player.lines > gameState.player.lines) {
        console.log("Lines cleared detected!");

        // Find which lines were cleared by comparing the boards
        // This is more accurate than the previous method
        const linesCleared: number[] = [];

        // First, find all filled lines in the old board
        const filledLines = gameState.board
          .map((row, index) => ({
            row,
            index,
            isFilled: row.every((cell) => cell !== 0),
          }))
          .filter((item) => item.isFilled)
          .map((item) => item.index);

        console.log("Previously filled lines:", filledLines);

        // If we had filled lines in previous state but they're gone now,
        // they were likely cleared
        if (filledLines.length > 0) {
          linesCleared.push(...filledLines);
          console.log("Lines to animate:", linesCleared);

          // Set lines to be animated
          setClearedLines(linesCleared);

          // Reset cleared lines after animation
          setTimeout(() => {
            setClearedLines([]);
          }, 650); // Slightly longer than animation duration
        }
      }

      // Add color to the currentPiece if it exists
      if (newGameState.currentPiece && newGameState.currentPiece.type) {
        newGameState.currentPiece.color =
          PIECE_COLORS[newGameState.currentPiece.type] || "#AAA";
      }

      setGameState(newGameState);
    });

    // Listen for room updates
    newSocket.on("roomUpdate", (roomData: RoomData) => {
      setRoomInfo(roomData);
    });

    // Listen for garbage line notifications
    newSocket.on(
      "receiveGarbage",
      ({
        lineCount,
        fromPlayer,
      }: {
        lineCount: number;
        fromPlayer: string;
      }) => {
        console.log(`Received ${lineCount} garbage lines from ${fromPlayer}`);

        // Show garbage notification
        setGarbageNotification({
          lineCount,
          fromPlayer,
          timestamp: Date.now(),
        });

        // Clear notification after 3 seconds
        setTimeout(() => {
          setGarbageNotification(null);
        }, 3000);
      }
    );

    // Store the socket instance
    setSocket(newSocket);

    // Clean up the socket connection when component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Initialize socket on first load
  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  // Handle player actions with a callback to avoid recreating it on each render
  const handlePlayerAction = useCallback(
    (action: PlayerAction) => {
      if (socket) {
        // Emit the action to the server
        socket.emit("playerAction", { type: action });
        console.log(`Emitted ${action} action to server`);
      }
    },
    [socket]
  );

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle input if the game is in playing state
      if (gameState.status !== GameStatus.PLAYING) return;

      // Prevent default behavior for game control keys
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          " ",
          "Shift",
        ].includes(event.key)
      ) {
        event.preventDefault();
      }

      switch (event.key) {
        case "ArrowLeft":
          handlePlayerAction(PlayerAction.MOVE_LEFT);
          break;
        case "ArrowRight":
          handlePlayerAction(PlayerAction.MOVE_RIGHT);
          break;
        case "ArrowDown":
          handlePlayerAction(PlayerAction.MOVE_DOWN);
          break;
        case "ArrowUp":
          handlePlayerAction(PlayerAction.ROTATE);
          break;
        case " ": // Space bar
          handlePlayerAction(PlayerAction.DROP);
          break;
        case "Shift": // Hold piece
          handlePlayerAction(PlayerAction.HOLD);
          break;
        default:
          break;
      }
    };

    // Add the event listener
    window.addEventListener("keydown", handleKeyDown);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlePlayerAction, gameState.status]);

  // Calculate ghost piece position
  const ghostPosition = gameState.currentPiece
    ? {
        x: gameState.currentPiece.position.x,
        y: calculateGhostPosition(
          gameState.currentPiece,
          gameState.board // Pass the raw board data
        ),
      }
    : undefined;

  // Get opponents if they exist
  const hasOpponents = gameState.opponents && gameState.opponents.length > 0;

  // Add a useEffect to check the board state when it's received from the server
  useEffect(() => {
    if (gameState?.board) {
      console.log("App: Received board state from server");
    }
  }, [gameState?.board]);

  // Add handlers for multiplayer functionality
  const handleCreateRoom = useCallback(
    (roomName: string) => {
      if (!socket || !playerName) return;

      socket.emit("createRoom", roomName, (roomId: string) => {
        console.log(`Created room: ${roomId}`);

        // Join the room
        socket.emit("joinRoom", { roomId, playerName }, (success: boolean) => {
          if (success) {
            console.log(`Joined room: ${roomId} as ${playerName}`);
            setGameMode("multiplayer");
          } else {
            setConnectionError("Failed to join room. Please try again.");
          }
        });
      });
    },
    [socket, playerName]
  );

  const handleJoinRoom = useCallback(
    (roomId: string, name: string) => {
      if (!socket) return;

      setPlayerName(name);

      socket.emit(
        "joinRoom",
        { roomId, playerName: name },
        (success: boolean) => {
          if (success) {
            console.log(`Joined room: ${roomId} as ${name}`);
            setGameMode("multiplayer");
          } else {
            setConnectionError("Failed to join room. Please try again.");
          }
        }
      );
    },
    [socket]
  );

  return (
    <div
      className="min-h-screen text-white p-4 bg-gradient-to-b from-slate-900 to-slate-800 font-sans"
      style={{ backgroundColor: COLORS.ui.background.dark }}
    >
      <header className="py-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            Tetris Multiplayer
          </h1>
          <p
            className={`text-sm px-3 py-1 rounded-full flex items-center ${
              socket?.connected
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                socket?.connected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            ></span>
            {socket?.connected ? "Connected" : "Disconnected"}
          </p>
        </div>

        {gameState.status === GameStatus.GAME_OVER && (
          <div className="text-center text-xl text-red-500 mt-2 p-2 bg-red-500/10 rounded-md border border-red-500/20 animate-pulse-fast">
            Game Over!
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto mt-4">
        {/* Game start screen - shown when not playing */}
        {(gameState.status === GameStatus.WAITING ||
          gameState.status === GameStatus.GAME_OVER) &&
          !roomInfo && (
            <div className="flex flex-col items-center justify-center h-[70vh]">
              <div className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Welcome to Tetris Multiplayer
              </div>

              {gameMode === "menu" && (
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mx-auto">
                  <div className="bg-slate-800/60 p-8 rounded-lg shadow-lg border border-slate-700 mb-8 max-w-md text-center flex-1">
                    <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                      Single Player Mode
                    </h2>

                    <p className="mb-6 text-slate-300">
                      Challenge yourself against a bot in single player mode!
                    </p>

                    {connectionError && (
                      <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
                        {connectionError}
                        <button
                          onClick={initializeConnection}
                          className="ml-2 underline hover:text-red-300"
                        >
                          Try Again
                        </button>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                        placeholder="Enter your name"
                        disabled={connecting}
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!socket) {
                          initializeConnection();
                          return;
                        }

                        if (!socket.connected) {
                          socket.connect();
                          return;
                        }

                        socket.emit(
                          "startSinglePlayerWithBot",
                          {
                            difficulty: "medium",
                            playerName:
                              playerName ||
                              `Player ${socket.id?.substring(0, 5)}`,
                          },
                          (success: boolean) => {
                            if (success) {
                              console.log(
                                "Started single player game with bot"
                              );
                              setGameMode("singleplayer");
                            } else {
                              console.error(
                                "Failed to start single player game"
                              );
                              setConnectionError(
                                "Failed to start game. Please try again."
                              );
                            }
                          }
                        );
                      }}
                      disabled={connecting}
                      className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-md transition-colors shadow-lg text-xl w-full mb-4 ${
                        connecting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {connecting
                        ? "Connecting..."
                        : !socket?.connected
                        ? "Connect & Play"
                        : "Start Single Player Game"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 flex-1">
                    <div className="bg-slate-800/60 p-8 rounded-lg shadow-lg border border-slate-700 mb-4 text-center">
                      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
                        Multiplayer Mode
                      </h2>
                      <p className="mb-6 text-slate-300">
                        Play against your friends in real-time multiplayer mode!
                      </p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                          placeholder="Enter your name"
                          disabled={connecting}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => {
                            if (!socket) {
                              initializeConnection();
                              return;
                            }

                            if (!socket.connected) {
                              socket.connect();
                              return;
                            }

                            setGameMode("multiplayer");
                          }}
                          disabled={!playerName || connecting}
                          className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md w-full ${
                            !playerName || connecting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          Create Room
                        </button>

                        <button
                          onClick={() => {
                            if (!socket) {
                              initializeConnection();
                              return;
                            }

                            if (!socket.connected) {
                              socket.connect();
                              return;
                            }

                            setGameMode("multiplayer");
                          }}
                          disabled={!playerName || connecting}
                          className={`bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md w-full ${
                            !playerName || connecting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          Join Room
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {gameMode === "multiplayer" && (
                <div className="flex flex-col items-center w-full max-w-md mx-auto">
                  <MultiplayerMenu
                    socket={socket}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    connectionError={connectionError}
                    connecting={connecting}
                  />
                  <button
                    onClick={() => setGameMode("menu")}
                    className="mt-4 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Back to Menu
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Only show game content when playing */}
        {gameState.status === GameStatus.PLAYING && (
          <>
            {/* Garbage notification */}
            {garbageNotification && (
              <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-shake">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="font-bold">
                    {garbageNotification.fromPlayer} sent you{" "}
                    {garbageNotification.lineCount} garbage lines!
                  </p>
                </div>
              </div>
            )}

            {/* Room information */}
            {roomInfo && (
              <div className="mb-6 w-full">
                <RoomInfo
                  roomId={roomInfo.id}
                  roomName={roomInfo.name}
                  playerCount={roomInfo.players.length}
                  maxPlayers={roomInfo.maxPlayers}
                />
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">
              {/* Game area - main section */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Left side - Held piece and level */}
                <div className="flex flex-col gap-4 order-2 sm:order-1">
                  <PiecePreview
                    piece={gameState.heldPiece}
                    title="Hold"
                    disabled={!gameState.canHold}
                  />

                  <LevelDisplay
                    level={gameState.player.level}
                    lines={gameState.player.lines}
                    linesPerLevel={LINES_PER_LEVEL}
                    dropInterval={gameState.dropInterval}
                  />
                </div>

                {/* Center - Game board - Make it larger */}
                <div className="w-full max-w-xs sm:max-w-md order-1 sm:order-2">
                  <GameBoard
                    board={gameState.board}
                    currentPiece={
                      gameState.currentPiece
                        ? {
                            ...gameState.currentPiece,
                            color: getPieceGradient(
                              gameState.currentPiece.type
                            ),
                          }
                        : null
                    }
                    ghostPiecePosition={ghostPosition}
                    clearedLines={clearedLines}
                  />

                  {/* Controls on small screens only */}
                  <div className="mt-6 sm:hidden grid grid-cols-3 gap-3 w-full">
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handlePlayerAction(PlayerAction.MOVE_LEFT)}
                      disabled={gameState.status !== GameStatus.PLAYING}
                    >
                      ←
                    </button>
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handlePlayerAction(PlayerAction.MOVE_DOWN)}
                      disabled={gameState.status !== GameStatus.PLAYING}
                    >
                      ↓
                    </button>
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() =>
                        handlePlayerAction(PlayerAction.MOVE_RIGHT)
                      }
                      disabled={gameState.status !== GameStatus.PLAYING}
                    >
                      →
                    </button>
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handlePlayerAction(PlayerAction.ROTATE)}
                      disabled={gameState.status !== GameStatus.PLAYING}
                    >
                      Rotate
                    </button>
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handlePlayerAction(PlayerAction.HOLD)}
                      disabled={
                        gameState.status !== GameStatus.PLAYING ||
                        !gameState.canHold
                      }
                    >
                      Hold
                    </button>
                    <button
                      className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 p-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handlePlayerAction(PlayerAction.DROP)}
                      disabled={gameState.status !== GameStatus.PLAYING}
                    >
                      Drop
                    </button>
                  </div>
                </div>

                {/* Right side - Next piece and score */}
                <div className="flex flex-col gap-4 order-3">
                  <PiecePreview piece={gameState.nextPiece} title="Next" />

                  <ScoreDisplay
                    score={gameState.player.score}
                    level={gameState.player.level}
                    lines={gameState.player.lines}
                  />
                </div>
              </div>

              {/* Opponents section - side or below based on screen size */}
              {hasOpponents && (
                <div className="mt-6 lg:mt-0 max-w-md lg:max-w-xs w-full">
                  <h2 className="text-lg font-medium mb-3 px-1 text-slate-300">
                    Opponents
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {gameState.opponents &&
                      gameState.opponents.map((opponent: OpponentData) => (
                        <OpponentBoard key={opponent.id} opponent={opponent} />
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game info and controls */}
              <div className="bg-slate-800 p-4 rounded-md shadow-md border border-slate-700">
                <h2 className="text-lg font-medium mb-3 text-slate-200">
                  Controls
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                      ←
                    </span>
                    <span>Move Left</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                      →
                    </span>
                    <span>Move Right</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                      ↑
                    </span>
                    <span>Rotate</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600">
                      ↓
                    </span>
                    <span>Soft Drop</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600 text-xs">
                      Space
                    </span>
                    <span>Hard Drop</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-8 h-8 mr-2 bg-slate-700 rounded flex items-center justify-center border border-slate-600 text-xs">
                      Shift
                    </span>
                    <span>Hold Piece</span>
                  </div>
                </div>
              </div>

              {/* Scoring system */}
              <ScoringInfo />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Helper function to get piece gradient based on type
function getPieceGradient(type: TetrominoType): string {
  switch (type) {
    case "I":
      return "linear-gradient(135deg, #66F9F9 0%, #00CFCF 50%, #00A5A5 100%)";
    case "O":
      return "linear-gradient(135deg, #FFEB80 0%, #FFD500 50%, #CCAA00 100%)";
    case "T":
      return "linear-gradient(135deg, #CF66F9 0%, #9E00CF 50%, #7400A5 100%)";
    case "L":
      return "linear-gradient(135deg, #FFCB80 0%, #FF9000 50%, #CC7300 100%)";
    case "J":
      return "linear-gradient(135deg, #667DF9 0%, #0028CF 50%, #001EA5 100%)";
    case "S":
      return "linear-gradient(135deg, #66F989 0%, #00CF2F 50%, #00A525 100%)";
    case "Z":
      return "linear-gradient(135deg, #F9667D 0%, #CF0030 50%, #A50025 100%)";
    default:
      return "linear-gradient(135deg, #66F9F9 0%, #00CFCF 50%, #00A5A5 100%)";
  }
}

// Helper function to calculate ghost piece position
function calculateGhostPosition(piece: Piece, board: number[][]): number {
  let testY = piece.position.y;

  // Move the piece down until it collides
  while (testY < board.length) {
    let collision = false;

    // Check for collisions
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const boardX = piece.position.x + x;
          const boardY = testY + y;

          // Check if out of bounds or colliding with another piece
          if (
            boardY >= board.length ||
            boardX < 0 ||
            boardX >= board[0].length ||
            (boardY >= 0 && board[boardY][boardX] !== 0)
          ) {
            collision = true;
            break;
          }
        }
      }
      if (collision) break;
    }

    if (collision) {
      testY--; // Move back up one step
      break;
    }

    testY++;
  }

  return testY;
}

export default App;
