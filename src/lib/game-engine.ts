import {
  GameState,
  PlayerState,
  Enemy,
  Bullet,
  PowerUp,
  Particle,
  ScorePopup,
  EnemyPattern,
  PowerUpType,
  POWER_UP_CONFIG,
} from './game-types';

// Generate unique ID
let idCounter = 0;
export const generateId = () => `${Date.now()}-${idCounter++}`;

// Initial game state
export const createInitialGameState = (): GameState => ({
  score: 0,
  lives: 3,
  isPlaying: false,
  isGameOver: false,
  isPaused: false,
  level: 1,
  combo: 0,
});

// Initial player state
export const createInitialPlayerState = (canvasWidth: number, canvasHeight: number): PlayerState => ({
  x: canvasWidth / 2,
  y: canvasHeight - 100,
  width: 50,
  height: 50,
  speed: 8,
  fireRate: 200,
  lastFireTime: 0,
  isInvincible: false,
  invincibleUntil: 0,
  powerUps: [],
});

// Enemy patterns
const patterns: EnemyPattern[] = ['straight', 'zigzag', 'sine', 'spiral', 'chase'];

// Create random enemy
export const createEnemy = (
  canvasWidth: number,
  imageUrl: string,
  name: string,
  level: number
): Enemy => {
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const baseSpeed = 1 + level * 0.3;
  const baseHealth = 1 + Math.floor(level / 3);

  return {
    id: generateId(),
    x: Math.random() * (canvasWidth - 60) + 30,
    y: -60,
    width: 50 + Math.random() * 20,
    height: 50 + Math.random() * 20,
    speed: baseSpeed + Math.random() * 1.5,
    health: baseHealth,
    maxHealth: baseHealth,
    imageUrl,
    name,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.1,
    pattern,
    patternData: {
      amplitude: 50 + Math.random() * 50,
      frequency: 0.02 + Math.random() * 0.03,
      startX: 0,
      time: 0,
    },
  };
};

// Update enemy position based on pattern
export const updateEnemyPosition = (
  enemy: Enemy,
  playerX: number,
  deltaTime: number,
  slowMotion: boolean
): Enemy => {
  const speedMultiplier = slowMotion ? 0.3 : 1;
  const speed = enemy.speed * speedMultiplier;
  enemy.patternData.time = (enemy.patternData.time || 0) + deltaTime;

  switch (enemy.pattern) {
    case 'straight':
      enemy.y += speed;
      break;

    case 'zigzag':
      enemy.y += speed;
      if (!enemy.patternData.startX) enemy.patternData.startX = enemy.x;
      enemy.x = enemy.patternData.startX + Math.sin(enemy.patternData.time * 0.003) * enemy.patternData.amplitude;
      break;

    case 'sine':
      enemy.y += speed * 0.8;
      if (!enemy.patternData.startX) enemy.patternData.startX = enemy.x;
      enemy.x = enemy.patternData.startX + Math.sin(enemy.y * enemy.patternData.frequency) * enemy.patternData.amplitude;
      break;

    case 'spiral':
      enemy.y += speed * 0.6;
      const spiralRadius = 30 + enemy.patternData.time * 0.01;
      enemy.x += Math.cos(enemy.patternData.time * 0.005) * spiralRadius * 0.02;
      break;

    case 'chase':
      enemy.y += speed * 0.7;
      const dx = playerX - enemy.x;
      enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.02, speed);
      break;
  }

  enemy.rotation += enemy.rotationSpeed;
  return enemy;
};

// Create bullet
export const createBullet = (
  x: number,
  y: number,
  isPlayerBullet: boolean,
  angle: number = -Math.PI / 2,
  damage: number = 1
): Bullet => ({
  id: generateId(),
  x,
  y,
  width: isPlayerBullet ? 8 : 12,
  height: isPlayerBullet ? 20 : 12,
  speed: isPlayerBullet ? 15 : 5,
  damage,
  isPlayerBullet,
  color: isPlayerBullet ? '#FFE66D' : '#FF6B6B',
});

// Create power-up with random type
export const createPowerUp = (x: number, y: number): PowerUp => {
  const types: PowerUpType[] = ['rapidFire', 'shield', 'multiShot', 'bomb', 'slowMotion'];
  const weights = [30, 20, 25, 10, 15]; // Weighted probability
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  let type: PowerUpType = 'rapidFire';
  for (let i = 0; i < types.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      type = types[i];
      break;
    }
  }

  return {
    id: generateId(),
    type,
    x,
    y,
    width: 30,
    height: 30,
    speed: 2,
  };
};

// Create explosion particles
export const createExplosionParticles = (x: number, y: number, color: string, count: number = 10): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      id: generateId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color,
      size: 3 + Math.random() * 5,
    });
  }
  return particles;
};

// Create score popup
export const createScorePopup = (x: number, y: number, value: number): ScorePopup => ({
  id: generateId(),
  x,
  y,
  value,
  life: 1,
});

// Check collision between two rectangles
export const checkCollision = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
};

// Calculate score for defeating enemy
export const calculateScore = (enemy: Enemy, combo: number): number => {
  const baseScore = 100;
  const healthBonus = enemy.maxHealth * 50;
  const comboMultiplier = 1 + combo * 0.1;
  return Math.floor((baseScore + healthBonus) * comboMultiplier);
};

// Check if power-up should drop (10% chance)
export const shouldDropPowerUp = (): boolean => Math.random() < 0.1;

// Get active power-up effect
export const hasActivePowerUp = (player: PlayerState, type: PowerUpType): boolean => {
  const now = Date.now();
  return player.powerUps.some(p => p.type === type && p.expiresAt > now);
};

// Add power-up to player
export const addPowerUp = (player: PlayerState, type: PowerUpType): PlayerState => {
  const config = POWER_UP_CONFIG[type];
  const now = Date.now();

  // Remove expired power-ups
  const activePowerUps = player.powerUps.filter(p => p.expiresAt > now);

  // Handle instant power-ups
  if (type === 'bomb') {
    // Bomb is handled separately
    return { ...player, powerUps: activePowerUps };
  }

  // Add or extend power-up
  const existingIndex = activePowerUps.findIndex(p => p.type === type);
  if (existingIndex >= 0) {
    activePowerUps[existingIndex].expiresAt = now + config.duration;
  } else {
    activePowerUps.push({ type, expiresAt: now + config.duration });
  }

  // Apply effects
  let newPlayer = { ...player, powerUps: activePowerUps };

  if (type === 'shield') {
    newPlayer.isInvincible = true;
    newPlayer.invincibleUntil = now + config.duration;
  }

  if (type === 'rapidFire') {
    newPlayer.fireRate = 100; // Faster fire rate
  }

  return newPlayer;
};

// Update player power-ups (remove expired)
export const updatePlayerPowerUps = (player: PlayerState): PlayerState => {
  const now = Date.now();
  const activePowerUps = player.powerUps.filter(p => p.expiresAt > now);

  // Reset effects if power-up expired
  let newPlayer = { ...player, powerUps: activePowerUps };

  if (!hasActivePowerUp(newPlayer, 'rapidFire')) {
    newPlayer.fireRate = 200;
  }

  if (newPlayer.invincibleUntil < now) {
    newPlayer.isInvincible = false;
  }

  return newPlayer;
};
