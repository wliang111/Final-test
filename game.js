// Get the canvas and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const GRID_SIZE = 8; // Size of one pixel unit
const MOVE_SPEED = 4;
const DASH_SPEED = 8; // Dash speed is twice the normal move speed
const DASH_DURATION = 10; // How many frames the dash lasts
const DASH_COOLDOWN = 30; // Cooldown frames between dashes

// Game state-default with intital values
const gameState = {
    isInsideTrain: false,
    isInsideTrain2: false, // NEW: inside train 2 (puzzle)
    transitionAlpha: 0,
    isTransitioning: false,
    headDirection: 'center', // 'left', 'right', 'up', 'down', 'center'
    leftImageOpacity: 0,
    bottomImageOpacity: 0,
    rightImageOpacity: 0,
    upImageOpacity: 0,
    showDepartureWindow: false,
    departureWindowTimer: 0,
    countdownTimer: 0,
    isCountingDown: false,
    train2EntryWindow: false,
    showDialogue: false,
    showBlackOverlay: false,
    train3Countdown: 0,
    train3Entered: false
};

// Add after the gameState object
const dayNightCycle = {
    time: 0,
    moonX: Math.random() * 300 + 50,
    buildingHeights: Array(60).fill(0).map(() => Math.random() * 280 + 20),
    buildingWidth: 40,
    totalWidth: window.innerWidth * 3
};

// Character
const character = {
    x: 100,
    y: 200,
    width: GRID_SIZE * 4,
    height: GRID_SIZE * 6,
    velocityX: 0,
    facingRight: true,
    isDashing: false,
    dashCooldown: 0,
    dashFramesLeft: 0
};

// Platform (positioned at 3/4 of the height)
const platform = {
    x: 0,
    y: window.innerHeight * 0.75,
    width: window.innerWidth * 3, // Platform is 3 screens wide
    height: 50
};

// Train settings
const trains = [
    {
        x: window.innerWidth * 0.1,
        y: platform.y - 70,
        width: window.innerWidth * 0.8,
        height: 60,
        carriages: 6,
        color: '#3F51B5', // Indigo
        trackNumber: 1,
        door: {
            carriageIndex: 2,
            x: 0, // Will be calculated
            y: 0, // Will be calculated
            width: 30,
            height: 40,
            isHighlighted: false
        },
        interior: {
            floorY: 0 // Will be calculated
        }
    },
    {
        x: window.innerWidth * 1.2,
        y: platform.y - 70,
        width: window.innerWidth * 0.7,
        height: 60,
        carriages: 5,
        color: '#E53935', // Red
        trackNumber: 2,
        door: {
            carriageIndex: 2,
            x: 0, // Will be calculated
            y: 0, // Will be calculated
            width: 30,
            height: 40,
            isHighlighted: false,
            isLocked: false
        }
    },
    {
        x: window.innerWidth * 2.3,
        y: platform.y - 70,
        width: window.innerWidth * 0.6,
        height: 60,
        carriages: 4,
        color: '#43A047', // Green
        trackNumber: 3
    }
];

// Add after the gameState object
const npc = {
    x: window.innerWidth * 0.6,
    y: 0,
    width: GRID_SIZE * 4.6,
    height: GRID_SIZE * 6.9,
    isVisible: false,
    dialogue: {
        isActive: false,
        currentLine: 0,
        isComplete: false,
        lines: [
            { speaker: "NPC", text: "Child, you missed the train?" },
            { speaker: "You", text: "...I guess...yes..." },
            { speaker: "NPC", text: "Your parents bought you another ticket, do you want to catch again?" },
            { speaker: "You", text: "...I will...seems like no other choice for me." }
        ],
        finalLine: { speaker: "NPC", text: "Be respectful, I never repeat" }
    }
};

// Add NPC interaction distance constant
const NPC_INTERACTION_DISTANCE = 100; // Distance in pixels for NPC interaction

// Preload puzzle image
const puzzleImg = new Image();
puzzleImg.src = 'puzzle.png';

// Load smoke.png for smoke effect
const smokeImg = new Image();
smokeImg.src = 'smoke.png';

// Irregular smoke effect for train2 scene
let smokeCanvas = null;
let smokeCtx = null;
const SMOKE_CLEAR_RADIUS = 50;
const SMOKE_FADE_STEP = 0.15; // How much to fade per mouse move
const SMOKE_BLOBS = 80; // Number of smoke blobs

function initSmokeMask() {
    smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = canvas.width;
    smokeCanvas.height = canvas.height;
    smokeCtx = smokeCanvas.getContext('2d');
    smokeCtx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);
    // Wait for smokeImg to load
    if (!smokeImg.complete) {
        smokeImg.onload = () => initSmokeMask();
        return;
    }
    for (let i = 0; i < SMOKE_BLOBS; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const scale = 0.5 + Math.random() * 1.2; // Random scale for variety
        const w = smokeImg.width * scale;
        const h = smokeImg.height * scale;
        const alpha = 0.7 + Math.random() * 0.3; // 0.7-1.0
        smokeCtx.globalAlpha = alpha;
        smokeCtx.drawImage(smokeImg, x - w/2, y - h/2, w, h);
    }
    smokeCtx.globalAlpha = 1;
}

