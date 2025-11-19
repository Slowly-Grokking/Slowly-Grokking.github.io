// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY_CONSTANT = 2778000;

// Forward declarations for gameState (will be initialized in game-main.js)
let gameState = null;

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
function validateGameState(gameState) {
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

// Get daily challenge seed based on current date
function getDailyChallengeSeed() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Create deterministic seed from date
    return year * 10000 + month * 100 + day;
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

// Wrap position around screen edges
function wrapScreenPosition(entity) {
    if (entity.x < 0) entity.x = CANVAS_WIDTH;
    else if (entity.x > CANVAS_WIDTH) entity.x = 0;

    if (entity.y < 0) entity.y = CANVAS_HEIGHT;
    else if (entity.y > CANVAS_HEIGHT) entity.y = 0;
}
