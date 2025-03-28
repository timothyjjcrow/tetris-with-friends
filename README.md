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

- Node.js 16+ and npm

### Installation

1. Clone the repository

   ```
   git clone https://github.com/timothyjjcrow/tetris-with-friends.git
   cd tetris-with-friends
   ```

2. Install dependencies

   ```
   npm run install:all
   ```

3. Start the development servers

   ```
   # Start the server
   npm run dev:server

   # In another terminal, start the client
   npm run dev:client
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Deploying to Vercel

The project is configured for easy deployment to Vercel.

1. Fork this repository or push your changes to your GitHub account

2. Create a new project in Vercel and connect your GitHub repository

3. Use the following settings in Vercel:

   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:all`
   - **Output Directory**: `packages/client/dist`
   - **Install Command**: `npm run install:all`

4. Add the following environment variables in Vercel:

   - `NODE_ENV`: `production`

5. Deploy!

### Using the Deployed Version

The game is deployed at: [https://tetris-with-friends.vercel.app](https://github.com/timothyjjcrow/tetris-with-friends)

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
