import React from "react";
import { COLORS } from "../styles/colors";

interface RoomInfoProps {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
}

const RoomInfo: React.FC<RoomInfoProps> = ({
  roomId,
  roomName,
  playerCount,
  maxPlayers,
}) => {
  // Calculate players percentage for progress bar
  const playerPercentage = (playerCount / maxPlayers) * 100;

  // Determine room status color
  const getRoomStatusColor = () => {
    if (playerPercentage <= 25) return COLORS.ui.accent.secondary; // Low occupancy
    if (playerPercentage <= 75) return COLORS.ui.accent.primary; // Medium occupancy
    return COLORS.ui.accent.warning; // High occupancy
  };

  return (
    <div className="bg-slate-800 p-4 rounded-md shadow-md border border-slate-700 animate-fade-in">
      {/* Room header with player count */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-slate-200">{roomName}</h2>
        <div
          className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5"
          style={{
            backgroundColor: `${getRoomStatusColor()}15`,
            color: getRoomStatusColor(),
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse-fast"
            style={{ backgroundColor: getRoomStatusColor() }}
          ></span>
          {playerCount} / {maxPlayers} players
        </div>
      </div>

      {/* Player count progress bar */}
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${playerPercentage}%`,
            backgroundColor: getRoomStatusColor(),
          }}
        ></div>
      </div>

      {/* Room ID with copy indicator */}
      <div className="text-xs text-slate-400 flex items-center">
        <span className="mr-2 font-medium">Room ID:</span>
        <div className="font-mono bg-slate-900 px-2 py-1.5 rounded-md overflow-hidden flex-1 flex justify-between items-center group border border-slate-700/50">
          <code className="truncate">{roomId}</code>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500 ml-1">
            Click to copy
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomInfo;
