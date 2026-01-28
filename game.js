// Hop Road - Endless Crossing Game
// A Crossy Road-inspired game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const TILE_SIZE = 50;
const PLAYER_SIZE = 40;
const HOP_DURATION = 100; // ms
const IDLE_TIMEOUT = 7000; // ms before eagle comes

// Colors
const COLORS = {
    grass: ['#4CAF50', '#45a049', '#66BB6A', '#43A047'],
    road: '#505050',
    roadLine: '#FFFFFF',
    water: ['#2196F3', '#1E88E5', '#42A5F5'],
    rail: '#8B4513',
    railMetal: '#757575',
    player: '#FF5722',
    playerShadow: '#BF360C',
    car: ['#F44336', '#2196F3', '#FFEB3B', '#9C27B0', '#FF9800'],
    truck: ['#795548', '#607D8B', '#3F51B5'],
    train: '#424242',
    trainStripe: '#FFC107',
    log: '#8D6E63',
    logDark: '#5D4037',
    coin: '#FFD700',
    coinShadow: '#FFA000',
    lily: '#81C784',
    eagle: '#795548'
};

// Game state
let gameState = 'start'; // start, playing, gameover
let score = 0;
let highScore = localStorage.getItem('hopRoadHighScore') || 0;
let coins = 0;
let totalCoins = localStorage.getItem('hopRoadTotalCoins') || 0;

// Player
let player = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    row: 0,
    isHopping: false,
    hopProgress: 0,
    hopStartTime: 0,
    direction: 'up',
    lastMoveTime: Date.now()
};

// World
let rows = [];
let cameraY = 0;
let furthestRow = 0;

// Input
let keysPressed = {};
let touchStartX = 0;
let touchStartY = 0;

// Audio context for sounds
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch(type) {
        case 'hop':
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'coin':
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.15);
            break;
        case 'hit':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
            break;
        case 'splash':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
            break;
        case 'train':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
            break;
    }
}

// Row types and generation
const ROW_TYPES = ['grass', 'road', 'water', 'rail'];

function createRow(rowIndex) {
    let type;
    const prevRow = rows.find(r => r.index === rowIndex - 1);

    // Ensure variety and prevent impossible situations
    if (rowIndex < 3) {
        type = 'grass';
    } else {
        const weights = { grass: 30, road: 35, water: 20, rail: 15 };

        // Reduce consecutive same types
        if (prevRow) {
            weights[prevRow.type] *= 0.3;
        }

        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [t, w] of Object.entries(weights)) {
            random -= w;
            if (random <= 0) {
                type = t;
                break;
            }
        }
    }

    const row = {
        index: rowIndex,
        type: type,
        obstacles: [],
        coins: [],
        variant: Math.floor(Math.random() * 4)
    };

    // Generate obstacles based on row type
    switch (type) {
        case 'road':
            generateRoadObstacles(row);
            break;
        case 'water':
            generateWaterObstacles(row);
            break;
        case 'rail':
            generateRailObstacles(row);
            break;
    }

    // Random coin placement
    if (Math.random() < 0.15) {
        const coinX = Math.floor(Math.random() * 11) - 5;
        row.coins.push({ x: coinX, collected: false });
    }

    return row;
}

function generateRoadObstacles(row) {
    const speed = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1);
    const isTruck = Math.random() < 0.3;
    const count = Math.floor(Math.random() * 3) + 2;
    const gap = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < count; i++) {
        row.obstacles.push({
            x: i * gap * TILE_SIZE * (speed > 0 ? 1 : -1),
            speed: speed,
            width: isTruck ? TILE_SIZE * 2 : TILE_SIZE * 1.2,
            height: TILE_SIZE * 0.7,
            type: isTruck ? 'truck' : 'car',
            color: isTruck ?
                COLORS.truck[Math.floor(Math.random() * COLORS.truck.length)] :
                COLORS.car[Math.floor(Math.random() * COLORS.car.length)]
        });
    }
}

