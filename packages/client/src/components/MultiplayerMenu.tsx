import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

interface Room {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
  maxPlayers: number;
  isActive: boolean;
}

interface MultiplayerMenuProps {
  socket: typeof Socket | null;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  connectionError: string | null;
  connecting: boolean;
}

const MultiplayerMenu: React.FC<MultiplayerMenuProps> = ({
  socket,
  onCreateRoom,
  onJoinRoom,
  connectionError,
  connecting,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Fetch available rooms periodically
  useEffect(() => {
    if (socket && showJoinRoom) {
      fetchRooms();

      // Refresh rooms every 5 seconds
      const interval = setInterval(fetchRooms, 5000);

      // Clean up interval
      return () => clearInterval(interval);
    }
  }, [socket, showJoinRoom]);

  // Listen for room updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (roomData: Room) => {
      setCurrentRoom(roomData);
    };

    const handleGameStarting = (playerCount: number) => {
      console.log(`Game starting with ${playerCount} players!`);
      // The App component will handle setting the game state to PLAYING
    };

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStarting", handleGameStarting);

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("gameStarting", handleGameStarting);
    };
  }, [socket]);

  const fetchRooms = () => {
    if (socket) {
      socket.emit("getRooms", (rooms: Room[]) => {
        setAvailableRooms(rooms);
      });
    }
  };

  const handleCreateRoom = () => {
    if (!playerName || !roomName) return;

    console.log(`Creating room with name: ${roomName}`);
    if (socket) {
      // The server expects roomName directly, not an object
      socket.emit("createRoom", roomName, (roomId: string) => {
        console.log(`Room created with ID: ${roomId}`);
        if (!roomId) {
          console.error("Failed to create room - no roomId returned");
          return;
        }

        // Now join the created room
        socket.emit("joinRoom", { roomId, playerName }, (success: boolean) => {
          console.log(`Join room result: ${success ? "success" : "failed"}`);
          if (success) {
            onCreateRoom(roomName);
          } else {
            console.error("Failed to join the created room");
          }
        });
      });
    }
  };

  const handleJoinRoom = () => {
    if (!playerName || !roomId) return;

    console.log(`Joining room with ID: ${roomId}`);
    if (socket) {
      try {
        socket.emit("joinRoom", { roomId, playerName }, (success: boolean) => {
          console.log(`Join room result: ${success ? "success" : "failed"}`);
          if (success) {
            onJoinRoom(roomId, playerName);
          } else {
            console.error("Failed to join room with ID:", roomId);
          }
        });
      } catch (error) {
        console.error("Error joining room:", error);
      }
    }
  };

  const handleStartGame = () => {
    if (!socket || !currentRoom) return;

    socket.emit("startGame", currentRoom.id, (success: boolean) => {
      if (!success) {
        console.error("Failed to start game. Need at least 2 players.");
        // Could add an error message here
      }
    });
  };

  // If the user is already in a room, show the room information
  if (currentRoom) {
    return (
      <div className="bg-slate-800/60 p-8 rounded-lg shadow-lg border border-slate-700 mb-8 max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
          Room: {currentRoom.name}
        </h2>

        <div className="mb-4 p-3 bg-slate-700/50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 font-medium">Room ID:</span>
            <span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded">
              {currentRoom.id}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Share this ID with friends so they can join your room.
          </p>

          <div className="mb-4">
            <h3 className="text-slate-300 font-medium mb-2">
              Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
            </h3>
            <div className="max-h-32 overflow-y-auto border border-slate-700 rounded-md">
              {currentRoom.players.map((player) => (
                <div
                  key={player.id}
                  className="p-2 border-b border-slate-700 last:border-b-0"
                >
                  <div className="font-medium">{player.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          disabled={
            currentRoom.players.length < 2 || connecting || currentRoom.isActive
          }
          className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md ${
            currentRoom.players.length < 2 || connecting || currentRoom.isActive
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {currentRoom.isActive
            ? "Game in Progress"
            : currentRoom.players.length < 2
            ? "Need at least 2 players"
            : "Start Game"}
        </button>

        {currentRoom.players.length < 2 && (
          <p className="text-sm text-slate-400 mt-2 text-center">
            Waiting for more players to join...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 p-8 rounded-lg shadow-lg border border-slate-700 mb-8 max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
        Multiplayer Mode
      </h2>

      {connectionError && (
        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
          {connectionError}
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

      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => {
            setShowCreateRoom(true);
            setShowJoinRoom(false);
          }}
          className={`flex-1 py-2 rounded-md transition-colors ${
            showCreateRoom
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          disabled={connecting}
        >
          Create Room
        </button>
        <button
          onClick={() => {
            setShowJoinRoom(true);
            setShowCreateRoom(false);
            fetchRooms();
          }}
          className={`flex-1 py-2 rounded-md transition-colors ${
            showJoinRoom
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          disabled={connecting}
        >
          Join Room
        </button>
      </div>

      {showCreateRoom && (
        <div className="border border-slate-700 rounded-md p-4 bg-slate-800/50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
              placeholder="Enter room name"
              disabled={connecting}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={!playerName || !roomName || connecting}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md ${
              !playerName || !roomName || connecting
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Create & Join
          </button>
        </div>
      )}

      {showJoinRoom && (
        <div className="border border-slate-700 rounded-md p-4 bg-slate-800/50">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Available Rooms
              </label>
              <button
                onClick={fetchRooms}
                className="text-xs text-blue-400 hover:text-blue-300"
                disabled={connecting}
              >
                Refresh
              </button>
            </div>

            {availableRooms.length > 0 ? (
              <div className="max-h-40 overflow-y-auto mb-4 border border-slate-700 rounded-md">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setRoomId(room.id)}
                    className={`p-2 cursor-pointer hover:bg-slate-700 ${
                      roomId === room.id ? "bg-slate-700" : ""
                    }`}
                  >
                    <div className="font-medium">{room.name}</div>
                    <div className="text-xs text-slate-400">
                      Players: {room.players.length}/{room.maxPlayers}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 my-4 p-4 border border-dashed border-slate-700 rounded-md">
                No rooms available
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                placeholder="Enter room ID"
                disabled={connecting}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!playerName || !roomId || connecting}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md ${
                !playerName || !roomId || connecting
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Join Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerMenu;
