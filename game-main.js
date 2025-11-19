// Game state will be initialized in init.js

// Calculate endless mode score
function calculateEndlessScore() {
    const levels = gameState.levelsCompleted;
    const time = gameState.currentTime / 1000; // Convert to seconds

    if (levels === 0 || time === 0) return 0;

    // Score formula: (levels × 1000) + (6000 × levels³ / time)
    const baseScore = levels * 1000;
    const speedBonus = (6000 * Math.pow(levels, 3)) / time;

    return Math.floor(baseScore + speedBonus);
}

// Start game with specific mode
function startGame(mode, target = null) {
    gameState.mode = mode;
    gameState.gameStarted = true;
    gameState.showMenu = false;
    gameState.levelsCompleted = 0;
    gameState.deaths = 0;
    gameState.currentLevelNumber = 1;
    gameState.startTime = performance.now();
    gameState.currentTime = 0;

    // Mode-specific setup
    if (mode === 'endless') {
        gameState.lives = 3;
        gameState.score = 0;
        gameState.currentLevel = Level.generateLevel(1);
    } else if (mode === 'speedrun') {
        gameState.speedrunTarget = target || 10;
        gameState.lives = Infinity; // Infinite lives
        gameState.currentLevel = Level.generateLevel(1);
    } else if (mode === 'daily') {
        const dailySeed = getDailyChallengeSeed();
        gameState.lives = 3;
        gameState.score = 0;
        gameState.currentLevel = Level.generateLevel(dailySeed);
        gameState.currentLevelNumber = dailySeed;
    } else if (mode === 'practice') {
        gameState.lives = Infinity;
        gameState.currentLevel = Level.generateLevel(target || 1);
        gameState.currentLevelNumber = target || 1;
    }

    // Create player
    gameState.player = new Player(
        gameState.currentLevel.startPosition.x,
        gameState.currentLevel.startPosition.y,
        gameState.currentLevel.planets[0]
    );

    updateUI();

    // Ensure game loop is running
    if (typeof gameLoop === 'function') {
        // Game loop should already be running from init, but ensure it's active
        gameState.gameStarted = true;
    }
}

// Update UI based on current mode
function updateUI() {
    if (gameState.mode === 'speedrun') {
        document.getElementById('score').textContent = `Progress: ${gameState.levelsCompleted}/${gameState.speedrunTarget}`;
        document.getElementById('lives').textContent = `Deaths: ${gameState.deaths}`;
    } else if (gameState.mode === 'endless') {
        gameState.score = calculateEndlessScore();
        document.getElementById('score').textContent = `Score: ${gameState.score}`;
        document.getElementById('lives').textContent = `Lives: ${gameState.lives}`;
    } else if (gameState.mode === 'daily') {
        gameState.score = calculateEndlessScore();
        document.getElementById('score').textContent = `Score: ${gameState.score}`;
        document.getElementById('lives').textContent = `Lives: ${gameState.lives}`;
    } else if (gameState.mode === 'practice') {
        document.getElementById('score').textContent = `Practice: Level ${gameState.currentLevelNumber}`;
        document.getElementById('lives').textContent = `Deaths: ${gameState.deaths}`;
    }

    document.getElementById('level').textContent = `Level: ${gameState.currentLevelNumber}`;
}

