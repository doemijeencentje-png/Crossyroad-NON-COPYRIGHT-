// ============================================
// HOP ROAD - Input Handler
// Keyboard + Touch with input buffering
// ============================================

import { CONFIG } from './config.js';

export class InputHandler {
    constructor() {
        this.keys = {};
        this.bufferedInput = null;
        this.bufferTime = 0;
        this.touchStart = { x: 0, y: 0 };
        this.enabled = false;
        this.onMove = null;  // Callback for movement

        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            this.keys[e.key] = true;
            let direction = null;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                case ' ':
                    direction = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    direction = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    direction = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    direction = 'right';
                    break;
                case 'Escape':
                case 'p':
                case 'P':
                    if (this.onPause) this.onPause();
                    return;
            }

            if (direction) {
                e.preventDefault();
                this.queueInput(direction);
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    setupTouch() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            e.preventDefault();

            const touch = e.touches[0];
            this.touchStart.x = touch.clientX;
            this.touchStart.y = touch.clientY;
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (!this.enabled) return;
            e.preventDefault();

            const touch = e.changedTouches[0];
            const dx = touch.clientX - this.touchStart.x;
            const dy = touch.clientY - this.touchStart.y;
            const threshold = CONFIG.SWIPE_THRESHOLD;

            let direction = null;

            if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
                // Tap - move forward
                direction = 'up';
            } else if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                direction = dx > 0 ? 'right' : 'left';
            } else {
                // Vertical swipe
                direction = dy < 0 ? 'up' : 'down';
            }

            if (direction) {
                this.queueInput(direction);
            }
        }, { passive: false });

        // Prevent scrolling on mobile
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    queueInput(direction) {
        this.bufferedInput = direction;
        this.bufferTime = CONFIG.INPUT_BUFFER_TIME;

        // Try to execute immediately
        if (this.onMove) {
            const executed = this.onMove(direction);
            if (executed) {
                this.bufferedInput = null;
                this.bufferTime = 0;
            }
        }
    }

    update(deltaTime) {
        // Decrease buffer time
        if (this.bufferTime > 0) {
            this.bufferTime -= deltaTime;

            if (this.bufferTime <= 0) {
                this.bufferedInput = null;
            }
        }
    }

    // Try to consume buffered input
    consumeBufferedInput() {
        if (this.bufferedInput && this.bufferTime > 0) {
            const direction = this.bufferedInput;
            this.bufferedInput = null;
            this.bufferTime = 0;
            return direction;
        }
        return null;
    }

    hasBufferedInput() {
        return this.bufferedInput !== null && this.bufferTime > 0;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.bufferedInput = null;
        this.bufferTime = 0;
    }

    // Check if a key is currently held
    isKeyHeld(key) {
        return this.keys[key] === true;
    }
}
