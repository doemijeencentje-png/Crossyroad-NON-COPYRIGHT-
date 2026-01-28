// ============================================
// HOP ROAD - World Generator
// Procedural lane generation with obstacles
// ============================================

import { CONFIG, random } from './config.js';

// Lane types
export const LANE_TYPES = {
    GRASS: 'grass',
    ROAD: 'road',
    WATER: 'water',
    RAIL: 'rail'
};

// Obstacle class
class Obstacle {
    constructor(type, x, speed, width, height, extra = {}) {
        this.type = type;
        this.x = x;
        this.speed = speed;
        this.width = width;
        this.height = height;
        this.color = extra.color || null;
        this.variant = extra.variant || 0;
        this.active = extra.active !== undefined ? extra.active : true;
    }

    update(deltaTime, screenWidth) {
        if (!this.active) return;

        this.x += this.speed * deltaTime * 0.06;

        // Wrap around screen
        if (this.speed > 0 && this.x > screenWidth + this.width) {
            this.x = -this.width * 2;
        } else if (this.speed < 0 && this.x < -this.width * 2) {
            this.x = screenWidth + this.width;
        }
    }

    getHitbox() {
        // Slightly smaller hitbox for fairness
        const margin = CONFIG.TILE_SIZE * 0.1;
        return {
            x: this.x + margin,
            y: 0,
            width: this.width - margin * 2,
            height: this.height
        };
    }
}

// Prop class (decorative elements on grass)
class Prop {
    constructor(type, x, variant = 0) {
        this.type = type;
        this.x = x;
        this.variant = variant;
    }
}

// Coin class
class Coin {
    constructor(x) {
        this.x = x;
        this.collected = false;
        this.animOffset = Math.random() * Math.PI * 2;
    }
}

// Lane class
export class Lane {
    constructor(index, type, difficulty = 1) {
        this.index = index;
        this.type = type;
        this.difficulty = difficulty;
        this.obstacles = [];
        this.props = [];
        this.coins = [];
        this.variant = random.int(0, 3);

        // Rail-specific
        this.trainWarning = false;
        this.trainActive = false;
        this.trainTimer = 0;

        this.generate();
    }

    generate() {
        switch (this.type) {
            case LANE_TYPES.GRASS:
                this.generateGrass();
                break;
            case LANE_TYPES.ROAD:
                this.generateRoad();
                break;
            case LANE_TYPES.WATER:
                this.generateWater();
                break;
            case LANE_TYPES.RAIL:
                this.generateRail();
                break;
        }

        // Maybe add a coin
        if (random.chance(CONFIG.COIN_SPAWN_CHANCE)) {
            const coinX = random.int(-4, 4) * CONFIG.TILE_SIZE;
            // Don't place coin on obstacle
            const blocked = this.obstacles.some(obs =>
                Math.abs(obs.x - coinX) < CONFIG.TILE_SIZE
            );
            if (!blocked) {
                this.coins.push(new Coin(coinX));
            }
        }
    }

    generateGrass() {
        // Add decorative props
        const props = CONFIG.GRASS_PROPS;
        const halfCols = Math.floor(CONFIG.GRID_COLS / 2);

        for (let col = -halfCols; col <= halfCols; col++) {
            const x = col * CONFIG.TILE_SIZE;

            if (random.chance(props.tree.chance)) {
                this.props.push(new Prop('tree', x, random.int(0, 2)));
            } else if (random.chance(props.bush.chance)) {
                this.props.push(new Prop('bush', x, random.int(0, 2)));
            } else if (random.chance(props.rock.chance)) {
                this.props.push(new Prop('rock', x, random.int(0, 1)));
            } else if (random.chance(props.flower.chance)) {
                this.props.push(new Prop('flower', x, random.int(0, 3)));
            }
        }
    }

