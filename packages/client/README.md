# Tetris Game Client

This is the client component of the Tetris game. It provides the user interface for the game and connects to the server for game state updates.

## User Interface Components

### Game Board

- Displays the current state of the game grid
- Shows the active piece and ghost piece
- Updates in real-time based on server game state

### Score Display

- Shows the current score
- Displays the player's level
- Shows total lines cleared

### Level Display

- Shows the current level with a progress bar
- Indicates how many lines are needed to reach the next level
- Updates dynamically as lines are cleared

### Piece Displays

- Next Piece: Shows the upcoming piece
- Hold Piece: Displays the currently held piece (if any)

## Game Controls

| Control | Action     | Description                         |
| ------- | ---------- | ----------------------------------- |
| ←       | Move Left  | Moves the piece one cell left       |
| →       | Move Right | Moves the piece one cell right      |
| ↓       | Soft Drop  | Accelerates the piece downward      |
| ↑       | Rotate     | Rotates the piece clockwise         |
| Space   | Hard Drop  | Instantly drops the piece to bottom |
| Shift   | Hold       | Holds the current piece             |

The controls can be used via keyboard or the on-screen buttons.

## Features

- Real-time gameplay via Socket.IO connection to the server
- Responsive design with Tailwind CSS
- Visual feedback for game actions (ghost piece, disabled hold)
- Game state synchronization with the server
- Score and level tracking
- Visual indicators for level progression
- Simple and intuitive UI for Tetris gameplay

## Technical Details

The client is built with:

- React for the UI components
- TypeScript for type safety
- Socket.IO for real-time communication with the server
- Tailwind CSS for styling

The game state is managed by the server and synchronized to the client via Socket.IO events. The client is responsible for rendering the game state and sending player actions to the server.
