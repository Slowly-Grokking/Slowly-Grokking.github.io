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

// Mobile menu function - shows pause menu or main menu based on game state
function showMobileMenu() {
    if (gameState.gameStarted) {
        // In game - show pause menu
        hideAllMenus();
        document.getElementById('pause-menu').classList.remove('hidden');
        gameState.paused = true;
    } else {
        // Not in game - show main menu (if hidden)
        showMainMenu();
    }
}

function hideHowToPlay() {
    showMainMenu();
}

function showPracticeSelect() {
    hideAllMenus();
    document.getElementById('practice-select').classList.remove('hidden');
}

function setLevel(level) {
    document.getElementById('level-input').value = level;
}

function startPracticeMode() {
    const level = Math.max(1, parseInt(document.getElementById('level-input').value) || 1);
    selectMode('practice', level);
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