function drawSmokeMask() {
    if (!smokeCanvas) return;
    ctx.drawImage(smokeCanvas, 0, 0);
}

canvas.addEventListener('mousemove', function(e) {
    if (!gameState.isInsideTrain2 || !smokeCanvas) return;
    // Mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Erase smoke in a circle under the mouse
    smokeCtx.save();
    smokeCtx.globalCompositeOperation = 'destination-out';
    const grad = smokeCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, SMOKE_CLEAR_RADIUS);
    grad.addColorStop(0, `rgba(0,0,0,${SMOKE_FADE_STEP})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    smokeCtx.fillStyle = grad;
    smokeCtx.beginPath();
    smokeCtx.arc(mouseX, mouseY, SMOKE_CLEAR_RADIUS, 0, Math.PI * 2);
    smokeCtx.fill();
    smokeCtx.restore();
});

// Calculate door positions for trains
function updateDoorPosition() {
    trains.forEach(train => {
        if (train.door) {
            const carriageWidth = train.width / train.carriages;
            train.door.x = train.x + train.door.carriageIndex * carriageWidth + carriageWidth / 2 - train.door.width / 2;
            train.door.y = train.y + train.height - train.door.height;
            if (train.interior) {
                train.interior.floorY = train.y + train.height - 5;
            }
        }
    });
}

// Track signs (one for each train)
const trackSigns = [
    {
        x: window.innerWidth * 0.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 1
    },
    {
        x: window.innerWidth * 1.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 2
    },
    {
        x: window.innerWidth * 2.5,
        y: platform.y - 100,
        width: 60,
        height: 40,
        number: 3
    }
];

// Camera/viewport
const camera = {
    x: 0,
    width: window.innerWidth
};

// Set canvas dimensions to match window size
function resizeCanvas() {
    // Update canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Calculate common values
    const platformY = canvas.height * 0.75;
    const platformWidth = window.innerWidth * 3;
    
    // Update platform
    platform.y = platformY;
    platform.width = platformWidth;
    
    // Update trains using array mapping
    const trainConfigs = [
        { x: 0.1, width: 0.8, carriages: 6 },
        { x: 1.2, width: 0.7, carriages: 5 },
        { x: 2.3, width: 0.6, carriages: 4 }
    ];
    
    trains.forEach((train, index) => {
        const config = trainConfigs[index];
        train.y = platformY - 70;
        train.x = window.innerWidth * config.x;
        train.width = window.innerWidth * config.width;
    });
    
    // Update track signs using array mapping
    trackSigns.forEach((sign, index) => {
        sign.y = platformY - 100;
        sign.x = window.innerWidth * (0.5 + index);
    });
    
    // Update camera
    camera.width = window.innerWidth;
    
    // Update character position
    if (!gameState.isInsideTrain) {
        character.y = platformY - character.height;
        // Keep character within bounds
        character.x = Math.min(character.x, platformWidth - character.width);
    }
    
    // Update door positions
    updateDoorPosition();
}

// Initialize canvas size
resizeCanvas();
updateDoorPosition();

// Add event listener for window resize
window.addEventListener('resize', resizeCanvas);

// Controls
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    dash: false
};

// Event listeners for keyboard controls
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (gameState.isInsideTrain && !gameState.isTransitioning) {
            startTransition(false);
        } else if (gameState.isInsideTrain2) {
            // Exit puzzle screen
            gameState.isInsideTrain2 = false;
            // Place character outside train 2 door
            character.x = trains[1].door.x;
            character.y = platform.y - character.height;
            gameState.isTransitioning = false;
            gameState.isInsideTrain = false;
            smokeCanvas = null; // Reset smoke for next entry
            smokeCtx = null;
        }
    }
    
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'left';
            }
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'right';
            }
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'up';
            } else if (npc.isVisible && !gameState.isInsideTrain) {
                // Calculate distance between character and NPC
                const characterCenterX = character.x + character.width / 2;
                const npcCenterX = npc.x + npc.width / 2;
                const distance = Math.abs(characterCenterX - npcCenterX);
                
                // Only show dialogue if player is close enough
                if (distance <= NPC_INTERACTION_DISTANCE) {
                    if (!gameState.showDialogue) {
                        // Start new dialogue
                        gameState.showDialogue = true;
                        if (npc.dialogue.isComplete) {
                            // Show final line if conversation is complete
                            npc.dialogue.currentLine = -1; // Special state for final line
                        } else {
                            npc.dialogue.currentLine = 0;
                        }
                    } else {
                        if (npc.dialogue.currentLine === -1) {
                            // End dialogue after showing final line
                            gameState.showDialogue = false;
                        } else {
                            // Move to next line
                            npc.dialogue.currentLine++;
                            if (npc.dialogue.currentLine >= npc.dialogue.lines.length) {
                                // End dialogue and mark as complete
                                gameState.showDialogue = false;
                                npc.dialogue.isComplete = true;
                                
                                // Check if we just finished the specific line
                                if (npc.dialogue.lines[npc.dialogue.currentLine - 1].text === "...I will...seems like no other choice for me.") {
                                    // Start new countdown
                                    gameState.isCountingDown = true;
                                    gameState.countdownTimer = 600; // 10 seconds
                                    gameState.train2EntryWindow = true;
                                    trains[1].door.isLocked = false;
                                    // Ensure modal states are reset so puzzle scene can render
                                    gameState.showDialogue = false;
                                    gameState.isTransitioning = false;
                                }
                            }
                        }
                    }
                }
            } else {
                checkDoorInteraction();
            }
            break;
        case 'ArrowDown':
        case 's':
            keys.down = true;
            if (gameState.isInsideTrain) {
                gameState.headDirection = 'down';
            }
            break;
        case 'Shift':
            if (character.dashCooldown === 0 && !gameState.isInsideTrain) {
                keys.dash = true;
                character.isDashing = true;
                character.dashFramesLeft = DASH_DURATION;
                character.dashCooldown = DASH_COOLDOWN;
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'left') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'right') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'up') {
                gameState.headDirection = 'center';
            }
            break;
        case 'ArrowDown':
        case 's':
            keys.down = false;
            if (gameState.isInsideTrain && gameState.headDirection === 'down') {
                gameState.headDirection = 'center';
            }
            break;
    }
});

// Check if the character is near the door and can interact with it
function checkDoorInteraction() {
    if (gameState.isTransitioning) return;

    const characterCenterX = character.x + character.width / 2;

    // Check train 1 door
    const train1 = trains[0];
    const doorX1 = train1.door.x;
    const doorWidth1 = train1.door.width;
    const isNearDoor1 = Math.abs(characterCenterX - (doorX1 + doorWidth1 / 2)) < 30;
    if (isNearDoor1 && (gameState.isCountingDown || gameState.train3Countdown > 0)) {
        console.log('Attempting to enter Train 1');
        startTransition(true); // Enter insideTrain
        return;
    }

    // Check train 2 door
    const train2 = trains[1];
    const doorX2 = train2.door.x;
    const doorWidth2 = train2.door.width;
    const isNearDoor2 = Math.abs(characterCenterX - (doorX2 + doorWidth2 / 2)) < 30;
    if (isNearDoor2 && (gameState.isCountingDown || gameState.train3Countdown > 0)) {
        console.log('Attempting to enter Train 2 (puzzle)');
        gameState.isInsideTrain2 = true;
        gameState.isTransitioning = false;
        gameState.isInsideTrain = false;
        smokeCanvas = null;
        smokeCtx = null;
        return;
    }

    // Check train 3 door
    const train3 = trains[2];
    if (train3.door) {
        const doorX3 = train3.door.x;
        const doorWidth3 = train3.door.width;
        const isNearDoor3 = Math.abs(characterCenterX - (doorX3 + doorWidth3 / 2)) < 30;
        if (isNearDoor3 && (gameState.isCountingDown || gameState.train3Countdown > 0)) {
            console.log('Attempting to enter Train 3');
            gameState.train3Entered = true;
            gameState.train3Countdown = 0;
            gameState.showBlackOverlay = false;
            // Add your train 3 scene logic here
            return;
        }
    }
}

// Start transition between inside/outside train
function startTransition(enteringTrain) {
    gameState.isTransitioning = true;
    
    // Reset head direction when transitioning
    if (enteringTrain) {
        gameState.headDirection = 'center';
    } else {
        // Show departure window when exiting train
        gameState.showDepartureWindow = true;
        gameState.departureWindowTimer = 300; // 5 seconds
        gameState.countdownTimer = 600; // 10 seconds
        gameState.isCountingDown = true;
        gameState.train2EntryWindow = true;
    }
    
    // Change state immediately
    gameState.isInsideTrain = enteringTrain;
    gameState.isInsideTrain2 = false; // Always leave puzzle mode when using this
    
    // If entering train, position character inside
    if (enteringTrain) {
        character.x = window.innerWidth / 2 - character.width / 2;
        character.y = trains[0].interior.floorY - character.height;
    } else {
        // If exiting, position character outside door
        character.x = trains[0].door.x;
        character.y = platform.y - character.height;
    }
    
    // End transition immediately
    gameState.isTransitioning = false;
    gameState.transitionAlpha = 0;
}

// Draw departure window
function drawDepartureWindow() {
    if (!gameState.showDepartureWindow) return;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Window background
    const windowWidth = 400;
    const windowHeight = 300;
    const windowX = (canvas.width - windowWidth) / 2;
    const windowY = (canvas.height - windowHeight) / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(windowX, windowY, windowWidth, windowHeight);

    // Window border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);

    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Departure Information', canvas.width / 2, windowY + 40);

    // Information
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const infoX = windowX + 40;
    let infoY = windowY + 100;
    const lineHeight = 30;

    const info = [
        'Departure: Middle School',
        'Destination: High School',
        'Duration: 4 years',
        'Departure Time: In 10 seconds',
        'Track: 2'
    ];

    info.forEach(line => {
        ctx.fillText(line, infoX, infoY);
        infoY += lineHeight;
    });

    // Close button
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(canvas.width / 2 - 50, windowY + windowHeight - 60, 100, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Close', canvas.width / 2, windowY + windowHeight - 35);
}

// Draw countdown timer
function drawCountdownTimer() {
    if (!gameState.isCountingDown) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width / 2 - 100, 20, 200, 40);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    const seconds = Math.ceil(gameState.countdownTimer / 60);
    ctx.fillText(`${seconds} seconds`, canvas.width / 2, 50);
}

// Game loop
function update() {
    // Update day/night cycle
    dayNightCycle.time += 0.001; // Adjust this value to control transition speed
    
    // Debug: log current state
    console.log('update:', {
        isInsideTrain: gameState.isInsideTrain,
        isInsideTrain2: gameState.isInsideTrain2,
        isTransitioning: gameState.isTransitioning,
        showDialogue: gameState.showDialogue,
        showBlackOverlay: gameState.showBlackOverlay,
        isCountingDown: gameState.isCountingDown,
        train2EntryWindow: gameState.train2EntryWindow,
        train3Countdown: gameState.train3Countdown,
        train3Entered: gameState.train3Entered
    });

    // Calculate background color based on time
    const t = Math.sin(dayNightCycle.time) * 0.5 + 0.5; // Convert to 0-1 range
    const dayColor = [255, 153, 51]; // Sunset orange
    const nightColor = [25, 25, 112]; // Deep blue
    const bgColor = [
        dayColor[0] + (nightColor[0] - dayColor[0]) * t,
        dayColor[1] + (nightColor[1] - dayColor[1]) * t,
        dayColor[2] + (nightColor[2] - dayColor[2]) * t
    ];
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`);
    gradient.addColorStop(1, `rgb(${bgColor[0] * 0.7}, ${bgColor[1] * 0.7}, ${bgColor[2] * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw moon
    if (t > 0.5) { // Only show moon at night
        ctx.fillStyle = `rgba(255, 255, 204, ${(t - 0.5) * 2})`;
        ctx.beginPath();
        ctx.arc(dayNightCycle.moonX, 80, 40, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw buildings
    const buildingColor = [
        255 - (255 - 50) * t,
        204 - (204 - 50) * t,
        153 - (153 - 50) * t
    ];
    
    ctx.fillStyle = `rgb(${buildingColor[0]}, ${buildingColor[1]}, ${buildingColor[2]})`;
    for (let i = 0; i < dayNightCycle.buildingHeights.length; i++) {
        const x = i * dayNightCycle.buildingWidth - camera.x;
        const height = dayNightCycle.buildingHeights[i];
        const y = platform.y - height;
        
        // Only draw buildings that are visible
        if (x + dayNightCycle.buildingWidth > 0 && x < canvas.width) {
            ctx.fillRect(x, y, dayNightCycle.buildingWidth, height);
        }
    }

    // Update departure window timer
    if (gameState.showDepartureWindow) {
        gameState.departureWindowTimer--;
        if (gameState.departureWindowTimer <= 0) {
            gameState.showDepartureWindow = false;
        }
    }

    // Update countdown timer
    if (gameState.isCountingDown) {
        gameState.countdownTimer--;
        if (gameState.countdownTimer <= 0) {
            gameState.isCountingDown = false;
            gameState.train2EntryWindow = false;
            trains[1].door.isLocked = true;
            // Show NPC when countdown ends
            npc.isVisible = true;
            npc.y = platform.y - npc.height; // Position NPC on platform
        }
    }

    // If inside train, only handle the head directions and image fading
    if (gameState.isInsideTrain && !gameState.isTransitioning) {
        console.log('Rendering train 1 interior');
        // Clear canvas
        ctx.fillStyle = '#4287f5'; // Blue background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw train interior with head
        drawTrainInterior();
        
        // Draw transition overlay if transitioning
        if (gameState.transitionAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${gameState.transitionAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Request next frame
        requestAnimationFrame(update);
        return;
    }

    // If inside train 2 (puzzle), show puzzle image and Esc hint
    if (gameState.isInsideTrain2) {
        console.log('Rendering puzzle scene!');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw puzzle image scaled to fit canvas with margin
        const margin = 40;
        const maxW = canvas.width - margin * 2;
        const maxH = canvas.height - margin * 2;
        const imgW = puzzleImg.width;
        const imgH = puzzleImg.height;
        let drawW = maxW;
        let drawH = maxH;
        // Maintain aspect ratio
        const imgAspect = imgW / imgH;
        const canvasAspect = maxW / maxH;
        if (imgAspect > canvasAspect) {
            drawW = maxW;
            drawH = maxW / imgAspect;
        } else {
            drawH = maxH;
            drawW = maxH * imgAspect;
        }
        const drawX = (canvas.width - drawW) / 2;
        const drawY = (canvas.height - drawH) / 2;
        ctx.drawImage(puzzleImg, drawX, drawY, drawW, drawH);
        // Initialize smoke mask if needed
        if (!smokeCanvas || smokeCanvas.width !== canvas.width || smokeCanvas.height !== canvas.height) {
            initSmokeMask();
        }
        // Draw smoke mask over everything
        drawSmokeMask();
        // Draw exit hint
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press ESC to exit the train', canvas.width / 2, canvas.height - 40);
        requestAnimationFrame(update);
        return;
    }

    // Handle dashing cooldown
    if (character.dashCooldown > 0) {
        character.dashCooldown--;
    }
    
    // Handle dash timing
    if (character.isDashing) {
        character.dashFramesLeft--;
        if (character.dashFramesLeft <= 0) {
            character.isDashing = false;
        }
    }
    
    // Only allow movement if not transitioning
    if (!gameState.isTransitioning) {
        // Handle horizontal movement
        character.velocityX = 0;
        
        if (keys.left) {
            character.velocityX = character.isDashing ? -DASH_SPEED : -MOVE_SPEED;
            character.facingRight = false;
        }
        if (keys.right) {
            character.velocityX = character.isDashing ? DASH_SPEED : MOVE_SPEED;
            character.facingRight = true;
        }
        
        // Update position
        character.x += character.velocityX;
        
        // Apply different boundary checks based on if inside or outside train
        if (gameState.isInsideTrain) {
            // Inside train boundaries - limit to visible screen
            if (character.x < 20) character.x = 20;
            if (character.x > canvas.width - character.width - 20) {
                character.x = canvas.width - character.width - 20;
            }
        } else {
            // Outside train boundaries - world limits
            if (character.x < 0) character.x = 0;
            if (character.x > platform.width - character.width) {
                character.x = platform.width - character.width;
            }
            
            // Place character on platform
            character.y = platform.y - character.height;
        }
    }
    
    // Update door highlight states
    if (!gameState.isInsideTrain) {
        const characterCenterX = character.x + character.width / 2;
        const DOOR_INTERACTION_DISTANCE = 30;
        
        // Update highlights for both trains
        trains.forEach((train, index) => {
            if (!train.door) return;
            
            const doorCenterX = train.door.x + train.door.width / 2;
            const isNearDoor = Math.abs(characterCenterX - doorCenterX) < DOOR_INTERACTION_DISTANCE;
            
            // Train 1 is always interactive, Train 2 needs additional conditions
            train.door.isHighlighted = isNearDoor && 
                (index === 0 || (gameState.train2EntryWindow && !train.door.isLocked));
        });
    }
    
    // Camera follows character only when outside the train
    if (!gameState.isInsideTrain) {
        // Update camera to follow character
        camera.x = character.x - canvas.width / 2;
        
        // Keep camera within bounds
        if (camera.x < 0) camera.x = 0;
        if (camera.x > platform.width - canvas.width) {
            camera.x = platform.width - canvas.width;
        }
    }
    
    // Draw platform scene
    // Draw platform (adjusted for camera)
    drawPlatform();
    
    // Draw trains (adjusted for camera)
    drawTrains();
    
    // Draw track signs (adjusted for camera)
    drawTrackSigns();
    
    // Draw character (pixel art style, adjusted for camera position)
    drawCharacter();
    
    // Draw NPC if visible
    if (npc.isVisible) {
        // Hat
        ctx.fillStyle = '#000000'; // Black hat
        ctx.fillRect(
            npc.x - camera.x + GRID_SIZE,
            npc.y - GRID_SIZE,
            npc.width - GRID_SIZE * 2,
            GRID_SIZE
        );
        
        // Head
        ctx.fillStyle = '#FFA07A'; // Same skin tone as main character
        ctx.fillRect(
            npc.x - camera.x + GRID_SIZE,
            npc.y,
            npc.width - GRID_SIZE * 2,
            GRID_SIZE * 2
        );
        
        // Body
        ctx.fillStyle = '#000000'; // Black body
        ctx.fillRect(
            npc.x - camera.x + GRID_SIZE,
            npc.y + GRID_SIZE * 2,
            npc.width - GRID_SIZE * 2,
            npc.height - GRID_SIZE * 2
        );
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(
            npc.x - camera.x + GRID_SIZE * 2.5,
            npc.y + GRID_SIZE / 2,
            GRID_SIZE / 2,
            GRID_SIZE / 2
        );
        
        // Legs
        ctx.fillStyle = '#2c3e50'; // Same leg color as main character
        ctx.fillRect(
            npc.x - camera.x + GRID_SIZE,
            npc.y + npc.height - GRID_SIZE * 2,
            GRID_SIZE,
            GRID_SIZE * 2
        );
        ctx.fillRect(
            npc.x - camera.x + npc.width - GRID_SIZE * 2,
            npc.y + npc.height - GRID_SIZE * 2,
            GRID_SIZE,
            GRID_SIZE * 2
        );
    }

    // Draw dialogue if active
    if (gameState.showDialogue) {
        // Left chat box (NPC)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(20, canvas.height - 120, canvas.width/2 - 40, 100);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, canvas.height - 120, canvas.width/2 - 40, 100);
        
        // Right chat box (Player)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(canvas.width/2 + 20, canvas.height - 120, canvas.width/2 - 40, 100);
        ctx.strokeRect(canvas.width/2 + 20, canvas.height - 120, canvas.width/2 - 40, 100);
        
        // Dialogue text
        ctx.fillStyle = '#000';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        
        if (npc.dialogue.currentLine === -1) {
            // Show final line
            ctx.fillText(npc.dialogue.finalLine.text, 30, canvas.height - 90);
        } else if (npc.dialogue.currentLine < npc.dialogue.lines.length) {
            const currentDialogue = npc.dialogue.lines[npc.dialogue.currentLine];
            
            if (currentDialogue.speaker === "NPC") {
                // NPC text in left box
                ctx.fillText(currentDialogue.text, 30, canvas.height - 90);
            } else {
                // Player text in right box
                ctx.fillText(currentDialogue.text, canvas.width/2 + 30, canvas.height - 90);
            }
        }
        
        // Continue prompt
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Press UP to continue...", canvas.width/2, canvas.height - 20);
    }
    
    // Draw transition overlay if transitioning
    if (gameState.transitionAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${gameState.transitionAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw departure window if active
    if (gameState.showDepartureWindow) {
        drawDepartureWindow();
    }

    // Draw countdown timer if active
    if (gameState.isCountingDown) {
        drawCountdownTimer();
    }
    
    if (gameState.showBlackOverlay) {
        console.log('Rendering black overlay');
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Optionally, add a message here
        return;
    }
    
    // Request next frame
    requestAnimationFrame(update);
}

// Draw train interior with pixel head
function drawTrainInterior() {
    // Blue background
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update image opacities based on head direction
    updateImageOpacities();
    
    // Draw images based on direction (with proper opacity)
    drawDirectionalImages();
    
    // Draw pixel head in the center of the screen
    drawPixelHead();
    
    // Draw exit hint at the bottom of the screen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC to exit the train', canvas.width / 2, canvas.height - 20);
}

// Update image opacities based on head direction
function updateImageOpacities() {
    // Fade in/out left image
    if (gameState.headDirection === 'left') {
        gameState.leftImageOpacity = Math.min(1, gameState.leftImageOpacity + 0.05);
    } else {
        gameState.leftImageOpacity = Math.max(0, gameState.leftImageOpacity - 0.05);
    }
    
    // Fade in/out bottom image
    if (gameState.headDirection === 'down') {
        gameState.bottomImageOpacity = Math.min(1, gameState.bottomImageOpacity + 0.05);
    } else {
        gameState.bottomImageOpacity = Math.max(0, gameState.bottomImageOpacity - 0.05);
    }
    
    // Fade in/out right image
    if (gameState.headDirection === 'right') {
        gameState.rightImageOpacity = Math.min(1, gameState.rightImageOpacity + 0.05);
    } else {
        gameState.rightImageOpacity = Math.max(0, gameState.rightImageOpacity - 0.05);
    }
    
    // Fade in/out up image
    if (gameState.headDirection === 'up') {
        gameState.upImageOpacity = Math.min(1, gameState.upImageOpacity + 0.05);
    } else {
        gameState.upImageOpacity = Math.max(0, gameState.upImageOpacity - 0.05);
    }
}

// Draw images based on direction
function drawDirectionalImages() {
    // Left image - exam paper and pencils
    if (gameState.leftImageOpacity > 0) {
        ctx.globalAlpha = gameState.leftImageOpacity;
        
        // Draw a table
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(50, canvas.height/2 - 50, canvas.width/3, 20); // Table surface
        
        // Draw table legs
        ctx.fillRect(60, canvas.height/2 - 30, 10, 150); // Left leg
        ctx.fillRect(canvas.width/3 + 30, canvas.height/2 - 30, 10, 150); // Right leg
        
        // Draw exam paper
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(80, canvas.height/2 - 70, 180, 220);
        
        // Draw pencils
        ctx.fillStyle = '#FFC107'; // Yellow pencil
        ctx.fillRect(270, canvas.height/2 - 60, 8, 100);
        ctx.fillStyle = '#000000'; // Pencil tip
        ctx.fillRect(270, canvas.height/2 + 40, 8, 5);
        
        ctx.fillStyle = '#F44336'; // Red pencil
        ctx.fillRect(285, canvas.height/2 - 40, 8, 80);
        ctx.fillStyle = '#000000'; // Pencil tip
        ctx.fillRect(285, canvas.height/2 + 40, 8, 5);
        
        // Draw lines on the exam paper
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(90, canvas.height/2 - 50 + i * 20, 160, 1);
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    // Bottom image - hidden switch
    if (gameState.bottomImageOpacity > 0) {
        ctx.globalAlpha = gameState.bottomImageOpacity;
        
        // Draw floor
        ctx.fillStyle = '#8B4513'; // Brown floor
        ctx.fillRect(canvas.width/2 - 150, canvas.height - 200, 300, 200);
        
        // Draw hidden switch under a desk
        ctx.fillStyle = '#333333'; // Switch base
        ctx.fillRect(canvas.width/2 - 20, canvas.height - 80, 40, 10);
        
        // Switch lever
        ctx.fillStyle = '#FF0000'; // Red lever
        ctx.fillRect(canvas.width/2 - 5, canvas.height - 90, 10, 20);
        
        // Draw some debris/dust around to show it's hidden
        ctx.fillStyle = '#D3D3D3';
        ctx.fillRect(canvas.width/2 - 40, canvas.height - 75, 15, 5);
        ctx.fillRect(canvas.width/2 + 25, canvas.height - 78, 20, 8);
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    // Optional: Right and Up images can be added here
}

// Draw pixel head
function drawPixelHead() {
    const headSize = Math.min(canvas.width, canvas.height) * 0.3;
    const headX = canvas.width / 2 - headSize / 2;
    const headY = canvas.height / 2 - headSize / 2;
    
    // Head offset based on direction
    let offsetX = 0;
    let offsetY = 0;
    
    switch(gameState.headDirection) {
        case 'left':
            offsetX = -20;
            break;
        case 'right':
            offsetX = 20;
            break;
        case 'up':
            offsetY = -20;
            break;
        case 'down':
            offsetY = 20;
            break;
    }
    
    // Draw head (face)
    ctx.fillStyle = '#FFA07A'; // Skin color
    ctx.fillRect(headX + offsetX, headY + offsetY, headSize, headSize);
    
    // Draw eyes based on direction
    ctx.fillStyle = '#000000';
    
    // Left eye
    let leftEyeX = headX + headSize * 0.25;
    let rightEyeX = headX + headSize * 0.75;
    let eyeY = headY + headSize * 0.4;
    let eyeSize = headSize * 0.1;
    
    // Adjust eye positions based on direction
    switch(gameState.headDirection) {
        case 'left':
            leftEyeX -= eyeSize;
            rightEyeX -= eyeSize;
            break;
        case 'right':
            leftEyeX += eyeSize;
            rightEyeX += eyeSize;
            break;
        case 'up':
            eyeY -= eyeSize;
            break;
        case 'down':
            eyeY += eyeSize;
            break;
    }
    
    ctx.fillRect(leftEyeX + offsetX, eyeY + offsetY, eyeSize, eyeSize);
    ctx.fillRect(rightEyeX + offsetX, eyeY + offsetY, eyeSize, eyeSize);
    
    // Draw mouth
    let mouthY = headY + headSize * 0.7;
    let mouthWidth = headSize * 0.4;
    let mouthHeight = headSize * 0.05;
    
    // Adjust mouth based on direction
    switch(gameState.headDirection) {
        case 'up':
            mouthHeight = headSize * 0.02; // Smaller mouth when looking up
            break;
        case 'down':
            mouthHeight = headSize * 0.08; // Bigger mouth when looking down
            break;
    }
    
    ctx.fillRect(headX + headSize/2 - mouthWidth/2 + offsetX, 
                mouthY + offsetY, 
                mouthWidth, 
                mouthHeight);
    
    // Draw hair
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(headX + offsetX, headY + offsetY, headSize, headSize * 0.2);
    
    // Draw ears
    ctx.fillStyle = '#FFA07A'; // Skin color
    ctx.fillRect(headX + offsetX - 10, headY + offsetY + headSize * 0.3, 10, headSize * 0.3);
    ctx.fillRect(headX + offsetX + headSize, headY + offsetY + headSize * 0.3, 10, headSize * 0.3);
}

// Draw simple platform
function drawPlatform() {
    // Main platform
    ctx.fillStyle = '#8B4513'; // Brown for wooden platform base
    ctx.fillRect(platform.x - camera.x, platform.y, platform.width, platform.height);
    
    // Platform top edge (lighter color)
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(platform.x - camera.x, platform.y, platform.width, 10);
    
    // Draw platform sections for visual reference
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#A0522D' : '#8B4513';
        ctx.fillRect(window.innerWidth * i - camera.x, platform.y, 5, 10);
    }
}

// Draw trains
function drawTrains() {
    trains.forEach((train, index) => {
        const carriageWidth = train.width / train.carriages;
        
        // Draw each carriage
        for (let i = 0; i < train.carriages; i++) {
            const carriageX = train.x + i * carriageWidth - camera.x;
            
            // Skip if carriage is not visible
            if (carriageX + carriageWidth < 0 || carriageX > canvas.width) continue;
            
            // Main carriage body
            ctx.fillStyle = train.color;
            ctx.fillRect(carriageX, train.y, carriageWidth - 5, train.height);
            
            // Carriage connector
            if (i < train.carriages - 1) {
                ctx.fillStyle = '#1A237E';
                ctx.fillRect(carriageX + carriageWidth - 5, train.y + 15, 5, 30);
            }
            
            // Front of train (first carriage)
            if (i === 0) {
                ctx.fillStyle = '#1A237E';
                ctx.fillRect(carriageX, train.y, 10, train.height);
                
                // Train lights
                ctx.fillStyle = '#FFF9C4';
                ctx.fillRect(carriageX + 2, train.y + 10, 4, 4);
                ctx.fillRect(carriageX + 2, train.y + train.height - 14, 4, 4);
            }
            
            // Draw door if this is the right carriage
            if (train.door && i === train.door.carriageIndex) {
                // Door
                ctx.fillStyle = train.door.isHighlighted ? '#4DD0E1' : '#1A237E';
                ctx.fillRect(train.door.x - camera.x, train.door.y, train.door.width, train.door.height);
                
                // Door handle
                ctx.fillStyle = '#FFC107';
                ctx.fillRect(train.door.x + train.door.width - 8 - camera.x, train.door.y + 20, 5, 10);
                
                // "Press Up" hint if door is highlighted
                if (train.door.isHighlighted) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Press Up', train.door.x + train.door.width/2 - camera.x, train.door.y - 10);
                }
            }
            
            // Windows (except for door carriage)
            if (!(train.door && i === train.door.carriageIndex)) {
                ctx.fillStyle = '#81D4FA'; // Light blue for windows
                for (let j = 0; j < 3; j++) {
                    const windowX = carriageX + 20 + j * 25;
                    if (windowX + 15 > 0 && windowX < canvas.width) {
                        ctx.fillRect(windowX, train.y + 15, 15, 20);
                    }
                }
            }
            
            // Wheels
            ctx.fillStyle = '#263238';
            if (carriageX + carriageWidth/4 > 0 && carriageX + carriageWidth/4 < canvas.width) {
                ctx.beginPath();
                ctx.arc(carriageX + carriageWidth/4, train.y + train.height, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (carriageX + carriageWidth*3/4 > 0 && carriageX + carriageWidth*3/4 < canvas.width) {
                ctx.beginPath();
                ctx.arc(carriageX + carriageWidth*3/4, train.y + train.height, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

// Draw track signs
function drawTrackSigns() {
    trackSigns.forEach(sign => {
        const signX = sign.x - camera.x;
        
        // Skip if sign is not visible
        if (signX + sign.width < 0 || signX > canvas.width) return;
        
        // Sign background
        ctx.fillStyle = '#303F9F';
        ctx.fillRect(signX, sign.y, sign.width, sign.height);
        
        // Sign border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(signX, sign.y, sign.width, sign.height);
        
        // Sign text (track number)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sign.number}`, signX + sign.width/2, sign.y + sign.height/2);
        
        // Sign post
        ctx.fillStyle = '#616161';
        ctx.fillRect(signX + sign.width/2 - 5, sign.y + sign.height, 10, platform.y - sign.y - sign.height);
    });
}

