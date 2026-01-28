// ============================================
// HOP ROAD - Main Game Module
// Game loop, state management, collision detection
// ============================================

import { CONFIG } from './config.js';
import { InputHandler } from './input.js';
import { AudioManager, audio } from './audio.js';
import { ParticleSystem, ScreenShake } from './particles.js';
import { Player } from './player.js';
import { World, LANE_TYPES } from './world.js';
import { Renderer } from './renderer.js';

// Game states
const STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.state = STATE.MENU;

        // Core systems
        this.renderer = new Renderer(this.canvas);
        this.input = new InputHandler();
        this.particles = new ParticleSystem();
        this.screenShake = new ScreenShake();
        this.player = new Player();
        this.world = new World();

        // Game data
        this.score = 0;
        this.coins = 0;
        this.highScore = parseInt(localStorage.getItem('hopRoadHighScore')) || 0;
        this.totalCoins = parseInt(localStorage.getItem('hopRoadTotalCoins')) || 0;

        // Timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDeltaTime = 1000 / 60; // 60 FPS fixed timestep

        // Setup input callback
        this.input.onMove = (direction) => this.handleMove(direction);
        this.input.onPause = () => this.togglePause();

        // Setup UI
        this.setupUI();

        // Start game loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    setupUI() {
        // Start button
        document.getElementById('start-btn')?.addEventListener('click', () => {
            audio.init();
            audio.play('click');
            this.startGame();
        });

        // Restart button
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            audio.play('click');
            this.startGame();
        });

        // Update high score display
        const highScoreEl = document.getElementById('high-score');
        if (highScoreEl) {
            highScoreEl.textContent = this.highScore;
        }
    }

    startGame() {
        this.state = STATE.PLAYING;
        this.score = 0;
        this.coins = 0;

        this.player.reset();
        this.world.reset();
        this.particles.clear();

        this.input.enable();
        this.updateUI();

        // Hide screens
        document.getElementById('start-screen')?.classList.add('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
    }

    handleMove(direction) {
        if (this.state !== STATE.PLAYING) return false;
        if (this.player.isHopping) return false;

        const result = this.player.move(direction);

        if (result && result.moved) {
            audio.play('hop');

            if (result.scored) {
                this.score = this.player.furthestRow;
                this.updateUI();
            }

            return true;
        }

        return false;
    }

    togglePause() {
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
            this.input.disable();
        } else if (this.state === STATE.PAUSED) {
            this.state = STATE.PLAYING;
            this.input.enable();
        }
    }

    update(deltaTime) {
        if (this.state !== STATE.PLAYING) return;

        // Update input (for buffering)
        this.input.update(deltaTime);

        // Update player
        const playerEvent = this.player.update(deltaTime);

        if (playerEvent === 'landed') {
            audio.play('land');
            const screenY = this.renderer.height * CONFIG.CAMERA_OFFSET_Y;
            this.particles.emitDust(
                this.player.x + this.renderer.width / 2,
                screenY
            );

            // Try to consume buffered input
            const bufferedDir = this.input.consumeBufferedInput();
            if (bufferedDir) {
                this.handleMove(bufferedDir);
            }
        }

        // Update world
        const worldEvents = this.world.update(
            deltaTime,
            this.player.gridY,
            this.renderer.width
        );

        worldEvents.forEach(event => {
            if (event.type === 'trainWarning') {
                audio.play('train');
            }
        });

        // Check collisions
        this.checkCollisions();

        // Check idle timeout
        if (this.player.isIdle() && this.player.alive) {
            this.gameOver('eagle');
        }

        // Update camera
        this.renderer.updateCamera(this.player.gridY);

        // Update particles
        this.particles.update(deltaTime);
        this.screenShake.update(deltaTime);
    }

    checkCollisions() {
        if (!this.player.alive) return;

        const currentLane = this.world.getLane(this.player.gridY);
        if (!currentLane) return;

        const playerX = this.player.x;
        const playerHitbox = this.player.getHitbox();

        // Check coins
        currentLane.coins.forEach(coin => {
            if (!coin.collected) {
                const coinX = coin.x;
                const dist = Math.abs(playerX - coinX);
                if (dist < CONFIG.TILE_SIZE * 0.6) {
                    coin.collected = true;
                    this.coins++;
                    this.totalCoins++;
                    localStorage.setItem('hopRoadTotalCoins', this.totalCoins);
                    audio.play('coin');

                    const screenY = this.renderer.height * CONFIG.CAMERA_OFFSET_Y;
                    this.particles.emitCoinCollect(
                        coinX + this.renderer.width / 2,
                        screenY - 10
                    );

                    this.updateUI();
                }
            }
        });

        // Check lane-specific collisions
        switch (currentLane.type) {
            case LANE_TYPES.ROAD:
                this.checkRoadCollision(currentLane, playerX);
                break;
            case LANE_TYPES.WATER:
                this.checkWaterCollision(currentLane, playerX);
                break;
            case LANE_TYPES.RAIL:
                this.checkRailCollision(currentLane, playerX);
                break;
        }

        // Check boundaries
        const halfCols = Math.floor(CONFIG.GRID_COLS / 2);
        if (Math.abs(this.player.gridX) > halfCols + 1) {
            this.gameOver('boundary');
        }
    }

    checkRoadCollision(lane, playerX) {
        const hitboxWidth = CONFIG.PLAYER_SIZE * CONFIG.PLAYER_HITBOX_RATIO;

        lane.obstacles.forEach(obs => {
            if (obs.type === 'car' || obs.type === 'truck') {
                const obsLeft = obs.x - obs.width / 2;
                const obsRight = obs.x + obs.width / 2;
                const playerLeft = playerX - hitboxWidth / 2;
                const playerRight = playerX + hitboxWidth / 2;

                // Forgiving collision - need significant overlap
                const overlap = Math.min(playerRight, obsRight) - Math.max(playerLeft, obsLeft);
                if (overlap > hitboxWidth * 0.3) {
                    this.gameOver('hit');
                }
            }
        });
    }

    checkWaterCollision(lane, playerX) {
        if (this.player.isHopping) {
            this.player.onLog = null;
            return;
        }

        // Check if on a safe platform
        const log = lane.getLogAt(playerX);

        if (log) {
            this.player.onLog = log;
        } else {
            this.player.onLog = null;
            this.gameOver('drown');
        }
    }

    checkRailCollision(lane, playerX) {
        lane.obstacles.forEach(obs => {
            if (obs.type === 'train' && obs.active) {
                const obsLeft = obs.x;
                const obsRight = obs.x + obs.width;

                if (playerX > obsLeft - CONFIG.TILE_SIZE / 2 &&
                    playerX < obsRight + CONFIG.TILE_SIZE / 2) {
                    this.gameOver('hit');
                }
            }
        });
    }

    gameOver(reason) {
        if (!this.player.alive) return;

        this.player.die();
        this.state = STATE.GAME_OVER;
        this.input.disable();

        const screenX = this.player.x + this.renderer.width / 2;
        const screenY = this.renderer.height * CONFIG.CAMERA_OFFSET_Y;

        switch (reason) {
            case 'hit':
                audio.play('hit');
                this.particles.emitImpact(screenX, screenY);
                this.screenShake.shake(CONFIG.SCREEN_SHAKE_INTENSITY, CONFIG.SCREEN_SHAKE_DURATION);
                break;
            case 'drown':
                audio.play('splash');
                this.particles.emitSplash(screenX, screenY);
                break;
            case 'eagle':
                audio.play('hit');
                break;
            case 'boundary':
                audio.play('hit');
                break;
        }

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('hopRoadHighScore', this.highScore);
        }

        // Show game over screen after delay
        setTimeout(() => {
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('final-coins').textContent = this.coins;
            document.getElementById('high-score').textContent = this.highScore;
            document.getElementById('game-over-screen')?.classList.remove('hidden');
        }, 800);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('coins').textContent = this.coins;
    }

    render() {
        const ctx = this.renderer.ctx;

        ctx.save();

        // Apply screen shake
        this.screenShake.apply(ctx);

        // Draw background
        this.renderer.beginFrame();

        // Get visible lanes and draw them
        const visibleLanes = this.world.getVisibleLanes(this.player.gridY, 12);
        visibleLanes.forEach(lane => {
            this.renderer.drawLane(lane, this.player.gridY);
        });

        // Draw player
        if (this.player.alive || this.state === STATE.GAME_OVER) {
            this.renderer.drawPlayer(this.player, this.player.gridY);
        }

        // Draw particles
        this.particles.draw(ctx);

        ctx.restore();
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Prevent huge delta spikes
        const clampedDelta = Math.min(deltaTime, 100);

        // Fixed timestep with accumulator
        this.accumulator += clampedDelta;

        while (this.accumulator >= this.fixedDeltaTime) {
            this.update(this.fixedDeltaTime);
            this.accumulator -= this.fixedDeltaTime;
        }

        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Game());
} else {
    new Game();
}

export { Game };
