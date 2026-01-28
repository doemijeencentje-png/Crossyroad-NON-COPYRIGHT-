// ============================================
// HOP ROAD - Player Entity
// Grid-based movement with hop animation
// ============================================

import { CONFIG } from './config.js';
import { Easing, lerp, clamp } from './utils.js';

export class Player {
    constructor() {
        this.reset();
    }

    reset() {
        // Grid position
        this.gridX = 0;
        this.gridY = 0;

        // Visual position (smooth)
        this.x = 0;
        this.y = 0;

        // Target position
        this.targetX = 0;
        this.targetY = 0;

        // Previous position (for interpolation)
        this.prevX = 0;
        this.prevY = 0;

        // Hop state
        this.isHopping = false;
        this.hopProgress = 0;
        this.hopDirection = 'up';

        // Animation
        this.squash = 1;  // Vertical scale (< 1 = squashed)
        this.stretch = 1; // Horizontal scale
        this.landingBounce = 0;

        // State
        this.alive = true;
        this.onLog = null;  // Reference to log/lily player is standing on
        this.lastMoveTime = Date.now();

        // Stats
        this.furthestRow = 0;
    }

    // Get world position for rendering
    getWorldX() {
        return this.gridX * CONFIG.TILE_SIZE;
    }

    getWorldY() {
        return this.gridY * CONFIG.TILE_SIZE;
    }

    // Get hitbox (smaller than visual for fairness)
    getHitbox() {
        const size = CONFIG.PLAYER_SIZE * CONFIG.PLAYER_HITBOX_RATIO;
        const offset = (CONFIG.PLAYER_SIZE - size) / 2;
        return {
            x: this.x - CONFIG.PLAYER_SIZE / 2 + offset,
            y: this.y - CONFIG.PLAYER_SIZE / 2 + offset,
            width: size,
            height: size
        };
    }

    // Try to move in a direction
    // Returns true if move started, false if blocked
    move(direction) {
        if (this.isHopping || !this.alive) return false;

        let newGridX = this.gridX;
        let newGridY = this.gridY;

        switch (direction) {
            case 'up':
                newGridY++;
                break;
            case 'down':
                newGridY--;
                break;
            case 'left':
                newGridX--;
                break;
            case 'right':
                newGridX++;
                break;
        }

        // Boundary check (grid columns)
        const halfCols = Math.floor(CONFIG.GRID_COLS / 2);
        if (newGridX < -halfCols || newGridX > halfCols) {
            return false;
        }

        // Can't go too far back
        if (newGridY < this.furthestRow - 2) {
            return false;
        }

        // Start hop
        this.prevX = this.x;
        this.prevY = this.y;
        this.gridX = newGridX;
        this.gridY = newGridY;
        this.targetX = newGridX * CONFIG.TILE_SIZE;
        this.targetY = newGridY * CONFIG.TILE_SIZE;
        this.isHopping = true;
        this.hopProgress = 0;
        this.hopDirection = direction;
        this.lastMoveTime = Date.now();

        // Initial stretch for jump anticipation
        this.squash = 1 + CONFIG.STRETCH_AMOUNT;
        this.stretch = 1 - CONFIG.STRETCH_AMOUNT * 0.5;

        // Track furthest row
        if (newGridY > this.furthestRow) {
            this.furthestRow = newGridY;
            return { moved: true, scored: true };
        }

        return { moved: true, scored: false };
    }

    update(deltaTime) {
        if (this.isHopping) {
            // Progress hop
            this.hopProgress += deltaTime / CONFIG.HOP_DURATION;

            if (this.hopProgress >= 1) {
                // Hop complete
                this.hopProgress = 1;
                this.isHopping = false;
                this.x = this.targetX;
                this.y = this.targetY;

                // Squash on landing
                this.squash = 1 - CONFIG.SQUASH_AMOUNT;
                this.stretch = 1 + CONFIG.SQUASH_AMOUNT * 0.5;
                this.landingBounce = 1;

                return 'landed';
            }

            // Smooth position interpolation with easing
            const easeProgress = Easing.easeOutQuad(this.hopProgress);
            this.x = lerp(this.prevX, this.targetX, easeProgress);
            this.y = lerp(this.prevY, this.targetY, easeProgress);

            // Squash/stretch during hop
            const hopArc = Easing.jumpArc(this.hopProgress);
            this.squash = 1 + hopArc * CONFIG.STRETCH_AMOUNT * 0.3;
            this.stretch = 1 - hopArc * CONFIG.STRETCH_AMOUNT * 0.2;

        } else {
            // Recovery from landing squash
            this.squash = lerp(this.squash, 1, 0.2);
            this.stretch = lerp(this.stretch, 1, 0.2);
            this.landingBounce *= 0.85;

            // Move with log if on one
            if (this.onLog) {
                this.x += this.onLog.speed;
                this.targetX = this.x;
                this.gridX = Math.round(this.x / CONFIG.TILE_SIZE);
            }
        }

        return null;
    }

    // Get current hop height for rendering
    getHopHeight() {
        if (!this.isHopping) {
            return this.landingBounce * 3; // Small bounce on land
        }
        return Easing.jumpArc(this.hopProgress) * CONFIG.HOP_HEIGHT;
    }

    // Check idle timeout
    isIdle() {
        return Date.now() - this.lastMoveTime > CONFIG.IDLE_TIMEOUT;
    }

    die() {
        this.alive = false;
    }
}
