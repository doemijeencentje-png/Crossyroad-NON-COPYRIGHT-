// ============================================
// HOP ROAD - Configuration
// All tunable game parameters in one place
// ============================================

export const CONFIG = {
    // Display
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    TILE_SIZE: 48,
    GRID_COLS: 9,  // -4 to 4, with 0 in center

    // Player
    PLAYER_SIZE: 36,
    PLAYER_HITBOX_RATIO: 0.6,  // Hitbox is 60% of visual size (forgiving)
    HOP_DURATION: 150,  // ms
    HOP_HEIGHT: 18,  // pixels
    SQUASH_AMOUNT: 0.3,  // 30% squash on land
    STRETCH_AMOUNT: 0.2,  // 20% stretch on jump
    IDLE_TIMEOUT: 7000,  // ms before eagle

    // Input
    INPUT_BUFFER_TIME: 200,  // ms to buffer next input
    SWIPE_THRESHOLD: 30,  // pixels

    // Camera
    CAMERA_LERP: 0.12,  // Smooth follow speed
    CAMERA_OFFSET_Y: 0.65,  // Player position on screen (from top)

    // Lanes
    LANES_AHEAD: 15,  // Generate this many rows ahead
    LANES_BEHIND: 8,  // Keep this many rows behind
    SAFE_START_ROWS: 4,  // Grass rows at start

    // Obstacles - Roads
    CAR_SPEED_MIN: 1.5,
    CAR_SPEED_MAX: 3.5,
    CAR_GAP_MIN: 2.5,
    CAR_GAP_MAX: 4.5,
    CAR_COUNT_MIN: 2,
    CAR_COUNT_MAX: 4,
    TRUCK_CHANCE: 0.25,

    // Obstacles - Water
    LOG_SPEED_MIN: 0.8,
    LOG_SPEED_MAX: 2.0,
    LOG_GAP_MIN: 2,
    LOG_GAP_MAX: 3.5,
    LOG_COUNT_MIN: 2,
    LOG_COUNT_MAX: 4,
    LOG_LENGTH_MIN: 2,
    LOG_LENGTH_MAX: 4,
    LILY_CHANCE: 0.15,

    // Obstacles - Rail
    TRAIN_WARNING_TIME: 1500,  // ms
    TRAIN_MIN_INTERVAL: 3000,  // ms
    TRAIN_MAX_INTERVAL: 6000,  // ms
    TRAIN_SPEED: 18,
    TRAIN_LENGTH: 12,  // tiles

    // Difficulty scaling
    DIFFICULTY_SCORE_INTERVAL: 10,  // Increase difficulty every N score
    SPEED_INCREASE_FACTOR: 0.05,  // 5% faster per interval
    GAP_DECREASE_FACTOR: 0.03,  // 3% smaller gaps per interval
    MAX_DIFFICULTY_MULTIPLIER: 2.0,  // Cap at 2x difficulty

    // Coins
    COIN_SPAWN_CHANCE: 0.12,
    COIN_BOUNCE_SPEED: 0.004,
    COIN_BOUNCE_HEIGHT: 4,

    // Particles
    DUST_PARTICLES: 6,
    SPLASH_PARTICLES: 10,
    PARTICLE_LIFETIME: 400,  // ms

    // Screen effects
    SCREEN_SHAKE_INTENSITY: 8,
    SCREEN_SHAKE_DURATION: 300,  // ms

    // Colors - Voxel palette
    COLORS: {
        sky: '#87CEEB',
        skyGradientTop: '#5BA3D0',
        skyGradientBottom: '#B8E0F0',

        // Grass variations
        grass: ['#5DBE5D', '#4CAF50', '#66BB6A', '#53A653'],
        grassDark: ['#3D8E3D', '#2E7D32', '#43A047', '#388E3C'],
        grassDetail: '#2E7D32',

        // Road
        road: '#4A4A4A',
        roadDark: '#3A3A3A',
        roadLine: '#E0E0E0',
        sidewalk: '#9E9E9E',

        // Water
        water: ['#2196F3', '#1E88E5', '#42A5F5'],
        waterDark: '#1565C0',
        waterHighlight: 'rgba(255, 255, 255, 0.3)',

        // Rail
        rail: '#6D4C41',
        railMetal: '#78909C',
        railBed: '#8D6E63',

        // Player - unique blocky character
        player: '#FF6B35',
        playerDark: '#D84315',
        playerLight: '#FF8A65',
        playerEye: '#FFFFFF',
        playerPupil: '#212121',

        // Vehicles
        carColors: ['#E53935', '#1E88E5', '#FDD835', '#8E24AA', '#FB8C00', '#00ACC1'],
        truckColors: ['#5D4037', '#455A64', '#303F9F', '#00695C'],

        // Train
        train: '#37474F',
        trainDark: '#263238',
        trainStripe: '#FFCA28',
        trainWindow: '#FFF9C4',

        // Log/Lily
        log: '#8D6E63',
        logDark: '#5D4037',
        logRing: '#6D4C41',
        lily: '#66BB6A',
        lilyFlower: '#EC407A',
        lilyCenter: '#FFEE58',

        // Coins - Green voxel style (like pixel art cent coin)
        coin: '#4CAF50',           // Main green
        coinDark: '#388E3C',       // Darker green for depth
        coinLight: '#81C784',      // Light green for symbol
        coinHighlight: '#C8E6C9',  // Highlight/shine
        coinEdge: '#2E7D32',       // Edge/rim color

        // Effects
        shadow: 'rgba(0, 0, 0, 0.25)',
        shadowDark: 'rgba(0, 0, 0, 0.4)',
        dust: ['#D7CCC8', '#BCAAA4', '#A1887F'],
        splash: ['#90CAF9', '#64B5F6', '#42A5F5', '#FFFFFF'],
        impact: ['#FFEB3B', '#FFC107', '#FF9800']
    },

    // Lane type weights (for procedural generation)
    LANE_WEIGHTS: {
        grass: 25,
        road: 40,
        water: 20,
        rail: 15
    },

    // Props for grass lanes
    GRASS_PROPS: {
        tree: { chance: 0.15, minGap: 2 },
        bush: { chance: 0.2, minGap: 1 },
        rock: { chance: 0.1, minGap: 2 },
        flower: { chance: 0.25, minGap: 0 }
    }
};

// Seeded random for deterministic generation (optional)
export class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.state = seed;
    }

    next() {
        this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
        return this.state / 0x7fffffff;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }

    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    chance(probability) {
        return this.next() < probability;
    }

    pick(array) {
        return array[this.int(0, array.length - 1)];
    }
}

// Global random instance (can be seeded for debugging)
export let random = new SeededRandom();

export function setSeed(seed) {
    random = new SeededRandom(seed);
}
