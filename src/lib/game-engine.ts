import { create } from 'zustand';
import type { GameState, WalletAsset, Enemy, Bullet, EnemyBullet, PowerUp, Player, PowerUpType, EnemyAttackPattern } from './game-types';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_DURATION, ENEMY_BULLET_COLORS, BOSS_COLORS, KILLS_PER_BOSS } from './game-types';

const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -5,
  maxY: 8,
};

const SPAWN_RATE_INITIAL = 1500; // ms between enemy spawns (slow at start)
const SPAWN_RATE_MIN = 500; // fastest spawn rate
const SPAWN_COUNT_INITIAL = 1; // Start with 1 enemy
const SPAWN_COUNT_MAX = 6; // Maximum enemies per wave
const BLOCK_SPAWN_RATE = 2500; // ms between block spawns
const POWER_UP_DROP_CHANCE = 0.25;
const ENEMY_BULLET_SPEED = 6;
const DIFFICULTY_RAMP_TIME = 120000; // 2 minutes to reach max difficulty

// Counters stored in the store state to avoid module-level issues
interface GameStore extends GameState {
  walletAssets: WalletAsset[];
  playerAvatar: string | null;
  gameStartTime: number;
  lastSpawnTime: number;
  lastBlockSpawnTime: number;
  enemyIdCounter: number;
  bulletIdCounter: number;
  enemyBulletIdCounter: number;
  powerUpIdCounter: number;
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
  score: 0,
  lives: 3,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  activePowerUps: {
    rapidFire: false,
    shield: false,
    scoreBoost: false,
  },
  extraShipCount: 0,
  killCount: 0,
  bossActive: false,
  bossesDefeated: 0,
  walletAssets: [],
  playerAvatar: null,
  gameStartTime: 0,
  lastSpawnTime: 0,
  lastBlockSpawnTime: 0,
  enemyIdCounter: 0,
  bulletIdCounter: 0,
  enemyBulletIdCounter: 0,
  powerUpIdCounter: 0,

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
      score: 0,
      lives: 3,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      activePowerUps: {
        rapidFire: false,
        shield: false,
        scoreBoost: false,
      },
      extraShipCount: 0,
      killCount: 0,
      bossActive: false,
      bossesDefeated: 0,
      gameStartTime: Date.now(),
      lastSpawnTime: 0, // Set to 0 so first spawn happens immediately
      lastBlockSpawnTime: 0,
      enemyIdCounter: 0,
      bulletIdCounter: 0,
      enemyBulletIdCounter: 0,
      powerUpIdCounter: 0,
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  endGame: () => set({ isPlaying: false, isGameOver: true }),

