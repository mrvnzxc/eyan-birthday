const game = document.getElementById("game");
const track = document.getElementById("track");
const player = document.getElementById("player");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const startHint = document.getElementById("startHint");

const desktopBgImages = ["1.jpg", "2.jpg", "3.jpg", "4.jpg"];
const mobileBgImages = ["m1.JPG", "m2.JPG", "m3.JPG", "4.jpg"];
const backgroundChangeInterval = 250;
const obstacleSpawnMin = 900;
const obstacleSpawnMax = 1600;
const gravity = 0.95;
const jumpImpulse = 18.2;

let running = false;
let gameOver = false;
let score = 0;
let displayedScore = 0;

let playerY = 0;
let velocityY = 0;
let isJumping = false;

let speed = 5.2;
let speedRamp = 0.00035;
let lastFrameTime = 0;
let scoreAccumulator = 0;
let obstacleSpawnTimer = 0;
let currentBackgroundIndex = 0;
let lastBackgroundMode = "";

const obstacles = [];

function getSpawnSettings() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return {
      min: 1200,
      max: 2100,
      minGapFloor: 760,
      speedBiasMultiplier: 24,
      spawnBuffer: Math.max(170, window.innerWidth * 0.65),
    };
  }

  return {
    min: obstacleSpawnMin,
    max: obstacleSpawnMax,
    minGapFloor: 520,
    speedBiasMultiplier: 35,
    spawnBuffer: 50,
  };
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function getBackgroundMode() {
  return window.innerWidth <= 768 ? "mobile" : "desktop";
}

function getBackgroundImagesForViewport() {
  return getBackgroundMode() === "mobile" ? mobileBgImages : desktopBgImages;
}

function getNextBackgroundInfo() {
  const currentMode = getBackgroundMode();
  const activeBackgrounds = getBackgroundImagesForViewport();
  if (lastBackgroundMode !== currentMode) {
    currentBackgroundIndex = 0;
    lastBackgroundMode = currentMode;
  }

  const name = activeBackgrounds[currentBackgroundIndex];
  currentBackgroundIndex =
    (currentBackgroundIndex + 1) % activeBackgrounds.length;
  return {
    mode: currentMode,
    name,
    url: `url("${name}")`,
  };
}

function applyNextBackground() {
  const background = getNextBackgroundInfo();
  const skyLayer = "linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))";
  game.style.backgroundImage = `${skyLayer}, ${background.url}`;
  game.style.backgroundPosition =
    background.mode === "desktop" && background.name === "4.jpg"
      ? "center, center 38%"
      : "center, center";
}

function setDefaultBackground() {
  game.style.backgroundImage = "";
}

function updatePlayerVisual() {
  const rotation = isJumping ? Math.min(14, velocityY * -2) : 0;
  player.style.transform = `translateY(${-playerY}px) rotate(${rotation}deg)`;
}

function jump() {
  if (!running || gameOver || isJumping) {
    return;
  }

  isJumping = true;
  velocityY = jumpImpulse;
}

function createObstacle() {
  const obstacle = document.createElement("div");
  obstacle.className = "obstacle";
  const { spawnBuffer } = getSpawnSettings();
  obstacle.style.left = `${window.innerWidth + spawnBuffer}px`;
  track.appendChild(obstacle);
  obstacles.push(obstacle);
}

function updateObstacles(deltaMs) {
  const distance = (speed * deltaMs) / 16.67;

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    const currentLeft = parseFloat(obstacle.style.left);
    const nextLeft = currentLeft - distance;
    obstacle.style.left = `${nextLeft}px`;

    if (nextLeft < -100) {
      obstacle.remove();
      obstacles.splice(i, 1);
    }
  }
}

function updatePlayerPhysics(deltaMs) {
  if (!isJumping && playerY === 0) {
    return;
  }

  const frameScale = deltaMs / 16.67;
  velocityY -= gravity * frameScale;
  playerY += velocityY * frameScale;

  if (playerY <= 0) {
    playerY = 0;
    velocityY = 0;
    isJumping = false;
  }

  updatePlayerVisual();
}

function isCollision(playerRect, obstacleRect) {
  const inset = 12;
  return !(
    playerRect.right - inset < obstacleRect.left + inset ||
    playerRect.left + inset > obstacleRect.right - inset ||
    playerRect.bottom - inset < obstacleRect.top + inset ||
    playerRect.top + inset > obstacleRect.bottom - inset
  );
}

function checkCollision() {
  const playerRect = player.getBoundingClientRect();

  for (let i = 0; i < obstacles.length; i += 1) {
    const obstacleRect = obstacles[i].getBoundingClientRect();
    if (isCollision(playerRect, obstacleRect)) {
      endGame();
      return;
    }
  }
}

function updateScore(deltaMs) {
  scoreAccumulator += deltaMs * 0.06;
  score = Math.floor(scoreAccumulator);

  if (score !== displayedScore) {
    displayedScore = score;
    scoreEl.textContent = String(displayedScore);

    if (
      displayedScore > 0 &&
      displayedScore % backgroundChangeInterval === 0
    ) {
      applyNextBackground();
    }
  }
}

function updateDifficulty(deltaMs) {
  speed += speedRamp * deltaMs;
}

function updateSpawn(deltaMs) {
  obstacleSpawnTimer -= deltaMs;

  if (obstacleSpawnTimer <= 0) {
    createObstacle();
    const settings = getSpawnSettings();
    const fasterGapBias = Math.max(0, (speed - 5) * settings.speedBiasMultiplier);
    obstacleSpawnTimer = randomRange(
      settings.min - fasterGapBias,
      settings.max - fasterGapBias
    );
    obstacleSpawnTimer = Math.max(settings.minGapFloor, obstacleSpawnTimer);
  }
}

function gameLoop(timestamp) {
  if (!running || gameOver) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaMs = Math.min(34, timestamp - lastFrameTime);
  lastFrameTime = timestamp;

  updatePlayerPhysics(deltaMs);
  updateSpawn(deltaMs);
  updateObstacles(deltaMs);
  checkCollision();
  updateScore(deltaMs);
  updateDifficulty(deltaMs);

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

function clearObstacles() {
  for (let i = 0; i < obstacles.length; i += 1) {
    obstacles[i].remove();
  }
  obstacles.length = 0;
}

function resetGameState() {
  running = true;
  gameOver = false;
  score = 0;
  displayedScore = 0;
  scoreAccumulator = 0;
  speed = 5.2;
  playerY = 0;
  velocityY = 0;
  isJumping = false;
  currentBackgroundIndex = 0;
  lastBackgroundMode = "";
  lastFrameTime = 0;
  const settings = getSpawnSettings();
  obstacleSpawnTimer = randomRange(settings.min * 0.85, settings.max * 0.9);

  clearObstacles();
  scoreEl.textContent = "0";
  player.style.transform = "translateY(0) rotate(0deg)";
  overlay.classList.add("hidden");
  startHint.classList.add("hidden");
  setDefaultBackground();
}

function startGame() {
  resetGameState();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  gameOver = true;
  overlay.classList.remove("hidden");
}

function onPrimaryAction() {
  if (!running && !gameOver) {
    startGame();
    return;
  }

  if (gameOver) {
    startGame();
    return;
  }

  jump();
}

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") {
    return;
  }
  event.preventDefault();
  onPrimaryAction();
});

game.addEventListener("pointerdown", () => {
  onPrimaryAction();
});

overlay.addEventListener("pointerdown", () => {
  onPrimaryAction();
});

setDefaultBackground();