// Handle level completion based on mode
function handleLevelComplete() {
    gameState.levelsCompleted++;
    gameState.stats.totalLevelsCompleted++;

    if (gameState.mode === 'speedrun') {
        if (gameState.levelsCompleted >= gameState.speedrunTarget) {
            // Speedrun complete!
            completeSpeedrun();
            return;
        }
        // Load next sequential level
        gameState.currentLevelNumber++;
        gameState.currentLevel = Level.generateLevel(gameState.currentLevelNumber);
    } else if (gameState.mode === 'endless') {
        // Random next level
        gameState.currentLevelNumber++;
        gameState.currentLevel = Level.generateLevel(gameState.currentLevelNumber);

        // Update high score
        gameState.score = calculateEndlessScore();
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            safeSetLocalStorage('littlePrinceHighScore', gameState.highScore);
        }
    } else if (gameState.mode === 'daily') {
        // Daily challenge: fixed progression
        gameState.currentLevelNumber++;
        gameState.currentLevel = Level.generateLevel(getDailyChallengeSeed() + gameState.levelsCompleted);

        gameState.score = calculateEndlessScore();
        if (gameState.score > gameState.dailyBestScore) {
            gameState.dailyBestScore = gameState.score;
            const dailyKey = `littlePrinceDaily_${getDailyChallengeSeed()}`;
            safeSetLocalStorage(dailyKey, gameState.score);
        }
    } else if (gameState.mode === 'practice') {
        // Practice: just go to next level
        gameState.currentLevelNumber++;
        gameState.currentLevel = Level.generateLevel(gameState.currentLevelNumber);
    }

    // Create new player
    gameState.player = new Player(
        gameState.currentLevel.startPosition.x,
        gameState.currentLevel.startPosition.y,
        gameState.currentLevel.planets[0]
    );

    updateUI();
}

// Complete speedrun
function completeSpeedrun() {
    const finalTime = gameState.currentTime;
    const finalDeaths = gameState.deaths;
    const target = gameState.speedrunTarget;

    // Check if new record
    const current = gameState.speedrunRecords[target.toString()];
    let newRecord = false;

    if (finalDeaths === 0 && finalTime < current.deathlessTime) {
        current.deathlessTime = finalTime;
        newRecord = true;
    }

    if (finalTime < current.time || (finalTime === current.time && finalDeaths < current.deaths)) {
        current.time = finalTime;
        current.deaths = finalDeaths;
        newRecord = true;
    }

    // Save to localStorage
    safeSetLocalStorage('littlePrinceSpeedrun', gameState.speedrunRecords);

    // Save total time played
    gameState.stats.totalTimePlayed += gameState.currentTime;
    safeSetLocalStorage('littlePrinceStats', gameState.stats);

    // Show completion screen
    gameState.gameStarted = false;
    showCompletionScreen();

    // Update title if new record
    if (newRecord) {
        document.getElementById('completion-title').textContent = 'NEW RECORD!';
    }
}

// Handle player death based on mode
function handlePlayerDeath() {
    gameState.deaths++;
    gameState.stats.totalDeaths++;

    // Save stats to localStorage
    safeSetLocalStorage('littlePrinceStats', gameState.stats);

    if (gameState.mode === 'endless' || gameState.mode === 'daily') {
        gameState.lives--;
        if (gameState.lives <= 0) {
            // Game over
            gameState.gameStarted = false;

            // Update longest streak
            if (gameState.levelsCompleted > gameState.stats.longestStreak) {
                gameState.stats.longestStreak = gameState.levelsCompleted;
                safeSetLocalStorage('littlePrinceStats', gameState.stats);
            }

            // Save total time played
            gameState.stats.totalTimePlayed += gameState.currentTime;
            safeSetLocalStorage('littlePrinceStats', gameState.stats);

            // Show completion screen
            showCompletionScreen();

            return false; // Game over
        }
    }

    // Reset player (infinite lives in speedrun/practice)
    gameState.player = new Player(
        gameState.currentLevel.startPosition.x,
        gameState.currentLevel.startPosition.y,
        gameState.currentLevel.planets[0]
    );

    updateUI();
    return true; // Continue
}



// Check collision with black holes (instant death)
function checkBlackHoleCollision(player, blackHoles) {
    if (!blackHoles || blackHoles.length === 0) return false;

    const px = player.x;
    const py = player.y;
    const pr = player.radius;

    for (const blackHole of blackHoles) {
        const combinedRadius = blackHole.radius + pr;

        // First check current position
        const dx = px - blackHole.x;
        const dy = py - blackHole.y;
        const distSquared = dx * dx + dy * dy;
        const radiusSquared = combinedRadius * combinedRadius;

        if (distSquared < radiusSquared) {
            return true;
        }

        // Check swept collision
        if (lineSegmentIntersectsCircle(
            player.prevX, player.prevY,
            player.x, player.y,
            blackHole.x, blackHole.y,
            combinedRadius
        )) {
            return true;
        }
    }
    return false;
}

