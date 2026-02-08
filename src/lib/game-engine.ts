import { create } from 'zustand';
import type { GameState, WalletAsset, Enemy, Bullet, EnemyBullet, PowerUp, Player, PowerUpType, EnemyAttackPattern, Coin, BossType, FeverCoin } from './game-types';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_DURATION, ENEMY_BULLET_COLORS, BOSS_COLORS, KILLS_PER_BOSS, MAX_EXTRA_SHIPS, SHIP_DECAY_INTERVAL, FEVER_COIN_DROP_CHANCE, FEVER_COINS_REQUIRED, FEVER_TIME_DURATION, FEVER_SCORE_MULTIPLIER } from './game-types';

const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -5,
  maxY: 8,
};

const SPAWN_RATE_INITIAL = 3500; // ms between enemy spawns (slower at start)
const SPAWN_RATE_MIN = 800; // fastest spawn rate
const SPAWN_COUNT_INITIAL = 1; // Start with 1 enemy
const SPAWN_COUNT_MAX = 3; // Maximum enemies per wave (reduced from 4)
const BLOCK_SPAWN_RATE = 2500; // ms between block spawns
const POWER_UP_DROP_CHANCE = 0.08; // Reduced from 0.15
const ENEMY_BULLET_SPEED_MIN = 2.5; // Initial bullet speed (slow)
const ENEMY_BULLET_SPEED_MAX = 5; // Max bullet speed at 10 minutes (reduced)
const ENEMY_SPEED_MIN = 0.3; // Initial enemy movement speed (very slow)
const ENEMY_SPEED_MAX = 1.2; // Max enemy movement speed at 10 minutes (reduced from 2.0)
const DIFFICULTY_RAMP_TIME = 600000; // 10 minutes to reach max difficulty
const INVINCIBILITY_DURATION = 5000; // 5 seconds of invincibility after taking damage
const MAX_POWER_UP_DURATION = 60000; // Maximum 60 seconds for stacked power-ups
const MAX_SHIELD_DURATION = 20000; // Maximum 20 seconds for shield

// Counters stored in the store state to avoid module-level issues
interface GameStore extends GameState {
  powerUpExpireTimes: {
    rapidFire: number;
    shield: number;
    scoreBoost: number;
    tripleShot: number;
  };
  lastExtraShipDecayTime: number;
  lastBossDefeatedTime: number;
  walletAssets: WalletAsset[];
  playerAvatar: string | null;
  gameStartTime: number;
  lastSpawnTime: number;
  lastBlockSpawnTime: number;
  enemyIdCounter: number;
  bulletIdCounter: number;
  enemyBulletIdCounter: number;
  powerUpIdCounter: number;
  coinIdCounter: number;
  feverCoinIdCounter: number;
  noDropStreak: number; // Pity counter: consecutive kills without power-up drop
  setWalletAssets: (assets: WalletAsset[]) => void;
  setPlayerAvatar: (url: string | null) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  updateGame: (deltaTime: number) => void;
  movePlayer: (x: number, y: number) => void;
  fireBullet: () => void;
  collectPowerUp: (powerUpId: string) => void;
  takeDamage: () => void;
  takeDamageForceBoss: () => void;
  spawnBoss: () => void;
}

// Default crypto asset for enemies
const DEFAULT_ASSET: WalletAsset = {
  id: 'default-crypto',
  type: 'token',
  name: 'Crypto',
  symbol: 'CRYPTO',
  imageUrl: '',
  contractAddress: '0x0',
};

