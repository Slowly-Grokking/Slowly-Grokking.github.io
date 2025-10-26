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

        // Mobile/touch input state
        mobileInput: {
            active: false,        // Is mobile input active
            startX: 0,           // Touch/mouse start position
            startY: 0,           // Touch/mouse start position Y
            currentX: 0,         // Current touch/mouse position
            currentY: 0,         // Current touch/mouse position Y
            centerX: 0,          // Joystick center position
            centerY: 0,          // Joystick center position Y
            joystickRadius: 60,  // Joystick visual radius
            deadzone: 10,        // Deadzone for centering
            maxDistance: 50,     // Maximum joystick travel
            left: false,         // Current left input state
            right: false,        // Current right input state
            targetSpeed: 0,      // Target speed based on drag distance (0-1)
            fullScreenMode: true // Allow input anywhere on screen
        },

        // Device orientation detection
        isLandscape: false,
        isMobile: false,

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

    // Get joystick overlay references
    gameState.joystickOverlay = document.getElementById('joystick-overlay');
    gameState.joystickCanvas = document.getElementById('joystick-canvas');
    gameState.joystickCtx = gameState.joystickCanvas.getContext('2d');

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

    // Mobile/touch input event listeners
    setupMobileInput();

    // Fullscreen button event listener
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateFullscreenButton);
        document.addEventListener('mozfullscreenchange', updateFullscreenButton);
        document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
        document.addEventListener('msfullscreenchange', updateFullscreenButton);
    }

    // Menu button event listener for mobile
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', showMobileMenu);
    }

    console.log('Little Prince Gravity Game initialized successfully!');
}

