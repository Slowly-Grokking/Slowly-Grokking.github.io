// Planet class
class Planet {
    constructor(radius, x, y, gravityStrength = 1.0) {
        this.radius = radius;
        this.x = x;
        this.y = y;
        this.gravityStrength = gravityStrength;
        // Varied colors based on size/gravity
        const hue = 200 + (gravityStrength - 0.5) * 60; // Blue to purple
        this.color = `hsl(${hue}, 70%, 50%)`;
        this.highlightColor = `hsl(${hue}, 70%, 70%)`;
    }

    draw(ctx) {
        ctx.save();

        // Draw planet shadow/glow
        const shadowGradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.8, this.x, this.y, this.radius * 1.3);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw planet with 3D gradient
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3,
            this.y - this.radius * 0.3,
            this.radius * 0.1,
            this.x,
            this.y,
            this.radius
        );
        gradient.addColorStop(0, this.highlightColor);
        gradient.addColorStop(0.4, this.color);
        gradient.addColorStop(1, `hsl(${200 + (this.gravityStrength - 0.5) * 60}, 70%, 30%)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw subtle rim highlight
        ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 1, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.restore();
    }

    calculateGravity(player) {
        // Vector from player to planet center
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distSquared);

        // No gravity if too close to center (player is inside/on planet)
        if (distance < this.radius + 5) return { x: 0, y: 0 };

        // F = G * M * m / r² * gravityMultiplier
        // Softening factor (100) prevents extreme forces at very close range
        const forceMagnitude = (this.gravityStrength * GRAVITY_CONSTANT * gameState.gravityMultiplier) / (distSquared + 100);

        // Direction: normalize the vector and multiply by force magnitude
        const forceX = forceMagnitude * (dx / distance);
        const forceY = forceMagnitude * (dy / distance);

        return { x: forceX, y: forceY };
    }
}



// Black Hole class - Ultra-high gravity obstacle
class BlackHole {
    constructor(x, y, radius = 10) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.gravityStrength = 15.0; // 15x normal gravity - extremely dangerous
        this.collisionEffect = 'death';
        this.particles = []; // Vortex particles
        this.rotation = 0; // For rotating accretion disk

        // Generate initial vortex particles
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                angle: Math.random() * Math.PI * 2,
                distance: this.radius + Math.random() * 30,
                speed: 0.5 + Math.random() * 1.5,
                size: 1 + Math.random() * 2,
                hue: 250 + Math.random() * 40 // Purple to blue
            });
        }
    }

    update(dt) {
        // Rotate accretion disk
        this.rotation += dt * 0.5;

        // Update vortex particles - spiral inward
        for (let particle of this.particles) {
            particle.angle += particle.speed * dt;
            particle.distance -= particle.speed * 8 * dt;

            // Reset particle if it reaches center
            if (particle.distance < this.radius) {
                particle.distance = this.radius + 30;
                particle.angle = Math.random() * Math.PI * 2;
            }
        }
    }

    draw(ctx, time) {
        ctx.save();

        // Draw danger glow (pulsing)
        const pulsePhase = Math.sin(time * 0.003) * 0.5 + 0.5;
        const glowRadius = this.radius * 3;
        const glowGrad = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, glowRadius);
        glowGrad.addColorStop(0, `rgba(138, 43, 226, ${0.3 * pulsePhase})`);
        glowGrad.addColorStop(0.5, `rgba(75, 0, 130, ${0.15 * pulsePhase})`);
        glowGrad.addColorStop(1, 'rgba(75, 0, 130, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw vortex particles (accretion disk)
        for (let particle of this.particles) {
            const px = this.x + Math.cos(particle.angle) * particle.distance;
            const py = this.y + Math.sin(particle.angle) * particle.distance;

            // Fade based on distance
            const distRatio = (particle.distance - this.radius) / 30;
            const alpha = distRatio * 0.8;

            ctx.fillStyle = `hsla(${particle.hue}, 100%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw event horizon (black core)
        const coreGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        coreGrad.addColorStop(0, '#000000');
        coreGrad.addColorStop(0.7, '#1a001a');
        coreGrad.addColorStop(1, '#4b0082');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw spinning accretion disk ring
        ctx.strokeStyle = `rgba(138, 43, 226, ${0.6 + pulsePhase * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -this.rotation * 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    calculateGravity(player) {
        // Same as planet but with extreme gravity multiplier
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distSquared);

        if (distance < this.radius + 5) return { x: 0, y: 0 };

        const forceMagnitude = (this.gravityStrength * GRAVITY_CONSTANT * gameState.gravityMultiplier) / (distSquared + 100);
        const forceX = forceMagnitude * (dx / distance);
        const forceY = forceMagnitude * (dy / distance);

        return { x: forceX, y: forceY };
    }
}

// Player class
class Player {
    constructor(x, y, planet = null) {
        this.x = x;
        this.y = y;
        this.prevX = x; // Previous position for swept collision detection
        this.prevY = y; // Previous position for swept collision detection
        this.screenWrapped = false; // Flag to disable swept collision after screen wrap
        this.trail = []; // Store recent positions for trail effect
        this.vx = 0;
        this.vy = 0;
        this.onPlanet = false;
        this.currentPlanet = null;
        this.hasJumped = false;
        this.angle = 0;
        this.radius = 8;
        this.color = '#ffd700';

        // Angular movement physics (running around planets)
        this.angularSpeed = 0; // Current angular velocity (radians/second)
        this.targetAngularSpeed = 0; // Target angular velocity (0-1 multiplier of base speed)
        this.baseAngularSpeed = 6 * 2 * Math.PI; // Max: 6 rotations/second (37.7 rad/s)

        // Physics calibration (reduced acceleration for better control):
        // - Takes longer to reach max speed for more strategic gameplay
        // - Using θ = ω²/(2α), we get α = ω²/(32π) for 50% slower acceleration
        this.angularAcceleration = Math.pow(this.baseAngularSpeed, 2) / (32 * Math.PI); // ≈14.14 rad/s² (50% slower)
        this.angularDeceleration = this.angularAcceleration * 0.8; // ≈11.31 rad/s² (80% of accel)

        // Escape velocity threshold: ratio of escape speed to max speed
        // Since escape is at 2 rotations and max at 4 rotations: ω_escape = ω_max / √2
        this.escapeThreshold = 1 / Math.sqrt(2); // ≈0.707 (70.7% of max speed)

        // If a planet is provided, place player on it (initial spawn)
        if (planet) {
            this.onPlanet = true;
            this.currentPlanet = planet; // Set current planet for initial spawn
            this.angle = Math.atan2(this.y - planet.y, this.x - planet.x) || 0;
        }
    }

    updateAngularMovement(keys, dt) {
        // dt is already scaled by gameSpeed for time dilation

        // Calculate target speed based on input
        let targetSpeed = 0;

        if (keys.left && keys.right) {
            // Both buttons held: target speed = 0 (braking)
            targetSpeed = 0;
        } else if (keys.left) {
            // Left button: negative max speed
            targetSpeed = -this.baseAngularSpeed;
        } else if (keys.right) {
            // Right button: positive max speed
            targetSpeed = this.baseAngularSpeed;
        } else {
            // No buttons: target speed = 0
            targetSpeed = 0;
        }

        // Apply mobile input target speed (0-1 multiplier)
        if (gameState.mobileInput && gameState.mobileInput.targetSpeed > 0) {
            const mobileDirection = gameState.mobileInput.left ? -1 : 1;
            targetSpeed = mobileDirection * this.baseAngularSpeed * gameState.mobileInput.targetSpeed;
        }

        // Smooth acceleration towards target speed
        const speedDifference = targetSpeed - this.angularSpeed;
        const maxAcceleration = this.angularAcceleration * dt;

        if (Math.abs(speedDifference) < maxAcceleration) {
            // Close enough to target, snap to it
            this.angularSpeed = targetSpeed;
        } else {
            // Accelerate towards target
            const accelerationDirection = Math.sign(speedDifference);
            this.angularSpeed += accelerationDirection * maxAcceleration;
        }

        // Clamp to maximum speed
        this.angularSpeed = Math.max(-this.baseAngularSpeed, Math.min(this.baseAngularSpeed, this.angularSpeed));

        // Update angle based on angular velocity
        this.angle += this.angularSpeed * dt;
    }

    updatePhysics(planets, keys, deltaTime = 16.67) {
        // Convert to seconds and apply time dilation (speed slider)
        const dt = deltaTime * 0.001 * gameState.gameSpeed;

        // === LANDING PHYSICS ===
        if (!this.onPlanet) {
            for (let i = 0; i < planets.length; i++) {
                const planet = planets[i];
                // Land when player circumference touches planet circumference
                const landingDistance = planet.radius + this.radius;

                // Check current position
                const dx = this.x - planet.x;
                const dy = this.y - planet.y;
                const distSquared = dx * dx + dy * dy;
                const landingDistSquared = landingDistance * landingDistance;

                let shouldLand = false;

                // Check if player is touching planet now
                if (distSquared <= landingDistSquared) {
                    shouldLand = true;
                }

                // Check swept collision: did we touch planet this frame? (prevents tunneling)
                if (!shouldLand) {
                    if (lineSegmentIntersectsCircle(
                        this.prevX, this.prevY,
                        this.x, this.y,
                        planet.x, planet.y,
                        landingDistance
                    )) {
                        shouldLand = true;
                    }
                }

                if (shouldLand) {
                    // Land on planet
                    this.onPlanet = true;
                    this.currentPlanet = planet;
                    this.hasJumped = false;
                    this.trail = [];

                    // Track stats
                    if (gameState.stats) {
                        gameState.stats.totalLandings++;
                    }

                    // Landing particle effect
                    const landSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                    const particleCount = Math.min(12, Math.floor(landSpeed / 10) + 4);
                    createParticleBurst(this.x, this.y, particleCount, 'rgba(255, 215, 0, 1)', 80);

                    // Position on surface
                    const surfaceDistance = planet.radius + this.radius;
                    this.angle = Math.atan2(dy, dx);
                    this.x = planet.x + Math.cos(this.angle) * surfaceDistance;
                    this.y = planet.y + Math.sin(this.angle) * surfaceDistance;
                    this.vx = 0;
                    this.vy = 0;
                    this.angularSpeed = 0;
                    break;
                }
            }
        }

        // === ON-PLANET PHYSICS ===
        if (this.onPlanet && this.currentPlanet) {
            // Update angular movement (running around planet)
            this.updateAngularMovement(keys, dt);

            // Keep player on planet surface (performance: calculate once per frame)
            const planet = this.currentPlanet;
            const surfaceDistance = planet.radius + this.radius + 2;
            const cosAngle = Math.cos(this.angle);
            const sinAngle = Math.sin(this.angle);
            this.x = planet.x + cosAngle * surfaceDistance;
            this.y = planet.y + sinAngle * surfaceDistance;
        }
        // === FREE-FALL PHYSICS ===
        else {
            // Calculate gravitational forces from all sources
            let totalForceX = 0;
            let totalForceY = 0;

            for (const planet of planets) {
                const gravity = planet.calculateGravity(this);
                totalForceX += gravity.x;
                totalForceY += gravity.y;
            }

            // Goal gravity
            if (gameState.currentLevel.goal) {
                const goalGravity = gameState.currentLevel.goal.calculateGravity(this);
                totalForceX += goalGravity.x;
                totalForceY += goalGravity.y;
            }

            // Black hole gravity
            if (gameState.currentLevel.blackHoles) {
                for (const blackHole of gameState.currentLevel.blackHoles) {
                    const bhGravity = blackHole.calculateGravity(this);
                    totalForceX += bhGravity.x;
                    totalForceY += bhGravity.y;
                }
            }

            // Apply forces (F = ma, assuming m = 1)
            this.vx += totalForceX * dt;
            this.vy += totalForceY * dt;

            // Update position
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Screen wrapping (this invalidates swept collision for this frame)
            this.screenWrapped = false;
            const oldX = this.x;
            const oldY = this.y;
            wrapScreenPosition(this);

            // If position changed due to wrapping, update prevX/prevY to prevent false swept collisions
            if (this.x !== oldX || this.y !== oldY) {
                this.screenWrapped = true;
                this.prevX = this.x;
                this.prevY = this.y;
            }

            // Trail system
            if (Math.random() < 0.7) {
                this.trail.push({ x: this.x, y: this.y, age: 0 });
                if (this.trail.length > 50) this.trail.shift();
            }
            for (let point of this.trail) {
                point.age += dt;
            }
        }
    }

    jump() {
        if (this.onPlanet && this.currentPlanet) {
            const planet = this.currentPlanet;
            const orbitalRadius = planet.radius + this.radius + 2;

            // JUMP PHYSICS:
            // Convert current angular velocity (rad/s) to linear velocity (pixels/s)
            // v_linear = ω * r
            //
            // Escape velocity for this game is calibrated to be:
            // v_escape ≈ 0.707 * baseAngularSpeed * orbitalRadius (70.7%, reached after 2 rotations)
            //
            // So: < 70.7% speed → orbit back to planet
            //     ≈ 70.7% speed → barely escape
            //     > 70.7% speed → escape cleanly
            const currentLinearVelocity = Math.abs(this.angularSpeed) * orbitalRadius;

            // Launch direction: tangent to the planet surface
            const radialAngle = Math.atan2(this.y - planet.y, this.x - planet.x);
            const directionSign = this.angularSpeed >= 0 ? 1 : -1;
            const tangentialAngle = radialAngle + (Math.PI / 2) * directionSign;

            // Add RADIAL component to push away from planet (prevents clipping at low speeds)
            const minRadialVelocity = 50; // Minimum push away from planet (pixels/s)

            // Set launch velocity: tangential (from running) + radial (push away)
            this.vx = Math.cos(tangentialAngle) * currentLinearVelocity + Math.cos(radialAngle) * minRadialVelocity;
            this.vy = Math.sin(tangentialAngle) * currentLinearVelocity + Math.sin(radialAngle) * minRadialVelocity;

            // Visual feedback
            const speedRatio = Math.abs(this.angularSpeed) / this.baseAngularSpeed;
            const particleCount = Math.floor(8 + speedRatio * 8);
            const particleColor = speedRatio >= this.escapeThreshold ? 'rgba(255, 100, 0, 1)' : 'rgba(100, 200, 255, 1)';
            createParticleBurst(this.x, this.y, particleCount, particleColor, 60);

            // State change
            this.onPlanet = false;
            this.hasJumped = true;
        }
    }

    draw(ctx) {
        // Draw player body with glow effect
        ctx.save();

        // Outer glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, 2 * Math.PI);
        ctx.fill();

        // Main body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();

        if (!this.onPlanet) {
            // Draw velocity vector when in flight
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 10) { // Only show if moving significantly
                const vectorScale = 0.3; // Scale down for visibility
                const endX = this.x + this.vx * vectorScale;
                const endY = this.y + this.vy * vectorScale;

                // Draw velocity line
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw arrowhead
                const arrowSize = 6;
                const angle = Math.atan2(this.vy, this.vx);
                ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowSize * Math.cos(angle - Math.PI / 6),
                    endY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    endX - arrowSize * Math.cos(angle + Math.PI / 6),
                    endY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

// Level class
class Level {
    constructor(planets, startPosition, goalPosition) {
        this.planets = planets;
        this.startPosition = startPosition;
        this.goalPosition = goalPosition;
        this.goalRadius = 20;
        this.blackHoles = [];
        this.seed = 0;
        this.archetype = 'standard'; // Level design pattern

        // Create goal as a gravity-exerting object
        this.goal = {
            x: goalPosition.x,
            y: goalPosition.y,
            radius: this.goalRadius,
            gravityStrength: 0.56, // 0.7 * 0.8 = 0.56 for moderate helpful gravity

            calculateGravity: function(player) {
                const dx = this.x - player.x;
                const dy = this.y - player.y;
                const distSquared = dx * dx + dy * dy;
                const distance = Math.sqrt(distSquared);

                if (distance < this.radius + 5) return { x: 0, y: 0 };

                const forceMagnitude = (this.gravityStrength * GRAVITY_CONSTANT * gameState.gravityMultiplier) / (distSquared + 100);
                const forceX = forceMagnitude * (dx / distance);
                const forceY = forceMagnitude * (dy / distance);

                return { x: forceX, y: forceY };
            }
        };
    }

    static generateLevel(levelNumber) {
        // Seeded random number generator
        let randSeed = levelNumber;
        const random = () => {
            randSeed = (randSeed * 9301 + 49297) % 233280;
            return randSeed / 233280;
        };

        // Determine difficulty tier
        let tier, config;
        if (levelNumber <= 5) {
            tier = 'tutorial';
            config = {
                planetCount: [3, 4],
                sizeRange: [25, 45],
                minSpacing: 120,
                blackHoleCount: 0,
                goalHops: 1,
                archetype: 'simple'
            };
        } else if (levelNumber <= 15) {
            tier = 'easy';
            config = {
                planetCount: [4, 5],
                sizeRange: [20, 55],
                minSpacing: 140,
                blackHoleCount: 0,
                goalHops: random() < 0.5 ? 1 : 2,
                archetype: random() < 0.7 ? 'simple' : 'binary'
            };
        } else if (levelNumber <= 30) {
            tier = 'medium';
            config = {
                planetCount: [5, 6],
                sizeRange: [15, 65],
                minSpacing: 160,
                blackHoleCount: 0,
                goalHops: Math.floor(random() * 2) + 2, // 2-3
                archetype: ['simple', 'binary', 'gauntlet', 'slingshot'][Math.floor(random() * 4)]
            };
        } else if (levelNumber <= 50) {
            tier = 'hard';
            config = {
                planetCount: [6, 7],
                sizeRange: [12, 75],
                minSpacing: 180,
                blackHoleCount: 0,
                goalHops: Math.floor(random() * 2) + 3, // 3-4
                archetype: ['binary', 'gauntlet', 'slingshot', 'void', 'maze'][Math.floor(random() * 5)]
            };
        } else if (levelNumber <= 75) {
            tier = 'expert';
            config = {
                planetCount: [6, 8],
                sizeRange: [10, 85],
                minSpacing: 200,
                blackHoleCount: random() < 0.3 ? 1 : 0, // 30% chance
                goalHops: Math.floor(random() * 2) + 3, // 3-4
                archetype: ['gauntlet', 'void', 'maze', 'giant', 'precision'][Math.floor(random() * 5)]
            };
        } else {
            tier = 'master';
            config = {
                planetCount: [6, 9],
                sizeRange: [8, 90],
                minSpacing: 220,
                blackHoleCount: Math.min(Math.floor(levelNumber / 50), 3), // 1-3 black holes
                goalHops: Math.floor(random() * 3) + 3, // 3-5
                archetype: ['void', 'maze', 'giant', 'precision', 'chaos'][Math.floor(random() * 5)]
            };
        }

        const level = Level._generateByArchetype(levelNumber, config, random);
        level.seed = levelNumber;
        level.archetype = config.archetype;
        return level;
    }

    static _generateByArchetype(levelNumber, config, random) {
        const archetype = config.archetype;

        // Different generation strategies based on archetype
        if (archetype === 'binary') {
            return Level._generateBinarySystem(levelNumber, config, random);
        } else if (archetype === 'gauntlet') {
            return Level._generateGauntlet(levelNumber, config, random);
        } else if (archetype === 'void') {
            return Level._generateVoid(levelNumber, config, random);
        } else if (archetype === 'maze') {
            return Level._generateMaze(levelNumber, config, random);
        } else if (archetype === 'giant') {
            return Level._generateGiant(levelNumber, config, random);
        } else if (archetype === 'precision') {
            return Level._generatePrecision(levelNumber, config, random);
        } else if (archetype === 'slingshot') {
            return Level._generateSlingshot(levelNumber, config, random);
        } else if (archetype === 'chaos') {
            return Level._generateChaos(levelNumber, config, random);
        } else {
            // Default: simple random distribution
            return Level._generateSimple(levelNumber, config, random);
        }
    }

    // Simple random distribution of planets
    static _generateSimple(levelNumber, config, random) {
        const planetCount = config.planetCount[0] + Math.floor(random() * (config.planetCount[1] - config.planetCount[0] + 1));
        const planets = [];

        for (let i = 0; i < planetCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]));
                x = radius + 20 + random() * (CANVAS_WIDTH - 2 * radius - 40);
                y = radius + 20 + random() * (CANVAS_HEIGHT - 2 * radius - 40);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing;
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                const baseRadius = 35;
                const gravityStrength = Math.pow(radius / baseRadius, 3);
                planets.push(new Planet(radius, x, y, gravityStrength));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Binary system: Two large planets close together
    static _generateBinarySystem(levelNumber, config, random) {
        const planets = [];

        // Create binary pair
        const binaryRadius1 = config.sizeRange[1] * 0.7 + random() * config.sizeRange[1] * 0.3;
        const binaryRadius2 = config.sizeRange[1] * 0.6 + random() * config.sizeRange[1] * 0.3;
        const binarySeparation = binaryRadius1 + binaryRadius2 + config.minSpacing * 0.7;

        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        const angle = random() * Math.PI * 2;

        const x1 = centerX + Math.cos(angle) * binarySeparation / 2;
        const y1 = centerY + Math.sin(angle) * binarySeparation / 2;
        const x2 = centerX - Math.cos(angle) * binarySeparation / 2;
        const y2 = centerY - Math.sin(angle) * binarySeparation / 2;

        const baseRadius = 35;
        planets.push(new Planet(binaryRadius1, x1, y1, Math.pow(binaryRadius1 / baseRadius, 3)));
        planets.push(new Planet(binaryRadius2, x2, y2, Math.pow(binaryRadius2 / baseRadius, 3)));

        // Add supporting planets
        const remainingPlanets = config.planetCount[0] - 2 + Math.floor(random() * (config.planetCount[1] - config.planetCount[0]));
        for (let i = 0; i < remainingPlanets; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]) * 0.6);
                x = radius + 20 + random() * (CANVAS_WIDTH - 2 * radius - 40);
                y = radius + 20 + random() * (CANVAS_HEIGHT - 2 * radius - 40);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing;
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Gauntlet: Line of alternating sized planets
    static _generateGauntlet(levelNumber, config, random) {
        const planets = [];
        const planetCount = Math.max(5, config.planetCount[0]);
        const horizontal = random() < 0.5;

        for (let i = 0; i < planetCount; i++) {
            const t = (i + 1) / (planetCount + 1);
            const alternateSize = i % 2 === 0;
            const radius = alternateSize ?
                config.sizeRange[1] * 0.7 :
                config.sizeRange[0] + random() * (config.sizeRange[0] * 0.5);

            const x = horizontal ?
                t * (CANVAS_WIDTH - 100) + 50 :
                CANVAS_WIDTH / 2 + (random() - 0.5) * 200;
            const y = horizontal ?
                CANVAS_HEIGHT / 2 + (random() - 0.5) * 200 :
                t * (CANVAS_HEIGHT - 100) + 50;

            const baseRadius = 35;
            planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Void: Sparse planets, large distances
    static _generateVoid(levelNumber, config, random) {
        const planetCount = Math.max(3, config.planetCount[0] - 1);
        const planets = [];

        for (let i = 0; i < planetCount; i++) {
            let radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]));
            const x = radius + 40 + random() * (CANVAS_WIDTH - 2 * radius - 80);
            const y = radius + 40 + random() * (CANVAS_HEIGHT - 2 * radius - 80);

            const baseRadius = 35;
            planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Maze: Dense cluster of varied sizes
    static _generateMaze(levelNumber, config, random) {
        const planetCount = config.planetCount[1];
        const planets = [];

        for (let i = 0; i < planetCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]));
                x = radius + 20 + random() * (CANVAS_WIDTH - 2 * radius - 40);
                y = radius + 20 + random() * (CANVAS_HEIGHT - 2 * radius - 40);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing * 0.7; // Closer spacing
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                const baseRadius = 35;
                planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Giant: One huge planet dominates
    static _generateGiant(levelNumber, config, random) {
        const planets = [];

        // Create giant planet at center
        const giantRadius = config.sizeRange[1];
        const giantX = CANVAS_WIDTH / 2 + (random() - 0.5) * 100;
        const giantY = CANVAS_HEIGHT / 2 + (random() - 0.5) * 100;
        const baseRadius = 35;
        planets.push(new Planet(giantRadius, giantX, giantY, Math.pow(giantRadius / baseRadius, 3) * 1.5));

        // Add smaller satellites
        const satelliteCount = config.planetCount[0] - 1;
        for (let i = 0; i < satelliteCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[0] * 2));
                x = radius + 20 + random() * (CANVAS_WIDTH - 2 * radius - 40);
                y = radius + 20 + random() * (CANVAS_HEIGHT - 2 * radius - 40);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing;
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Precision: All tiny planets
    static _generatePrecision(levelNumber, config, random) {
        const planetCount = config.planetCount[1];
        const planets = [];
        const tinySize = config.sizeRange[0];

        for (let i = 0; i < planetCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = tinySize + Math.floor(random() * (tinySize * 0.5));
                x = radius + 30 + random() * (CANVAS_WIDTH - 2 * radius - 60);
                y = radius + 30 + random() * (CANVAS_HEIGHT - 2 * radius - 60);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing * 1.2;
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                const baseRadius = 35;
                planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Slingshot: Planets positioned for gravity assists
    static _generateSlingshot(levelNumber, config, random) {
        const planets = [];
        const pathPlanets = 4;

        // Create curved path of planets
        for (let i = 0; i < pathPlanets; i++) {
            const t = i / (pathPlanets - 1);
            const radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]) * 0.7);

            const curveAngle = t * Math.PI;
            const curveRadius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35;
            const x = CANVAS_WIDTH / 2 + Math.cos(curveAngle) * curveRadius;
            const y = CANVAS_HEIGHT / 2 + Math.sin(curveAngle) * curveRadius * 0.5;

            const baseRadius = 35;
            planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3)));
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Chaos: Everything random, maximum variety
    static _generateChaos(levelNumber, config, random) {
        const planetCount = config.planetCount[1];
        const planets = [];

        for (let i = 0; i < planetCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = config.sizeRange[0] + Math.floor(random() * (config.sizeRange[1] - config.sizeRange[0]));
                x = radius + 15 + random() * (CANVAS_WIDTH - 2 * radius - 30);
                y = radius + 15 + random() * (CANVAS_HEIGHT - 2 * radius - 30);

                validPosition = true;
                for (const existing of planets) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = existing.radius + radius + config.minSpacing * 0.8;
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                const baseRadius = 35;
                // Randomize gravity strength ±30%
                const gravityVariance = 0.7 + random() * 0.6;
                planets.push(new Planet(radius, x, y, Math.pow(radius / baseRadius, 3) * gravityVariance));
            }
        }

        return Level._finalizeLevelGeneration(levelNumber, config, random, planets);
    }

    // Finalize level: add start, goal, obstacles, black holes
    static _finalizeLevelGeneration(levelNumber, config, random, planets) {
        if (planets.length === 0) {
            // Fallback: create at least one planet
            planets.push(new Planet(30, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1.0));
        }

        // Start position on first planet
        const startPlanet = planets[0];
        const startAngle = random() * Math.PI * 2;
        const startPosition = {
            x: startPlanet.x + Math.cos(startAngle) * (startPlanet.radius + 15),
            y: startPlanet.y + Math.sin(startAngle) * (startPlanet.radius + 15)
        };

        // Goal position: place it farther based on goalHops
        let goalPlanetIndex = Math.min(config.goalHops, planets.length - 1);
        if (goalPlanetIndex < 0) goalPlanetIndex = planets.length > 1 ? 1 : 0;

        const goalPlanet = planets[goalPlanetIndex];
        const goalAngle = random() * Math.PI * 2;
        const goalDistance = goalPlanet.radius + 40 + random() * 30;

        let goalX = goalPlanet.x + Math.cos(goalAngle) * goalDistance;
        let goalY = goalPlanet.y + Math.sin(goalAngle) * goalDistance;

        // Ensure goal doesn't spawn inside any planet
        let attempts = 0;
        const maxAttempts = 100; // Increased attempts
        const goalRadius = 20; // Goal radius for collision detection
        const minBuffer = 40; // Increased buffer zone

        while (attempts < maxAttempts) {
            let collision = false;
            for (const planet of planets) {
                const dx = goalX - planet.x;
                const dy = goalY - planet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Check if goal center is too close to planet center (planet radius + goal radius + buffer)
                if (distance < planet.radius + goalRadius + minBuffer) {
                    collision = true;
                    break;
                }
            }

            if (!collision) break;

            // Try a new position with more varied distance
            const newAngle = random() * Math.PI * 2;
            const newDistance = goalDistance + (random() - 0.5) * 60; // Vary distance by ±30
            goalX = goalPlanet.x + Math.cos(newAngle) * newDistance;
            goalY = goalPlanet.y + Math.sin(newAngle) * newDistance;
            attempts++;
        }

        // If we still couldn't find a valid position, force it outside
        if (attempts >= maxAttempts) {
            // Place goal far from the planet that would cause collision
            const dx = goalX - goalPlanet.x;
            const dy = goalY - goalPlanet.y;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            if (currentDistance < goalPlanet.radius + goalRadius + minBuffer) {
                const forceDistance = goalPlanet.radius + goalRadius + minBuffer + 20;
                const angle = Math.atan2(dy, dx);
                goalX = goalPlanet.x + Math.cos(angle) * forceDistance;
                goalY = goalPlanet.y + Math.sin(angle) * forceDistance;
            }
        }

        // Clamp goal to screen
        const goalMargin = 30;
        goalX = Math.max(goalRadius + goalMargin, Math.min(CANVAS_WIDTH - goalRadius - goalMargin, goalX));
        goalY = Math.max(goalRadius + goalMargin, Math.min(CANVAS_HEIGHT - goalRadius - goalMargin, goalY));

        const goalPosition = { x: goalX, y: goalY };
        const level = new Level(planets, startPosition, goalPosition);



        // Add black holes
        for (let i = 0; i < config.blackHoleCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let x, y;

            while (!validPosition && attempts < 50) {
                x = 50 + random() * (CANVAS_WIDTH - 100);
                y = 50 + random() * (CANVAS_HEIGHT - 100);

                validPosition = true;

                // Check distance from planets
                for (const planet of planets) {
                    const dx = x - planet.x;
                    const dy = y - planet.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < planet.radius + 80) {
                        validPosition = false;
                        break;
                    }
                }

                // Check distance from goal
                const goalDist = Math.sqrt((x - goalX) ** 2 + (y - goalY) ** 2);
                if (goalDist < 100) validPosition = false;

                // Check distance from start
                const startDist = Math.sqrt((x - startPosition.x) ** 2 + (y - startPosition.y) ** 2);
                if (startDist < 120) validPosition = false;

                // Check distance from other black holes
                for (const bh of level.blackHoles) {
                    const dx = x - bh.x;
                    const dy = y - bh.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        validPosition = false;
                        break;
                    }
                }

                attempts++;
            }

            if (validPosition) {
                level.blackHoles.push(new BlackHole(x, y, 8 + Math.floor(random() * 4)));
            }
        }

        return level;
    }

    checkGoal(player) {
        // SWEPT COLLISION: Check if player's movement path intersects goal circle
        // This prevents tunneling through goal at high speeds

        // First check current position (fast path)
        const dx = player.x - this.goalPosition.x;
        const dy = player.y - this.goalPosition.y;
        const distSquared = dx * dx + dy * dy;
        const goalRadiusSquared = this.goalRadius * this.goalRadius;

        // Goal collision: player just needs to touch the goal circle (not edge)
        if (distSquared <= goalRadiusSquared) {
            return true;
        }

        // Check if movement path crosses through goal
        return lineSegmentIntersectsCircle(
            player.prevX, player.prevY,  // Previous position
            player.x, player.y,          // Current position
            this.goalPosition.x, this.goalPosition.y,
            this.goalRadius              // Goal circle radius (not combined)
        );
    }
}

// Particle Pool for performance optimization
class ParticlePool {
    constructor(initialSize = 100) {
        this.pool = [];
        this.active = [];
        this.initialSize = initialSize;
        this.initializePool();
    }

    initializePool() {
        for (let i = 0; i < this.initialSize; i++) {
            this.pool.push({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: '',
                lifetime: 0,
                maxLifetime: 0,
                radius: 0,
                active: false
            });
        }
    }

    getParticle(x, y, vx, vy, color, lifetime = 1.0) {
        let particle;

        // Try to get from pool first
        if (this.pool.length > 0) {
            particle = this.pool.pop();
        } else {
            // Create new if pool is empty
            particle = {
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: '',
                lifetime: 0,
                maxLifetime: 0,
                radius: 0,
                active: false
            };
        }

        // Initialize particle
        particle.x = x;
        particle.y = y;
        particle.vx = vx;
        particle.vy = vy;
        particle.color = color;
        particle.lifetime = lifetime;
        particle.maxLifetime = lifetime;
        particle.radius = 2 + Math.random() * 2;
        particle.active = true;

        this.active.push(particle);
        return particle;
    }

    update(dt) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const particle = this.active[i];

            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 20 * dt; // Slight gravity effect
            particle.lifetime -= dt;

            // Screen wrapping for particles too
            if (particle.x < 0) particle.x = CANVAS_WIDTH;
            else if (particle.x > CANVAS_WIDTH) particle.x = 0;
            if (particle.y < 0) particle.y = CANVAS_HEIGHT;
            else if (particle.y > CANVAS_HEIGHT) particle.y = 0;

            if (particle.lifetime <= 0) {
                // Return to pool
                particle.active = false;
                this.pool.push(this.active.splice(i, 1)[0]);
            }
        }
    }

    draw(ctx) {
        for (const particle of this.active) {
            const alpha = particle.lifetime / particle.maxLifetime;
            ctx.fillStyle = particle.color.replace('1)', `${alpha})`);
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    createBurst(x, y, count, color, speedRange = 100) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = speedRange * (0.5 + Math.random() * 0.5);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.getParticle(x, y, vx, vy, color, 0.5 + Math.random() * 0.5);
        }
    }

    clear() {
        // Return all active particles to pool
        for (const particle of this.active) {
            particle.active = false;
            this.pool.push(particle);
        }
        this.active = [];
    }

    getActiveCount() {
        return this.active.length;
    }
}