  movePlayer: (x, y) => {
    set((state) => {
      const clampedX = Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, x));
      const clampedY = Math.max(GAME_BOUNDS.minY, Math.min(GAME_BOUNDS.maxY, y));

      const newPlayers = state.players.map((player, index) => {
        if (player.isMain) {
          return {
            ...player,
            position: { x: clampedX, y: clampedY, z: 0 },
          };
        }
        // Extra ships follow with offset
        const offset = (index % 2 === 0 ? -1 : 1) * Math.ceil(index / 2) * 1.5;
        return {
          ...player,
          position: {
            x: Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, clampedX + offset)),
            y: clampedY,
            z: 0,
          },
        };
      });
      return { players: newPlayers };
    });
  },

  fireBullet: () => {
    set((state) => {
      const newBullets: Bullet[] = state.players.map((player) => ({
        id: `bullet-${state.bulletIdCounter + player.id}`,
        position: { x: player.position.x, y: player.position.y + 0.8, z: 0 },
        velocity: { x: 0, y: 20, z: 0 },
        playerId: player.id,
      }));
      return {
        bullets: [...state.bullets, ...newBullets],
        bulletIdCounter: state.bulletIdCounter + state.players.length,
      };
    });
  },

  collectPowerUp: (powerUpId) => {
    set((state) => {
      const powerUp = state.powerUps.find((p) => p.id === powerUpId);
      if (!powerUp) return state;

      const newPowerUps = state.powerUps.filter((p) => p.id !== powerUpId);
      let updates: Partial<GameStore> = { powerUps: newPowerUps };

      switch (powerUp.type) {
        case 'extra_ship':
          const newShipId = state.players.length;
          const offset = (newShipId % 2 === 0 ? -1 : 1) * Math.ceil(newShipId / 2) * 1.5;
          const mainPlayer = state.players.find((p) => p.isMain);
          updates.players = [
            ...state.players,
            {
              id: newShipId,
              position: {
                x: (mainPlayer?.position.x || 0) + offset,
                y: mainPlayer?.position.y || -3,
                z: 0,
              },
              isMain: false,
            },
          ];
          updates.extraShipCount = state.extraShipCount + 1;
          break;
        case 'rapid_fire':
          updates.activePowerUps = { ...state.activePowerUps, rapidFire: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, rapidFire: false } }));
          }, POWER_UP_DURATION);
          break;
        case 'shield':
          updates.activePowerUps = { ...state.activePowerUps, shield: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, shield: false } }));
          }, POWER_UP_DURATION);
          break;
        case 'score_boost':
          updates.activePowerUps = { ...state.activePowerUps, scoreBoost: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, scoreBoost: false } }));
          }, POWER_UP_DURATION);
          break;
      }

      return updates as GameStore;
    });
  },

  takeDamage: () => {
    set((state) => {
      if (state.activePowerUps.shield) return state;

      const newLives = state.lives - 1;
      if (newLives <= 0) {
        return { lives: 0, isPlaying: false, isGameOver: true };
      }
      return { lives: newLives };
    });
  },

  spawnBoss: () => {
    set((state) => {
      const bossPatterns: EnemyAttackPattern[] = ['spiral', 'barrage'];
      const pattern = bossPatterns[state.bossesDefeated % bossPatterns.length];
      const boss: Enemy = {
        id: `boss-${state.enemyIdCounter}`,
        asset: { id: 'boss', type: 'token', name: 'BOSS', imageUrl: '', contractAddress: '' },
        position: { x: 0, y: GAME_BOUNDS.maxY + 2, z: 0 },
        velocity: { x: 0, y: -0.5, z: 0 },
        health: 30 + state.bossesDefeated * 10,
        maxHealth: 30 + state.bossesDefeated * 10,
        size: 2.5,
        isBlock: false,
        isBoss: true,
        attackPattern: pattern,
        lastFireTime: 0,
        fireRate: 200,
      };
      console.log('Spawning boss!', boss.id);
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

    // Spawn rate decreases over time (faster spawns)
    const currentSpawnRate = SPAWN_RATE_INITIAL - (SPAWN_RATE_INITIAL - SPAWN_RATE_MIN) * difficultyProgress;

    // Spawn count increases over time
    const baseSpawnCount = Math.floor(SPAWN_COUNT_INITIAL + (SPAWN_COUNT_MAX - SPAWN_COUNT_INITIAL) * difficultyProgress);
    const spawnCount = Math.min(SPAWN_COUNT_MAX, baseSpawnCount + Math.floor(state.bossesDefeated * 0.5));

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

    // Spawn enemies based on time-scaled difficulty
    if (state.lastSpawnTime === 0 || currentTime - state.lastSpawnTime > currentSpawnRate) {
      const availablePatterns = getAvailablePatterns();
      const newEnemies: Enemy[] = [];

      for (let i = 0; i < spawnCount; i++) {
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        const fireRate = pattern === 'circular' ? 1500 : pattern === 'spread' ? 1200 : pattern === 'aimed' ? 800 : pattern === 'wave' ? 600 : pattern === 'burst' ? 1800 : 1000;

        // Enemy speed increases with difficulty
        const baseSpeed = 1.5 + difficultyProgress * 1.5;

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
          health: 2,
          maxHealth: 2,
          size: 0.6 + Math.random() * 0.3,
          isBlock: false,
          isBoss: false,
          attackPattern: pattern,
          lastFireTime: currentTime + Math.random() * 500,
          fireRate,
        };
        newEnemies.push(newEnemy);
      }
      updates.enemies = [...state.enemies, ...newEnemies];
      updates.lastSpawnTime = currentTime;
      updates.enemyIdCounter = (updates.enemyIdCounter || state.enemyIdCounter) + spawnCount;
    }

    // Spawn block
    if (state.lastBlockSpawnTime === 0 || currentTime - state.lastBlockSpawnTime > BLOCK_SPAWN_RATE) {
      const newBlock: Enemy = {
        id: `block-${updates.enemyIdCounter || state.enemyIdCounter}`,
        asset: { id: 'block', type: 'token', name: 'Block', imageUrl: '', contractAddress: '' },
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY + 2,
          z: 0,
        },
        velocity: { x: 0, y: -2, z: 0 },
        health: 3,
        maxHealth: 3,
        size: 1.0,
        isBlock: true,
        isBoss: false,
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

    // Update positions
    enemies = enemies.map((enemy) => ({
      ...enemy,
      position: {
        x: enemy.position.x + enemy.velocity.x * deltaTime,
        y: enemy.position.y + enemy.velocity.y * deltaTime,
        z: 0,
      },
    }));

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

    // Update enemy bullets
    let enemyBullets = state.enemyBullets.map((b) => ({
      ...b,
      position: {
        x: b.position.x + b.velocity.x * deltaTime,
        y: b.position.y + b.velocity.y * deltaTime,
        z: 0,
      },
    }));

    // Remove enemy bullets that are off screen
    enemyBullets = enemyBullets.filter(
      (b) => b.position.y > GAME_BOUNDS.minY - 2 && b.position.y < GAME_BOUNDS.maxY + 2 &&
             b.position.x > GAME_BOUNDS.minX - 2 && b.position.x < GAME_BOUNDS.maxX + 2
    );

    // Enemy firing logic
    const mainPlayer = state.players.find((p) => p.isMain);
    const newEnemyBullets: EnemyBullet[] = [];
    let enemyBulletIdCounter = updates.enemyBulletIdCounter || state.enemyBulletIdCounter;

    for (const enemy of enemies) {
      if (enemy.isBlock || enemy.attackPattern === 'none') continue;
      if (enemy.position.y > GAME_BOUNDS.maxY || enemy.position.y < GAME_BOUNDS.minY) continue;

      if (currentTime - enemy.lastFireTime > enemy.fireRate) {
        enemy.lastFireTime = currentTime;
        const bulletColor = ENEMY_BULLET_COLORS[Math.floor(Math.random() * ENEMY_BULLET_COLORS.length)];

        switch (enemy.attackPattern) {
          case 'straight':
            newEnemyBullets.push({
              id: `eb-${enemyBulletIdCounter++}`,
              position: { ...enemy.position },
              velocity: { x: 0, y: -ENEMY_BULLET_SPEED, z: 0 },
              size: 0.15,
              color: bulletColor,
            });
            break;

          case 'spread':
            for (let angle = -30; angle <= 30; angle += 30) {
              const rad = (angle * Math.PI) / 180;
              newEnemyBullets.push({
                id: `eb-${enemyBulletIdCounter++}`,
                position: { ...enemy.position },
                velocity: {
                  x: Math.sin(rad) * ENEMY_BULLET_SPEED * 0.7,
                  y: -Math.cos(rad) * ENEMY_BULLET_SPEED * 0.7,
                  z: 0,
                },
                size: 0.12,
                color: bulletColor,
              });
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
                    x: (dx / dist) * ENEMY_BULLET_SPEED,
                    y: (dy / dist) * ENEMY_BULLET_SPEED,
                    z: 0,
                  },
                  size: 0.18,
                  color: '#FF6B6B',
                });
              }
            }
            break;

          case 'circular':
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              newEnemyBullets.push({
                id: `eb-${enemyBulletIdCounter++}`,
                position: { ...enemy.position },
                velocity: {
                  x: Math.cos(angle) * ENEMY_BULLET_SPEED * 0.5,
                  y: Math.sin(angle) * ENEMY_BULLET_SPEED * 0.5,
                  z: 0,
                },
                size: 0.1,
                color: bulletColor,
              });
            }
            break;

          case 'wave':
            // Wave pattern - bullets move in sine wave
            for (let i = 0; i < 3; i++) {
              const waveOffset = (i - 1) * 0.5;
              newEnemyBullets.push({
                id: `eb-${enemyBulletIdCounter++}`,
                position: { x: enemy.position.x + waveOffset, y: enemy.position.y, z: 0 },
                velocity: {
                  x: Math.sin(currentTime / 100 + i) * 2,
                  y: -ENEMY_BULLET_SPEED * 0.6,
                  z: 0,
                },
                size: 0.14,
                color: '#54E6CB',
              });
            }
            break;

          case 'burst':
            // Quick 3-shot burst aimed at player
            if (mainPlayer) {
              const dx = mainPlayer.position.x - enemy.position.x;
              const dy = mainPlayer.position.y - enemy.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                for (let i = 0; i < 3; i++) {
                  const spreadAngle = (i - 1) * 0.15;
                  const baseAngle = Math.atan2(dy, dx);
                  const angle = baseAngle + spreadAngle;
                  newEnemyBullets.push({
                    id: `eb-${enemyBulletIdCounter++}`,
                    position: { ...enemy.position },
                    velocity: {
                      x: Math.cos(angle) * ENEMY_BULLET_SPEED * 0.9,
                      y: Math.sin(angle) * ENEMY_BULLET_SPEED * 0.9,
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
            // Boss spiral pattern
            const spiralTime = currentTime / 200;
            for (let i = 0; i < 4; i++) {
              const angle = spiralTime + (i / 4) * Math.PI * 2;
              newEnemyBullets.push({
                id: `eb-${enemyBulletIdCounter++}`,
                position: { ...enemy.position },
                velocity: {
                  x: Math.cos(angle) * ENEMY_BULLET_SPEED * 0.6,
                  y: Math.sin(angle) * ENEMY_BULLET_SPEED * 0.6 - 2,
                  z: 0,
                },
                size: 0.2,
                color: '#A66CFF',
              });
            }
            break;

          case 'barrage':
            // Boss barrage pattern
            for (let i = 0; i < 6; i++) {
              const angle = ((i - 2.5) / 5) * Math.PI * 0.6 - Math.PI / 2;
              newEnemyBullets.push({
                id: `eb-${enemyBulletIdCounter++}`,
                position: { ...enemy.position },
                velocity: {
                  x: Math.cos(angle) * ENEMY_BULLET_SPEED * 0.8,
                  y: Math.sin(angle) * ENEMY_BULLET_SPEED * 0.8,
                  z: 0,
                },
                size: 0.22,
                color: '#FF6B6B',
              });
            }
            break;
        }
      }
    }

    enemyBullets = [...enemyBullets, ...newEnemyBullets];
    updates.enemyBulletIdCounter = enemyBulletIdCounter;

    // Collision detection
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
              scoreIncrease += state.activePowerUps.scoreBoost ? 2000 : 1000;
              bossWasDestroyed = true;
            } else {
              scoreIncrease += state.activePowerUps.scoreBoost ? (enemy.isBlock ? 100 : 200) : (enemy.isBlock ? 50 : 100);
              if (!enemy.isBlock) killIncrease++;
            }
          }
          return false;
        }
      }
      return true;
    });

    // Remove destroyed enemies and spawn power-ups
    enemies = enemies.filter((enemy) => {
      if (destroyedEnemyIds.has(enemy.id)) {
        // Higher drop chance for boss
        const dropChance = enemy.isBoss ? 1.0 : POWER_UP_DROP_CHANCE;
        const dropCount = enemy.isBoss ? 3 : 1;
        for (let i = 0; i < dropCount; i++) {
          if (Math.random() < dropChance) {
            const types: PowerUpType[] = ['extra_ship', 'rapid_fire', 'shield', 'score_boost'];
            powerUps.push({
              id: `powerup-${(updates.powerUpIdCounter || state.powerUpIdCounter) + i}`,
              type: types[Math.floor(Math.random() * types.length)],
              position: {
                x: enemy.position.x + (Math.random() - 0.5) * 2,
                y: enemy.position.y,
                z: 0,
              },
              velocity: { x: 0, y: -1.5, z: 0 },
            });
          }
        }
        updates.powerUpIdCounter = (updates.powerUpIdCounter || state.powerUpIdCounter) + dropCount;
        return false;
      }
      return enemy.position.y > GAME_BOUNDS.minY - 3;
    });

    // Player collision with enemies
    if (mainPlayer) {
      for (const enemy of enemies) {
        const dx = mainPlayer.position.x - enemy.position.x;
        const dy = mainPlayer.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Smaller hitbox for player (0.3 instead of 0.5)
        if (dist < enemy.size + 0.3) {
          get().takeDamage();
          enemies = enemies.filter((e) => e.id !== enemy.id);
          break;
        }
      }

      // Player collision with enemy bullets
      enemyBullets = enemyBullets.filter((b) => {
        const dx = mainPlayer.position.x - b.position.x;
        const dy = mainPlayer.position.y - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Small hitbox for player vs bullets
        if (dist < b.size + 0.25) {
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
    const killsForNextBoss = KILLS_PER_BOSS * (state.bossesDefeated + 1);
    const shouldSpawnBoss = !state.bossActive && newKillCount >= killsForNextBoss;

    // Update boss state
    let newBossActive = state.bossActive;
    let newBossesDefeated = state.bossesDefeated;
    if (bossWasDestroyed) {
      newBossActive = false;
      newBossesDefeated = state.bossesDefeated + 1;
    }

    set({
      ...updates,
      enemies,
      bullets,
      enemyBullets,
      powerUps,
      score: state.score + scoreIncrease,
      killCount: newKillCount,
      bossActive: newBossActive,
      bossesDefeated: newBossesDefeated,
    });

    // Spawn boss after state update
    if (shouldSpawnBoss) {
      get().spawnBoss();
    }
  },
}));
