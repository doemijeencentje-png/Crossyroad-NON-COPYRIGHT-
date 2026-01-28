# HOP ROAD - Development Guide

An original endless hopper game inspired by the lane-crossing genre. Built with vanilla JavaScript and HTML5 Canvas.

## Quick Start

```bash
# No build step required! Just serve the files:
python3 -m http.server 8080
# Then open http://localhost:8080

# Or with Node.js:
npx serve
```

## Project Structure

```
├── index.html          # Main HTML entry point
├── styles.css          # All CSS styles
├── game.js             # Legacy single-file version (deprecated)
├── CLAUDE.md           # This file
└── src/
    ├── config.js       # All tunable parameters
    ├── utils.js        # Helper functions and easing
    ├── input.js        # Keyboard + touch input with buffering
    ├── audio.js        # Web Audio API sound synthesis
    ├── particles.js    # Particle system + screen shake
    ├── player.js       # Player entity with hop physics
    ├── world.js        # Lane generation and obstacles
    ├── renderer.js     # 2.5D isometric rendering
    └── game.js         # Main game loop and state management
```

## Architecture

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `config.js` | Central configuration - all magic numbers live here |
| `input.js` | Input handling with buffering for responsive controls |
| `audio.js` | Synthesized sounds using Web Audio oscillators |
| `particles.js` | Visual effects (dust, splash, impact, sparkles) |
| `player.js` | Grid-based movement with squash/stretch animation |
| `world.js` | Procedural lane generation with difficulty scaling |
| `renderer.js` | Drawing everything with depth and shadows |
| `game.js` | Game loop, state machine, collision detection |

### Game States

```
MENU → PLAYING → GAME_OVER
         ↓ ↑
       PAUSED
```

## Tuning Parameters (config.js)

### Movement Feel
```javascript
HOP_DURATION: 150,      // ms - how long a hop takes
HOP_HEIGHT: 18,         // px - jump arc height
SQUASH_AMOUNT: 0.3,     // 0-1 - squash on landing
STRETCH_AMOUNT: 0.2,    // 0-1 - stretch on takeoff
INPUT_BUFFER_TIME: 200, // ms - input queue window
```

### Difficulty
```javascript
DIFFICULTY_SCORE_INTERVAL: 10,   // Increase every N points
SPEED_INCREASE_FACTOR: 0.05,     // 5% faster per interval
GAP_DECREASE_FACTOR: 0.03,       // 3% smaller gaps
MAX_DIFFICULTY_MULTIPLIER: 2.0,  // Cap at 2x speed
```

### Obstacle Speeds
```javascript
CAR_SPEED_MIN: 1.5,
CAR_SPEED_MAX: 3.5,
LOG_SPEED_MIN: 0.8,
LOG_SPEED_MAX: 2.0,
TRAIN_SPEED: 18,
```

### Collision Fairness
```javascript
PLAYER_HITBOX_RATIO: 0.6,  // Hitbox is 60% of visual size
```

## Key Design Decisions

### Input Buffering
When player presses a direction key while hopping, the input is queued and executed on landing. This prevents "swallowed" inputs and makes controls feel responsive.

### Grid-Based Movement
Player always lands exactly on tile centers. Visual position interpolates smoothly, but logical position is always grid-aligned.

### Forgiving Hitboxes
Player hitbox is smaller than visual sprite. Vehicles need significant overlap to trigger collision (30%+ of hitbox width).

### Procedural Generation Rules
- Never more than 2 consecutive water lanes
- Safe grass rows at game start
- Lane type weights reduce for consecutive same-type
- Difficulty scales obstacle speed and gap frequency

## Adding New Content

### New Lane Type
1. Add type to `LANE_TYPES` in `world.js`
2. Add weight to `CONFIG.LANE_WEIGHTS`
3. Create `generateNewType()` method in `Lane` class
4. Add collision check in `Game.checkCollisions()`
5. Add `drawNewTypeLane()` in `renderer.js`

### New Obstacle
1. Create obstacle in lane generator
2. Add drawing method in `renderer.js`
3. Handle collision if dangerous

### New Sound
1. Add method to `AudioManager` in `audio.js`
2. Call via `audio.play('soundName')` from game

## Performance Notes

- Target: 60 FPS on modern devices
- Fixed timestep game loop prevents physics issues
- Lanes are culled when off-screen
- Old lanes are removed from memory
- Particle count is capped

## Browser Support

- Modern Chrome, Firefox, Safari, Edge
- Mobile browsers with touch support
- Requires ES6 modules support
- Web Audio API for sounds

## Future Improvements

- [ ] Character selection
- [ ] Power-ups
- [ ] Achievements
- [ ] Leaderboard (requires backend)
- [ ] More lane types (ice, conveyor belts)
- [ ] Day/night cycle
- [ ] Weather effects
