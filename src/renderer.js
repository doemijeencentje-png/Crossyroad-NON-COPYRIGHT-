// ============================================
// HOP ROAD - Renderer
// Isometric 2.5D voxel-style rendering
// ============================================

import { CONFIG } from './config.js';
import { shadeColor, lerp } from './utils.js';
import { LANE_TYPES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = CONFIG.CANVAS_WIDTH;
        this.height = CONFIG.CANVAS_HEIGHT;

        // Camera
        this.cameraY = 0;
        this.targetCameraY = 0;

        // Set canvas size
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    // Convert grid coordinates to screen coordinates
    gridToScreen(gridX, gridY, cameraY = this.cameraY) {
        const screenX = this.width / 2 + gridX;
        const screenY = this.height * CONFIG.CAMERA_OFFSET_Y - gridY + cameraY;
        return { x: screenX, y: screenY };
    }

    // Update camera to follow player
    updateCamera(playerGridY) {
        this.targetCameraY = playerGridY * CONFIG.TILE_SIZE - this.height * 0.3;
        this.cameraY = lerp(this.cameraY, this.targetCameraY, CONFIG.CAMERA_LERP);
    }

    // Clear and prepare frame
    beginFrame() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, CONFIG.COLORS.skyGradientTop);
        gradient.addColorStop(1, CONFIG.COLORS.skyGradientBottom);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Draw a lane
    drawLane(lane, playerRow) {
        const screenY = this.height * CONFIG.CAMERA_OFFSET_Y -
            (lane.index - playerRow) * CONFIG.TILE_SIZE;

        // Skip if off screen
        if (screenY < -CONFIG.TILE_SIZE * 2 || screenY > this.height + CONFIG.TILE_SIZE) {
            return;
        }

        const tileY = screenY;
        const tileHeight = CONFIG.TILE_SIZE;

        switch (lane.type) {
            case LANE_TYPES.GRASS:
                this.drawGrassLane(lane, tileY, tileHeight);
                break;
            case LANE_TYPES.ROAD:
                this.drawRoadLane(lane, tileY, tileHeight);
                break;
            case LANE_TYPES.WATER:
                this.drawWaterLane(lane, tileY, tileHeight);
                break;
            case LANE_TYPES.RAIL:
                this.drawRailLane(lane, tileY, tileHeight);
                break;
        }

        // Draw coins
        lane.coins.forEach(coin => {
            if (!coin.collected) {
                this.drawCoin(coin, tileY);
            }
        });
    }

    drawGrassLane(lane, y, height) {
        const colors = CONFIG.COLORS.grass;
        const darkColors = CONFIG.COLORS.grassDark;

        // Main grass
        this.ctx.fillStyle = colors[lane.variant];
        this.ctx.fillRect(0, y - height / 2, this.width, height);

        // Darker edge for depth
        this.ctx.fillStyle = darkColors[lane.variant];
        this.ctx.fillRect(0, y + height / 2 - 4, this.width, 4);

        // Draw props
        lane.props.forEach(prop => {
            this.drawProp(prop, y);
        });

        // Grass detail
        this.ctx.fillStyle = CONFIG.COLORS.grassDetail;
        for (let i = 0; i < 30; i++) {
            const gx = ((i * 37 + lane.index * 23) % this.width);
            const gh = 4 + (i % 4) * 2;
            this.ctx.fillRect(gx, y - gh, 2, gh);
        }
    }

    drawRoadLane(lane, y, height) {
        // Road surface
        this.ctx.fillStyle = CONFIG.COLORS.road;
        this.ctx.fillRect(0, y - height / 2, this.width, height);

        // Darker edge
        this.ctx.fillStyle = CONFIG.COLORS.roadDark;
        this.ctx.fillRect(0, y + height / 2 - 3, this.width, 3);

        // Road markings (dashed center line)
        this.ctx.fillStyle = CONFIG.COLORS.roadLine;
        const dashLength = 25;
        const dashGap = 20;
        for (let x = (Date.now() / 50) % (dashLength + dashGap); x < this.width; x += dashLength + dashGap) {
            this.ctx.fillRect(x, y - 2, dashLength, 4);
        }

        // Draw vehicles
        lane.obstacles.forEach(obs => {
            if (obs.type === 'car') {
                this.drawCar(obs, y);
            } else if (obs.type === 'truck') {
                this.drawTruck(obs, y);
            }
        });
    }

    drawWaterLane(lane, y, height) {
        // Animated water color
        const waterPhase = Math.floor(Date.now() / 400) % 3;
        this.ctx.fillStyle = CONFIG.COLORS.water[waterPhase];
        this.ctx.fillRect(0, y - height / 2, this.width, height);

        // Water depth edge
        this.ctx.fillStyle = CONFIG.COLORS.waterDark;
        this.ctx.fillRect(0, y + height / 2 - 4, this.width, 4);

        // Ripples
        this.ctx.fillStyle = CONFIG.COLORS.waterHighlight;
        const rippleOffset = (Date.now() / 80) % 50;
        for (let x = rippleOffset; x < this.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 8, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw logs/lilies
        lane.obstacles.forEach(obs => {
            if (obs.type === 'log') {
                this.drawLog(obs, y);
            } else if (obs.type === 'lily') {
                this.drawLily(obs, y);
            }
        });
    }

    drawRailLane(lane, y, height) {
        // Gravel bed
        this.ctx.fillStyle = CONFIG.COLORS.railBed;
        this.ctx.fillRect(0, y - height / 2, this.width, height);

        // Darker edge
        this.ctx.fillStyle = shadeColor(CONFIG.COLORS.railBed, -20);
        this.ctx.fillRect(0, y + height / 2 - 3, this.width, 3);

        // Wooden sleepers
        this.ctx.fillStyle = CONFIG.COLORS.rail;
        for (let x = 0; x < this.width; x += 35) {
            this.ctx.fillRect(x, y - height / 2 + 6, 18, height - 12);
        }

        // Metal rails
        this.ctx.fillStyle = CONFIG.COLORS.railMetal;
        this.ctx.fillRect(0, y - 12, this.width, 5);
        this.ctx.fillRect(0, y + 7, this.width, 5);

        // Rail highlights
        this.ctx.fillStyle = shadeColor(CONFIG.COLORS.railMetal, 30);
        this.ctx.fillRect(0, y - 12, this.width, 2);
        this.ctx.fillRect(0, y + 7, this.width, 2);

        // Warning lights if train coming
        if (lane.trainWarning) {
            this.drawTrainWarning(y);
        }

        // Draw train
        lane.obstacles.forEach(obs => {
            if (obs.type === 'train' && obs.active) {
                this.drawTrain(obs, y);
            }
        });
    }

    drawProp(prop, y) {
        const x = prop.x + this.width / 2;

        switch (prop.type) {
            case 'tree':
                // Shadow
                this.ctx.fillStyle = CONFIG.COLORS.shadow;
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + 5, 15, 6, 0, 0, Math.PI * 2);
                this.ctx.fill();

                // Trunk
                this.ctx.fillStyle = '#5D4037';
                this.ctx.fillRect(x - 5, y - 35, 10, 30);

                // Foliage (stacked circles for voxel feel)
                const treeColors = ['#2E7D32', '#388E3C', '#43A047'];
                this.ctx.fillStyle = treeColors[prop.variant];
                this.ctx.beginPath();
                this.ctx.arc(x, y - 45, 18, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = shadeColor(treeColors[prop.variant], 15);
                this.ctx.beginPath();
                this.ctx.arc(x, y - 55, 14, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'bush':
                this.ctx.fillStyle = CONFIG.COLORS.shadow;
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + 3, 10, 4, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = CONFIG.COLORS.grass[prop.variant];
                this.ctx.beginPath();
                this.ctx.arc(x, y - 8, 12, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = shadeColor(CONFIG.COLORS.grass[prop.variant], -15);
                this.ctx.beginPath();
                this.ctx.arc(x - 5, y - 5, 8, 0, Math.PI * 2);
                this.ctx.arc(x + 6, y - 6, 7, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'rock':
                this.ctx.fillStyle = CONFIG.COLORS.shadow;
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + 3, 8, 3, 0, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#757575';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y - 5, 10, 8, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#9E9E9E';
                this.ctx.beginPath();
                this.ctx.ellipse(x - 2, y - 7, 5, 4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'flower':
                const flowerColors = ['#E91E63', '#FFEB3B', '#9C27B0', '#FF5722'];
                this.ctx.fillStyle = CONFIG.COLORS.grassDetail;
                this.ctx.fillRect(x - 1, y - 10, 2, 10);

                this.ctx.fillStyle = flowerColors[prop.variant];
                this.ctx.beginPath();
                this.ctx.arc(x, y - 12, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#FFEB3B';
                this.ctx.beginPath();
                this.ctx.arc(x, y - 12, 2, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }
    }

    drawCar(obs, y) {
        const x = obs.x + this.width / 2;
        const w = obs.width;
        const h = obs.height;
        const facing = obs.speed > 0 ? 1 : -1;

        // Shadow
        this.ctx.fillStyle = CONFIG.COLORS.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + h / 2 + 5, w / 2, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Body
        this.ctx.fillStyle = obs.color;
        this.roundRect(x - w / 2, y - h / 2, w, h, 4);

        // Roof
        this.ctx.fillStyle = shadeColor(obs.color, -15);
        this.roundRect(x - w / 2 + w * 0.2, y - h / 2 - 12, w * 0.55, 12, 3);

        // Windows
        this.ctx.fillStyle = '#B3E5FC';
        this.roundRect(x - w / 2 + w * 0.25, y - h / 2 - 10, w * 0.45, 9, 2);

        // Front highlight
        this.ctx.fillStyle = shadeColor(obs.color, 20);
        this.ctx.fillRect(x + (facing > 0 ? w / 2 - 8 : -w / 2), y - h / 2 + 3, 8, h - 6);

        // Wheels
        this.ctx.fillStyle = '#212121';
        this.ctx.beginPath();
        this.ctx.arc(x - w / 2 + 12, y + h / 2, 8, 0, Math.PI * 2);
        this.ctx.arc(x + w / 2 - 12, y + h / 2, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Wheel highlights
        this.ctx.fillStyle = '#424242';
        this.ctx.beginPath();
        this.ctx.arc(x - w / 2 + 12, y + h / 2 - 2, 4, 0, Math.PI * 2);
        this.ctx.arc(x + w / 2 - 12, y + h / 2 - 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawTruck(obs, y) {
        const x = obs.x + this.width / 2;
        const w = obs.width;
        const h = obs.height;
        const facing = obs.speed > 0 ? 1 : -1;

        // Shadow
        this.ctx.fillStyle = CONFIG.COLORS.shadowDark;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + h / 2 + 6, w / 2, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Cargo body
        this.ctx.fillStyle = obs.color;
        this.roundRect(x - w / 2, y - h / 2, w * 0.7, h, 3);

        // Darker side
        this.ctx.fillStyle = shadeColor(obs.color, -20);
        this.ctx.fillRect(x - w / 2, y + h / 2 - 5, w * 0.7, 5);

        // Cabin
        const cabinX = facing > 0 ? x + w / 2 - w * 0.3 : x - w / 2;
        this.ctx.fillStyle = shadeColor(obs.color, -10);
        this.roundRect(cabinX, y - h / 2 - 15, w * 0.3, h + 15, 3);

        // Cabin window
        this.ctx.fillStyle = '#B3E5FC';
        this.roundRect(cabinX + 4, y - h / 2 - 12, w * 0.3 - 8, 10, 2);

        // Wheels
        this.ctx.fillStyle = '#212121';
        this.ctx.beginPath();
        this.ctx.arc(x - w / 2 + 15, y + h / 2 + 2, 10, 0, Math.PI * 2);
        this.ctx.arc(x + w / 2 - 20, y + h / 2 + 2, 10, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLog(obs, y) {
        const x = obs.x + this.width / 2;
        const w = obs.width;

        // Shadow in water
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 10, w / 2 + 5, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Log body
        this.ctx.fillStyle = CONFIG.COLORS.log;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 3, w / 2, 12, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Log ends (darker)
        this.ctx.fillStyle = CONFIG.COLORS.logDark;
        this.ctx.beginPath();
        this.ctx.ellipse(x - w / 2 + 8, y - 3, 8, 12, 0, 0, Math.PI * 2);
        this.ctx.ellipse(x + w / 2 - 8, y - 3, 8, 12, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ring details
        this.ctx.strokeStyle = CONFIG.COLORS.logRing;
        this.ctx.lineWidth = 2;
        for (let i = 0; i < w - 30; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - w / 2 + 15 + i, y - 12);
            this.ctx.lineTo(x - w / 2 + 15 + i, y + 6);
            this.ctx.stroke();
        }

        // Highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 8, w / 2 - 10, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLily(obs, y) {
        const x = obs.x + this.width / 2;
        const r = CONFIG.TILE_SIZE * 0.4;

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 5, r + 3, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Lily pad
        this.ctx.fillStyle = CONFIG.COLORS.lily;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 2, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Notch
        this.ctx.fillStyle = CONFIG.COLORS.water[0];
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 2);
        this.ctx.lineTo(x + r, y - 8);
        this.ctx.lineTo(x + r, y + 4);
        this.ctx.closePath();
        this.ctx.fill();

        // Flower
        this.ctx.fillStyle = CONFIG.COLORS.lilyFlower;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const px = x + Math.cos(angle) * 6;
            const py = y - 5 + Math.sin(angle) * 6;
            this.ctx.beginPath();
            this.ctx.ellipse(px, py, 5, 3, angle, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = CONFIG.COLORS.lilyCenter;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 5, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawTrain(obs, y) {
        const x = obs.x;
        const w = obs.width;
        const h = obs.height;

        // Big shadow
        this.ctx.fillStyle = CONFIG.COLORS.shadowDark;
        this.ctx.fillRect(x - 5, y + h / 2 + 5, w + 10, 12);

        // Main body
        this.ctx.fillStyle = CONFIG.COLORS.train;
        this.ctx.fillRect(x, y - h / 2, w, h);

        // Top edge
        this.ctx.fillStyle = CONFIG.COLORS.trainDark;
        this.ctx.fillRect(x, y - h / 2, w, 5);

        // Warning stripes
        this.ctx.fillStyle = CONFIG.COLORS.trainStripe;
        for (let i = 0; i < w; i += 50) {
            this.ctx.fillRect(x + i, y - h / 2 + 5, 25, 4);
            this.ctx.fillRect(x + i, y + h / 2 - 9, 25, 4);
        }

        // Windows
        this.ctx.fillStyle = CONFIG.COLORS.trainWindow;
        for (let i = 30; i < w - 30; i += 55) {
            this.roundRect(x + i, y - 12, 35, 18, 2);
        }

        // Wheels
        this.ctx.fillStyle = '#37474F';
        for (let i = 25; i < w; i += 45) {
            this.ctx.beginPath();
            this.ctx.arc(x + i, y + h / 2 + 2, 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawTrainWarning(y) {
        const flash = Math.floor(Date.now() / 150) % 2;

        if (flash) {
            // Warning lights
            [60, this.width - 60].forEach(x => {
                // Glow
                const gradient = this.ctx.createRadialGradient(x, y - 30, 0, x, y - 30, 30);
                gradient.addColorStop(0, 'rgba(244, 67, 54, 0.6)');
                gradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(x, y - 30, 30, 0, Math.PI * 2);
                this.ctx.fill();

                // Light
                this.ctx.fillStyle = '#F44336';
                this.ctx.beginPath();
                this.ctx.arc(x, y - 30, 12, 0, Math.PI * 2);
                this.ctx.fill();

                // Highlight
                this.ctx.fillStyle = '#FF8A80';
                this.ctx.beginPath();
                this.ctx.arc(x - 3, y - 33, 4, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
    }

    drawCoin(coin, y) {
        const x = coin.x + this.width / 2;
        const bounce = Math.sin(Date.now() * CONFIG.COIN_BOUNCE_SPEED + coin.animOffset)
            * CONFIG.COIN_BOUNCE_HEIGHT;
        const coinY = y - 12 + bounce;

        // Shadow
        this.ctx.fillStyle = CONFIG.COLORS.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 3, 10, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Coin body
        this.ctx.fillStyle = CONFIG.COLORS.coin;
        this.ctx.beginPath();
        this.ctx.arc(x, coinY, 11, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner ring
        this.ctx.fillStyle = CONFIG.COLORS.coinDark;
        this.ctx.beginPath();
        this.ctx.arc(x, coinY, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Center
        this.ctx.fillStyle = CONFIG.COLORS.coin;
        this.ctx.beginPath();
        this.ctx.arc(x, coinY, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Highlight
        this.ctx.fillStyle = CONFIG.COLORS.coinHighlight;
        this.ctx.beginPath();
        this.ctx.arc(x - 3, coinY - 4, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPlayer(player, row) {
        const screenPos = this.gridToScreen(player.x, row * CONFIG.TILE_SIZE);
        const x = screenPos.x;
        const baseY = this.height * CONFIG.CAMERA_OFFSET_Y;
        const hopHeight = player.getHopHeight();

        const squash = player.squash;
        const stretch = player.stretch;
        const size = CONFIG.PLAYER_SIZE;

        // Shadow (smaller when jumping)
        const shadowScale = 1 - (hopHeight / CONFIG.HOP_HEIGHT) * 0.3;
        this.ctx.fillStyle = CONFIG.COLORS.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x, baseY + 5, size / 2 * shadowScale, size / 4 * shadowScale, 0, 0, Math.PI * 2);
        this.ctx.fill();

        const y = baseY - hopHeight;

        // Body with squash/stretch
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(stretch, squash);

        // Body (blocky voxel character)
        this.ctx.fillStyle = CONFIG.COLORS.player;
        this.roundRect(-size / 2 + 6, -size / 2 - 5, size - 12, size - 8, 4);

        // Darker side for depth
        this.ctx.fillStyle = CONFIG.COLORS.playerDark;
        this.ctx.fillRect(-size / 2 + 6, size / 2 - 15, size - 12, 5);

        // Head
        this.ctx.fillStyle = CONFIG.COLORS.player;
        this.ctx.beginPath();
        this.ctx.arc(0, -size / 2 - 12, size / 2.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Head highlight
        this.ctx.fillStyle = CONFIG.COLORS.playerLight;
        this.ctx.beginPath();
        this.ctx.arc(-4, -size / 2 - 16, size / 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        const eyeOffsetX = player.hopDirection === 'left' ? -3 :
            player.hopDirection === 'right' ? 3 : 0;
        const eyeOffsetY = player.hopDirection === 'up' ? -2 :
            player.hopDirection === 'down' ? 2 : 0;

        this.ctx.fillStyle = CONFIG.COLORS.playerEye;
        this.ctx.beginPath();
        this.ctx.arc(-6 + eyeOffsetX, -size / 2 - 14 + eyeOffsetY, 5, 0, Math.PI * 2);
        this.ctx.arc(6 + eyeOffsetX, -size / 2 - 14 + eyeOffsetY, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = CONFIG.COLORS.playerPupil;
        this.ctx.beginPath();
        this.ctx.arc(-6 + eyeOffsetX * 1.3, -size / 2 - 14 + eyeOffsetY, 2.5, 0, Math.PI * 2);
        this.ctx.arc(6 + eyeOffsetX * 1.3, -size / 2 - 14 + eyeOffsetY, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Feet
        this.ctx.fillStyle = CONFIG.COLORS.playerDark;
        if (!player.isHopping) {
            this.roundRect(-12, size / 2 - 12, 9, 10, 2);
            this.roundRect(3, size / 2 - 12, 9, 10, 2);
        } else {
            // Tucked feet during jump
            this.roundRect(-10, size / 2 - 18, 7, 7, 2);
            this.roundRect(3, size / 2 - 18, 7, 7, 2);
        }

        this.ctx.restore();
    }

    // Helper: draw rounded rectangle
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
        this.ctx.fill();
    }
}
