/*
 * LITTLE PRINCE GRAVITY GAME - Physics System
 *
 * CORE MECHANICS:
 * - Run around planets to build angular velocity
 * - Press spacebar to launch with current velocity
 * - Navigate between planets using gravity and momentum
 *
 * PHYSICS CALIBRATION:
 * - 2 rotations to reach escape velocity (≈70.7% of max speed)
 * - 4 rotations to reach max speed
 * - Jump below escape velocity: orbital return to planet
 * - Jump at escape velocity: barely escape
 * - Jump above escape velocity: clean escape
 *
 * COLLISION DETECTION:
 * - Planets: Land when player touches planet surface (player.radius + planet.radius)
 * - Goal: Win when player touches anywhere inside goal circle (goal.radius only)
 * - All collisions use SWEPT detection to prevent tunneling at high speeds
 * - Screen wrapping detection: prevX/prevY are reset after wrapping to prevent false collisions
 * - Jump mechanics: Adds radial push velocity to ensure player clears collision radius
 *
 * SPEED SLIDER (Time Dilation):
 * - Only affects how fast game-time passes relative to real-time
 * - All physics relationships remain constant
 * - At 2x: everything happens in half the real time, but same number of rotations to escape
 * - Implementation: scale dt (delta time) uniformly everywhere by gameSpeed
 */

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY_CONSTANT = 2778000;

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
        this.gravityStrength = 4.0; // 4x normal planet gravity - dangerous but escapable
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

// Particle class for visual effects
class Particle {
    constructor(x, y, vx, vy, color, lifetime = 1.0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.radius = 2 + Math.random() * 2;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 20 * dt; // Slight gravity effect
        this.lifetime -= dt;

        // Screen wrapping for particles too
        if (this.x < 0) this.x = CANVAS_WIDTH;
        else if (this.x > CANVAS_WIDTH) this.x = 0;
        if (this.y < 0) this.y = CANVAS_HEIGHT;
        else if (this.y > CANVAS_HEIGHT) this.y = 0;
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.fillStyle = this.color.replace('1)', `${alpha})`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * alpha, 0, 2 * Math.PI);
        ctx.fill();
    }