function generateWaterObstacles(row) {
    const speed = (Math.random() * 1.5 + 0.5) * (Math.random() < 0.5 ? 1 : -1);
    const count = Math.floor(Math.random() * 3) + 2;
    const gap = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < count; i++) {
        const isLily = Math.random() < 0.2;
        row.obstacles.push({
            x: i * gap * TILE_SIZE * (speed > 0 ? 1 : -1),
            speed: speed,
            width: isLily ? TILE_SIZE * 0.8 : TILE_SIZE * (Math.floor(Math.random() * 2) + 2),
            height: TILE_SIZE * 0.6,
            type: isLily ? 'lily' : 'log',
            safe: true
        });
    }
}

function generateRailObstacles(row) {
    row.trainWarning = false;
    row.trainComing = false;
    row.trainTimer = Math.random() * 3000 + 2000;
    row.obstacles.push({
        x: canvas.width + 200,
        speed: 0,
        width: TILE_SIZE * 15,
        height: TILE_SIZE * 0.8,
        type: 'train',
        active: false
    });
}

function initGame() {
    canvas.width = 800;
    canvas.height = 600;

    // Reset game state
    score = 0;
    coins = 0;
    furthestRow = 0;
    rows = [];

    // Reset player
    player = {
        x: 0,
        y: canvas.height * 0.7,
        targetX: 0,
        targetY: canvas.height * 0.7,
        row: 0,
        col: 0,
        isHopping: false,
        hopProgress: 0,
        hopStartTime: 0,
        direction: 'up',
        lastMoveTime: Date.now()
    };

    cameraY = 0;

    // Generate initial rows
    for (let i = -5; i < 20; i++) {
        rows.push(createRow(i));
    }

    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('coins').textContent = coins;
}

function movePlayer(direction) {
    if (player.isHopping || gameState !== 'playing') return;

    initAudio();

    let newCol = player.col;
    let newRow = player.row;

    switch (direction) {
        case 'up':
            newRow++;
            player.direction = 'up';
            break;
        case 'down':
            newRow--;
            player.direction = 'down';
            break;
        case 'left':
            newCol--;
            player.direction = 'left';
            break;
        case 'right':
            newCol++;
            player.direction = 'right';
            break;
    }

    // Boundary check
    if (newCol < -5 || newCol > 5) return;
    if (newRow < player.row - 1) return; // Can only go back one row

    // Start hop
    player.isHopping = true;
    player.hopStartTime = Date.now();
    player.targetX = newCol * TILE_SIZE;
    player.targetY = canvas.height * 0.7 - (newRow - player.row + furthestRow) * TILE_SIZE - cameraY;

    player.col = newCol;
    player.row = newRow;
    player.lastMoveTime = Date.now();

    playSound('hop');

    // Update score if moving forward
    if (newRow > furthestRow) {
        furthestRow = newRow;
        score = furthestRow;
        updateUI();
    }
}

function updatePlayer(deltaTime) {
    if (player.isHopping) {
        const elapsed = Date.now() - player.hopStartTime;
        player.hopProgress = Math.min(elapsed / HOP_DURATION, 1);

        // Smooth interpolation
        const easeProgress = 1 - Math.pow(1 - player.hopProgress, 3);

        player.x += (player.targetX - player.x) * easeProgress * 0.3;
        player.y += (player.targetY - player.y) * easeProgress * 0.3;

        if (player.hopProgress >= 1) {
            player.isHopping = false;
            player.x = player.targetX;
            player.y = player.targetY;
            player.hopProgress = 0;
        }
    }

    // Check for idle timeout (eagle attack)
    if (Date.now() - player.lastMoveTime > IDLE_TIMEOUT && gameState === 'playing') {
        gameOver('eagle');
    }
}

