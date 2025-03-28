# Tetris Game Server

This is the server component for the Tetris with Friends multiplayer game. It provides WebSocket connections via Socket.IO to enable real-time multiplayer gameplay.

## Features

- Real-time multiplayer gameplay
- Room management for hosting and joining games
- Game state synchronization
- Bot players for single-player practice

## Deployment

### Deploying to Railway (Recommended for WebSockets)

Railway is recommended for WebSocket applications as it supports long-lived connections.

## Deploying the Tetris Server to Railway

Follow these steps to deploy the Tetris server to Railway:

1. Make sure you're in the server directory:

   ```
   cd packages/server
   ```

2. If you haven't already, install the Railway CLI:

   ```
   npm i -g @railway/cli
   ```

3. Login to Railway:

   ```
   railway login
   ```

4. Create a new project on Railway:

   ```
   railway init
   ```

   - Name your project (e.g., "tetris-with-friends-server")

5. Create environment variables:

   ```
   railway vars set PORT=3001
   railway vars set NODE_ENV=production
   ```

6. Deploy the server:

   ```
   railway up
   ```

7. Get your deployment URL:

   ```
   railway domain
   ```

8. Update the client's `.env.production` file with the Railway URL:

   ```
   VITE_SERVER_URL=https://your-railway-url.up.railway.app
   ```

9. Commit and push your changes to deploy the client with the updated server URL.

### Deploying to Vercel (Not recommended for WebSockets)

**Note:** Vercel serverless functions do not support long-lived WebSocket connections. This deployment option is provided for API endpoints only.

1. Make sure you have the Vercel CLI installed:
   ```
   npm install -g vercel
   ```
2. Login to Vercel:
   ```
   vercel login
   ```
3. Deploy the server:
   ```
   cd packages/server
   vercel
   ```

## Development

Run the server locally:

```
npm run dev
```

The server will start on port 3001 by default.

## API Endpoints

- `GET /health` - Health check
- `GET /status` - Server status and statistics

## WebSocket Events

The server uses Socket.IO for real-time communication. Key events include:

- `connect` - Client connection
- `disconnect` - Client disconnection
- `createRoom` - Create a new game room
- `joinRoom` - Join an existing game room
- `gameStateUpdate` - Update game state
- `playerAction` - Handle player actions (move, rotate, etc.)
- `sendAttack` - Send an attack to opponents
- `receiveGarbage` - Receive garbage lines from opponents

## Scoring System

The scoring system follows standard Tetris rules:

| Lines Cleared | Name   | Base Points |
| ------------- | ------ | ----------- |
| 1             | Single | 100         |
| 2             | Double | 300         |
| 3             | Triple | 500         |
| 4             | Tetris | 800         |

The actual points awarded are calculated by multiplying the base points with the current level + 1.

For example:

- Clearing 2 lines (Double) at level 0 = 300 × 1 = 300 points
- Clearing 4 lines (Tetris) at level 2 = 800 × 3 = 2,400 points

## Level Progression

The game starts at level 0 and increases by 1 for every 10 lines cleared.

| Lines Cleared | Level |
| ------------- | ----- |
| 0-9           | 0     |
| 10-19         | 1     |
| 20-29         | 2     |
| ...           | ...   |

## Speed Curve

As the level increases, the speed of the falling pieces increases according to this curve:

| Level | Drop Interval (ms) |
| ----- | ------------------ |
| 0     | 800                |
| 1     | 717                |
| 2     | 633                |
| 3     | 550                |
| 4     | 467                |
| 5     | 383                |
| 6     | 300                |
| 7     | 217                |
| 8     | 133                |
| 9     | 100                |
| 10-12 | 83                 |
| 13-15 | 67                 |
| 16-18 | 50                 |
| 19+   | 33                 |

This provides a smooth difficulty progression that becomes increasingly challenging at higher levels.

## Game Features

- Standard Tetris gameplay with gravity
- Hard drop and soft drop
- Ghost piece showing where the piece will land
- Hold piece functionality
- Next piece preview
- Line clearing and scoring
- Level progression with increased speed
- Game over detection
