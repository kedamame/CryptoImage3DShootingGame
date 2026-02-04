import type { WalletAsset } from './wallet-assets';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  position: Vector3;
  lives: number;
  score: number;
  isInvincible: boolean;
  invincibleUntil: number;
}

export interface PlayerShip {
  id: string;
  position: Vector3;
  offset: Vector3; // Offset from main player position
}

export interface Bullet {
  id: string;
  position: Vector3;
  velocity: Vector3;
  isPlayerBullet: boolean;
  damage: number;
}

export interface Enemy {
  id: string;
  position: Vector3;
  velocity: Vector3;
  health: number;
  maxHealth: number;
  asset: WalletAsset;
  scoreValue: number;
  dropChance: number;
}

export interface Obstacle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  health: number;
  maxHealth: number;
  size: Vector3;
  color: string;
}

export type ItemType = 'extraShip' | 'speedUp' | 'shield' | 'rapidFire' | 'scoreMultiplier';

export interface DropItem {
  id: string;
  position: Vector3;
  velocity: Vector3;
  itemType: ItemType;
  duration: number; // in seconds, 0 for permanent effects
}

export interface ActiveEffect {
  type: ItemType;
  expiresAt: number;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'gameOver';
  player: Player;
  playerShips: PlayerShip[];
  bullets: Bullet[];
  enemies: Enemy[];
  obstacles: Obstacle[];
  dropItems: DropItem[];
  activeEffects: ActiveEffect[];
  walletAssets: WalletAsset[];
  lastSpawnTime: number;
  lastObstacleSpawnTime: number;
  gameTime: number;
  difficulty: number;
}

export const GAME_CONFIG = {
  // Game area
  GAME_WIDTH: 16,
  GAME_HEIGHT: 20,
  GAME_DEPTH: 5,

  // Player
  PLAYER_SPEED: 0.15,
  PLAYER_INITIAL_LIVES: 3,
  INVINCIBILITY_DURATION: 2000, // ms
  BULLET_SPEED: 0.4,
  FIRE_RATE: 150, // ms between shots

  // Extra ships
  EXTRA_SHIP_OFFSET: 1.5,

  // Enemies
  ENEMY_BASE_SPEED: 0.03,
  ENEMY_SPAWN_INTERVAL: 2000, // ms
  ENEMY_BASE_HEALTH: 3,
  ENEMY_BASE_SCORE: 100,
  ENEMY_DROP_CHANCE: 0.2, // 20% chance to drop item

  // Obstacles
  OBSTACLE_SPAWN_INTERVAL: 3000, // ms
  OBSTACLE_BASE_SPEED: 0.05,
  OBSTACLE_BASE_HEALTH: 5,

  // Items
  ITEM_FALL_SPEED: 0.05,
  EFFECT_DURATION: 10000, // ms

  // Difficulty scaling
  DIFFICULTY_INCREASE_INTERVAL: 30000, // ms
  MAX_DIFFICULTY: 10,

  // Colors (Unrailed-inspired)
  COLORS: {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    purple: '#A855F7',
    blue: '#3B82F6',
    green: '#22C55E',
    orange: '#F97316',
    pink: '#EC4899',
  },

  // Item colors
  ITEM_COLORS: {
    extraShip: '#FFE66D',
    speedUp: '#4ECDC4',
    shield: '#3B82F6',
    rapidFire: '#FF6B6B',
    scoreMultiplier: '#A855F7',
  },
} as const;

export function createInitialGameState(walletAssets: WalletAsset[]): GameState {
  return {
    status: 'idle',
    player: {
      id: 'player',
      position: { x: 0, y: -GAME_CONFIG.GAME_HEIGHT / 2 + 3, z: 0 },
      lives: GAME_CONFIG.PLAYER_INITIAL_LIVES,
      score: 0,
      isInvincible: false,
      invincibleUntil: 0,
    },
    playerShips: [
      {
        id: 'main-ship',
        position: { x: 0, y: -GAME_CONFIG.GAME_HEIGHT / 2 + 3, z: 0 },
        offset: { x: 0, y: 0, z: 0 },
      },
    ],
    bullets: [],
    enemies: [],
    obstacles: [],
    dropItems: [],
    activeEffects: [],
    walletAssets,
    lastSpawnTime: 0,
    lastObstacleSpawnTime: 0,
    gameTime: 0,
    difficulty: 1,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
