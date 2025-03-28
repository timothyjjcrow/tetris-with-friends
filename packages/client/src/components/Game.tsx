import { useState, useEffect, useCallback } from "react";
import { GameManager } from "../game/GameManager";
import { GameStatus, MoveDirection, RotationDirection } from "../types";
import useInterval from "../hooks/useInterval";
import useKeyPress from "../hooks/useKeyPress";
import { Socket } from "socket.io-client";

interface GameProps {
  socket: Socket | null;
  roomId?: string;
  playerName: string;
}

const INITIAL_DROP_INTERVAL = 1000; // 1 second
const MIN_DROP_INTERVAL = 100; // Fastest drop speed at highest level
const SOFT_DROP_FACTOR = 0.1; // Soft drop is 10x faster than normal

export const Game = ({ socket, roomId, playerName }: GameProps) => {
  const [gameManager] = useState(() => new GameManager());
  const [gameTime, setGameTime] = useState(0);
  const [dropInterval, setDropInterval] = useState(INITIAL_DROP_INTERVAL);
  const [activeSoftDrop, setActiveSoftDrop] = useState(false);
  const [effectiveDropInterval, setEffectiveDropInterval] = useState(
    INITIAL_DROP_INTERVAL
  );

  const resetGame = useCallback(() => {
    gameManager.reset();
    setDropInterval(INITIAL_DROP_INTERVAL);
    setGameTime(0);
  }, [gameManager]);

  // Game loop
  useInterval(() => {
    setGameTime((prevTime) => prevTime + effectiveDropInterval);

    if (gameManager.status === GameStatus.PLAYING) {
      // Move the piece down
      const didMove = gameManager.movePiece(MoveDirection.DOWN);

      // If multiplayer, send game state update
      if (socket?.connected && roomId) {
        socket.emit("gameStateUpdate", {
          roomId,
          playerName,
          gameState: gameManager.getStateForSync(),
        });
      }

      // If piece didn't move down, it has landed
      if (!didMove) {
        const linesCleared = gameManager.lockPieceAndGetLinesCleared();

        // Update drop interval based on level
        const newDropInterval = Math.max(
          MIN_DROP_INTERVAL,
          INITIAL_DROP_INTERVAL - (gameManager.level - 1) * 50
        );

        setDropInterval(newDropInterval);

        // If multiplayer, send updated game state after piece locks
        if (socket?.connected && roomId) {
          socket.emit("gameStateUpdate", {
            roomId,
            playerName,
            gameState: gameManager.getStateForSync(),
          });

          // If lines were cleared, send an attack to opponents
          if (linesCleared > 0) {
            socket.emit("sendAttack", {
              roomId,
              playerName,
              linesCleared,
            });
          }
        }
      }
    }
  }, effectiveDropInterval);

  // Update effective drop interval whenever drop interval or soft drop changes
  useEffect(() => {
    setEffectiveDropInterval(
      activeSoftDrop ? dropInterval * SOFT_DROP_FACTOR : dropInterval
    );
  }, [dropInterval, activeSoftDrop]);

  // Handle keyboard controls
  useKeyPress("ArrowLeft", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.movePiece(MoveDirection.LEFT);
    }
  });

  useKeyPress("ArrowRight", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.movePiece(MoveDirection.RIGHT);
    }
  });

  useKeyPress(
    "ArrowDown",
    // Key down
    () => {
      if (gameManager.status === GameStatus.PLAYING) {
        setActiveSoftDrop(true);
      }
    },
    // Key up
    () => {
      setActiveSoftDrop(false);
    }
  );

  useKeyPress("ArrowUp", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.rotatePiece(RotationDirection.CLOCKWISE);
    }
  });

  useKeyPress("z", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.rotatePiece(RotationDirection.COUNTER_CLOCKWISE);
    }
  });

  useKeyPress(" ", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.hardDrop();

      // After hard drop, immediately send update to server
      if (socket?.connected && roomId) {
        socket.emit("gameStateUpdate", {
          roomId,
          playerName,
          gameState: gameManager.getStateForSync(),
        });
      }
    } else if (gameManager.status === GameStatus.WAITING) {
      gameManager.start();
    }
  });

  useKeyPress("c", () => {
    if (gameManager.status === GameStatus.PLAYING) {
      gameManager.holdPiece();
    }
  });

  // Handle start game button
  const startGame = () => {
    resetGame();
    gameManager.start();

    // Notify server that game has started
    if (socket?.connected && roomId) {
      socket.emit("gameStart", { roomId, playerName });
    }
  };

  // Receive garbage lines from the server
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleReceiveGarbage = (data: { amount: number }) => {
      gameManager.addGarbageLines(data.amount);
    };

    socket.on("receiveGarbage", handleReceiveGarbage);

    return () => {
      socket.off("receiveGarbage", handleReceiveGarbage);
    };
  }, [socket, roomId, gameManager]);

  return {
    gameState: {
      ...gameManager.getState(),
      dropInterval,
    },
    gameActions: {
      start: startGame,
      reset: resetGame,
    },
  };
};