function updateCamera() {
    const targetCameraY = Math.max(0, (player.row - 5) * TILE_SIZE);
    cameraY += (targetCameraY - cameraY) * 0.1;

    // Update player's visual Y position
    player.y = canvas.height * 0.7 - (player.row - furthestRow + score) * TILE_SIZE + cameraY;
    player.targetY = player.y;

    // Generate new rows as needed
    const highestRow = Math.max(...rows.map(r => r.index));
    if (player.row + 15 > highestRow) {
        for (let i = highestRow + 1; i <= player.row + 20; i++) {
            rows.push(createRow(i));
        }
    }

    // Remove old rows
    rows = rows.filter(r => r.index >= player.row - 10);
}

function updateObstacles(deltaTime) {
    const screenWidth = canvas.width;

    rows.forEach(row => {
        // Update obstacle positions
        row.obstacles.forEach(obs => {
            if (row.type === 'rail') {
                // Train logic
                row.trainTimer -= deltaTime;

                if (row.trainTimer <= 1500 && !row.trainWarning) {
                    row.trainWarning = true;
                    playSound('train');
                }

                if (row.trainTimer <= 0 && !row.trainComing) {
                    row.trainComing = true;
                    obs.active = true;
                    obs.speed = -15;
                    obs.x = screenWidth + obs.width;
                }

                if (obs.active) {
                    obs.x += obs.speed;

                    if (obs.x + obs.width < -100) {
                        obs.active = false;
                        row.trainWarning = false;
                        row.trainComing = false;
                        row.trainTimer = Math.random() * 5000 + 3000;
                        obs.x = screenWidth + 200;
                    }
                }
            } else {
                // Cars, trucks, logs
                obs.x += obs.speed;

                // Wrap around
                if (obs.speed > 0 && obs.x > screenWidth + 100) {
                    obs.x = -obs.width - 100;
                } else if (obs.speed < 0 && obs.x + obs.width < -100) {
                    obs.x = screenWidth + 100;
                }
            }
        });
    });
}

function checkCollisions() {
    if (gameState !== 'playing') return;

    const currentRow = rows.find(r => r.index === player.row);
    if (!currentRow) return;

    const playerLeft = player.x + canvas.width / 2 - PLAYER_SIZE / 2;
    const playerRight = playerLeft + PLAYER_SIZE;
    const playerCenterX = playerLeft + PLAYER_SIZE / 2;

    // Check coin collection
    currentRow.coins.forEach(coin => {
        if (!coin.collected) {
            const coinX = coin.x * TILE_SIZE + canvas.width / 2;
            const dist = Math.abs(playerCenterX - coinX);
            if (dist < TILE_SIZE * 0.6) {
                coin.collected = true;
                coins++;
                totalCoins++;
                localStorage.setItem('hopRoadTotalCoins', totalCoins);
                playSound('coin');
                updateUI();
            }
        }
    });

    // Check obstacle collisions based on row type
    switch (currentRow.type) {
        case 'road':
            currentRow.obstacles.forEach(obs => {
                const obsLeft = obs.x + canvas.width / 2 - obs.width / 2;
                const obsRight = obsLeft + obs.width;

                if (playerRight > obsLeft + 10 && playerLeft < obsRight - 10) {
                    gameOver('hit');
                }
            });
            break;

        case 'water':
            let onSafe = false;
            currentRow.obstacles.forEach(obs => {
                const obsLeft = obs.x + canvas.width / 2 - obs.width / 2;
                const obsRight = obsLeft + obs.width;

                if (playerRight > obsLeft + 5 && playerLeft < obsRight - 5) {
                    onSafe = true;
                    // Move player with log/lily
                    if (!player.isHopping) {
                        player.x += obs.speed;
                        player.targetX += obs.speed;
                    }
                }
            });

            if (!onSafe && !player.isHopping) {
                gameOver('splash');
            }
            break;

        case 'rail':
            currentRow.obstacles.forEach(obs => {
                if (obs.active) {
                    const obsLeft = obs.x;
                    const obsRight = obsLeft + obs.width;
                    const playerWorldX = playerCenterX;

                    if (playerWorldX > obsLeft && playerWorldX < obsRight) {
                        gameOver('hit');
                    }
                }
            });
            break;
    }

    // Check if player fell off screen
    if (player.col < -5 || player.col > 5) {
        gameOver('hit');
    }
}

