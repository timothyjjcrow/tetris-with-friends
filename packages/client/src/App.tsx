import { useState, useEffect, useCallback } from "react";
import { Manager, Socket as SocketType } from "socket.io-client";
import io from "socket.io-client";
import GameBoard from "./components/GameBoard";
import { PiecePreview } from "./components/PiecePreview";
import ScoreDisplay from "./components/ScoreDisplay";
import LevelDisplay from "./components/LevelDisplay";
import OpponentBoard from "./components/OpponentBoard";
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
  status: GameStatus;
  opponents?: OpponentData[];
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
  const [socket, setSocket] = useState<typeof SocketType | null>(null);

  // Room information
  const [roomInfo, setRoomInfo] = useState<RoomData | null>(null);

  // Garbage notification state (rename to avoid unused variable warning)
  const [_garbageNotification, setGarbageNotification] = useState<{
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
    "menu" | "singleplayer" | "multiplayer" | "offline"
  >("menu");
  const [playerName, setPlayerName] = useState<string>("");

  // Initialize Socket.IO connection
  const initializeConnection = useCallback(() => {
    setConnecting(true);
    setConnectionError(null);

    // If there's an existing socket, disconnect it first
    if (socket) {
      console.log("Disconnecting existing socket before reconnecting");
      socket.disconnect();
    }

    // Determine the appropriate server URL based on environment
    const serverUrl =
      import.meta.env.VITE_SERVER_URL ||
      (window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : "https://tetris-server-production.up.railway.app");

    console.log(`Connecting to server at: ${serverUrl}`);

    // Try to establish a simple connection first
    trySimpleConnection(serverUrl);
  }, [socket]);

  // Function to try a simple socket.io connection
  const trySimpleConnection = (serverUrl: string) => {
    console.log("Attempting simple direct connection...");

    // Simple connection with minimal options
    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 8000,
    });

    // Set up a timeout for connection attempts
    const connectionTimeout = setTimeout(() => {
      if (connecting) {
        console.error("Connection attempt timed out");
        socket.disconnect();
        setConnectionError(
          "Connection timed out. Please check your internet connection and try again."
        );
        setConnecting(false);
      }
    }, 8000);

    // Connection event handlers
    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
      clearTimeout(connectionTimeout);
      setConnecting(false);
      setConnectionError(null);
      setSocket(socket);

      // Add additional event listeners after successful connection
      setupEventListeners(socket);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Connection error:", error);
      socket.disconnect();
      setConnectionError(
        `Connection error: ${error.message}. Please try again later.`
      );
      setConnecting(false);
      clearTimeout(connectionTimeout);
    });

    socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
      setConnectionError(`Socket error: ${error.message}`);
      clearTimeout(connectionTimeout);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Disconnected from server:", reason);
      setRoomInfo(null);

      // Only show error if it wasn't a client-initiated disconnect
      if (reason !== "io client disconnect" && reason !== "transport close") {
        setConnectionError(
          `Disconnected: ${reason}. Please reconnect manually.`
        );
      }
      clearTimeout(connectionTimeout);
    });

    return () => {
      clearTimeout(connectionTimeout);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  };

  // Function to set up all event listeners for the socket
  const setupEventListeners = (socket: typeof SocketType) => {
    // Listen for welcome message
    socket.on("welcome", (data: any) => {
      console.log("Received welcome message:", data);
    });

    // Listen for notification messages
    socket.on("notification", (data: any) => {
      console.log("Received notification:", data);
    });

    // Listen for game state updates
    socket.on("gameStateUpdate", (newGameState: ExtendedGameState) => {
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
    socket.on("roomUpdate", (roomData: RoomData) => {
      setRoomInfo(roomData);
    });

    // Listen for garbage line notifications
    socket.on(
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
  };

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

      console.log(`Creating room with name: ${roomName}`);
      socket.emit("createRoom", roomName, (roomId: string) => {
        console.log(`Created room: ${roomId}`);

        if (!roomId) {
          setConnectionError("Failed to create room. Please try again.");
          return;
        }

        // Join the room
        socket.emit("joinRoom", { roomId, playerName }, (success: boolean) => {
          console.log(`Join room result: ${success ? "success" : "failed"}`);
          if (success) {
            console.log(`Joined room: ${roomId} as ${playerName}`);
            setConnectionError(null);
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
      console.log(`Joining room: ${roomId} as ${name}`);

      socket.emit(
        "joinRoom",
        { roomId, playerName: name },
        (success: boolean) => {
          console.log(`Join room result: ${success ? "success" : "failed"}`);
          if (success) {
            console.log(`Successfully joined room: ${roomId}`);
            setConnectionError(null);
            setGameMode("multiplayer");
          } else {
            console.error("Failed to join room");
            setConnectionError("Failed to join room. Please try again.");
          }
        }
      );
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;

    const handleWelcome = (data: any) => {
      console.log("Received welcome message:", data);
    };

    const handleRoomUpdate = (roomData: any) => {
      console.log("Received room update:", roomData);
      setRoomInfo(roomData);
    };

    const handleRoomsUpdate = (rooms: any) => {
      console.log("Received rooms update:", rooms);
    };

    const handleRoomJoined = (data: any) => {
      console.log("Room joined event received:", data);
      setConnectionError(null);
    };

    const handleSocketError = (error: any) => {
      console.error("Socket error:", error);
      setConnectionError(error.message || "An unknown error occurred");
    };

    const handleGameState = (gameState: any) => {
      console.log("Received game state:", gameState);
      setGameState((prevState) => ({
        ...prevState,
        ...gameState,
        // Make sure the state has the correct status format
        status:
          gameState.status === "playing"
            ? GameStatus.PLAYING
            : gameState.status === "waiting"
            ? GameStatus.WAITING
            : gameState.status === "paused"
            ? GameStatus.PAUSED
            : gameState.status === "game_over"
            ? GameStatus.GAME_OVER
            : prevState.status,
      }));
    };

    const handleGameStarting = (playerCount: number) => {
      console.log(`Game starting with ${playerCount} players!`);
    };

    // Listen for various socket events
    socket.on("welcome", handleWelcome);
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("roomsUpdate", handleRoomsUpdate);
    socket.on("roomJoined", handleRoomJoined);
    socket.on("error", handleSocketError);
    socket.on("gameState", handleGameState);
    socket.on("gameStarting", handleGameStarting);

    return () => {
      socket.off("welcome", handleWelcome);
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("roomsUpdate", handleRoomsUpdate);
      socket.off("roomJoined", handleRoomJoined);
      socket.off("error", handleSocketError);
      socket.off("gameState", handleGameState);
      socket.off("gameStarting", handleGameStarting);
    };
  }, [socket]);

  // Handle keyboard input for debugging game start
  useEffect(() => {
    const debugKeyHandler = (event: KeyboardEvent) => {
      // G key to force start a game
      if (event.key.toLowerCase() === "g" && socket?.connected) {
        console.log("Forcing game start with the debug key");

        // Find a room this player is in
        if (roomInfo?.id) {
          console.log(`Starting game in room ${roomInfo.id}`);
          socket.emit("startGame", roomInfo.id, (success: boolean) => {
            console.log(`Game start result: ${success ? "success" : "failed"}`);
          });
        } else {
          console.log("Not in a room, can't start game");
        }
      }
    };

    window.addEventListener("keydown", debugKeyHandler);
    return () => {
      window.removeEventListener("keydown", debugKeyHandler);
    };
  }, [socket, roomInfo]);

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
            {socket?.connected
              ? "Connected"
              : connecting
              ? "Connecting..."
              : "Disconnected"}
          </p>
        </div>

        {connectionError && (
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-300 text-sm">
            <p className="font-medium">Connection Issue</p>
            <p>{connectionError}</p>
            {connectionError.includes("server might be offline") && (
              <div className="mt-2">
                <p>Possible solutions:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Refresh the page and try again</li>
                  <li>
                    The game server may be temporarily down for maintenance
                  </li>
                  <li>Try again later when the server is back up</li>
                </ul>
                <button
                  onClick={initializeConnection}
                  className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-medium transition-colors"
                >
                  Try Connecting Again
                </button>
              </div>
            )}
          </div>
        )}

        {gameState.status === GameStatus.GAME_OVER && (
          <div className="text-center text-xl text-red-500 mt-2 p-2 bg-red-500/10 rounded-md border border-red-500/20 animate-pulse-fast">
            Game Over!
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto mt-4">
        {/* Show fallback content when disconnected */}
        {!socket?.connected && !connecting && (
          <div className="text-center py-10 px-4">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 5.636a9 9 0 0 1 0 12.728m-3.536-3.536a4 4 0 0 1-5.656-5.656m8.334 2.121a7 7 0 0 1-9.9-9.9"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3l18 18"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-300 mb-2">
              Server Connection Error
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              We're having trouble connecting to the game server. This usually
              happens when the server is down or your internet connection is
              unstable.
            </p>
            <button
              onClick={initializeConnection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Show loading spinner when connecting */}
        {connecting && (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="w-full h-full rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
            </div>
            <p className="text-lg text-gray-300">
              Connecting to game server...
            </p>
          </div>
        )}

        {/* Game board - show when playing and connected */}
        {socket?.connected && gameState.status === GameStatus.PLAYING && (
          <div
            className={`flex ${
              hasOpponents ? "justify-between" : "justify-center"
            } gap-8 flex-wrap`}
          >
            {/* Main player's game board */}
            <div className="flex flex-col items-center">
              <div className="flex justify-between items-start w-full mb-2">
                <div className="flex flex-col">
                  <ScoreDisplay
                    score={gameState.player.score}
                    level={gameState.player.level}
                    lines={gameState.player.lines}
                  />
                  <LevelDisplay
                    level={gameState.player.level}
                    lines={gameState.player.lines}
                    linesPerLevel={LINES_PER_LEVEL}
                    dropInterval={gameState.dropInterval}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <PiecePreview piece={gameState.nextPiece} title="Next" />
                  <PiecePreview
                    piece={gameState.heldPiece}
                    title="Hold"
                    disabled={!gameState.canHold}
                  />
                </div>
              </div>

              <GameBoard
                board={gameState.board}
                currentPiece={gameState.currentPiece}
                ghostPiecePosition={ghostPosition}
                clearedLines={clearedLines}
              />
            </div>

            {/* Opponents' boards */}
            {hasOpponents && (
              <div className="flex flex-wrap gap-4 justify-center">
                {gameState.opponents?.map((opponent) => (
                  <OpponentBoard key={opponent.id} opponent={opponent} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Game start screen - shown when not playing but connected */}
        {socket?.connected &&
          (gameState.status === GameStatus.WAITING ||
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

                        console.log("Starting single player game with bot");
                        socket.emit(
                          "startSinglePlayerWithBot",
                          {
                            difficulty: "medium",
                            playerName:
                              playerName ||
                              `Player ${socket.id?.substring(0, 5)}`,
                          },
                          (success: boolean, error?: string) => {
                            console.log(
                              `Single player start result: ${
                                success ? "success" : "failed"
                              }${error ? `, error: ${error}` : ""}`
                            );
                            if (success) {
                              setGameMode("singleplayer");
                              setConnectionError(null);
                            } else {
                              setConnectionError(
                                error ||
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
      </main>
    </div>
  );
}

// Function to calculate ghost piece position
function calculateGhostPosition(piece: Piece, board: number[][]): number {
  if (!piece) return 0;

  let yPos = piece.position.y;
  let collision = false;

  while (!collision) {
    yPos++;

    // Check for collision with the bottom of the board
    if (yPos + piece.shape.length > 20) {
      collision = true;
      break;
    }

    // Check for collision with existing pieces on the board
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (
          piece.shape[y][x] &&
          board[yPos + y] &&
          board[yPos + y][piece.position.x + x] !== 0
        ) {
          collision = true;
          break;
        }
      }
      if (collision) break;
    }
  }

  return yPos - 1;
}

export default App;
