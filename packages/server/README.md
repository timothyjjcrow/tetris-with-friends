# Tetris Game Server

This is the server component of the Tetris game. It handles game state, scoring, and multiplayer functionality.

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