// Setup mobile input system
function setupMobileInput() {
    // Full-screen input mode: listen to entire document
    gameState.mobileInput.fullScreenMode = true;

    if (gameState.mobileInput.fullScreenMode) {
        // Listen to entire document for full-screen input
        document.addEventListener('touchstart', handleMobileStart, { passive: false });
        document.addEventListener('touchmove', handleMobileMove, { passive: false });
        document.addEventListener('touchend', handleMobileEnd, { passive: false });

        // Mouse events for desktop (same behavior as mobile)
        document.addEventListener('mousedown', handleMobileStart);
        document.addEventListener('mousemove', handleMobileMove);
        document.addEventListener('mouseup', handleMobileEnd);

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    } else {
        // Original canvas-only mode
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', handleMobileStart, { passive: false });
        canvas.addEventListener('touchmove', handleMobileMove, { passive: false });
        canvas.addEventListener('touchend', handleMobileEnd, { passive: false });
        canvas.addEventListener('mousedown', handleMobileStart);
        canvas.addEventListener('mousemove', handleMobileMove);
        canvas.addEventListener('mouseup', handleMobileEnd);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}

// Mobile input handlers
function handleMobileStart(event) {
    if (!gameState.gameStarted || gameState.paused) return;

    // Don't handle events on UI buttons
    if (event.target.matches('.game-btn') || event.target.closest('.game-btn')) {
        return;
    }

    event.preventDefault();

    const pageX = event.type.startsWith('touch') ?
        event.touches[0].pageX : event.pageX;
    const pageY = event.type.startsWith('touch') ?
        event.touches[0].pageY : event.pageY;

    // Check if we're in fullscreen mode
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;

    // For fullscreen mode on mobile, use page coordinates directly (they're already screen-relative)
    let clientX, clientY;
    if (isFullscreen) {
        // In fullscreen mode on mobile, page coordinates are relative to the screen
        clientX = Math.max(0, pageX);
        clientY = Math.max(0, pageY);
    } else {
        // Normal mode - account for viewport offset and scrolling
        const rect = document.documentElement.getBoundingClientRect();
        clientX = Math.max(0, pageX - rect.left);
        clientY = Math.max(0, pageY - rect.top);
    }



    if (gameState.mobileInput.fullScreenMode) {
        // Full-screen mode: use screen coordinates directly
        gameState.mobileInput.startX = clientX;
        gameState.mobileInput.startY = clientY;
        gameState.mobileInput.currentX = clientX;
        gameState.mobileInput.currentY = clientY;
        gameState.mobileInput.centerX = clientX;
        gameState.mobileInput.centerY = clientY;
    } else {
        // Canvas-relative mode
        const canvas = gameState.canvas;
        const rect = canvas.getBoundingClientRect();
        gameState.mobileInput.startX = clientX - rect.left;
        gameState.mobileInput.startY = clientY - rect.top;
        gameState.mobileInput.currentX = clientX - rect.left;
        gameState.mobileInput.currentY = clientY - rect.top;
        gameState.mobileInput.centerX = clientX - rect.left;
        gameState.mobileInput.centerY = clientY - rect.top;
    }

    gameState.mobileInput.active = true;

    // Prevent default touch behavior
    if (event.type.startsWith('touch')) {
        event.preventDefault();
    }
}

function handleMobileMove(event) {
    if (!gameState.mobileInput.active || !gameState.gameStarted || gameState.paused) return;

    event.preventDefault();

    const pageX = event.type.startsWith('touch') ?
        event.touches[0].pageX : event.pageX;
    const pageY = event.type.startsWith('touch') ?
        event.touches[0].pageY : event.pageY;

    // Check if we're in fullscreen mode
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;

    // For fullscreen mode on mobile, use page coordinates directly (they're already screen-relative)
    let clientX, clientY;
    if (isFullscreen) {
        // In fullscreen mode on mobile, page coordinates are relative to the screen
        clientX = Math.max(0, pageX);
        clientY = Math.max(0, pageY);
    } else {
        // Normal mode - account for viewport offset and scrolling
        const rect = document.documentElement.getBoundingClientRect();
        clientX = Math.max(0, pageX - rect.left);
        clientY = Math.max(0, pageY - rect.top);
    }

    if (gameState.mobileInput.fullScreenMode) {
        // Full-screen mode: use screen coordinates directly
        gameState.mobileInput.currentX = clientX;
        gameState.mobileInput.currentY = clientY;
    } else {
        // Canvas-relative mode
        const canvas = gameState.canvas;
        const rect = canvas.getBoundingClientRect();
        gameState.mobileInput.currentX = clientX - rect.left;
        gameState.mobileInput.currentY = clientY - rect.top;
    }

    // Prevent default touch behavior
    if (event.type.startsWith('touch')) {
        event.preventDefault();
    }
}

function handleMobileEnd(event) {
    if (!gameState.mobileInput.active) return;

    event.preventDefault();

    // Jump when releasing (if no keyboard input is active)
    const hasKeyboardInput = gameState.keys.left || gameState.keys.right;
    if (!hasKeyboardInput && gameState.player && gameState.player.onPlanet && !gameState.player.hasJumped) {
        gameState.player.jump();
        if (gameState.stats) {
            gameState.stats.totalJumps++;
        }
    }

    gameState.mobileInput.active = false;

    // Prevent default touch behavior
    if (event.type.startsWith('touch')) {
        event.preventDefault();
    }
}

// Handle device orientation changes (no longer automatically entering fullscreen)
function handleOrientationChange() {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    gameState.isLandscape = isLandscape;
    gameState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Update UI for orientation changes
    updateFullscreenButton();
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen: Move joystick overlay into game-container first (following video player overlay pattern)
        const gameContainer = document.getElementById('game-container');
        const joystickOverlay = document.getElementById('joystick-overlay');
        if (joystickOverlay && gameContainer) {
            // Move overlay from body to game-container so it appears in fullscreen
            gameContainer.appendChild(joystickOverlay);
        }

        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.mozRequestFullScreen) { // Firefox
            gameContainer.mozRequestFullScreen();
        } else if (gameContainer.webkitRequestFullscreen) { // Chrome, Safari and Opera
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) { // IE/Edge
            gameContainer.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }
}

// Update fullscreen button based on current state
function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const joystickOverlay = document.getElementById('joystick-overlay');

    if (document.fullscreenElement) {
        // ENTERED FULLSCREEN - overlay already moved during toggleFullscreen
        fullscreenBtn.textContent = '⛶';
        document.body.classList.add('fullscreen-input');
    } else {
        // EXITED FULLSCREEN - move joystick overlay back to body
        const body = document.body;
        if (joystickOverlay && body) {
            // Move overlay back from game-container to body
            body.appendChild(joystickOverlay);
        }

        fullscreenBtn.textContent = '⛶';
        document.body.classList.remove('fullscreen-input');
    }
}

// Initialize when page loads
window.onload = function() {
    init();
    // Setup after a short delay to ensure all scripts have loaded
    setTimeout(setupGame, 100);

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    handleOrientationChange(); // Initial check
};