    isDead() {
        return this.lifetime <= 0;
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
        this.baseAngularSpeed = 6 * 2 * Math.PI; // Max: 6 rotations/second (37.7 rad/s)

        // Physics calibration:
        // - Takes 4 rotations (8π radians) to reach max speed
        // - Takes 2 rotations (4π radians) to reach escape velocity
        // Using θ = ω²/(2α), we get α = ω²/(16π)
        this.angularAcceleration = Math.pow(this.baseAngularSpeed, 2) / (16 * Math.PI); // ≈28.27 rad/s²
        this.angularDeceleration = this.angularAcceleration * 0.6; // ≈16.96 rad/s² (60% of accel)

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

        // Handle acceleration/deceleration based on input
        if (keys.left) {
            this.angularSpeed = Math.max(
                this.angularSpeed - this.angularAcceleration * dt,
                -this.baseAngularSpeed
            );
        } else if (keys.right) {
            this.angularSpeed = Math.min(
                this.angularSpeed + this.angularAcceleration * dt,
                this.baseAngularSpeed
            );
        } else {
            // Decelerate when not pressing keys (friction)
            const decel = this.angularDeceleration * dt;
            if (Math.abs(this.angularSpeed) < decel) {
                this.angularSpeed = 0; // Stop if very slow
            } else {
                this.angularSpeed -= Math.sign(this.angularSpeed) * decel;
            }
        }

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

        // Draw speed indicator when on planet
        if (this.onPlanet && this.currentPlanet) {
            const speedRatio = Math.abs(this.angularSpeed) / this.baseAngularSpeed;
            const escapeThreshold = this.escapeThreshold; // ≈70.7% of max speed (2 rotations)

            // Position indicator near player
            const indicatorAngle = this.angle + Math.PI / 2;
            const indicatorDist = this.radius + 15;
            const indicatorX = this.x + Math.cos(indicatorAngle) * indicatorDist;
            const indicatorY = this.y + Math.sin(indicatorAngle) * indicatorDist;

            // Draw speed bar background
            const barWidth = 40;
            const barHeight = 6;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(indicatorX - barWidth / 2, indicatorY - barHeight / 2, barWidth, barHeight);

            // Draw speed bar fill (changes color approaching escape velocity)
            const fillWidth = barWidth * speedRatio;
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
            ctx.fillRect(indicatorX - barWidth / 2, indicatorY - barHeight / 2, fillWidth, barHeight);

            // Draw escape velocity marker
            const escapeX = indicatorX - barWidth / 2 + barWidth * escapeThreshold;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(escapeX, indicatorY - barHeight / 2 - 3);
            ctx.lineTo(escapeX, indicatorY + barHeight / 2 + 3);
            ctx.stroke();
        } else if (!this.onPlanet) {
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
                obstacleCount: [0, 0],
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
                obstacleCount: [0, 2],
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
                obstacleCount: [2, 4],
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
                obstacleCount: [3, 5],
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
                obstacleCount: [4, 6],
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
                obstacleCount: [5, 8],
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

        // Clamp goal to screen
        const goalMargin = 30;
        const goalRadius = 20;
        goalX = Math.max(goalRadius + goalMargin, Math.min(CANVAS_WIDTH - goalRadius - goalMargin, goalX));
        goalY = Math.max(goalRadius + goalMargin, Math.min(CANVAS_HEIGHT - goalRadius - goalMargin, goalY));

        const goalPosition = { x: goalX, y: goalY };
        const level = new Level(planets, startPosition, goalPosition);

        // NOTE: Obstacles have been removed from the game

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

// Game state
let gameState = {
    // Core game state
    currentLevel: null,
    player: null,
    gameStarted: false,
    canvas: null,
    ctx: null,
    keys: { left: false, right: false },

    // Game mode system
    mode: 'endless', // 'endless', 'speedrun', 'daily', 'practice'
    speedrunTarget: 10, // 10, 25, or 100 levels
    currentLevelNumber: 1, // Actual level number (sequential for speedrun/daily)

    // Scoring and progression
    score: 0, // Calculated based on mode
    levelsCompleted: 0, // Number of levels beaten in this session
    deaths: 0, // Death count (for speedrun tiebreaker)
    lives: 3, // Current lives (endless mode only, speedrun has infinite)

    // Timing
    startTime: 0, // Game start timestamp
    currentTime: 0, // Current elapsed time in ms
    lastFrameTime: 0, // For delta time calculations
    deltaTime: 16.67, // Default 60 FPS delta time in ms

    // High scores and leaderboards
    highScore: 0, // Endless mode high score
    speedrunRecords: {
        '10': { time: Infinity, deaths: Infinity, deathlessTime: Infinity },
        '25': { time: Infinity, deaths: Infinity, deathlessTime: Infinity },
        '100': { time: Infinity, deaths: Infinity, deathlessTime: Infinity }
    },
    dailyBestScore: 0,

    // Settings
    gameSpeed: 1.0, // Time dilation factor (speed slider)
    gravityMultiplier: 2.0, // Gravity strength multiplier (development slider)
    visualEffects: true, // Toggle for effects

    // Visual effects (now using particle pool)
    particlePool: null,
    screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },
    slowMo: { active: false, duration: 0, targetSpeed: 0.3 },

    // UI state
    showMenu: true,
    paused: false,
    showCompletion: false,
    showLeaderboard: false,
    showStats: false,
    showSettings: false,
    showHowToPlay: false,

    // Statistics (persistent)
    stats: {
        totalDeaths: 0,
        totalLevelsCompleted: 0,
        totalTimePlayed: 0,
        totalJumps: 0,
        totalLandings: 0,
        blackHolesSurvived: 0,
        longestStreak: 0,
        fastestLevelClear: Infinity,
        achievements: []
    }
};

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

// Get daily challenge seed based on current date
function getDailyChallengeSeed() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Create deterministic seed from date
    return year * 10000 + month * 100 + day;
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

// Safe localStorage operations with error handling
function safeGetLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
        return defaultValue;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
    }
}

