// ============================================
// HOP ROAD - Particle System
// Dust, splash, impact effects
// ============================================

import { CONFIG } from './config.js';
import { lerp } from './utils.js';

class Particle {
    constructor(x, y, vx, vy, color, size, lifetime, gravity = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.gravity = gravity;
        this.alpha = 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime * 0.06;
        this.y += this.vy * deltaTime * 0.06;
        this.vy += this.gravity * deltaTime * 0.06;

        this.lifetime -= deltaTime;
        this.alpha = Math.max(0, this.lifetime / this.maxLifetime);
        this.rotation += this.rotationSpeed;

        // Shrink as it fades
        this.size *= 0.98;

        return this.lifetime > 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => p.update(deltaTime));
    }

    draw(ctx, cameraOffsetY = 0) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            ctx.translate(p.x, p.y - cameraOffsetY);
            ctx.rotate(p.rotation);

            // Draw as rounded square for voxel feel
            const halfSize = p.size / 2;
            ctx.beginPath();
            ctx.roundRect(-halfSize, -halfSize, p.size, p.size, 2);
            ctx.fill();

            ctx.restore();
        });
    }

    // Dust cloud when landing
    emitDust(x, y) {
        const colors = CONFIG.COLORS.dust;
        const count = CONFIG.DUST_PARTICLES;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 1 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed * 0.5 - 1;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 4 + Math.random() * 4;

            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 10,
                y,
                vx, vy, color, size,
                CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5),
                0.1
            ));
        }
    }

    // Water splash
    emitSplash(x, y) {
        const colors = CONFIG.COLORS.splash;
        const count = CONFIG.SPLASH_PARTICLES;

        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = 3 + Math.random() * 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 3 + Math.random() * 5;

            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 20,
                y,
                vx, vy, color, size,
                CONFIG.PARTICLE_LIFETIME * (0.6 + Math.random() * 0.4),
                0.15
            ));
        }

        // Water rings
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                x, y,
                0, 0,
                'rgba(255, 255, 255, 0.5)',
                10 + i * 8,
                CONFIG.PARTICLE_LIFETIME * 0.8,
                0
            ));
        }
    }

    // Impact stars when hit
    emitImpact(x, y) {
        const colors = CONFIG.COLORS.impact;
        const count = 8;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 4 + Math.random() * 3;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 6 + Math.random() * 6;

            this.particles.push(new Particle(
                x, y,
                vx, vy, color, size,
                CONFIG.PARTICLE_LIFETIME * 0.6,
                0
            ));
        }
    }

    // Coin sparkle
    emitCoinCollect(x, y) {
        const colors = ['#FFD700', '#FFEB3B', '#FFF59D', '#FFFFFF'];
        const count = 6;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 3 + Math.random() * 3;

            this.particles.push(new Particle(
                x, y,
                vx, vy, color, size,
                CONFIG.PARTICLE_LIFETIME * 0.5,
                0.05
            ));
        }
    }

    clear() {
        this.particles = [];
    }
}

// Screen shake manager
export class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.maxDuration = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    shake(intensity, duration) {
        this.intensity = intensity;
        this.duration = duration;
        this.maxDuration = duration;
    }

    update(deltaTime) {
        if (this.duration > 0) {
            this.duration -= deltaTime;
            const progress = this.duration / this.maxDuration;
            const currentIntensity = this.intensity * progress;

            this.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
            this.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    apply(ctx) {
        ctx.translate(this.offsetX, this.offsetY);
    }
}
