import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../styles/colors";

interface ScoreDisplayProps {
  score: number;
  level: number;
  lines: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, level, lines }) => {
  const prevScoreRef = useRef(score);
  const [isScoreIncreasing, setIsScoreIncreasing] = useState(false);

  // Add animation when score increases
  useEffect(() => {
    if (score > prevScoreRef.current) {
      setIsScoreIncreasing(true);
      const timer = setTimeout(() => setIsScoreIncreasing(false), 800);

      // Clean up timer
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = score;
  }, [score]);

  return (
    <div className="bg-slate-800 p-4 rounded-md shadow-md border border-slate-700">
      <div className="mb-4">
        <h2 className="text-xl font-medium mb-2 text-center text-slate-200">
          Score
        </h2>
        <div className="bg-slate-900/70 py-2 px-3 rounded-md border border-slate-700">
          <p
            className={`text-2xl font-mono text-center font-bold 
              ${
                isScoreIncreasing
                  ? "text-yellow-400 animate-pulse-fast scale-110"
                  : "text-slate-200"
              } 
              transition-all duration-300`}
          >
            {score.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 p-2 rounded-md border border-slate-700/50">
          <h3 className="text-sm text-slate-400 text-center mb-1">Level</h3>
          <p
            className="text-lg font-mono text-center font-semibold"
            style={{ color: COLORS.ui.accent.primary }}
          >
            {level}
          </p>
        </div>

        <div className="bg-slate-900/50 p-2 rounded-md border border-slate-700/50">
          <h3 className="text-sm text-slate-400 text-center mb-1">Lines</h3>
          <p
            className="text-lg font-mono text-center font-semibold"
            style={{ color: COLORS.ui.accent.secondary }}
          >
            {lines}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScoreDisplay;