// Validate and sanitize game state
function validateGameState() {
    // Ensure required properties exist with valid values
    if (typeof gameState.gameSpeed !== 'number' || gameState.gameSpeed < 0.1 || gameState.gameSpeed > 5.0) {
        gameState.gameSpeed = 1.0;
    }
    if (typeof gameState.gravityMultiplier !== 'number' || gameState.gravityMultiplier < 0.1 || gameState.gravityMultiplier > 10.0) {
        gameState.gravityMultiplier = 2.0;
    }
    if (typeof gameState.lives !== 'number' || gameState.lives < 0) {
        gameState.lives = 3;
    }
    if (!gameState.stats || typeof gameState.stats !== 'object') {
        gameState.stats = {
            totalDeaths: 0,
            totalLevelsCompleted: 0,
            totalTimePlayed: 0,
            totalJumps: 0,
            totalLandings: 0,
            blackHolesSurvived: 0,
            longestStreak: 0,
            achievements: []
        };
    }
}

// Initialize game
function init() {
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');

    // Validate game state before loading
    validateGameState();

    // Load high score with error handling
    gameState.highScore = safeGetLocalStorage('littlePrinceHighScore', 0);
    if (typeof gameState.highScore !== 'number') gameState.highScore = 0;
    document.getElementById('high-score').textContent = `High Score: ${gameState.highScore}`;

    // Load speedrun records with error handling
    gameState.speedrunRecords = safeGetLocalStorage('littlePrinceSpeedrun', {
        '10': { time: Infinity, deaths: Infinity, deathlessTime: Infinity },
        '25': { time: Infinity, deaths: Infinity, deathlessTime: Infinity },
        '100': { time: Infinity, deaths: Infinity, deathlessTime: Infinity }
    });

    // Load stats with error handling
    gameState.stats = safeGetLocalStorage('littlePrinceStats', {
        totalDeaths: 0,
        totalLevelsCompleted: 0,
        totalTimePlayed: 0,
        totalJumps: 0,
        totalLandings: 0,
        blackHolesSurvived: 0,
        longestStreak: 0,
        achievements: []
    });

    // Load visual effects preference
    gameState.visualEffects = safeGetLocalStorage('littlePrinceVisualEffects', true);
    if (typeof gameState.visualEffects !== 'boolean') gameState.visualEffects = true;

    // Initialize particle pool for performance
    gameState.particlePool = new ParticlePool(100);

    // Initial level (will be replaced when game starts)
    gameState.currentLevel = Level.generateLevel(1);
    gameState.player = new Player(
        gameState.currentLevel.startPosition.x,
        gameState.currentLevel.startPosition.y,
        gameState.currentLevel.planets[0]
    );
    gameState.gameStarted = false; // Don't start automatically

    // Show main menu on load
    showMainMenu();

    // Event listeners
    document.addEventListener('keydown', handleInput);
    document.addEventListener('keyup', handleInput);

    // Settings event listener for visual effects toggle
    const effectsToggle = document.getElementById('effects-toggle');
    if (effectsToggle) {
        effectsToggle.addEventListener('change', function(e) {
            gameState.visualEffects = e.target.checked;
            safeSetLocalStorage('littlePrinceVisualEffects', e.target.checked);
        });

        // Load saved preference with error handling
        const savedEffects = safeGetLocalStorage('littlePrinceVisualEffects', true);
        gameState.visualEffects = savedEffects;
        effectsToggle.checked = gameState.visualEffects;
    }

    // Speed slider event listener
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');

    speedSlider.addEventListener('input', function(e) {
        const newSpeed = parseFloat(e.target.value);
        gameState.gameSpeed = newSpeed;
        speedValue.textContent = newSpeed.toFixed(1) + 'x';
    });

    speedSlider.value = gameState.gameSpeed;
    speedValue.textContent = gameState.gameSpeed.toFixed(1) + 'x';

    // Gravity slider event listener
    const gravitySlider = document.getElementById('gravity-slider');
    const gravityValue = document.getElementById('gravity-value');

    gravitySlider.addEventListener('input', function(e) {
        const newGravity = parseFloat(e.target.value);
        gameState.gravityMultiplier = newGravity;
        gravityValue.textContent = newGravity.toFixed(1) + 'x';
    });

    gravitySlider.value = gameState.gravityMultiplier;
    gravityValue.textContent = gameState.gravityMultiplier.toFixed(1) + 'x';

    // Start game loop
    gameLoop(performance.now());
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
    if (!gameState.gameStarted || gameState.paused) return;

    // Update timer (real-world time, not affected by game speed)
    gameState.currentTime = performance.now() - gameState.startTime;
    updateTimerDisplay();

    // Store previous position BEFORE physics update for swept collision detection
    gameState.player.prevX = gameState.player.x;
    gameState.player.prevY = gameState.player.y;

    gameState.player.updatePhysics(gameState.currentLevel.planets, gameState.keys, deltaTime);

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

    // NOTE: Obstacles have been removed from the game

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

    // NOTE: Obstacles have been removed from the game

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

// Wrap position around screen edges
function wrapScreenPosition(entity) {
    if (entity.x < 0) entity.x = CANVAS_WIDTH;
    else if (entity.x > CANVAS_WIDTH) entity.x = 0;

    if (entity.y < 0) entity.y = CANVAS_HEIGHT;
    else if (entity.y > CANVAS_HEIGHT) entity.y = 0;
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
    if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
    }

    if (event.code === 'Space') {
        if (isKeyDown) {
            if (gameState.gameStarted && gameState.player.onPlanet && !gameState.player.hasJumped) {
                // Jump from planet (only if haven't already jumped)
                gameState.player.jump();
                gameState.stats.totalJumps++;
            }
        }
    } else if (event.code === 'ArrowLeft') {
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
        gameState.particlePool.clear(); // Clear particles using pool
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

// Swept collision detection: line segment vs circle
// Prevents tunneling through objects at high speeds
function lineSegmentIntersectsCircle(x1, y1, x2, y2, cx, cy, radius) {
    // Vector from start to end of movement
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    // If no movement, just check point-circle collision
    if (lengthSquared === 0) {
        const distSquared = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy);
        return distSquared <= radius * radius;
    }

    // Vector from line start to circle center
    const fx = x1 - cx;
    const fy = y1 - cy;

    // Solve quadratic: at² + bt + c = 0
    // Where t is the parameter along the line segment [0,1]
    const a = lengthSquared;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;

    const discriminant = b * b - 4 * a * c;

    // No intersection
    if (discriminant < 0) {
        return false;
    }

    // Calculate intersection points
    const sqrt_discriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrt_discriminant) / (2 * a);
    const t2 = (-b + sqrt_discriminant) / (2 * a);

    // Check if either intersection is within the line segment [0,1]
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

// Menu Navigation Functions
function showMainMenu() {
    hideAllMenus();
    document.getElementById('main-menu').classList.remove('hidden');
    gameState.paused = false;
    gameState.gameStarted = false;

    // Update high score display
    document.getElementById('menu-high-score').textContent = gameState.highScore;
}

function showModeSelect() {
    hideAllMenus();
    document.getElementById('mode-select').classList.remove('hidden');

    // Update mode records
    document.getElementById('endless-record').textContent = gameState.highScore;
    const dailyKey = `littlePrinceDaily_${getDailyChallengeSeed()}`;
    const dailyScore = safeGetLocalStorage(dailyKey, '0');
    document.getElementById('daily-record').textContent = dailyScore;
}

function showSpeedrunSelect() {
    hideAllMenus();
    document.getElementById('speedrun-select').classList.remove('hidden');

    // Update speedrun records
    const formatTime = (ms) => {
        if (ms === Infinity) return '--:--';
        const totalSeconds = ms / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(1);
        return `${minutes}:${seconds.padStart(4, '0')}`;
    };

    document.getElementById('speedrun-10-time').textContent = formatTime(gameState.speedrunRecords['10'].time);
    document.getElementById('speedrun-10-deaths').textContent = gameState.speedrunRecords['10'].deaths === Infinity ? '0' : gameState.speedrunRecords['10'].deaths;
    document.getElementById('speedrun-25-time').textContent = formatTime(gameState.speedrunRecords['25'].time);
    document.getElementById('speedrun-25-deaths').textContent = gameState.speedrunRecords['25'].deaths === Infinity ? '0' : gameState.speedrunRecords['25'].deaths;
    document.getElementById('speedrun-100-time').textContent = formatTime(gameState.speedrunRecords['100'].time);
    document.getElementById('speedrun-100-deaths').textContent = gameState.speedrunRecords['100'].deaths === Infinity ? '0' : gameState.speedrunRecords['100'].deaths;
}

function showStats() {
    const wasInGame = gameState.gameStarted;
    hideAllMenus();
    document.getElementById('stats-screen').classList.remove('hidden');

    // Update stats display
    document.getElementById('stat-levels').textContent = gameState.stats.totalLevelsCompleted;
    document.getElementById('stat-deaths').textContent = gameState.stats.totalDeaths;
    document.getElementById('stat-jumps').textContent = gameState.stats.totalJumps;
    document.getElementById('stat-landings').textContent = gameState.stats.totalLandings;
    document.getElementById('stat-streak').textContent = gameState.stats.longestStreak;

    const totalHours = Math.floor(gameState.stats.totalTimePlayed / 3600000);
    const totalMins = Math.floor((gameState.stats.totalTimePlayed % 3600000) / 60000);
    document.getElementById('stat-time').textContent = `${totalHours}h ${totalMins}m`;

    if (wasInGame) {
        gameState.paused = true;
    }
}

function hideStats() {
    if (gameState.gameStarted) {
        hideAllMenus();
        document.getElementById('pause-menu').classList.remove('hidden');
    } else {
        showMainMenu();
    }
}

function showSettings() {
    const wasInGame = gameState.gameStarted;
    hideAllMenus();
    document.getElementById('settings-screen').classList.remove('hidden');

    // Sync settings with current state
    document.getElementById('effects-toggle').checked = gameState.visualEffects;

    if (wasInGame) {
        gameState.paused = true;
    }
}

function hideSettings() {
    if (gameState.gameStarted) {
        hideAllMenus();
        document.getElementById('pause-menu').classList.remove('hidden');
    } else {
        showMainMenu();
    }
}

function showHowToPlay() {
    hideAllMenus();
    document.getElementById('howto-screen').classList.remove('hidden');
}

function hideHowToPlay() {
    showMainMenu();
}

function hideAllMenus() {
    document.querySelectorAll('.menu-overlay').forEach(menu => {
        menu.classList.add('hidden');
    });
}

// Game Control Functions
function selectMode(mode, target = null) {
    hideAllMenus();
    startGame(mode, target);
}

function resumeGame() {
    hideAllMenus();
    gameState.paused = false;
}

function restartLevel() {
    hideAllMenus();
    gameState.paused = false;

    // Reset to current level
    gameState.currentLevel = Level.generateLevel(gameState.currentLevelNumber);
    gameState.player = new Player(
        gameState.currentLevel.startPosition.x,
        gameState.currentLevel.startPosition.y,
        gameState.currentLevel.planets[0]
    );
    gameState.particlePool.clear();
}

function quitToMenu() {
    // Save total time played
    if (gameState.gameStarted) {
        gameState.stats.totalTimePlayed += gameState.currentTime;
        safeSetLocalStorage('littlePrinceStats', gameState.stats);
    }

    gameState.gameStarted = false;
    gameState.paused = false;
    showMainMenu();
}

function playAgain() {
    hideAllMenus();
    const lastMode = gameState.mode;
    const lastTarget = gameState.speedrunTarget;
    startGame(lastMode, lastTarget);
}

// Show completion screen
function showCompletionScreen() {
    hideAllMenus();
    document.getElementById('completion-screen').classList.remove('hidden');

    // Update completion stats
    if (gameState.mode === 'speedrun') {
        document.getElementById('completion-title').textContent = 'Speedrun Complete!';
    } else if (gameState.mode === 'daily') {
        document.getElementById('completion-title').textContent = 'Daily Challenge Complete!';
    } else {
        document.getElementById('completion-title').textContent = 'Game Over';
    }

    document.getElementById('final-levels').textContent = gameState.levelsCompleted;

    const totalSeconds = gameState.currentTime / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    document.getElementById('final-time').textContent = `${minutes}:${seconds.padStart(4, '0')}`;

    document.getElementById('final-deaths').textContent = gameState.deaths;
    document.getElementById('final-score').textContent = gameState.score;
}

// Initialize when page loads
window.onload = init;