export const useGameStore = create<GameStore>((set, get) => ({
  players: [{ id: 0, position: { x: 0, y: -3, z: 0 }, isMain: true }],
  enemies: [],
  bullets: [],
  enemyBullets: [],
  powerUps: [],
  coins: [],
  feverCoins: [],
  score: 0,
  lives: 3,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  isInvincible: false,
  invincibleUntil: 0,
  activePowerUps: {
    rapidFire: false,
    shield: false,
    scoreBoost: false,
    tripleShot: false,
  },
  powerUpExpireTimes: {
    rapidFire: 0,
    shield: 0,
    scoreBoost: 0,
    tripleShot: 0,
  },
  lastExtraShipDecayTime: 0,
  lastBossDefeatedTime: 0,
  extraShipCount: 0,
  killCount: 0,
  bossActive: false,
  bossesDefeated: 0,
  feverCoinCount: 0,
  isFeverTime: false,
  feverTimeUntil: 0,
  walletAssets: [],
  playerAvatar: null,
  gameStartTime: 0,
  lastSpawnTime: 0,
  lastBlockSpawnTime: 0,
  enemyIdCounter: 0,
  bulletIdCounter: 0,
  enemyBulletIdCounter: 0,
  powerUpIdCounter: 0,
  coinIdCounter: 0,
  feverCoinIdCounter: 0,
  noDropStreak: 0,

  setWalletAssets: (assets) => set({ walletAssets: assets }),
  setPlayerAvatar: (url) => set({ playerAvatar: url }),

  startGame: () => {
    console.log('Starting game...');
    set({
      players: [{ id: 0, position: { x: 0, y: -3, z: 0 }, isMain: true }],
      enemies: [],
      bullets: [],
      enemyBullets: [],
      powerUps: [],
      coins: [],
      feverCoins: [],
      score: 0,
      lives: 3,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      isInvincible: false,
      invincibleUntil: 0,
      activePowerUps: {
        rapidFire: false,
        shield: false,
        scoreBoost: false,
        tripleShot: false,
      },
      powerUpExpireTimes: {
        rapidFire: 0,
        shield: 0,
        scoreBoost: 0,
        tripleShot: 0,
      },
      lastExtraShipDecayTime: 0,
      lastBossDefeatedTime: 0,
      extraShipCount: 0,
      killCount: 0,
      bossActive: false,
      bossesDefeated: 0,
      feverCoinCount: 0,
      isFeverTime: false,
      feverTimeUntil: 0,
      gameStartTime: Date.now(),
      lastSpawnTime: 0, // Set to 0 so first spawn happens immediately
      lastBlockSpawnTime: 0,
      enemyIdCounter: 0,
      bulletIdCounter: 0,
      enemyBulletIdCounter: 0,
      powerUpIdCounter: 0,
      coinIdCounter: 0,
      feverCoinIdCounter: 0,
      noDropStreak: 0,
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  endGame: () => set({ isPlaying: false, isGameOver: true }),

  movePlayer: (x, y) => {
    set((state) => {
      const clampedX = Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, x));
      const clampedY = Math.max(GAME_BOUNDS.minY, Math.min(GAME_BOUNDS.maxY, y));

      // 1-2-3 inverted V formation:
      // Row 0: Main ship (index 0)
      // Row 1: 2 ships (indices 1, 2)
      // Row 2: 3 ships (indices 3, 4, 5)
      const formationOffsets: { x: number; y: number }[] = [
        { x: 0, y: 0 },       // Main ship (index 0)
        { x: -0.5, y: -0.5 }, // Index 1: row 1 left
        { x: 0.5, y: -0.5 },  // Index 2: row 1 right
        { x: -0.8, y: -1.0 }, // Index 3: row 2 left
        { x: 0, y: -1.0 },    // Index 4: row 2 center
        { x: 0.8, y: -1.0 },  // Index 5: row 2 right
      ];

      const newPlayers = state.players.map((player, index) => {
        if (player.isMain) {
          return {
            ...player,
            position: { x: clampedX, y: clampedY, z: 0 },
          };
        }
        const offset = formationOffsets[index] || { x: 0, y: -1.5 };
        return {
          ...player,
          position: {
            x: Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, clampedX + offset.x)),
            y: Math.max(GAME_BOUNDS.minY, Math.min(GAME_BOUNDS.maxY, clampedY + offset.y)),
            z: 0,
          },
        };
      });
      return { players: newPlayers };
    });
  },

  fireBullet: () => {
    set((state) => {
      const newBullets: Bullet[] = [];
      let bulletCounter = state.bulletIdCounter;

      for (const player of state.players) {
        // Main bullet (straight up)
        newBullets.push({
          id: `bullet-${bulletCounter++}`,
          position: { x: player.position.x, y: player.position.y + 0.8, z: 0 },
          velocity: { x: 0, y: 20, z: 0 },
          playerId: player.id,
        });

        // Triple shot - add side bullets at 30 degree angles
        if (state.activePowerUps.tripleShot) {
          const spreadAngle = Math.PI / 6; // 30 degrees
          const bulletSpeed = 20;
          // Left bullet
          newBullets.push({
            id: `bullet-${bulletCounter++}`,
            position: { x: player.position.x - 0.2, y: player.position.y + 0.8, z: 0 },
            velocity: {
              x: -Math.sin(spreadAngle) * bulletSpeed,
              y: Math.cos(spreadAngle) * bulletSpeed,
              z: 0,
            },
            playerId: player.id,
          });
          // Right bullet
          newBullets.push({
            id: `bullet-${bulletCounter++}`,
            position: { x: player.position.x + 0.2, y: player.position.y + 0.8, z: 0 },
            velocity: {
              x: Math.sin(spreadAngle) * bulletSpeed,
              y: Math.cos(spreadAngle) * bulletSpeed,
              z: 0,
            },
            playerId: player.id,
          });
        }
      }

      return {
        bullets: [...state.bullets, ...newBullets],
        bulletIdCounter: bulletCounter,
      };
    });
  },

  collectPowerUp: (powerUpId) => {
    set((state) => {
      const powerUp = state.powerUps.find((p) => p.id === powerUpId);
      if (!powerUp) return state;

      const newPowerUps = state.powerUps.filter((p) => p.id !== powerUpId);
      let updates: Partial<GameStore> = { powerUps: newPowerUps };

      // 1-2-3 inverted V formation offsets
      const formationOffsets: { x: number; y: number }[] = [
        { x: 0, y: 0 },       // Main ship (index 0)
        { x: -0.5, y: -0.5 }, // Index 1: row 1 left
        { x: 0.5, y: -0.5 },  // Index 2: row 1 right
        { x: -0.8, y: -1.0 }, // Index 3: row 2 left
        { x: 0, y: -1.0 },    // Index 4: row 2 center
        { x: 0.8, y: -1.0 },  // Index 5: row 2 right
      ];

      switch (powerUp.type) {
        case 'extra_ship':
          // Cap at MAX_EXTRA_SHIPS (5 extra = 6 total including main)
          if (state.extraShipCount >= MAX_EXTRA_SHIPS) {
            // Already at max, don't add more ships
            return updates as GameStore;
          }
          const newShipId = state.players.length;
          const mainPlayer = state.players.find((p) => p.isMain);
          const offset = formationOffsets[newShipId] || { x: 0, y: -1.5 };
          updates.players = [
            ...state.players,
            {
              id: newShipId,
              position: {
                x: (mainPlayer?.position.x || 0) + offset.x,
                y: (mainPlayer?.position.y || -3) + offset.y,
                z: 0,
              },
              isMain: false,
            },
          ];
          updates.extraShipCount = state.extraShipCount + 1;
          // Reset decay timer when gaining a ship
          updates.lastExtraShipDecayTime = Date.now();
          break;
        case 'rapid_fire':
          {
            updates.activePowerUps = { ...state.activePowerUps, rapidFire: true };
            // Extend duration if already active, up to max 60 seconds
            const currentExpire = state.activePowerUps.rapidFire ? state.powerUpExpireTimes.rapidFire : Date.now();
            const newExpire = Math.min(currentExpire + POWER_UP_DURATION, Date.now() + MAX_POWER_UP_DURATION);
            updates.powerUpExpireTimes = { ...state.powerUpExpireTimes, rapidFire: newExpire };
          }
          break;
        case 'shield':
          {
            updates.activePowerUps = { ...state.activePowerUps, shield: true };
            const currentExpire = state.activePowerUps.shield ? state.powerUpExpireTimes.shield : Date.now();
            // Shield has a lower max duration of 20 seconds
            const newExpire = Math.min(currentExpire + POWER_UP_DURATION, Date.now() + MAX_SHIELD_DURATION);
            updates.powerUpExpireTimes = { ...state.powerUpExpireTimes, shield: newExpire };
          }
          break;
        case 'score_boost':
          {
            updates.activePowerUps = { ...state.activePowerUps, scoreBoost: true };
            const currentExpire = state.activePowerUps.scoreBoost ? state.powerUpExpireTimes.scoreBoost : Date.now();
            const newExpire = Math.min(currentExpire + POWER_UP_DURATION, Date.now() + MAX_POWER_UP_DURATION);
            updates.powerUpExpireTimes = { ...state.powerUpExpireTimes, scoreBoost: newExpire };
          }
          break;
        case 'triple_shot':
          {
            updates.activePowerUps = { ...state.activePowerUps, tripleShot: true };
            const currentExpire = state.activePowerUps.tripleShot ? state.powerUpExpireTimes.tripleShot : Date.now();
            const newExpire = Math.min(currentExpire + POWER_UP_DURATION, Date.now() + MAX_POWER_UP_DURATION);
            updates.powerUpExpireTimes = { ...state.powerUpExpireTimes, tripleShot: newExpire };
          }
          break;
        case 'heal':
          // Restore 1 HP, up to maximum of 3
          updates.lives = Math.min(3, state.lives + 1);
          break;
      }

      return updates as GameStore;
    });
  },

  takeDamage: () => {
    set((state) => {
      // Check for shield, invincibility, or fever time (player is invincible during fever)
      if (state.activePowerUps.shield || state.isInvincible || state.isFeverTime) return state;

      const newLives = state.lives - 1;
      if (newLives <= 0) {
        return { lives: 0, isPlaying: false, isGameOver: true, isInvincible: false, invincibleUntil: 0 };
      }
      // Set invincibility for 5 seconds after taking damage
      return {
        lives: newLives,
        isInvincible: true,
        invincibleUntil: Date.now() + INVINCIBILITY_DURATION,
      };
    });
  },

  // Boss body collision: ignores shield, consumes shield first, then takes life
  takeDamageForceBoss: () => {
    set((state) => {
      // Invincibility and fever still protect
      if (state.isInvincible || state.isFeverTime) return state;

      // If shield is active, consume shield but don't lose a life
      if (state.activePowerUps.shield) {
        return {
          activePowerUps: { ...state.activePowerUps, shield: false },
          powerUpExpireTimes: { ...state.powerUpExpireTimes, shield: 0 },
          isInvincible: true,
          invincibleUntil: Date.now() + INVINCIBILITY_DURATION,
        };
      }

      const newLives = state.lives - 1;
      if (newLives <= 0) {
        return { lives: 0, isPlaying: false, isGameOver: true, isInvincible: false, invincibleUntil: 0 };
      }
      return {
        lives: newLives,
        isInvincible: true,
        invincibleUntil: Date.now() + INVINCIBILITY_DURATION,
      };
    });
  },

  spawnBoss: () => {
    set((state) => {
      // Define boss configurations: [pattern, bossType, fireRate, size]
      const bossConfigs: { pattern: EnemyAttackPattern; bossType: BossType; fireRate: number; size: number }[] = [
        { pattern: 'spiral', bossType: 'demon', fireRate: 250, size: 2.5 },     // Demon: rotating 6-way shots (slower fire)
        { pattern: 'barrage', bossType: 'mech', fireRate: 400, size: 2.8 },     // Mech: heavy downward barrage (slower fire)
        { pattern: 'laser', bossType: 'dragon', fireRate: 200, size: 2.6 },     // Dragon: sweeping laser (slower fire)
        { pattern: 'ring', bossType: 'golem', fireRate: 500, size: 3.0 },       // Golem: expanding rings (slower fire)
        { pattern: 'homing', bossType: 'phantom', fireRate: 600, size: 2.4 },   // Phantom: homing missiles (slower fire)
        { pattern: 'burst', bossType: 'sprite', fireRate: 350, size: 1.5 },     // Sprite: small, fast, agile (slower fire)
        { pattern: 'hydra', bossType: 'hydra', fireRate: 300, size: 2.7 },      // Hydra: multi-head alternating shots
        { pattern: 'kraken', bossType: 'kraken', fireRate: 350, size: 3.2 },    // Kraken: wave-like tentacle sweeps
      ];

      const config = bossConfigs[state.bossesDefeated % bossConfigs.length];
      // Boss health is 9x normal (base 30 + 10 per boss defeated, then 9x)
      const bossHealth = (30 + state.bossesDefeated * 10) * 9;

      const boss: Enemy = {
        id: `boss-${state.enemyIdCounter}`,
        asset: { id: 'boss', type: 'token', name: config.bossType.toUpperCase(), imageUrl: '', contractAddress: '' },
        position: { x: 0, y: GAME_BOUNDS.maxY + 2, z: 0 },
        velocity: { x: 0, y: -0.5, z: 0 },
        health: bossHealth,
        maxHealth: bossHealth,
        size: config.size,
        isBlock: false,
        isBoss: true,
        isShiny: false,
        isElite: false,
        bossType: config.bossType,
        attackPattern: config.pattern,
        lastFireTime: 0,
        fireRate: config.fireRate,
      };
      console.log('Spawning boss!', boss.id, 'Type:', config.bossType, 'Pattern:', config.pattern);
      return {
        enemies: [...state.enemies, boss],
        enemyIdCounter: state.enemyIdCounter + 1,
        bossActive: true,
      };
    });
  },

  updateGame: (deltaTime) => {
    const state = get();
    if (!state.isPlaying || state.isPaused) return;

    const currentTime = Date.now();
    let updates: Partial<GameStore> = {};

    // Get assets or use default
    const assets = state.walletAssets.length > 0 ? state.walletAssets : [DEFAULT_ASSET];

    // Calculate difficulty based on elapsed time
    const elapsedTime = currentTime - state.gameStartTime;
    const difficultyProgress = Math.min(1, elapsedTime / DIFFICULTY_RAMP_TIME);

    // Spawn rate decreases over time (faster spawns) - using square root for more gradual increase
    const spawnRateProgress = Math.sqrt(difficultyProgress); // More gradual curve
    const currentSpawnRate = SPAWN_RATE_INITIAL - (SPAWN_RATE_INITIAL - SPAWN_RATE_MIN) * spawnRateProgress;

    // Spawn count increases over time - using square root for more gradual increase
    // Reduced scaling: slower increase, less impact from bosses defeated
    const baseSpawnCount = Math.floor(SPAWN_COUNT_INITIAL + (SPAWN_COUNT_MAX - SPAWN_COUNT_INITIAL) * spawnRateProgress * 0.7);
    const spawnCount = Math.min(SPAWN_COUNT_MAX, baseSpawnCount + Math.floor(state.bossesDefeated * 0.15));

    // Available attack patterns unlock over time
    const getAvailablePatterns = (): EnemyAttackPattern[] => {
      const patterns: EnemyAttackPattern[] = ['straight']; // Always available
      if (elapsedTime > 10000) patterns.push('spread'); // After 10 seconds
      if (elapsedTime > 25000) patterns.push('aimed'); // After 25 seconds
      if (elapsedTime > 45000) patterns.push('circular'); // After 45 seconds
      if (elapsedTime > 60000) patterns.push('wave'); // After 60 seconds
      if (elapsedTime > 80000) patterns.push('burst'); // After 80 seconds
      return patterns;
    };

    // Check if boss is about to spawn (within 2 seconds)
    const BOSS_SPAWN_WARNING_TIME = 2000; // 2 seconds before boss spawns
    let bossAboutToSpawn = false;
    if (!state.bossActive) {
      if (state.bossesDefeated === 0) {
        // First boss: check if we're close to kill threshold
        const killsForFirstBoss = KILLS_PER_BOSS;
        // If we're within a few kills of the boss, consider it "about to spawn"
        bossAboutToSpawn = state.killCount >= killsForFirstBoss - 2;
      } else if (state.lastBossDefeatedTime > 0) {
        // Subsequent bosses: check if we're within 2 seconds of spawn time
        const BOSS_RESPAWN_DELAY_CHECK = 30000; // Must match BOSS_RESPAWN_DELAY below
        const timeSinceBossDefeat = currentTime - state.lastBossDefeatedTime;
        bossAboutToSpawn = timeSinceBossDefeat >= (BOSS_RESPAWN_DELAY_CHECK - BOSS_SPAWN_WARNING_TIME);
      }
    }

    // Check fever time status
    const isFeverActive = state.isFeverTime && currentTime < state.feverTimeUntil;

    // Dramatically reduce spawn rate during boss phase (boss active or about to spawn)
    // But during fever time, spawn rate is dramatically increased
    const inBossPhase = state.bossActive || bossAboutToSpawn;
    let effectiveSpawnRate: number;
    if (isFeverActive) {
      effectiveSpawnRate = 200; // Very fast spawns during fever (5 per second)
    } else if (inBossPhase) {
      effectiveSpawnRate = currentSpawnRate * 5; // 5x slower during boss phase
    } else {
      effectiveSpawnRate = currentSpawnRate;
    }

    // Spawn enemies based on time-scaled difficulty
    if (state.lastSpawnTime === 0 || currentTime - state.lastSpawnTime > effectiveSpawnRate) {
      const availablePatterns = getAvailablePatterns();
      const newEnemies: Enemy[] = [];

      // Determine spawn count based on phase
      let effectiveSpawnCount: number;
      if (isFeverActive) {
        effectiveSpawnCount = 5 + Math.floor(Math.random() * 3); // 5-7 enemies during fever
      } else if (inBossPhase) {
        effectiveSpawnCount = Math.max(1, Math.floor(spawnCount / 3));
      } else {
        effectiveSpawnCount = spawnCount;
      }

      // 5% chance for formation spawn (only when no boss and no fever)
      const isFormation = !inBossPhase && !isFeverActive && Math.random() < 0.05;

      if (isFormation) {
        // Formation spawn: 3-5 enemies in a pattern
        const formationCount = 3 + Math.floor(Math.random() * 3); // 3-5
        const formationType = Math.floor(Math.random() * 3); // 0=V, 1=horizontal, 2=vertical
        const centerX = GAME_BOUNDS.minX + 2 + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX - 4);
        const baseY = GAME_BOUNDS.maxY + 3;
        const baseSpeed = ENEMY_SPEED_MIN + (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) * difficultyProgress;
        const sharedVelX = (Math.random() - 0.5) * 1; // Shared horizontal drift
        const sharedVelY = -baseSpeed - Math.random() * 0.5;
        const formationAsset = assets[Math.floor(Math.random() * assets.length)];
        const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        const fireRate = pattern === 'none' ? 0 : pattern === 'circular' ? 1500 : pattern === 'spread' ? 1200 : pattern === 'aimed' ? 800 : pattern === 'wave' ? 600 : pattern === 'burst' ? 1800 : 1000;
        const healthBonus = Math.floor(elapsedTime / 180000);
        const enemyHealth = 2 + healthBonus;

        for (let i = 0; i < formationCount; i++) {
          let offsetX = 0;
          let offsetY = 0;
          const spacing = 1.2;

          if (formationType === 0) {
            // V-formation
            const half = Math.floor(formationCount / 2);
            const relIdx = i - half;
            offsetX = relIdx * spacing;
            offsetY = -Math.abs(relIdx) * spacing * 0.7;
          } else if (formationType === 1) {
            // Horizontal line
            const half = (formationCount - 1) / 2;
            offsetX = (i - half) * spacing;
          } else {
            // Vertical line
            offsetY = -i * spacing * 0.8;
          }

          const posX = Math.max(GAME_BOUNDS.minX + 0.5, Math.min(GAME_BOUNDS.maxX - 0.5, centerX + offsetX));

          const newEnemy: Enemy = {
            id: `enemy-${(updates.enemyIdCounter || state.enemyIdCounter) + i}`,
            asset: formationAsset,
            position: { x: posX, y: baseY + offsetY, z: 0 },
            velocity: { x: sharedVelX, y: sharedVelY, z: 0 },
            health: enemyHealth,
            maxHealth: enemyHealth,
            size: 0.6,
            isBlock: false,
            isBoss: false,
            isShiny: false,
            isElite: false,
            attackPattern: pattern,
            lastFireTime: currentTime + Math.random() * 500,
            fireRate,
          };
          newEnemies.push(newEnemy);
        }
        updates.enemyIdCounter = (updates.enemyIdCounter || state.enemyIdCounter) + formationCount;
      } else {
        // Normal spawn
        for (let i = 0; i < effectiveSpawnCount; i++) {
          const randomAsset = assets[Math.floor(Math.random() * assets.length)];
          // During fever time, all enemies don't attack (100% non-attacking)
          const isFeverEnemy = isFeverActive;
          const pattern = isFeverEnemy ? 'none' : availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
          const fireRate = pattern === 'none' ? 0 : pattern === 'circular' ? 1500 : pattern === 'spread' ? 1200 : pattern === 'aimed' ? 800 : pattern === 'wave' ? 600 : pattern === 'burst' ? 1800 : 1000;

          // Enemy speed increases with difficulty over 10 minutes
          const baseSpeed = ENEMY_SPEED_MIN + (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) * difficultyProgress;

          // Enemy health increases over time (no upper limit)
          // Base health 2 (reduced), increases by 1 every 180 seconds
          // Fever enemies always have 1 HP for easy kills
          const healthBonus = Math.floor(elapsedTime / 180000);
          let enemyHealth = isFeverEnemy ? 1 : 2 + healthBonus; // Fever enemies have 1 HP

          // 0.1% chance for shiny enemy (rare, more HP, drops 5 items)
          const isShiny = Math.random() < 0.001;

          // 20% chance for elite enemy (more HP, higher drop rate) - only if not shiny
          const isElite = !isShiny && Math.random() < 0.2;

          if (isShiny) {
            enemyHealth = enemyHealth * 4; // Shiny enemies have 4x health
          } else if (isElite) {
            enemyHealth = enemyHealth * 6; // Elite enemies have 6x health
          }

          // Size based on enemy type: shiny > elite > regular
          const enemySize = isShiny ? 0.9 + Math.random() * 0.2 : (isElite ? 0.75 + Math.random() * 0.2 : 0.5 + Math.random() * 0.25);

          const newEnemy: Enemy = {
            id: `enemy-${(updates.enemyIdCounter || state.enemyIdCounter) + i}`,
            asset: randomAsset,
            position: {
              x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
              y: GAME_BOUNDS.maxY + 2 + Math.random() * 2,
              z: 0,
            },
            velocity: {
              x: (Math.random() - 0.5) * 2,
              y: -baseSpeed - Math.random() * 1,
              z: 0,
            },
            health: enemyHealth,
            maxHealth: enemyHealth,
            size: enemySize,
            isBlock: false,
            isBoss: false,
            isShiny,
            isElite,
            attackPattern: pattern,
            lastFireTime: currentTime + Math.random() * 500,
            fireRate,
          };
          newEnemies.push(newEnemy);
        }
      }
      updates.enemies = [...state.enemies, ...newEnemies];
      updates.lastSpawnTime = currentTime;
      if (!isFormation) {
        updates.enemyIdCounter = (updates.enemyIdCounter || state.enemyIdCounter) + effectiveSpawnCount;
      }
    }

    // Spawn block with wallet token/NFT image
    if (state.lastBlockSpawnTime === 0 || currentTime - state.lastBlockSpawnTime > BLOCK_SPAWN_RATE) {
      // Use random wallet asset for block image
      const blockAsset = assets[Math.floor(Math.random() * assets.length)];
      const newBlock: Enemy = {
        id: `block-${updates.enemyIdCounter || state.enemyIdCounter}`,
        asset: blockAsset, // Use wallet asset with imageUrl
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY + 2,
          z: 0,
        },
        velocity: { x: 0, y: -2, z: 0 },
        health: 5,
        maxHealth: 5,
        size: 1.0,
        isBlock: true,
        isBoss: false,
        isShiny: false,
        isElite: false,
        attackPattern: 'none',
        lastFireTime: 0,
        fireRate: 0,
      };
      updates.enemies = [...(updates.enemies || state.enemies), newBlock];
      updates.lastBlockSpawnTime = currentTime;
      updates.enemyIdCounter = (updates.enemyIdCounter || state.enemyIdCounter) + 1;
    }

    // Use updated enemies if spawned, otherwise use state
    let enemies = updates.enemies || state.enemies;

    // Boss stop position (upper middle of the stage)
    const BOSS_STOP_Y = 4;

    // Update positions
    enemies = enemies.map((enemy) => {
      let newY = enemy.position.y + enemy.velocity.y * deltaTime;
      let newX = enemy.position.x + enemy.velocity.x * deltaTime;
      let newVelX = enemy.velocity.x;
      let newVelY = enemy.velocity.y;

      // All enemies bounce off side walls
      const enemyHalfSize = enemy.size / 2;
      if (newX <= GAME_BOUNDS.minX + enemyHalfSize) {
        newX = GAME_BOUNDS.minX + enemyHalfSize;
        newVelX = Math.abs(newVelX); // Bounce right
      } else if (newX >= GAME_BOUNDS.maxX - enemyHalfSize) {
        newX = GAME_BOUNDS.maxX - enemyHalfSize;
        newVelX = -Math.abs(newVelX); // Bounce left
      }

      // Boss stops at upper middle of stage
      if (enemy.isBoss && newY <= BOSS_STOP_Y) {
        newY = BOSS_STOP_Y;

        // Sprite boss moves horizontally and erratically
        if (enemy.bossType === 'sprite') {
          // Fast horizontal movement with direction changes at edges
          const spriteSpeed = 4;
          if (newVelX === 0) {
            newVelX = spriteSpeed * (Math.random() > 0.5 ? 1 : -1);
          }

          // Randomly change direction sometimes
          if (Math.random() < 0.01) {
            newVelX = -newVelX;
          }

          // Add slight vertical bobbing
          const bobAmount = Math.sin(currentTime / 300) * 0.5;
          newY = BOSS_STOP_Y + bobAmount;
        }
      }

      return {
        ...enemy,
        position: {
          x: newX,
          y: newY,
          z: 0,
        },
        velocity: {
          x: newVelX,
          y: newVelY,
          z: 0,
        },
      };
    });

    let bullets = state.bullets.map((bullet) => ({
      ...bullet,
      position: {
        x: bullet.position.x + bullet.velocity.x * deltaTime,
        y: bullet.position.y + bullet.velocity.y * deltaTime,
        z: 0,
      },
    }));

    let powerUps = state.powerUps.map((p) => ({
      ...p,
      position: {
        x: p.position.x + p.velocity.x * deltaTime,
        y: p.position.y + p.velocity.y * deltaTime,
        z: 0,
      },
    }));

    // Get main player position for coin attraction
    const mainPlayer = state.players.find((p) => p.isMain);
    const playerPos = mainPlayer ? mainPlayer.position : { x: 0, y: -3, z: 0 };

    // Update coins - drop phase then fly to player
    const COIN_DROP_DURATION = 500; // ms in drop phase
    const COIN_FLY_SPEED = 15; // Speed when flying to player
    const COIN_COLLECT_DISTANCE = 0.8; // Distance at which coins are collected

    let coinScoreIncrease = 0;
    let coins = state.coins.map((coin) => {
      const newCoin = { ...coin };
      newCoin.dropTime += deltaTime * 1000;

      if (newCoin.phase === 'drop') {
        // Drop phase - coins fall and spread out
        newCoin.position = {
          x: coin.position.x + coin.velocity.x * deltaTime,
          y: coin.position.y + coin.velocity.y * deltaTime,
          z: coin.position.z,
        };

        // After drop duration, switch to fly phase
        if (newCoin.dropTime >= COIN_DROP_DURATION) {
          newCoin.phase = 'fly';
        }
      } else {
        // Fly phase - coins accelerate towards player
        const dx = playerPos.x - coin.position.x;
        const dy = playerPos.y - coin.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
          const dirX = dx / dist;
          const dirY = dy / dist;
          // Accelerate as coins get closer
          const speed = COIN_FLY_SPEED * (1 + (1 / (dist + 0.5)));
          newCoin.position = {
            x: coin.position.x + dirX * speed * deltaTime,
            y: coin.position.y + dirY * speed * deltaTime,
            z: coin.position.z,
          };
        }
      }

      return newCoin;
    });

    // Remove coins that reached the player and add score
    coins = coins.filter((coin) => {
      const dx = playerPos.x - coin.position.x;
      const dy = playerPos.y - coin.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= COIN_COLLECT_DISTANCE) {
        coinScoreIncrease += 10; // Each coin gives 10 points
        return false;
      }
      return true;
    });

    // Update enemy bullets
    let enemyBullets = state.enemyBullets.map((b) => ({
      ...b,
      position: {
        x: b.position.x + b.velocity.x * deltaTime,
        y: b.position.y + b.velocity.y * deltaTime,
        z: 0,
      },
    }));

    // Remove enemy bullets that are off screen or hit side walls
    enemyBullets = enemyBullets.filter(
      (b) => b.position.y > GAME_BOUNDS.minY - 2 && b.position.y < GAME_BOUNDS.maxY + 2 &&
             b.position.x > GAME_BOUNDS.minX && b.position.x < GAME_BOUNDS.maxX // Disappear on wall hit
    );

    // Enemy firing logic (mainPlayer already defined above for coin collection)
    const newEnemyBullets: EnemyBullet[] = [];
    let enemyBulletIdCounter = updates.enemyBulletIdCounter || state.enemyBulletIdCounter;

    // Calculate current bullet speed based on difficulty (scales over 10 minutes)
    const currentBulletSpeed = ENEMY_BULLET_SPEED_MIN + (ENEMY_BULLET_SPEED_MAX - ENEMY_BULLET_SPEED_MIN) * difficultyProgress;

    // Calculate bullet count multiplier: starts at 0.5 (half), reaches 1.0 (full) at 10 minutes
    // Non-boss enemies use this to scale their bullet counts
    const bulletCountMultiplier = 0.5 + 0.5 * difficultyProgress;

    for (const enemy of enemies) {
      if (enemy.isBlock || enemy.attackPattern === 'none') continue;
      if (enemy.position.y > GAME_BOUNDS.maxY || enemy.position.y < GAME_BOUNDS.minY) continue;

      // Calculate effective fire rate
      let effectiveFireRate = enemy.fireRate;

      // If enemy is below player and can shoot upward (aimed, burst patterns),
      // dramatically reduce attack frequency (5x slower)
      const canShootUpward = enemy.attackPattern === 'aimed' || enemy.attackPattern === 'burst';
      const isBelowPlayer = mainPlayer && enemy.position.y < mainPlayer.position.y;
      if (canShootUpward && isBelowPlayer && !enemy.isBoss) {
        effectiveFireRate = enemy.fireRate * 5; // 5x slower when below player
      }

      if (currentTime - enemy.lastFireTime > effectiveFireRate) {
        enemy.lastFireTime = currentTime;
        const bulletColor = ENEMY_BULLET_COLORS[Math.floor(Math.random() * ENEMY_BULLET_COLORS.length)];

        // Boss phase-based attack pattern switching
        // When HP drops below 50%, bosses become more aggressive with different attacks
        let currentPattern = enemy.attackPattern;
        if (enemy.isBoss) {
          const hpPercent = enemy.health / enemy.maxHealth;
          const timePhase = Math.floor(currentTime / 8000) % 3; // Change pattern every 8 seconds

          // Phase 1 (100-50% HP): Primary pattern + occasional aimed shots
          // Phase 2 (below 50% HP): More aggressive patterns
          if (hpPercent < 0.5) {
            // Rage mode: alternate between original pattern and more aggressive variants
            if (timePhase === 1) {
              // Every 8 seconds, fire aimed bursts at player
              currentPattern = 'aimed';
            } else if (timePhase === 2 && enemy.bossType !== 'sprite') {
              // Add spread shots periodically (not for sprite - it moves too fast)
              currentPattern = 'spread';
            }
          } else {
            // Normal phase: occasionally add variety
            if (timePhase === 2) {
              // Sometimes fire aimed shots to force player to move
              if (Math.random() < 0.3) {
                currentPattern = 'aimed';
              }
            }
          }
        }

        switch (currentPattern) {
          case 'straight':
            newEnemyBullets.push({
              id: `eb-${enemyBulletIdCounter++}`,
              position: { ...enemy.position },
              velocity: { x: 0, y: -currentBulletSpeed, z: 0 },
              size: 0.15,
              color: bulletColor,
            });
            break;

          case 'spread':
            // 1-2 bullets based on difficulty progress
            {
              const spreadBulletCount = Math.max(1, Math.ceil(2 * bulletCountMultiplier));
              const angleStep = spreadBulletCount > 1 ? 40 / (spreadBulletCount - 1) : 0;
              for (let i = 0; i < spreadBulletCount; i++) {
                const angle = spreadBulletCount > 1 ? -20 + i * angleStep : 0;
                const rad = (angle * Math.PI) / 180;
                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: Math.sin(rad) * currentBulletSpeed * 0.7,
                    y: -Math.cos(rad) * currentBulletSpeed * 0.7,
                    z: 0,
                  },
                  size: 0.12,
                  color: bulletColor,
                });
              }
            }
            break;

          case 'aimed':
            if (mainPlayer) {
              const dx = mainPlayer.position.x - enemy.position.x;
              const dy = mainPlayer.position.y - enemy.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: (dx / dist) * currentBulletSpeed,
                    y: (dy / dist) * currentBulletSpeed,
                    z: 0,
                  },
                  size: 0.18,
                  color: '#FF6B6B',
                });
              }
            }
            break;

          case 'circular':
            // 2-3 bullets based on difficulty progress
            {
              const circularBulletCount = Math.max(2, Math.ceil(3 * bulletCountMultiplier));
              for (let i = 0; i < circularBulletCount; i++) {
                const angle = (i / circularBulletCount) * Math.PI * 2;
                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: Math.cos(angle) * currentBulletSpeed * 0.5,
                    y: Math.sin(angle) * currentBulletSpeed * 0.5,
                    z: 0,
                  },
                  size: 0.1,
                  color: bulletColor,
                });
              }
            }
            break;

          case 'wave':
            // Wave pattern - single bullet
            newEnemyBullets.push({
              id: `eb-${enemyBulletIdCounter++}`,
              position: { x: enemy.position.x, y: enemy.position.y, z: 0 },
              velocity: {
                x: Math.sin(currentTime / 100) * 2,
                y: -currentBulletSpeed * 0.6,
                z: 0,
              },
              size: 0.14,
              color: '#54E6CB',
            });
            break;

          case 'burst':
            // Burst pattern - aimed shots with spread, pattern varies over time
            // Difficulty scales with bosses defeated for sprite boss
            if (mainPlayer) {
              const dx = mainPlayer.position.x - enemy.position.x;
              const dy = mainPlayer.position.y - enemy.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const baseAngle = Math.atan2(dy, dx);
                const bossLevel = state.bossesDefeated;
                const phaseDuration = Math.max(1000, 2000 - bossLevel * 150); // Faster phase changes
                const burstPhase = Math.floor(currentTime / phaseDuration) % 4;

                // Different burst patterns based on phase
                if (enemy.isBoss && enemy.bossType === 'sprite') {
                  // Sprite boss: rapid bursts in varying directions
                  const burstCount = 3 + Math.floor(bossLevel / 2); // More bullets
                  const bulletSpeed = 0.8 + bossLevel * 0.05;
                  for (let i = 0; i < burstCount; i++) {
                    const spreadMultiplier = burstPhase === 0 ? 0.15 : burstPhase === 1 ? -0.15 : burstPhase === 2 ? 0.25 : 0.2;
                    const spreadOffset = spreadMultiplier * (i - (burstCount - 1) / 2);
                    const angle = baseAngle + spreadOffset;
                    newEnemyBullets.push({
                      id: `eb-${enemyBulletIdCounter++}`,
                      position: { ...enemy.position },
                      velocity: {
                        x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                        y: Math.sin(angle) * currentBulletSpeed * bulletSpeed,
                        z: 0,
                      },
                      size: 0.13,
                      color: '#00FFFF',
                    });
                  }
                } else {
                  // Regular enemies: single aimed bullet
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(baseAngle) * currentBulletSpeed * 0.9,
                      y: Math.sin(baseAngle) * currentBulletSpeed * 0.9,
                      z: 0,
                    },
                    size: 0.13,
                    color: '#FFD93D',
                  });
                }
              }
            }
            break;

          case 'spiral':
            // Boss spiral pattern - continuously rotating shot (slower, more varied)
            // Difficulty scales with bosses defeated
            {
              const bossLevel = state.bossesDefeated;
              const rotationSpeed = 0.0015 + bossLevel * 0.0002; // Slower rotation
              const baseAngle = (currentTime * rotationSpeed) % (Math.PI * 2);
              const numDirections = 5 + Math.floor(bossLevel / 3); // Fewer directions
              const bulletSpeed = 0.35 + bossLevel * 0.03; // Much slower bullets

              // Every 6 seconds, change between clockwise and counter-clockwise
              const directionMultiplier = Math.floor(currentTime / 6000) % 2 === 0 ? 1 : -1;
              const adjustedAngle = baseAngle * directionMultiplier;

              // Add wave-like variation to the pattern
              const waveOffset = Math.sin(currentTime * 0.002) * 0.3;

              for (let i = 0; i < numDirections; i++) {
                const angle = adjustedAngle + (i / numDirections) * Math.PI * 2 + waveOffset;
                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                    y: Math.sin(angle) * currentBulletSpeed * bulletSpeed - 1.0,
                    z: 0,
                  },
                  size: 0.2,
                  color: '#A66CFF',
                });
              }
            }
            break;

          case 'barrage':
            // Boss barrage pattern - sweeping fan of bullets that moves left/right (slower, varied)
            // Difficulty scales with bosses defeated
            {
              const bossLevel = state.bossesDefeated;
              const sweepCycle = Math.max(2000, 3500 - bossLevel * 150); // Slower sweeps
              const sweepProgress = (currentTime % sweepCycle) / sweepCycle;
              const sweepOffset = Math.sin(sweepProgress * Math.PI * 2) * (0.3 + bossLevel * 0.03);
              const numBullets = 3 + Math.floor(bossLevel / 3); // Fewer bullets
              const bulletSpeed = 0.45 + bossLevel * 0.025; // Much slower bullets

              // Add alternating density pattern
              const densityPhase = Math.floor(currentTime / 2000) % 3;
              const actualBullets = densityPhase === 2 ? numBullets + 2 : numBullets;

              for (let i = 0; i < actualBullets; i++) {
                const baseAngle = ((i - (actualBullets - 1) / 2) / (actualBullets - 1)) * Math.PI * 0.6 - Math.PI / 2;
                const angle = baseAngle + sweepOffset;
                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                    y: Math.sin(angle) * currentBulletSpeed * bulletSpeed,
                    z: 0,
                  },
                  size: 0.22,
                  color: '#FF6B6B',
                });
              }
            }
            break;

          case 'laser':
            // Dragon boss - sweeping fire breath with pauses (slower, more dodgeable)
            // Difficulty scales with bosses defeated
            {
              const bossLevel = state.bossesDefeated;
              const sweepDuration = Math.max(1200, 2000 - bossLevel * 80); // Slower sweeps
              const sweepProgress = (currentTime % sweepDuration) / sweepDuration;
              const sweepRange = 0.5 + bossLevel * 0.05; // Narrower sweep angle

              // Add pause phases - only fire during certain parts of the cycle
              const firePhase = sweepProgress > 0.15 && sweepProgress < 0.85;
              if (firePhase) {
                const adjustedProgress = (sweepProgress - 0.15) / 0.7;
                const baseAngle = -Math.PI / 2 + (adjustedProgress - 0.5) * Math.PI * sweepRange;
                const numBullets = 2 + Math.floor(bossLevel / 4); // Fewer bullets
                const bulletSpeed = 0.45 + bossLevel * 0.025; // Much slower

                for (let i = 0; i < numBullets; i++) {
                  const spreadOffset = (i - (numBullets - 1) / 2) * 0.12;
                  const angle = baseAngle + spreadOffset;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                      y: Math.sin(angle) * currentBulletSpeed * bulletSpeed,
                      z: 0,
                    },
                    size: 0.25,
                    color: '#54E6CB',
                  });
                }
              }
            }
            break;

          case 'ring':
            // Golem boss - expanding rings with gaps for dodging (slower, varied)
            // Difficulty scales with bosses defeated
            {
              const bossLevel = state.bossesDefeated;
              const phaseDuration = Math.max(2500, 4500 - bossLevel * 250); // Slower phase changes
              const patternPhase = Math.floor(currentTime / phaseDuration) % 4;
              const baseBullets = 8 + bossLevel; // Fewer bullets with gaps
              const numBullets = patternPhase === 3 ? Math.floor(baseBullets * 0.6) : baseBullets;
              const ringOffset = (currentTime * (0.0008 + bossLevel * 0.0001)) % (Math.PI * 2); // Slower rotation
              const bulletSpeed = 0.3 + bossLevel * 0.02; // Much slower bullets

              // Create gaps in the ring for player to pass through
              const gapAngle = (currentTime * 0.001) % (Math.PI * 2);
              const gapSize = 0.8 - bossLevel * 0.05; // Gap gets smaller over time

              for (let i = 0; i < numBullets; i++) {
                const angle = ringOffset + (i / numBullets) * Math.PI * 2;
                // Skip bullets near the gap
                const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (angleDiff < gapSize) continue;

                newEnemyBullets.push({
                  id: `eb-${enemyBulletIdCounter++}`,
                  position: { ...enemy.position },
                  velocity: {
                    x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                    y: Math.sin(angle) * currentBulletSpeed * bulletSpeed - 0.8,
                    z: 0,
                  },
                  size: 0.18,
                  color: '#6BCB77',
                });
              }
            }
            break;

          case 'homing':
            // Phantom boss - homing missiles with pauses for dodging (slower)
            // Difficulty scales with bosses defeated
            if (mainPlayer) {
              const bossLevel = state.bossesDefeated;
              const phaseDuration = Math.max(3000, 5500 - bossLevel * 300); // Slower phase changes
              const homingPhase = Math.floor(currentTime / phaseDuration) % 4;
              const numMissiles = 2 + Math.floor(bossLevel / 3); // Fewer missiles
              const bulletSpeed = 0.4 + bossLevel * 0.025; // Much slower
              const baseAngle = Math.atan2(
                mainPlayer.position.y - enemy.position.y,
                mainPlayer.position.x - enemy.position.x
              );

              // Phase 3 is a pause phase - no attack
              if (homingPhase === 0) {
                // Direct aim at player - fewer bullets
                for (let i = 0; i < Math.min(numMissiles, 4); i++) {
                  const spreadAngle = ((i - (numMissiles - 1) / 2) * 0.3);
                  const angle = baseAngle + spreadAngle;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                      y: Math.sin(angle) * currentBulletSpeed * bulletSpeed,
                      z: 0,
                    },
                    size: 0.2,
                    color: '#A66CFF',
                  });
                }
              } else if (homingPhase === 1) {
                // Wide spread - slower bullets
                const spreadCount = 4 + Math.floor(bossLevel / 3);
                for (let i = 0; i < spreadCount; i++) {
                  const angle = baseAngle + (i - (spreadCount - 1) / 2) * 0.4;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(angle) * currentBulletSpeed * 0.35,
                      y: Math.sin(angle) * currentBulletSpeed * 0.35,
                      z: 0,
                    },
                    size: 0.18,
                    color: '#FF9FF3',
                  });
                }
              } else if (homingPhase === 2) {
                // Predictive shots - slower
                const predictionOffset = Math.sin(currentTime / 600) * 0.4;
                const numPredictive = 2 + Math.floor(bossLevel / 4);
                for (let i = 0; i < numPredictive; i++) {
                  const angle = baseAngle + predictionOffset + (i - (numPredictive - 1) / 2) * 0.25;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(angle) * currentBulletSpeed * 0.45,
                      y: Math.sin(angle) * currentBulletSpeed * 0.45,
                      z: 0,
                    },
                    size: 0.2,
                    color: '#A66CFF',
                  });
                }
              }
            }
            break;

          case 'hydra':
            // Hydra boss - multi-head attack with alternating directions (slow, varied)
            // Each "head" fires in a different direction, alternating patterns
            {
              const bossLevel = state.bossesDefeated;
              const headPhase = Math.floor(currentTime / 1500) % 5; // 5 different head patterns
              const bulletSpeed = 0.35 + bossLevel * 0.02; // Slow bullets
              const numHeads = 3; // Three heads

              // Each head has a different base angle
              const headAngles = [
                -Math.PI * 0.7, // Left head
                -Math.PI * 0.5, // Center head (down)
                -Math.PI * 0.3, // Right head
              ];

              // Alternate which heads fire
              const activeHeads = headPhase === 0 ? [0, 2] : headPhase === 1 ? [1] : headPhase === 2 ? [0, 1, 2] : headPhase === 3 ? [0] : [2];

              for (const headIdx of activeHeads) {
                const baseAngle = headAngles[headIdx];
                const wobble = Math.sin(currentTime * 0.003 + headIdx * 2) * 0.2;
                const bulletsPerHead = 2 + Math.floor(bossLevel / 4);

                for (let i = 0; i < bulletsPerHead; i++) {
                  const spreadOffset = (i - (bulletsPerHead - 1) / 2) * 0.15;
                  const angle = baseAngle + wobble + spreadOffset;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: {
                      x: enemy.position.x + Math.cos(baseAngle) * 0.5,
                      y: enemy.position.y + Math.sin(baseAngle) * 0.5,
                      z: 0,
                    },
                    velocity: {
                      x: Math.cos(angle) * currentBulletSpeed * bulletSpeed,
                      y: Math.sin(angle) * currentBulletSpeed * bulletSpeed,
                      z: 0,
                    },
                    size: 0.2,
                    color: '#8B4513', // Brown/bronze color
                  });
                }
              }
            }
            break;

          case 'kraken':
            // Kraken boss - wave-like tentacle sweeps (slow, beautiful patterns)
            // Creates sweeping arcs that look like tentacle attacks
            {
              const bossLevel = state.bossesDefeated;
              const sweepPhase = Math.floor(currentTime / 2500) % 4;
              const bulletSpeed = 0.3 + bossLevel * 0.02; // Very slow bullets

              // Create wave-like sweeping patterns
              const waveProgress = (currentTime % 2500) / 2500;
              const numTentacles = 2 + Math.floor(bossLevel / 3);

              for (let t = 0; t < numTentacles; t++) {
                const tentacleOffset = (t / numTentacles) * Math.PI;
                const sweepAngle = (sweepPhase % 2 === 0 ? 1 : -1) * (waveProgress - 0.5) * Math.PI * 0.8;
                const baseAngle = -Math.PI / 2 + tentacleOffset * 0.5 - Math.PI * 0.25 + sweepAngle;

                // Each tentacle fires a short burst
                const bulletsPerTentacle = 2;
                for (let i = 0; i < bulletsPerTentacle; i++) {
                  const delay = i * 0.1;
                  const delayedAngle = baseAngle + delay * (sweepPhase % 2 === 0 ? 0.3 : -0.3);

                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(delayedAngle) * currentBulletSpeed * bulletSpeed * (0.8 + i * 0.2),
                      y: Math.sin(delayedAngle) * currentBulletSpeed * bulletSpeed * (0.8 + i * 0.2),
                      z: 0,
                    },
                    size: 0.22,
                    color: '#4169E1', // Royal blue
                  });
                }
              }
            }
            break;
        }

        // Boss anti-camping attack: if player is above the boss, fire additional aimed shots
        // This prevents players from resting in the safe zone above the boss
        if (enemy.isBoss && mainPlayer && mainPlayer.position.y > enemy.position.y + 0.5) {
          // Fire a slow aimed shot upward at the player - triggered with the normal fire rate
          const dx = mainPlayer.position.x - enemy.position.x;
          const dy = mainPlayer.position.y - enemy.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const angle = Math.atan2(dy, dx);
            // Fire single slow aimed bullet at player above (0.4x speed for easier dodging)
            newEnemyBullets.push({
              id: `eb-${enemyBulletIdCounter++}`,
              position: {
                x: enemy.position.x,
                y: enemy.position.y + enemy.size * 0.5, // Fire from top of boss
                z: 0,
              },
              velocity: {
                x: Math.cos(angle) * currentBulletSpeed * 0.4,
                y: Math.sin(angle) * currentBulletSpeed * 0.4,
                z: 0,
              },
              size: 0.25, // Slightly larger so it's more visible
              color: '#FF4444', // Red warning color for anti-camping shots
            });
          }
        }
      }
    }

    enemyBullets = [...enemyBullets, ...newEnemyBullets];
    updates.enemyBulletIdCounter = enemyBulletIdCounter;

    // Collision detection
    // Score multiplier: fever time gives 2x, score boost gives 2x (stacks)
    const feverMultiplier = isFeverActive ? FEVER_SCORE_MULTIPLIER : 1;
    const scoreBoostMultiplier = state.activePowerUps.scoreBoost ? 2 : 1;
    const totalScoreMultiplier = feverMultiplier * scoreBoostMultiplier;

    let scoreIncrease = 0;
    let killIncrease = 0;
    const destroyedEnemyIds = new Set<string>();
    let bossWasDestroyed = false;

    bullets = bullets.filter((bullet) => {
      if (bullet.position.y > GAME_BOUNDS.maxY + 5) return false;

      for (const enemy of enemies) {
        const dx = bullet.position.x - enemy.position.x;
        const dy = bullet.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < enemy.size) {
          enemy.health -= 1;
          if (enemy.health <= 0) {
            destroyedEnemyIds.add(enemy.id);
            if (enemy.isBoss) {
              scoreIncrease += 1000 * totalScoreMultiplier;
              bossWasDestroyed = true;
            } else if (enemy.isShiny) {
              // Shiny enemies give 5x base score
              scoreIncrease += 500 * totalScoreMultiplier;
              killIncrease++;
            } else {
              scoreIncrease += (enemy.isBlock ? 50 : 100) * totalScoreMultiplier;
              if (!enemy.isBlock) killIncrease++;
            }
          }
          return false;
        }
      }
      return true;
    });

    // Remove destroyed enemies and spawn power-ups, coins, and fever coins
    let coinIdCounter = updates.coinIdCounter || state.coinIdCounter;
    let feverCoinIdCounter = updates.feverCoinIdCounter || state.feverCoinIdCounter;
    let feverCoins = [...state.feverCoins];

    enemies = enemies.filter((enemy) => {
      if (destroyedEnemyIds.has(enemy.id)) {
        // Spawn regular coins based on enemy type (more during fever)
        const baseCoinCount = enemy.isBoss ? 15 : (enemy.isBlock ? 2 : 5);
        const coinCount = isFeverActive ? baseCoinCount * 2 : baseCoinCount; // 2x coins during fever
        for (let i = 0; i < coinCount; i++) {
          const angle = (Math.PI * 2 * i) / coinCount + (Math.random() - 0.5) * 0.5;
          const speed = 2 + Math.random() * 3;
          coins.push({
            id: `coin-${coinIdCounter++}`,
            position: {
              x: enemy.position.x + (Math.random() - 0.5) * 0.5,
              y: enemy.position.y + (Math.random() - 0.5) * 0.5,
              z: 0.1,
            },
            velocity: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed - 2,
              z: 0,
            },
            targetPosition: { x: -10, y: 7 },
            phase: 'drop',
            dropTime: 0,
            size: isFeverActive ? 0.2 + Math.random() * 0.15 : 0.15 + Math.random() * 0.1, // Larger coins during fever
          });
        }

        // 2.5% chance to drop a large fever coin (not during fever time or boss fights)
        if (!isFeverActive && !state.bossActive && Math.random() < FEVER_COIN_DROP_CHANCE) {
          feverCoins.push({
            id: `fever-${feverCoinIdCounter++}`,
            position: {
              x: enemy.position.x,
              y: enemy.position.y,
              z: 0.2,
            },
            velocity: {
              x: (Math.random() - 0.5) * 2,
              y: -1,
              z: 0,
            },
            phase: 'drop',
            dropTime: 0,
          });
        }

        // No power-up drops during Fever Time (focus on score)
        if (!isFeverActive) {
          // Higher drop chance for boss, shiny, and elite enemies, pity system for regular enemies/blocks
          // Pity: guaranteed drop after 5 consecutive no-drops
          // During boss fights, drop rate is 75% for normal enemies/blocks
          // Elite enemies have 50% base drop rate
          const currentNoDropStreak = updates.noDropStreak !== undefined ? updates.noDropStreak : state.noDropStreak;
          const pityActive = currentNoDropStreak >= 5;
          let baseDropChance = POWER_UP_DROP_CHANCE;
          if (state.bossActive) {
            baseDropChance = 0.75; // 75% during boss fights
          } else if (enemy.isElite) {
            baseDropChance = 0.5; // 50% for elite enemies
          }
          const dropChance = (enemy.isBoss || enemy.isShiny) ? 1.0 : (pityActive ? 1.0 : baseDropChance);
          const dropCount = enemy.isBoss ? 3 : (enemy.isShiny ? 5 : 1);
          let didDrop = false;

          for (let i = 0; i < dropCount; i++) {
            if (Math.random() < dropChance) {
              didDrop = true;
              // Weighted power-up selection: rapid_fire is more common (35%), heal is very rare (3%)
              const roll = Math.random();
              let selectedType: PowerUpType;
              if (roll < 0.03) {
                selectedType = 'heal'; // 3% chance - very rare heart HP recovery
              } else if (roll < 0.10) {
                selectedType = 'extra_ship'; // 7% chance
              } else if (roll < 0.45) {
                selectedType = 'rapid_fire'; // 35% chance - most common
              } else if (roll < 0.57) {
                selectedType = 'shield'; // 12% chance (reduced)
              } else if (roll < 0.77) {
                selectedType = 'score_boost'; // 20% chance
              } else {
                selectedType = 'triple_shot'; // 23% chance
              }
              powerUps.push({
                id: `powerup-${(updates.powerUpIdCounter || state.powerUpIdCounter) + i}`,
                type: selectedType,
                position: {
                  x: enemy.position.x + (Math.random() - 0.5) * 2,
                  y: enemy.position.y,
                  z: 0,
                },
                velocity: { x: 0, y: -1.5, z: 0 },
              });
            }
          }

          // Update pity counter (not for bosses or shiny - they always drop)
          if (!enemy.isBoss && !enemy.isShiny) {
            if (didDrop) {
              updates.noDropStreak = 0; // Reset streak on drop
            } else {
              updates.noDropStreak = currentNoDropStreak + 1; // Increment streak
            }
          }
          updates.powerUpIdCounter = (updates.powerUpIdCounter || state.powerUpIdCounter) + dropCount;
        }

        return false;
      }
      return enemy.position.y > GAME_BOUNDS.minY - 3;
    });
    updates.coinIdCounter = coinIdCounter;
    updates.feverCoinIdCounter = feverCoinIdCounter;

    // Update fever coin positions
    const FEVER_COIN_DROP_DURATION = 800; // ms in drop phase
    const FEVER_COIN_FLY_SPEED = 12;
    const FEVER_COIN_COLLECT_DISTANCE = 1.2; // Larger collection radius

    feverCoins = feverCoins.map((fc) => {
      const newFc = { ...fc };
      newFc.dropTime += deltaTime * 1000;

      if (newFc.phase === 'drop') {
        newFc.position = {
          x: fc.position.x + fc.velocity.x * deltaTime,
          y: fc.position.y + fc.velocity.y * deltaTime,
          z: fc.position.z,
        };
        if (newFc.dropTime >= FEVER_COIN_DROP_DURATION) {
          newFc.phase = 'fly';
        }
      } else if (mainPlayer) {
        // Fly towards player
        const dx = mainPlayer.position.x - fc.position.x;
        const dy = mainPlayer.position.y - fc.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) {
          const dirX = dx / dist;
          const dirY = dy / dist;
          const speed = FEVER_COIN_FLY_SPEED * (1 + (1 / (dist + 0.5)));
          newFc.position = {
            x: fc.position.x + dirX * speed * deltaTime,
            y: fc.position.y + dirY * speed * deltaTime,
            z: fc.position.z,
          };
        }
      }
      return newFc;
    });

    // Fever coin collection
    let newFeverCoinCount = updates.feverCoinCount !== undefined ? updates.feverCoinCount : state.feverCoinCount;
    let newIsFeverTime = isFeverActive;
    let newFeverTimeUntil = state.feverTimeUntil;

    if (mainPlayer) {
      feverCoins = feverCoins.filter((fc) => {
        const dx = mainPlayer.position.x - fc.position.x;
        const dy = mainPlayer.position.y - fc.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= FEVER_COIN_COLLECT_DISTANCE) {
          newFeverCoinCount++;
          // Check if fever time should activate
          if (newFeverCoinCount >= FEVER_COINS_REQUIRED && !newIsFeverTime) {
            newIsFeverTime = true;
            newFeverTimeUntil = currentTime + FEVER_TIME_DURATION;
            newFeverCoinCount = 0; // Reset counter
            console.log('FEVER TIME ACTIVATED!');
          }
          return false;
        }
        // Remove if off screen
        return fc.position.y > GAME_BOUNDS.minY - 2;
      });
    }

    // Check fever time expiration - use state.isFeverTime to detect when it just expired
    if (state.isFeverTime && currentTime >= state.feverTimeUntil) {
      newIsFeverTime = false;
      newFeverTimeUntil = 0;
      // Remove all non-attacking enemies (fever enemies) when fever time ends
      enemies = enemies.filter((e) => e.attackPattern !== 'none' || e.isBlock);
      console.log('Fever time ended');
    }

    // Player collision with enemies
    if (mainPlayer) {
      for (const enemy of enemies) {
        const dx = mainPlayer.position.x - enemy.position.x;
        const dy = mainPlayer.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Very small hitbox for player (0.15 for precise dodging)
        if (dist < enemy.size + 0.15) {
          if (enemy.isBoss) {
            // Boss collision: always take damage (shield doesn't protect against boss body)
            get().takeDamageForceBoss();
            // Boss is NOT destroyed by player collision
          } else {
            get().takeDamage();
            enemies = enemies.filter((e) => e.id !== enemy.id);
          }
          break;
        }
      }

      // Player collision with enemy bullets
      enemyBullets = enemyBullets.filter((b) => {
        const dx = mainPlayer.position.x - b.position.x;
        const dy = mainPlayer.position.y - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Very small hitbox for player vs bullets (0.1 for precise dodging)
        if (dist < b.size + 0.1) {
          get().takeDamage();
          return false;
        }
        return true;
      });

      // Power-up collection
      powerUps = powerUps.filter((p) => {
        const dx = mainPlayer.position.x - p.position.x;
        const dy = mainPlayer.position.y - p.position.y;
        if (Math.sqrt(dx * dx + dy * dy) < 1.5) {
          get().collectPowerUp(p.id);
          return false;
        }
        return p.position.y > GAME_BOUNDS.minY - 3;
      });
    }

    // Track kills and boss spawning
    const newKillCount = state.killCount + killIncrease;
    const BOSS_RESPAWN_DELAY = 30000; // 30 seconds after boss defeat

    // Boss spawn logic:
    // - First boss: spawns when kill count reaches threshold
    // - Subsequent bosses: spawn 20 seconds after previous boss was defeated
    // - Delayed during Fever Time until it ends
    let shouldSpawnBoss = false;
    if (!state.bossActive && !isFeverActive) {
      if (state.bossesDefeated === 0) {
        // First boss: check kill count
        const killsForFirstBoss = KILLS_PER_BOSS;
        shouldSpawnBoss = newKillCount >= killsForFirstBoss;
      } else if (state.lastBossDefeatedTime > 0) {
        // Subsequent bosses: spawn 20 seconds after defeat
        shouldSpawnBoss = currentTime - state.lastBossDefeatedTime >= BOSS_RESPAWN_DELAY;
      }
    }

    // Update boss state
    let newBossActive = state.bossActive;
    let newBossesDefeated = state.bossesDefeated;
    let newLastBossDefeatedTime = state.lastBossDefeatedTime;
    if (bossWasDestroyed) {
      newBossActive = false;
      newBossesDefeated = state.bossesDefeated + 1;
      newLastBossDefeatedTime = currentTime;
    }

    // Get latest state after takeDamage calls to preserve invincibility
    const latestState = get();

    // Check invincibility expiration (use latestState to preserve takeDamage changes)
    let newIsInvincible = latestState.isInvincible;
    let newInvincibleUntil = latestState.invincibleUntil;
    if (latestState.isInvincible && currentTime >= latestState.invincibleUntil) {
      newIsInvincible = false;
      newInvincibleUntil = 0;
    }

    // Check power-up expiration (use latestState to get current power-up state)
    let newActivePowerUps = { ...latestState.activePowerUps };
    let newPowerUpExpireTimes = { ...latestState.powerUpExpireTimes };

    if (newActivePowerUps.rapidFire && currentTime >= newPowerUpExpireTimes.rapidFire) {
      newActivePowerUps.rapidFire = false;
      newPowerUpExpireTimes.rapidFire = 0;
    }
    if (newActivePowerUps.shield && currentTime >= newPowerUpExpireTimes.shield) {
      newActivePowerUps.shield = false;
      newPowerUpExpireTimes.shield = 0;
    }
    if (newActivePowerUps.scoreBoost && currentTime >= newPowerUpExpireTimes.scoreBoost) {
      newActivePowerUps.scoreBoost = false;
      newPowerUpExpireTimes.scoreBoost = 0;
    }
    if (newActivePowerUps.tripleShot && currentTime >= newPowerUpExpireTimes.tripleShot) {
      newActivePowerUps.tripleShot = false;
      newPowerUpExpireTimes.tripleShot = 0;
    }

    // Ship decay logic - remove one extra ship every 30 seconds
    let newPlayers = latestState.players;
    let newExtraShipCount = latestState.extraShipCount;
    let newLastExtraShipDecayTime = latestState.lastExtraShipDecayTime;

    if (newExtraShipCount > 0) {
      // If decay timer not set, set it now
      if (newLastExtraShipDecayTime === 0) {
        newLastExtraShipDecayTime = currentTime;
      }
      // Check if 30 seconds have passed
      if (currentTime - newLastExtraShipDecayTime >= SHIP_DECAY_INTERVAL) {
        // Remove one extra ship (the last one in the array)
        newPlayers = newPlayers.slice(0, -1);
        newExtraShipCount = Math.max(0, newExtraShipCount - 1);
        newLastExtraShipDecayTime = currentTime;
      }
    } else {
      // No extra ships, reset timer
      newLastExtraShipDecayTime = 0;
    }

    // Apply fever multiplier to coin score as well
    const feverCoinMultiplier = isFeverActive ? FEVER_SCORE_MULTIPLIER : 1;
    const finalCoinScore = coinScoreIncrease * feverCoinMultiplier;

    set({
      ...updates,
      enemies,
      bullets,
      enemyBullets,
      powerUps,
      coins,
      feverCoins,
      score: state.score + scoreIncrease + finalCoinScore,
      killCount: newKillCount,
      bossActive: newBossActive,
      bossesDefeated: newBossesDefeated,
      lastBossDefeatedTime: newLastBossDefeatedTime,
      feverCoinCount: newFeverCoinCount,
      isFeverTime: newIsFeverTime,
      feverTimeUntil: newFeverTimeUntil,
      isInvincible: newIsInvincible,
      invincibleUntil: newInvincibleUntil,
      activePowerUps: newActivePowerUps,
      powerUpExpireTimes: newPowerUpExpireTimes,
      players: newPlayers,
      extraShipCount: newExtraShipCount,
      lastExtraShipDecayTime: newLastExtraShipDecayTime,
    });

    // Spawn boss after state update
    if (shouldSpawnBoss) {
      get().spawnBoss();
    }
  },
}));
