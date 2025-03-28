import React, { useState } from "react";
import { COLORS } from "../styles/colors";

const ScoringInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Standard Tetris scoring system
  const scoringTable = [
    { lines: 1, name: "Single", basePoints: 100 },
    { lines: 2, name: "Double", basePoints: 300 },
    { lines: 3, name: "Triple", basePoints: 500 },
    { lines: 4, name: "Tetris", basePoints: 800 },
  ];

  return (
    <div className="bg-slate-800 p-4 rounded-md shadow-md border border-slate-700">
      <button
        onClick={toggleOpen}
        className="w-full flex justify-between items-center focus:outline-none"
      >
        <h2 className="text-lg font-medium text-slate-200">Scoring System</h2>
        <svg
          className={`h-5 w-5 transform transition-transform duration-300 text-slate-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="p-3 rounded-md bg-slate-900/50 border border-slate-700/50">
            <p className="text-sm text-slate-300 font-medium">
              Points = Base Points × (Level + 1)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-md overflow-hidden">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left py-2 px-3 font-medium text-slate-400">
                    Lines
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400">
                    Name
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-400">
                    Base Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoringTable.map((row, index) => (
                  <tr
                    key={row.lines}
                    className={`border-b border-slate-700 ${
                      index % 2 === 0 ? "bg-slate-800/50" : "bg-slate-900/30"
                    } hover:bg-slate-700/50 transition-colors`}
                  >
                    <td className="py-2 px-3 font-medium">{row.lines}</td>
                    <td className="py-2 px-3">
                      {row.name === "Tetris" ? (
                        <span
                          className="font-semibold"
                          style={{ color: COLORS.ui.accent.primary }}
                        >
                          {row.name}
                        </span>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {row.basePoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-slate-400 p-3 rounded-md bg-slate-900/50 border border-slate-700/50">
            <p className="font-medium text-slate-300 mb-2">Examples:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Single at Level 0:{" "}
                <span className="font-mono">100 × 1 = 100</span> points
              </li>
              <li>
                Tetris at Level 2:{" "}
                <span className="font-mono">800 × 3 = 2,400</span> points
              </li>
              <li>
                Back-to-back Tetris bonus:{" "}
                <span className="font-mono">+1,200</span> points
              </li>
            </ul>
          </div>

          <div className="flex justify-center mt-2">
            <button
              onClick={toggleOpen}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringInfo;