// Update game state
function update(deltaTime) {
    if (!gameState.gameStarted || gameState.paused) {
        // Still update particles and screen shake even when paused
        if (gameState.particlePool) {
            const particleDt = deltaTime * 0.001 * gameState.gameSpeed;
            gameState.particlePool.update(particleDt);
        }
        updateScreenShake(deltaTime * 0.001 * gameState.gameSpeed);
        return;
    }

    // Update timer (real-world time, not affected by game speed)
    gameState.currentTime = performance.now() - gameState.startTime;
    updateTimerDisplay();

    // Store previous position BEFORE physics update for swept collision detection
    gameState.player.prevX = gameState.player.x;
    gameState.player.prevY = gameState.player.y;

    // Update mobile input state
    updateMobileInput();

    // Combine keyboard and mobile input
    const combinedKeys = {
        left: gameState.keys.left || gameState.mobileInput.left,
        right: gameState.keys.right || gameState.mobileInput.right
    };

    gameState.player.updatePhysics(gameState.currentLevel.planets, combinedKeys, deltaTime);

    // Update black holes
    if (gameState.currentLevel.blackHoles) {
        const bhDt = deltaTime * 0.001 * gameState.gameSpeed;
        for (const blackHole of gameState.currentLevel.blackHoles) {
            blackHole.update(bhDt);
        }
    }

    // Update particles using pool (use scaled delta time for visual consistency)
    const particleDt = deltaTime * 0.001 * gameState.gameSpeed;
    gameState.particlePool.update(particleDt);

    // Update screen shake
    updateScreenShake(particleDt);

    // Check black hole collisions (instant death)
    if (checkBlackHoleCollision(gameState.player, gameState.currentLevel.blackHoles)) {
        // Create death particle effect
        createParticleBurst(gameState.player.x, gameState.player.y, 20, 'rgba(138, 43, 226, 1)', 120);
        addScreenShake(15, 0.3);

        handlePlayerDeath();
        return; // Don't check other collisions this frame
    }



    // Check goal
    if (gameState.currentLevel.checkGoal(gameState.player)) {
        // Success particle effect
        createParticleBurst(gameState.player.x, gameState.player.y, 25, 'rgba(0, 255, 100, 1)', 150);
        addScreenShake(8, 0.15);

        handleLevelComplete();
    }

    // Update score display in real-time for endless/daily modes
    if (gameState.mode === 'endless' || gameState.mode === 'daily') {
        updateUI();
    }
}

// Render game
function render() {
    // Always render if we have a valid context and level
    if (!gameState.ctx || !gameState.currentLevel) return;

    gameState.ctx.save();

    // Apply screen shake
    if (gameState.screenShake.duration > 0) {
        gameState.ctx.translate(gameState.screenShake.x, gameState.screenShake.y);
    }

    gameState.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw planets
    for (const planet of gameState.currentLevel.planets) {
        planet.draw(gameState.ctx);
    }

    // Draw gravitational force lines from player to planets
    drawGravityLines(gameState.ctx, gameState.currentLevel.planets, gameState.player);



    // Draw black holes
    if (gameState.currentLevel.blackHoles) {
        for (const blackHole of gameState.currentLevel.blackHoles) {
            blackHole.draw(gameState.ctx, gameState.lastFrameTime);
        }
    }

    // Draw player trail
    drawPlayerTrail(gameState.ctx, gameState.player.trail);

    // Draw particles using pool
    gameState.particlePool.draw(gameState.ctx);

    // Draw player
    gameState.player.draw(gameState.ctx);

    // Draw goal with pulsing animation
    drawGoal(gameState.ctx, gameState.currentLevel.goalPosition.x, gameState.currentLevel.goalPosition.y, gameState.lastFrameTime);

    gameState.ctx.restore();

    // Draw goal indicator (always on top, not affected by screen shake)
    if (gameState.gameStarted) {
        drawGoalIndicator(gameState.ctx);
        drawMobileJoystick(gameState.ctx);
        drawSpeedIndicator(gameState.ctx);
    }
}

