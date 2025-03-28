# Tetris with Friends

A real-time multiplayer Tetris game built with React, Socket.IO, and TypeScript.

## Features

- Single-player mode with bot opponent
- Multiplayer mode to play against friends
- Real-time gameplay with instant feedback
- Classic Tetris mechanics with modern visuals
- Complete with line clearing animations, ghost pieces, and score tracking
- Garbage line system for competitive play

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Architecture**: Monorepo structure with shared types

## Getting Started

### Prerequisites

- Node.js 14+ and npm

### Installation

1. Clone the repository

   ```
   git clone https://github.com/timothyjjcrow/tetris-with-friends.git
   cd tetris-with-friends
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Start the development servers

   ```
   # Start the server
   npm run dev:server

   # In another terminal, start the client
   cd packages/client
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Game Controls

- **Arrow Left/Right**: Move piece horizontally
- **Arrow Down**: Soft drop (move down faster)
- **Arrow Up**: Rotate piece
- **Space**: Hard drop (place piece instantly)
- **Shift**: Hold piece

## Project Structure

```
tetris-with-friends/
├── packages/
│   ├── client/           # Frontend React application
│   ├── server/           # Backend Socket.IO server
│   └── types/            # Shared TypeScript types
├── package.json          # Root package.json for workspaces
└── README.md             # This file
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Classic Tetris for the original game concept
- The React and Socket.IO communities for excellent documentation
