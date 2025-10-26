// Initialize game state with proper values
function initializeGameState() {
    gameState = {
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
        gravityMultiplier: 4.2, // Gravity strength multiplier (development slider)
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
}

// Initialize game
function init() {
    // Initialize game state
    initializeGameState();

    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');

    // Validate game state before loading
    validateGameState(gameState);

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

    // Event listeners (will be set up after all modules load)
    // document.addEventListener('keydown', handleInput);
    // document.addEventListener('keyup', handleInput);

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

// Setup functions that require all modules to be loaded
function setupGame() {
    // Set up event listeners now that all functions are available
    document.addEventListener('keydown', handleInput);
    document.addEventListener('keyup', handleInput);

    console.log('Little Prince Gravity Game initialized successfully!');
}

// Initialize when page loads
window.onload = function() {
    init();
    // Setup after a short delay to ensure all scripts have loaded
    setTimeout(setupGame, 100);
};