// Draw animated goal
function drawGoal(ctx, x, y, time) {
    ctx.save();

    // Pulsing animation using time
    const pulseSpeed = 0.003;
    const pulsePhase = Math.sin(time * pulseSpeed) * 0.5 + 0.5;
    const baseRadius = 20;
    const pulseRadius = baseRadius + pulsePhase * 5;

    // Outer glow rings
    for (let i = 3; i >= 1; i--) {
        const ringRadius = pulseRadius + i * 8;
        const alpha = (1 - i / 4) * 0.3 * pulsePhase;
        ctx.strokeStyle = `rgba(0, 255, 100, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // Inner filled circle with gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
    gradient.addColorStop(0, 'rgba(100, 255, 150, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 100, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 255, 100, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Main goal outline
    ctx.strokeStyle = `rgba(0, 255, 100, ${0.8 + pulsePhase * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Star shape in center
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + pulsePhase * 0.4})`;
    ctx.beginPath();
    const spikes = 4;
    const outerR = 8;
    const innerR = 4;
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2 + time * 0.001;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Draw gravitational force lines from player to planets (and goal)
function drawGravityLines(ctx, planets, player) {
    if (player.onPlanet) return; // Don't show lines when landed on a planet

    ctx.save();

    // Helper function to draw gravity line
    const drawGravityLine = (gravitySource, forceMag) => {
        // Only show lines for sources with measurable gravitational pull
        if (forceMag > 0.1) {
            // Scale line properties based on gravitational force strength
            const forceScale = Math.min(1, forceMag / 1000); // Normalize to 0-1 range

            // Opacity scales with force strength
            const alpha = 0.1 + forceScale * 0.8; // 0.1 to 0.9

            // Thickness scales with force strength
            const lineWidth = 0.5 + forceScale * 4; // 0.5 to 4.5

            // Color shifts from cool blue (weak) to warm yellow (strong)
            const warmth = forceScale;
            const r = Math.floor(100 + warmth * 155); // 100 to 255
            const g = Math.floor(200 + warmth * 55);  // 200 to 255
            const b = Math.floor(255 - warmth * 100); // 255 to 155

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = lineWidth;

            // Draw line from player to gravity source center
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(gravitySource.x, gravitySource.y);
            ctx.stroke();

            // Add force magnitude indicator at source (small circle)
            if (forceScale > 0.3) {
                const indicatorRadius = 2 + forceScale * 5;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(gravitySource.x, gravitySource.y, indicatorRadius, 0, 2 * Math.PI);
                ctx.fill();

                // Add force magnitude indicator at player end
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
                const playerIndicatorRadius = 1 + forceScale * 3;
                ctx.beginPath();
                ctx.arc(player.x, player.y, playerIndicatorRadius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    };

    // Draw gravity lines for planets
    for (const planet of planets) {
        const gravity = planet.calculateGravity(player);
        const forceMag = Math.sqrt(gravity.x * gravity.x + gravity.y * gravity.y);
        drawGravityLine(planet, forceMag);
    }

    // Draw gravity line for goal if it has gravitational influence
    if (gameState.currentLevel.goal) {
        const goalGravity = gameState.currentLevel.goal.calculateGravity(player);
        const goalForceMag = Math.sqrt(goalGravity.x * goalGravity.x + goalGravity.y * goalGravity.y);
        drawGravityLine(gameState.currentLevel.goal, goalForceMag);
    }

    // Draw gravity lines for black holes (use purple/red color for danger)
    if (gameState.currentLevel.blackHoles) {
        for (const blackHole of gameState.currentLevel.blackHoles) {
            const bhGravity = blackHole.calculateGravity(player);
            const bhForceMag = Math.sqrt(bhGravity.x * bhGravity.x + bhGravity.y * bhGravity.y);

            if (bhForceMag > 0.1) {
                const forceScale = Math.min(1, bhForceMag / 1000);
                const alpha = 0.2 + forceScale * 0.8;
                const lineWidth = 1 + forceScale * 5;

                // Purple to red gradient for black hole danger
                ctx.strokeStyle = `rgba(138, 43, 226, ${alpha})`;
                ctx.lineWidth = lineWidth;

                ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(blackHole.x, blackHole.y);
                ctx.stroke();

                // Pulsing danger indicator
                if (forceScale > 0.3) {
                    const pulse = Math.sin(gameState.lastFrameTime * 0.005) * 0.5 + 0.5;
                    const indicatorRadius = 3 + forceScale * 7 + pulse * 3;
                    ctx.fillStyle = `rgba(255, 0, 100, ${alpha * 0.7})`;
                    ctx.beginPath();
                    ctx.arc(blackHole.x, blackHole.y, indicatorRadius, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    }

    ctx.restore();
}

// Draw player trail
function drawPlayerTrail(ctx, trail) {
    if (trail.length < 2) return;

    ctx.save();

    for (let i = 0; i < trail.length - 1; i++) {
        const point = trail[i];
        const nextPoint = trail[i + 1];

        // Handle screen wrapping - don't draw lines across wrap boundaries
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;

        // If jump is too large (likely screen wrap), skip drawing this segment
        const maxJump = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.7;
        if (Math.sqrt(dx * dx + dy * dy) > maxJump) {
            // Still draw sparkle for recent points even if line is skipped
            const alpha = Math.max(0.1, 1 - point.age / 0.5); // 0.5 second max trail
            if (point.age < 0.15) { // First 0.15 seconds
                ctx.fillStyle = `rgba(255, 255, 150, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
            continue;
        }

        // Fade out with age and distance (time-based: 0.5 second trail)
        const alpha = Math.max(0.1, 1 - point.age / 0.5);
        const brightness = Math.min(255, 200 + (1 - alpha) * 55);

        // Trail color (golden fading to purple)
        ctx.strokeStyle = `rgba(${brightness}, ${Math.floor(brightness * 0.7)}, 100, ${alpha})`;
        ctx.lineWidth = Math.max(0.5, 3 - point.age * 6); // Fade line width over 0.5 seconds

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();

        // Add sparkle effects for recent points
        if (point.age < 0.15) { // First 0.15 seconds
            ctx.fillStyle = `rgba(255, 255, 150, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    ctx.restore();
}

// Update timer display
function updateTimerDisplay() {
    const totalSeconds = gameState.currentTime / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds % 1) * 10);
    document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

// Create particle burst effect using pool
function createParticleBurst(x, y, count, color, speedRange = 100) {
    gameState.particlePool.createBurst(x, y, count, color, speedRange);
}

// Add screen shake effect
function addScreenShake(intensity, duration = 0.2) {
    if (!gameState.visualEffects) return;

    gameState.screenShake.intensity = Math.max(gameState.screenShake.intensity, intensity);
    gameState.screenShake.duration = Math.max(gameState.screenShake.duration, duration);
}

// Update screen shake
function updateScreenShake(dt) {
    if (gameState.screenShake.duration > 0) {
        gameState.screenShake.duration -= dt;

        if (gameState.screenShake.duration > 0) {
            const shakePower = gameState.screenShake.intensity * (gameState.screenShake.duration / 0.2);
            gameState.screenShake.x = (Math.random() - 0.5) * shakePower;
            gameState.screenShake.y = (Math.random() - 0.5) * shakePower;
        } else {
            gameState.screenShake.x = 0;
            gameState.screenShake.y = 0;
            gameState.screenShake.intensity = 0;
        }
    }
}

// Draw off-screen goal indicator
function drawGoalIndicator(ctx) {
    const goalX = gameState.currentLevel.goalPosition.x;
    const goalY = gameState.currentLevel.goalPosition.y;

    // Check if goal is off-screen
    const margin = 50;
    const isOffScreen = goalX < -margin || goalX > CANVAS_WIDTH + margin ||
                        goalY < -margin || goalY > CANVAS_HEIGHT + margin;

    if (!isOffScreen) return;

    // Calculate angle to goal from screen center
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const angle = Math.atan2(goalY - centerY, goalX - centerX);

    // Position indicator at screen edge
    const indicatorDist = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.45;
    const indX = centerX + Math.cos(angle) * indicatorDist;
    const indY = centerY + Math.sin(angle) * indicatorDist;

    // Draw pulsing arrow
    const pulse = Math.sin(gameState.lastFrameTime * 0.003) * 0.3 + 0.7;
    ctx.save();
    ctx.translate(indX, indY);
    ctx.rotate(angle);

    // Arrow shape
    ctx.fillStyle = `rgba(0, 255, 100, ${pulse})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Distance text
    const distance = Math.sqrt(Math.pow(goalX - centerX, 2) + Math.pow(goalY - centerY, 2));
    ctx.font = '12px monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.rotate(-angle);
    ctx.fillText(Math.floor(distance), 0, 25);

    ctx.restore();
}

// Handle input (optimized for responsiveness)
function handleInput(event) {
    const isKeyDown = event.type === 'keydown';

    // Prevent default behavior for game controls to avoid browser interference
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
    }

    // Handle keyboard input
    if (event.code === 'ArrowLeft') {
        gameState.keys.left = isKeyDown;
    } else if (event.code === 'ArrowRight') {
        gameState.keys.right = isKeyDown;
    } else if (event.code === 'KeyR' && isKeyDown && gameState.gameStarted && !gameState.paused) {
        // Restart current level
        event.preventDefault();
        gameState.currentLevel = Level.generateLevel(gameState.currentLevelNumber);
        gameState.player = new Player(
            gameState.currentLevel.startPosition.x,
            gameState.currentLevel.startPosition.y,
            gameState.currentLevel.planets[0]
        );
        gameState.particlePool.clear();
    } else if (event.code === 'Escape' && isKeyDown) {
        if (gameState.gameStarted && !gameState.paused) {
            // Show pause menu
            gameState.paused = true;
            hideAllMenus();
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (gameState.paused) {
            // Resume game
            resumeGame();
        }
    }
}

// Update mobile input state
function updateMobileInput() {
    if (!gameState.mobileInput.active) {
        // No mobile input active, clear mobile keys and target speed
        gameState.mobileInput.left = false;
        gameState.mobileInput.right = false;
        gameState.mobileInput.targetSpeed = 0;
        return;
    }

    // Calculate joystick position relative to center
    const deltaX = gameState.mobileInput.currentX - gameState.mobileInput.centerX;
    const distance = Math.abs(deltaX);

    // Apply deadzone
    if (distance < gameState.mobileInput.deadzone) {
        // In deadzone - no movement, target speed = 0
        gameState.mobileInput.left = false;
        gameState.mobileInput.right = false;
        gameState.mobileInput.targetSpeed = 0;
    } else {
        // Outside deadzone - calculate target speed based on drag distance
        const clampedDistance = Math.min(distance, gameState.mobileInput.maxDistance);
        const direction = deltaX > 0 ? 'right' : 'left';

        // Calculate target speed as percentage of max speed (0-1)
        gameState.mobileInput.targetSpeed = clampedDistance / gameState.mobileInput.maxDistance;

        // Set mobile input based on direction
        gameState.mobileInput.left = direction === 'left';
        gameState.mobileInput.right = direction === 'right';
    }
}

// Draw mobile joystick visual feedback - using overlay
function drawMobileJoystick(ctx) {
    if (!gameState.joystickOverlay) return;

    if (!gameState.mobileInput.active) {
        // Hide overlay when no input active
        gameState.joystickOverlay.style.display = 'none';
        return;
    }

    // Show overlay and ensure it's above everything
    gameState.joystickOverlay.style.display = 'block';

    // Same positioning logic for both fullscreen and normal modes - relative to touch point
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
    const zIndex = isFullscreen ? '2147483647' : '9999'; // Maximum z-index in fullscreen
    gameState.joystickOverlay.style.zIndex = zIndex;

    const isMobile = gameState.isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Use same positioning logic for both mobile and desktop: position relative to touch point
    const screenX = gameState.mobileInput.centerX;
    const screenY = gameState.mobileInput.centerY;

    // Use viewport-relative positioning for both platforms
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position joystick above the touch point with spacing
    const joystickRadius = gameState.mobileInput.joystickRadius + 10;
    let overlayX = Math.max(0, Math.min(screenX - 100, viewportWidth - 200)); // Center the 200px wide overlay on touch, clamp to viewport
    let overlayY = screenY - joystickRadius * 2;

    // If too high, position below touch point instead
    if (overlayY < 10) {
        overlayY = Math.max(0, screenY + joystickRadius * 2);
    }

    // Clamp to viewport bounds
    overlayY = Math.max(0, Math.min(overlayY, viewportHeight - 200)); // 200px is overlay height

    // Set overlay position using screen coordinates but clamped to viewport
    gameState.joystickOverlay.style.width = '200px';
    gameState.joystickOverlay.style.height = '200px';
    gameState.joystickOverlay.style.left = overlayX + 'px';
    gameState.joystickOverlay.style.top = overlayY + 'px';
    gameState.joystickOverlay.style.bottom = 'auto';
    gameState.joystickOverlay.style.position = 'fixed';

    // Draw on overlay canvas
    const overlayCtx = gameState.joystickCtx;

    // Clear overlay
    overlayCtx.clearRect(0, 0, 200, 200);

    // Draw joystick at center of overlay
    const centerX = 100;
    const centerY = 100;

    // Draw joystick base (outer circle)
    const baseRadius = gameState.mobileInput.joystickRadius;
    overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
    overlayCtx.stroke();

    // Draw joystick handle (inner circle)
    const deltaX = gameState.mobileInput.currentX - gameState.mobileInput.centerX;
    const distance = Math.abs(deltaX);

    if (distance > gameState.mobileInput.deadzone) {
        const clampedDistance = Math.min(distance, gameState.mobileInput.maxDistance);
        const direction = deltaX > 0 ? 1 : -1;
        const handleX = centerX + direction * clampedDistance;

        // Handle color based on direction
        const alpha = Math.min(distance / gameState.mobileInput.maxDistance, 1);
        overlayCtx.fillStyle = deltaX > 0 ?
            `rgba(255, 100, 100, ${0.6 * alpha})` : // Red for right
            `rgba(100, 100, 255, ${0.6 * alpha})`;  // Blue for left

        overlayCtx.beginPath();
        overlayCtx.arc(handleX, centerY, 20, 0, 2 * Math.PI);
        overlayCtx.fill();

        // Draw direction indicator text
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        overlayCtx.font = '14px monospace';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillText(deltaX > 0 ? '→' : '←', handleX, centerY - 5);
    } else {
        // In deadzone - show neutral position
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        overlayCtx.beginPath();
        overlayCtx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
        overlayCtx.fill();

        // Show "RELEASE TO JUMP" hint
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        overlayCtx.font = '12px monospace';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillText('RELEASE', centerX, centerY + 25);
        overlayCtx.fillText('TO JUMP', centerX, centerY + 40);
    }
}

// Draw static speed indicator
function drawSpeedIndicator(ctx) {
    if (!gameState.player || !gameState.player.onPlanet) return;

    ctx.save();

    const barWidth = 200;
    const barHeight = 10;
    const x = (CANVAS_WIDTH - barWidth) / 2;
    const y = CANVAS_HEIGHT - 30;

    // Draw speed bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Draw speed bar fill
    const speedRatio = Math.abs(gameState.player.angularSpeed) / gameState.player.baseAngularSpeed;
    const fillWidth = barWidth * speedRatio;
    const escapeThreshold = gameState.player.escapeThreshold;

    if (speedRatio < escapeThreshold) {
        // Green when below escape velocity
        ctx.fillStyle = `rgba(0, 255, 0, ${0.5 + speedRatio * 0.5})`;
    } else {
        // Yellow/Red when at or above escape velocity
        const overRatio = (speedRatio - escapeThreshold) / (1 - escapeThreshold);
        const r = 255;
        const g = Math.floor(255 * (1 - overRatio));
        ctx.fillStyle = `rgba(${r}, ${g}, 0, ${0.7 + speedRatio * 0.3})`;
    }
    ctx.fillRect(x, y, fillWidth, barHeight);

    // Draw escape velocity marker
    const escapeX = x + barWidth * escapeThreshold;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(escapeX, y - 3);
    ctx.lineTo(escapeX, y + barHeight + 3);
    ctx.stroke();

    ctx.restore();
}

// Game loop with dynamic frame rate and delta time
function gameLoop(currentTime) {
    // Calculate delta time for frame-rate independent physics
    const deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    gameState.deltaTime = deltaTime;

    update(deltaTime);
    render();
    requestAnimationFrame(gameLoop);
}