    generateRoad() {
        const baseSpeed = CONFIG.CAR_SPEED_MIN +
            random.next() * (CONFIG.CAR_SPEED_MAX - CONFIG.CAR_SPEED_MIN);
        const speed = baseSpeed * this.difficulty * (random.chance(0.5) ? 1 : -1);
        const isTruck = random.chance(CONFIG.TRUCK_CHANCE);
        const count = random.int(CONFIG.CAR_COUNT_MIN, CONFIG.CAR_COUNT_MAX);
        const gap = (CONFIG.CAR_GAP_MIN + random.next() * (CONFIG.CAR_GAP_MAX - CONFIG.CAR_GAP_MIN))
            / this.difficulty;

        const colors = isTruck ? CONFIG.COLORS.truckColors : CONFIG.COLORS.carColors;
        const width = isTruck ? CONFIG.TILE_SIZE * 2.2 : CONFIG.TILE_SIZE * 1.3;
        const height = CONFIG.TILE_SIZE * 0.7;

        for (let i = 0; i < count; i++) {
            const x = i * gap * CONFIG.TILE_SIZE * (speed > 0 ? 1 : -1);
            this.obstacles.push(new Obstacle(
                isTruck ? 'truck' : 'car',
                x, speed, width, height,
                { color: random.pick(colors), variant: random.int(0, 2) }
            ));
        }
    }

    generateWater() {
        const baseSpeed = CONFIG.LOG_SPEED_MIN +
            random.next() * (CONFIG.LOG_SPEED_MAX - CONFIG.LOG_SPEED_MIN);
        const speed = baseSpeed * (random.chance(0.5) ? 1 : -1);
        const count = random.int(CONFIG.LOG_COUNT_MIN, CONFIG.LOG_COUNT_MAX);
        const gap = CONFIG.LOG_GAP_MIN + random.next() * (CONFIG.LOG_GAP_MAX - CONFIG.LOG_GAP_MIN);

        for (let i = 0; i < count; i++) {
            const isLily = random.chance(CONFIG.LILY_CHANCE);
            const length = isLily ? 1 : random.int(CONFIG.LOG_LENGTH_MIN, CONFIG.LOG_LENGTH_MAX);
            const width = length * CONFIG.TILE_SIZE;
            const height = CONFIG.TILE_SIZE * 0.6;
            const x = i * gap * CONFIG.TILE_SIZE * (speed > 0 ? 1 : -1);

            this.obstacles.push(new Obstacle(
                isLily ? 'lily' : 'log',
                x, speed, width, height,
                { variant: random.int(0, 2) }
            ));
        }
    }

    generateRail() {
        this.trainTimer = random.range(CONFIG.TRAIN_MIN_INTERVAL, CONFIG.TRAIN_MAX_INTERVAL);
        this.trainWarning = false;
        this.trainActive = false;

        // Train obstacle (initially inactive)
        const width = CONFIG.TRAIN_LENGTH * CONFIG.TILE_SIZE;
        this.obstacles.push(new Obstacle(
            'train',
            CONFIG.CANVAS_WIDTH + width,
            0,
            width,
            CONFIG.TILE_SIZE * 0.85,
            { active: false }
        ));
    }

    update(deltaTime, screenWidth) {
        // Update obstacles
        this.obstacles.forEach(obs => {
            if (this.type === LANE_TYPES.RAIL) {
                // Train logic
                if (!this.trainActive) {
                    this.trainTimer -= deltaTime;

                    if (this.trainTimer <= CONFIG.TRAIN_WARNING_TIME && !this.trainWarning) {
                        this.trainWarning = true;
                        return 'trainWarning';
                    }

                    if (this.trainTimer <= 0) {
                        this.trainActive = true;
                        obs.active = true;
                        obs.speed = -CONFIG.TRAIN_SPEED * this.difficulty;
                        obs.x = screenWidth + obs.width;
                        return 'trainComing';
                    }
                } else {
                    obs.x += obs.speed * deltaTime * 0.06;

                    if (obs.x + obs.width < -100) {
                        // Train passed
                        obs.active = false;
                        this.trainActive = false;
                        this.trainWarning = false;
                        this.trainTimer = random.range(
                            CONFIG.TRAIN_MIN_INTERVAL,
                            CONFIG.TRAIN_MAX_INTERVAL
                        );
                        return 'trainPassed';
                    }
                }
            } else {
                obs.update(deltaTime, screenWidth);
            }
        });

        return null;
    }