// Draw character in pixel art style
function drawCharacter() {
    // Adjust position based on whether inside or outside train
    const screenX = gameState.isInsideTrain ? character.x : character.x - camera.x;
    
    // Body
    ctx.fillStyle = character.isDashing ? '#4dabf5' : '#3498db'; // Brighter blue if dashing
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y + GRID_SIZE * 2, 
        character.width - GRID_SIZE * 2, 
        character.height - GRID_SIZE * 2
    );
    
    // Head
    ctx.fillStyle = '#FFA07A'; // Light skin tone
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y, 
        character.width - GRID_SIZE * 2, 
        GRID_SIZE * 2
    );
    
    // Eyes
    ctx.fillStyle = '#000';
    if (character.facingRight) {
        ctx.fillRect(
            screenX + GRID_SIZE * 2, 
            character.y + GRID_SIZE / 2, 
            GRID_SIZE / 2, 
            GRID_SIZE / 2
        );
    } else {
        ctx.fillRect(
            screenX + GRID_SIZE * 1.5, 
            character.y + GRID_SIZE / 2, 
            GRID_SIZE / 2, 
            GRID_SIZE / 2
        );
    }
    
    // Legs
    ctx.fillStyle = '#2c3e50'; // Dark pants
    ctx.fillRect(
        screenX + GRID_SIZE, 
        character.y + character.height - GRID_SIZE * 2, 
        GRID_SIZE, 
        GRID_SIZE * 2
    );
    ctx.fillRect(
        screenX + character.width - GRID_SIZE * 2, 
        character.y + character.height - GRID_SIZE * 2, 
        GRID_SIZE, 
        GRID_SIZE * 2
    );
    
    // Add animation based on movement
    if (character.velocityX !== 0) {
        // Simple walking animation - alternate leg positions
        const time = Date.now() / 100;
        if (Math.floor(time) % 2 === 0) {
            ctx.fillRect(
                screenX + GRID_SIZE, 
                character.y + character.height - GRID_SIZE * 2, 
                GRID_SIZE, 
                GRID_SIZE * 2 + 2
            );
        } else {
            ctx.fillRect(
                screenX + character.width - GRID_SIZE * 2, 
                character.y + character.height - GRID_SIZE * 2, 
                GRID_SIZE, 
                GRID_SIZE * 2 + 2
            );
        }
    }
    
    // Draw dash cooldown indicator if applicable
    if (character.dashCooldown > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(
            screenX, 
            character.y - 10, 
            (character.width * (DASH_COOLDOWN - character.dashCooldown)) / DASH_COOLDOWN, 
            5
        );
    }
}

// Start the game loop immediately when the page loads
window.onload = () => {
    update();
};

// Add click handler for the departure window
canvas.addEventListener('click', (event) => {
    if (!gameState.showDepartureWindow) return;

    const windowWidth = 400;
    const windowHeight = 300;
    const windowX = (canvas.width - windowWidth) / 2;
    const windowY = (canvas.height - windowHeight) / 2;

    // Check if click is on the close button
    const closeButtonX = canvas.width / 2 - 50;
    const closeButtonY = windowY + windowHeight - 60;
    const closeButtonWidth = 100;
    const closeButtonHeight = 40;

    if (event.clientX >= closeButtonX && 
        event.clientX <= closeButtonX + closeButtonWidth &&
        event.clientY >= closeButtonY && 
        event.clientY <= closeButtonY + closeButtonHeight) {
        gameState.showDepartureWindow = false;
    }
}); 