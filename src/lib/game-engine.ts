import { create } from 'zustand';
import type { GameState, WalletAsset, Enemy, Bullet, PowerUp, Player, PowerUpType } from './game-types';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_DURATION } from './game-types';

const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -6,
  maxY: 10,
  minZ: -2,
  maxZ: 2,
};

const SPAWN_RATE = 1500; // ms between enemy spawns
const BLOCK_SPAWN_RATE = 3000; // ms between block spawns
const POWER_UP_DROP_CHANCE = 0.3; // 30% chance to drop power-up

let lastSpawnTime = 0;
let lastBlockSpawnTime = 0;
let bulletIdCounter = 0;
let enemyIdCounter = 0;
let powerUpIdCounter = 0;

interface GameStore extends GameState {
  walletAssets: WalletAsset[];
  playerAvatar: string | null;
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

export const useGameStore = create<GameStore>((set, get) => ({
  players: [{ id: 0, position: { x: 0, y: -4, z: 0 }, isMain: true }],
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

  setWalletAssets: (assets) => set({ walletAssets: assets }),
  setPlayerAvatar: (url) => set({ playerAvatar: url }),

  startGame: () => {
    lastSpawnTime = 0;
    lastBlockSpawnTime = 0;
    bulletIdCounter = 0;
    enemyIdCounter = 0;
    powerUpIdCounter = 0;

    set({
      players: [{ id: 0, position: { x: 0, y: -4, z: 0 }, isMain: true }],
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
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  endGame: () => set({ isPlaying: false, isGameOver: true }),

  movePlayer: (x, y) => {
    set((state) => {
      const newPlayers = state.players.map((player, index) => {
        // Main player follows touch exactly
        if (player.isMain) {
          return {
            ...player,
            position: {
              x: Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, x)),
              y: Math.max(GAME_BOUNDS.minX, Math.min(-2, y)),
              z: 0,
            },
          };
        }
        // Extra ships follow with offset
        const offset = (index % 2 === 0 ? -1 : 1) * Math.ceil(index / 2) * 1.5;
        return {
          ...player,
          position: {
            x: Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, x + offset)),
            y: Math.max(GAME_BOUNDS.minX, Math.min(-2, y)),
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
        id: `bullet-${bulletIdCounter++}`,
        position: { ...player.position, y: player.position.y + 0.5 },
        velocity: { x: 0, y: 15, z: 0 },
        playerId: player.id,
      }));
      return { bullets: [...state.bullets, ...newBullets] };
    });
  },

  collectPowerUp: (powerUpId) => {
    set((state) => {
      const powerUp = state.powerUps.find((p) => p.id === powerUpId);
      if (!powerUp) return state;

      const newPowerUps = state.powerUps.filter((p) => p.id !== powerUpId);
      let newState: Partial<GameState> = { powerUps: newPowerUps };

      switch (powerUp.type) {
        case 'extra_ship':
          // Add new ship
          const newShipId = state.players.length;
          const offset = (newShipId % 2 === 0 ? -1 : 1) * Math.ceil(newShipId / 2) * 1.5;
          const mainPlayer = state.players.find((p) => p.isMain);
          newState.players = [
            ...state.players,
            {
              id: newShipId,
              position: {
                x: (mainPlayer?.position.x || 0) + offset,
                y: mainPlayer?.position.y || -4,
                z: 0,
              },
              isMain: false,
            },
          ];
          newState.extraShipCount = state.extraShipCount + 1;
          break;
        case 'rapid_fire':
          newState.activePowerUps = { ...state.activePowerUps, rapidFire: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, rapidFire: false } }));
          }, POWER_UP_DURATION);
          break;
        case 'shield':
          newState.activePowerUps = { ...state.activePowerUps, shield: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, shield: false } }));
          }, POWER_UP_DURATION);
          break;
        case 'score_boost':
          newState.activePowerUps = { ...state.activePowerUps, scoreBoost: true };
          setTimeout(() => {
            set((s) => ({ activePowerUps: { ...s.activePowerUps, scoreBoost: false } }));
          }, POWER_UP_DURATION);
          break;
      }

      return newState as GameState;
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

    // Spawn enemies
    if (currentTime - lastSpawnTime > SPAWN_RATE && state.walletAssets.length > 0) {
      lastSpawnTime = currentTime;
      const randomAsset = state.walletAssets[Math.floor(Math.random() * state.walletAssets.length)];
      const newEnemy: Enemy = {
        id: `enemy-${enemyIdCounter++}`,
        asset: randomAsset,
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY,
          z: 0,
        },
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: -2 - Math.random() * 2,
          z: 0,
        },
        health: 2,
        maxHealth: 2,
        size: 0.8 + Math.random() * 0.4,
        isBlock: false,
      };
      set({ enemies: [...state.enemies, newEnemy] });
    }

    // Spawn blocks
    if (currentTime - lastBlockSpawnTime > BLOCK_SPAWN_RATE) {
      lastBlockSpawnTime = currentTime;
      const newBlock: Enemy = {
        id: `block-${enemyIdCounter++}`,
        asset: {
          id: 'block',
          type: 'token',
          name: 'Block',
          imageUrl: '',
          contractAddress: '',
        },
        position: {
          x: GAME_BOUNDS.minX + Math.random() * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX),
          y: GAME_BOUNDS.maxY,
          z: 0,
        },
        velocity: {
          x: 0,
          y: -1.5,
          z: 0,
        },
        health: 3,
        maxHealth: 3,
        size: 1.2,
        isBlock: true,
      };
      set({ enemies: [...state.enemies, newBlock] });
    }

    // Update enemy positions
    let newEnemies = state.enemies.map((enemy) => ({
      ...enemy,
      position: {
        x: enemy.position.x + enemy.velocity.x * deltaTime,
        y: enemy.position.y + enemy.velocity.y * deltaTime,
        z: enemy.position.z,
      },
    }));

    // Update bullet positions
    let newBullets = state.bullets.map((bullet) => ({
      ...bullet,
      position: {
        x: bullet.position.x + bullet.velocity.x * deltaTime,
        y: bullet.position.y + bullet.velocity.y * deltaTime,
        z: bullet.position.z,
      },
    }));

    // Update power-up positions
    let newPowerUps = state.powerUps.map((powerUp) => ({
      ...powerUp,
      position: {
        x: powerUp.position.x + powerUp.velocity.x * deltaTime,
        y: powerUp.position.y + powerUp.velocity.y * deltaTime,
        z: powerUp.position.z,
      },
    }));

    // Check bullet-enemy collisions
    let scoreIncrease = 0;
    const destroyedEnemies: Enemy[] = [];

    newBullets = newBullets.filter((bullet) => {
      if (bullet.position.y > GAME_BOUNDS.maxY) return false;

      for (const enemy of newEnemies) {
        const dx = bullet.position.x - enemy.position.x;
        const dy = bullet.position.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.size * 0.8) {
          enemy.health -= 1;
          if (enemy.health <= 0) {
            destroyedEnemies.push(enemy);
            const baseScore = enemy.isBlock ? 50 : 100;
            scoreIncrease += state.activePowerUps.scoreBoost ? baseScore * 2 : baseScore;
          }
          return false;
        }
      }
      return true;
    });

    // Remove destroyed enemies and spawn power-ups
    newEnemies = newEnemies.filter((enemy) => {
      if (destroyedEnemies.includes(enemy)) {
        // Chance to spawn power-up
        if (Math.random() < POWER_UP_DROP_CHANCE) {
          const powerUpTypes: PowerUpType[] = ['extra_ship', 'rapid_fire', 'shield', 'score_boost'];
          const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          const newPowerUp: PowerUp = {
            id: `powerup-${powerUpIdCounter++}`,
            type: randomType,
            position: { ...enemy.position },
            velocity: { x: 0, y: -1, z: 0 },
          };
          newPowerUps.push(newPowerUp);
        }
        return false;
      }
      return enemy.position.y > GAME_BOUNDS.minY - 2;
    });

    // Check player-enemy collisions
    const mainPlayer = state.players.find((p) => p.isMain);
    if (mainPlayer) {
      for (const enemy of newEnemies) {
        const dx = mainPlayer.position.x - enemy.position.x;
        const dy = mainPlayer.position.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.size + 0.5) {
          get().takeDamage();
          newEnemies = newEnemies.filter((e) => e.id !== enemy.id);
          break;
        }
      }
    }

    // Check player-powerup collisions
    if (mainPlayer) {
      newPowerUps = newPowerUps.filter((powerUp) => {
        const dx = mainPlayer.position.x - powerUp.position.x;
        const dy = mainPlayer.position.y - powerUp.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1.2) {
          get().collectPowerUp(powerUp.id);
          return false;
        }
        return powerUp.position.y > GAME_BOUNDS.minY - 2;
      });
    }

    set({
      enemies: newEnemies,
      bullets: newBullets,
      powerUps: newPowerUps,
      score: state.score + scoreIncrease,
    });
  },
}));