    // Check if position is safe (on log/lily for water lanes)
    isSafePosition(x) {
        if (this.type !== LANE_TYPES.WATER) return true;

        return this.obstacles.some(obs => {
            const margin = CONFIG.TILE_SIZE * 0.3;
            return x >= obs.x - margin && x <= obs.x + obs.width + margin;
        });
    }

    // Get log at position (for moving with it)
    getLogAt(x) {
        if (this.type !== LANE_TYPES.WATER) return null;

        return this.obstacles.find(obs => {
            const margin = CONFIG.TILE_SIZE * 0.3;
            return x >= obs.x - margin && x <= obs.x + obs.width + margin;
        });
    }
}

// World manager
export class World {
    constructor() {
        this.lanes = new Map();
        this.minRow = 0;
        this.maxRow = 0;
        this.difficulty = 1;
    }

    reset() {
        this.lanes.clear();
        this.minRow = -CONFIG.LANES_BEHIND;
        this.maxRow = CONFIG.LANES_AHEAD;
        this.difficulty = 1;

        // Generate initial lanes
        for (let i = this.minRow; i <= this.maxRow; i++) {
            this.generateLane(i);
        }
    }

    generateLane(index) {
        if (this.lanes.has(index)) return;

        let type;

        // Safe grass at start
        if (index < CONFIG.SAFE_START_ROWS) {
            type = LANE_TYPES.GRASS;
        } else {
            // Weighted random selection
            const weights = { ...CONFIG.LANE_WEIGHTS };

            // Reduce consecutive same-type lanes
            const prevLane = this.lanes.get(index - 1);
            if (prevLane) {
                weights[prevLane.type] *= 0.3;
            }

            // Ensure water lanes aren't too clustered
            const prevPrevLane = this.lanes.get(index - 2);
            if (prevLane?.type === LANE_TYPES.WATER && prevPrevLane?.type === LANE_TYPES.WATER) {
                weights[LANE_TYPES.WATER] = 0;
            }

            // Pick type based on weights
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            let r = random.next() * total;

            for (const [t, w] of Object.entries(weights)) {
                r -= w;
                if (r <= 0) {
                    type = t;
                    break;
                }
            }
        }

        this.lanes.set(index, new Lane(index, type, this.difficulty));
    }

    update(deltaTime, playerRow, screenWidth) {
        const events = [];

        // Update difficulty based on player progress
        const newDifficulty = 1 + Math.floor(playerRow / CONFIG.DIFFICULTY_SCORE_INTERVAL)
            * CONFIG.SPEED_INCREASE_FACTOR;
        this.difficulty = Math.min(newDifficulty, CONFIG.MAX_DIFFICULTY_MULTIPLIER);

        // Generate new lanes ahead
        while (this.maxRow < playerRow + CONFIG.LANES_AHEAD) {
            this.maxRow++;
            this.generateLane(this.maxRow);
        }

        // Remove old lanes behind
        while (this.minRow < playerRow - CONFIG.LANES_BEHIND) {
            this.lanes.delete(this.minRow);
            this.minRow++;
        }

        // Update all visible lanes
        this.lanes.forEach((lane, index) => {
            const event = lane.update(deltaTime, screenWidth);
            if (event) {
                events.push({ type: event, laneIndex: index });
            }
        });

        return events;
    }

    getLane(index) {
        return this.lanes.get(index);
    }

    // Get all lanes for rendering (sorted by index)
    getVisibleLanes(centerRow, visibleRange) {
        const result = [];
        for (let i = centerRow - visibleRange; i <= centerRow + visibleRange; i++) {
            const lane = this.lanes.get(i);
            if (lane) result.push(lane);
        }
        return result;
    }
}
