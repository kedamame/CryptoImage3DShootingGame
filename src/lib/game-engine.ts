import { create } from 'zustand';
import type { GameState, WalletAsset, Enemy, Bullet, PowerUp, Player, PowerUpType } from './game-types';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_DURATION } from './game-types';

const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -5,
  maxY: 8,
};

const SPAWN_RATE = 1200; // ms between enemy spawns
const BLOCK_SPAWN_RATE = 2500; // ms between block spawns
const POWER_UP_DROP_CHANCE = 0.3;

// Counters stored in the store state to avoid module-level issues
interface GameStore extends GameState {
  walletAssets: WalletAsset[];
  playerAvatar: string | null;
  lastSpawnTime: number;
  lastBlockSpawnTime: number;
  enemyIdCounter: number;
  bulletIdCounter: number;
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
  walletAssets: [],
  playerAvatar: null,
  lastSpawnTime: 0,
  lastBlockSpawnTime: 0,
  enemyIdCounter: 0,
  bulletIdCounter: 0,
  powerUpIdCounter: 0,

  setWalletAssets: (assets) => set({ walletAssets: assets }),
  setPlayerAvatar: (url) => set({ playerAvatar: url }),

  startGame: () => {
    console.log('Starting game...');
    set({
      players: [{ id: 0, position: { x: 0, y: -3, z: 0 }, isMain: true }],
      enemies: [],
      bullets: [],
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
      lastSpawnTime: 0, // Set to 0 so first spawn happens immediately
      lastBlockSpawnTime: 0,
      enemyIdCounter: 0,
      bulletIdCounter: 0,
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

  updateGame: (deltaTime) => {
    const state = get();
    if (!state.isPlaying || state.isPaused) return;

    const currentTime = Date.now();
    let updates: Partial<GameStore> = {};

    // Get assets or use default
    const assets = state.walletAssets.length > 0 ? state.walletAssets : [DEFAULT_ASSET];

    // Spawn enemy
    if (state.lastSpawnTime === 0 || currentTime - state.lastSpawnTime > SPAWN_RATE) {
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const newEnemy: Enemy = {
        id: `enemy-${state.enemyIdCounter}`,
        asset: randomAsset,
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY + 2,
          z: 0,
        },
        velocity: {
          x: (Math.random() - 0.5) * 3,
          y: -3 - Math.random() * 2,
          z: 0,
        },
        health: 2,
        maxHealth: 2,
        size: 0.8 + Math.random() * 0.4,
        isBlock: false,
      };
      updates.enemies = [...state.enemies, newEnemy];
      updates.lastSpawnTime = currentTime;
      updates.enemyIdCounter = state.enemyIdCounter + 1;
      console.log('Spawned enemy:', newEnemy.id);
    }

    // Spawn block
    if (state.lastBlockSpawnTime === 0 || currentTime - state.lastBlockSpawnTime > BLOCK_SPAWN_RATE) {
      const newBlock: Enemy = {
        id: `block-${state.enemyIdCounter}`,
        asset: { id: 'block', type: 'token', name: 'Block', imageUrl: '', contractAddress: '' },
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY + 2,
          z: 0,
        },
        velocity: { x: 0, y: -2, z: 0 },
        health: 3,
        maxHealth: 3,
        size: 1.2,
        isBlock: true,
      };
      updates.enemies = [...(updates.enemies || state.enemies), newBlock];
      updates.lastBlockSpawnTime = currentTime;
      updates.enemyIdCounter = (updates.enemyIdCounter || state.enemyIdCounter) + 1;
      console.log('Spawned block:', newBlock.id);
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

    // Collision detection
    let scoreIncrease = 0;
    const destroyedEnemyIds = new Set<string>();

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
            scoreIncrease += state.activePowerUps.scoreBoost ? (enemy.isBlock ? 100 : 200) : (enemy.isBlock ? 50 : 100);
          }
          return false;
        }
      }
      return true;
    });

    // Remove destroyed enemies and spawn power-ups
    enemies = enemies.filter((enemy) => {
      if (destroyedEnemyIds.has(enemy.id)) {
        if (Math.random() < POWER_UP_DROP_CHANCE) {
          const types: PowerUpType[] = ['extra_ship', 'rapid_fire', 'shield', 'score_boost'];
          powerUps.push({
            id: `powerup-${state.powerUpIdCounter}`,
            type: types[Math.floor(Math.random() * types.length)],
            position: { ...enemy.position },
            velocity: { x: 0, y: -1.5, z: 0 },
          });
          updates.powerUpIdCounter = (updates.powerUpIdCounter || state.powerUpIdCounter) + 1;
        }
        return false;
      }
      return enemy.position.y > GAME_BOUNDS.minY - 3;
    });

    // Player collision
    const mainPlayer = state.players.find((p) => p.isMain);
    if (mainPlayer) {
      for (const enemy of enemies) {
        const dx = mainPlayer.position.x - enemy.position.x;
        const dy = mainPlayer.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < enemy.size + 0.5) {
          get().takeDamage();
          enemies = enemies.filter((e) => e.id !== enemy.id);
          break;
        }
      }

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

    set({
      ...updates,
      enemies,
      bullets,
      powerUps,
      score: state.score + scoreIncrease,
    });
  },
}));
