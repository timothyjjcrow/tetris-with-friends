import React from "react";
import { COLORS } from "../styles/colors";

interface LevelDisplayProps {
  level: number;
  lines: number;
  linesPerLevel: number;
  dropInterval?: number;
}

// Speed curve values for reference (matches server implementation)
const SPEED_CURVE = [
  800, // Level 0
  717, // Level 1
  633, // Level 2
  550, // Level 3
  467, // Level 4
  383, // Level 5
  300, // Level 6
  217, // Level 7
  133, // Level 8
  100, // Level 9
  83, // Level 10
  83, // Level 11
  83, // Level 12
  67, // Level 13
  67, // Level 14
  67, // Level 15
  50, // Level 16
  50, // Level 17
  50, // Level 18
  33, // Level 19
  33, // Level 20+
];

const LevelDisplay: React.FC<LevelDisplayProps> = ({
  level,
  lines,
  linesPerLevel = 10,
  dropInterval,
}) => {
  // Calculate progress to next level
  const linesInCurrentLevel = lines % linesPerLevel;
  const progressPercent = (linesInCurrentLevel / linesPerLevel) * 100;

  // Calculate how many lines needed to reach the next level
  const linesToNextLevel = linesPerLevel - linesInCurrentLevel;

  // Calculate relative speed as a percentage of the initial speed
  const initialSpeed = SPEED_CURVE[0];
  const currentSpeed =
    dropInterval || SPEED_CURVE[Math.min(level, SPEED_CURVE.length - 1)];
  const speedPercent = Math.round((initialSpeed / currentSpeed) * 100);

  // Get a descriptive speed label
  const getSpeedLabel = () => {
    if (speedPercent <= 120) return "Slow";
    if (speedPercent <= 200) return "Medium";
    if (speedPercent <= 400) return "Fast";
    if (speedPercent <= 800) return "Very Fast";
    return "Extreme";
  };

  // Get color based on speed
  const getSpeedColor = () => {
    if (speedPercent <= 120) return COLORS.ui.accent.secondary;
    if (speedPercent <= 200) return COLORS.ui.accent.primary;
    if (speedPercent <= 400) return COLORS.ui.accent.warning;
    return COLORS.ui.accent.danger;
  };

  return (
    <div className="bg-slate-800 p-4 rounded-md shadow-md border border-slate-700">
      {/* Level display with badge */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-medium text-slate-200">Level</h2>
          <div
            className="text-lg font-bold px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${getSpeedColor()}25`,
              color: getSpeedColor(),
            }}
          >
            {level}
          </div>
        </div>
        <div className="text-xs font-medium text-slate-400 bg-slate-900/60 px-2 py-1 rounded">
          {linesToNextLevel} to next
        </div>
      </div>

      {/* Progress bar with improved styling */}
      <div className="mb-3">
        <div className="w-full bg-slate-900 rounded-full h-3 mb-1 overflow-hidden border border-slate-700/50">
          <div
            className="h-full rounded-full transition-all duration-300 flex items-center justify-end pr-1"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${COLORS.ui.accent.secondary}, ${COLORS.ui.accent.primary})`,
            }}
          >
            {progressPercent > 30 && (
              <span className="text-[8px] font-bold text-white">
                {Math.round(progressPercent)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-400 text-right">
          {linesInCurrentLevel}/{linesPerLevel} lines
        </div>
      </div>

      {/* Speed indicator with visual enhancements */}
      <div className="mt-4 bg-slate-900/60 p-2 rounded-md border border-slate-700/50">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-slate-400 font-medium">Speed</span>
          <span
            className="text-sm font-bold"
            style={{ color: getSpeedColor() }}
          >
            {getSpeedLabel()} ({speedPercent}%)
          </span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700/50 p-0.5">
          <div
            className="h-full rounded-full transition-all duration-300 max-w-full"
            style={{
              width: `${Math.min(speedPercent, 100)}%`,
              backgroundColor: getSpeedColor(),
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LevelDisplay;