function gameOver(reason) {
    gameState = 'gameover';

    switch (reason) {
        case 'hit':
            playSound('hit');
            break;
        case 'splash':
            playSound('splash');
            break;
        case 'eagle':
            playSound('hit');
            break;
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('hopRoadHighScore', highScore);
    }

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-coins').textContent = coins;
    document.getElementById('high-score').textContent = highScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw rows from back to front
    const sortedRows = [...rows].sort((a, b) => a.index - b.index);

    sortedRows.forEach(row => {
        const rowY = canvas.height * 0.7 - (row.index - player.row) * TILE_SIZE;

        if (rowY < -TILE_SIZE || rowY > canvas.height + TILE_SIZE) return;

        drawRow(row, rowY);
    });

    // Draw player
    drawPlayer();

    // Draw warning indicators
    sortedRows.forEach(row => {
        if (row.type === 'rail' && row.trainWarning) {
            const rowY = canvas.height * 0.7 - (row.index - player.row) * TILE_SIZE;
            drawTrainWarning(rowY);
        }
    });
}

function drawRow(row, y) {
    // Draw row background
    switch (row.type) {
        case 'grass':
            ctx.fillStyle = COLORS.grass[row.variant];
            ctx.fillRect(0, y - TILE_SIZE / 2, canvas.width, TILE_SIZE);

            // Draw grass details
            for (let i = 0; i < 20; i++) {
                const gx = (i * 43 + row.index * 17) % canvas.width;
                const grassHeight = 5 + (i % 3) * 3;
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(gx, y - grassHeight, 2, grassHeight);
            }
            break;

        case 'road':
            ctx.fillStyle = COLORS.road;
            ctx.fillRect(0, y - TILE_SIZE / 2, canvas.width, TILE_SIZE);

            // Road lines
            ctx.fillStyle = COLORS.roadLine;
            for (let i = 0; i < canvas.width; i += 60) {
                ctx.fillRect(i, y - 2, 30, 4);
            }
            break;

        case 'water':
            // Animated water
            const waterOffset = (Date.now() / 100) % 20;
            ctx.fillStyle = COLORS.water[Math.floor(Date.now() / 500) % 3];
            ctx.fillRect(0, y - TILE_SIZE / 2, canvas.width, TILE_SIZE);

            // Water ripples
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.beginPath();
                ctx.arc(i + waterOffset, y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'rail':
            ctx.fillStyle = '#9E9E9E';
            ctx.fillRect(0, y - TILE_SIZE / 2, canvas.width, TILE_SIZE);

            // Rails
            ctx.fillStyle = COLORS.railMetal;
            ctx.fillRect(0, y - 15, canvas.width, 6);
            ctx.fillRect(0, y + 9, canvas.width, 6);

            // Sleepers
            ctx.fillStyle = COLORS.rail;
            for (let i = 0; i < canvas.width; i += 30) {
                ctx.fillRect(i, y - TILE_SIZE / 2 + 5, 15, TILE_SIZE - 10);
            }
            break;
    }

    // Draw coins
    row.coins.forEach(coin => {
        if (!coin.collected) {
            const coinX = coin.x * TILE_SIZE + canvas.width / 2;
            const bounce = Math.sin(Date.now() / 200) * 3;

            ctx.fillStyle = COLORS.coinShadow;
            ctx.beginPath();
            ctx.ellipse(coinX, y + 5, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = COLORS.coin;
            ctx.beginPath();
            ctx.arc(coinX, y - 10 + bounce, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFF59D';
            ctx.beginPath();
            ctx.arc(coinX - 3, y - 13 + bounce, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw obstacles
    row.obstacles.forEach(obs => {
        const obsX = obs.x + canvas.width / 2 - obs.width / 2;

        switch (obs.type) {
            case 'car':
                // Car shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(obsX + 5, y + 5, obs.width, obs.height);

                // Car body
                ctx.fillStyle = obs.color;
                ctx.fillRect(obsX, y - obs.height / 2, obs.width, obs.height);

                // Car roof
                ctx.fillStyle = shadeColor(obs.color, -20);
                ctx.fillRect(obsX + obs.width * 0.2, y - obs.height / 2 - 10, obs.width * 0.5, 10);

                // Windows
                ctx.fillStyle = '#B3E5FC';
                ctx.fillRect(obsX + obs.width * 0.25, y - obs.height / 2 - 8, obs.width * 0.4, 8);

                // Wheels
                ctx.fillStyle = '#212121';
                ctx.beginPath();
                ctx.arc(obsX + 10, y + obs.height / 2 - 5, 8, 0, Math.PI * 2);
                ctx.arc(obsX + obs.width - 10, y + obs.height / 2 - 5, 8, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'truck':
                // Truck shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(obsX + 5, y + 5, obs.width, obs.height);

                // Truck body
                ctx.fillStyle = obs.color;
                ctx.fillRect(obsX, y - obs.height / 2, obs.width, obs.height);

                // Truck cabin
                ctx.fillStyle = shadeColor(obs.color, -30);
                ctx.fillRect(obs.speed > 0 ? obsX : obsX + obs.width - 25, y - obs.height / 2 - 15, 25, 15);

                // Wheels
                ctx.fillStyle = '#212121';
                ctx.beginPath();
                ctx.arc(obsX + 15, y + obs.height / 2 - 5, 10, 0, Math.PI * 2);
                ctx.arc(obsX + obs.width - 15, y + obs.height / 2 - 5, 10, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'log':
                // Log shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(obsX + obs.width / 2, y + 8, obs.width / 2, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Log body
                ctx.fillStyle = COLORS.log;
                ctx.beginPath();
                ctx.ellipse(obsX + obs.width / 2, y - 5, obs.width / 2, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Log ends
                ctx.fillStyle = COLORS.logDark;
                ctx.beginPath();
                ctx.ellipse(obsX + 10, y - 5, 10, 15, 0, 0, Math.PI * 2);
                ctx.ellipse(obsX + obs.width - 10, y - 5, 10, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Log details
                ctx.strokeStyle = COLORS.logDark;
                ctx.lineWidth = 2;
                for (let i = 20; i < obs.width - 20; i += 25) {
                    ctx.beginPath();
                    ctx.moveTo(obsX + i, y - 15);
                    ctx.lineTo(obsX + i, y + 5);
                    ctx.stroke();
                }
                break;

            case 'lily':
                ctx.fillStyle = COLORS.lily;
                ctx.beginPath();
                ctx.arc(obsX + obs.width / 2, y, obs.width / 2, 0, Math.PI * 2);
                ctx.fill();

                // Lily flower
                ctx.fillStyle = '#E91E63';
                ctx.beginPath();
                ctx.arc(obsX + obs.width / 2, y - 5, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.arc(obsX + obs.width / 2, y - 5, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'train':
                if (obs.active) {
                    // Train shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.fillRect(obs.x + 10, y + 10, obs.width, obs.height);

                    // Train body
                    ctx.fillStyle = COLORS.train;
                    ctx.fillRect(obs.x, y - obs.height / 2, obs.width, obs.height);

                    // Warning stripes
                    ctx.fillStyle = COLORS.trainStripe;
                    for (let i = 0; i < obs.width; i += 40) {
                        ctx.fillRect(obs.x + i, y - obs.height / 2, 20, 5);
                        ctx.fillRect(obs.x + i, y + obs.height / 2 - 5, 20, 5);
                    }

                    // Train windows
                    ctx.fillStyle = '#FFF9C4';
                    for (let i = 30; i < obs.width - 30; i += 50) {
                        ctx.fillRect(obs.x + i, y - 10, 30, 15);
                    }

                    // Wheels
                    ctx.fillStyle = '#424242';
                    for (let i = 20; i < obs.width; i += 40) {
                        ctx.beginPath();
                        ctx.arc(obs.x + i, y + obs.height / 2, 12, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
        }
    });
}

function drawPlayer() {
    const px = player.x + canvas.width / 2;
    const py = player.y;

    // Jump height during hop
    const jumpHeight = player.isHopping ?
        Math.sin(player.hopProgress * Math.PI) * 20 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 5, PLAYER_SIZE / 2 - jumpHeight / 4, PLAYER_SIZE / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(
        px - PLAYER_SIZE / 2 + 5,
        py - PLAYER_SIZE / 2 - jumpHeight - 10,
        PLAYER_SIZE - 10,
        PLAYER_SIZE - 5
    );

    // Head
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(px, py - PLAYER_SIZE / 2 - jumpHeight - 15, PLAYER_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    const eyeOffsetX = player.direction === 'left' ? -3 :
        player.direction === 'right' ? 3 : 0;
    const eyeOffsetY = player.direction === 'up' ? -2 :
        player.direction === 'down' ? 2 : 0;

    ctx.beginPath();
    ctx.arc(px - 5 + eyeOffsetX, py - PLAYER_SIZE / 2 - jumpHeight - 18 + eyeOffsetY, 5, 0, Math.PI * 2);
    ctx.arc(px + 5 + eyeOffsetX, py - PLAYER_SIZE / 2 - jumpHeight - 18 + eyeOffsetY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(px - 5 + eyeOffsetX * 1.5, py - PLAYER_SIZE / 2 - jumpHeight - 18 + eyeOffsetY, 2, 0, Math.PI * 2);
    ctx.arc(px + 5 + eyeOffsetX * 1.5, py - PLAYER_SIZE / 2 - jumpHeight - 18 + eyeOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Feet
    ctx.fillStyle = COLORS.playerShadow;
    if (!player.isHopping) {
        ctx.fillRect(px - 12, py - 5, 8, 10);
        ctx.fillRect(px + 4, py - 5, 8, 10);
    } else {
        // Feet tucked during jump
        ctx.fillRect(px - 10, py - jumpHeight - 5, 6, 6);
        ctx.fillRect(px + 4, py - jumpHeight - 5, 6, 6);
    }
}

function drawTrainWarning(y) {
    const flash = Math.floor(Date.now() / 200) % 2;
    if (flash) {
        // Warning lights
        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.arc(50, y - 30, 15, 0, Math.PI * 2);
        ctx.arc(canvas.width - 50, y - 30, 15, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
        ctx.beginPath();
        ctx.arc(50, y - 30, 25, 0, Math.PI * 2);
        ctx.arc(canvas.width - 50, y - 30, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// Input handlers
document.addEventListener('keydown', (e) => {
    if (gameState !== 'playing') return;

    keysPressed[e.key] = true;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
            e.preventDefault();
            movePlayer('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            movePlayer('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            movePlayer('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            movePlayer('right');
            break;
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        // Tap - move forward
        movePlayer('up');
    } else if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        movePlayer(dx > 0 ? 'right' : 'left');
    } else {
        // Vertical swipe
        movePlayer(dy > 0 ? 'down' : 'up');
    }
});

// Button handlers
document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('start-screen').classList.add('hidden');
    gameState = 'playing';
    initGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    gameState = 'playing';
    initGame();
});

// Game loop
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState === 'playing') {
        updatePlayer(deltaTime);
        updateCamera();
        updateObstacles(deltaTime);
        checkCollisions();
    }

    drawGame();

    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Resize handler
window.addEventListener('resize', () => {
    // Keep aspect ratio
    const container = document.getElementById('game-container');
    const aspectRatio = 800 / 600;
    const windowRatio = window.innerWidth / window.innerHeight;

    if (windowRatio > aspectRatio) {
        container.style.height = '100vh';
        container.style.width = 'auto';
    } else {
        container.style.width = '100vw';
        container.style.height = 'auto';
    }
});
