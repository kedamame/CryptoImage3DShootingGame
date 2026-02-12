export interface WalletAsset {
  id: string;
  type: 'token' | 'nft';
  name: string;
  symbol?: string;
  imageUrl: string;
  balance?: string;
  contractAddress: string;
  tokenId?: string;
}

export type EnemyAttackPattern =
  | 'none'        // No attack (blocks)
  | 'straight'    // Single bullet straight down
  | 'spread'      // 3-way spread shot
  | 'aimed'       // Aims at player
  | 'circular'    // Circular burst
  | 'wave'        // Sine wave pattern (late game)
  | 'burst'       // Quick 3-shot burst (late game)
  | 'spiral'      // Spiral pattern (boss - rotating 6-way shot)
  | 'crossfire'   // Cross-shaped bullets from sides (boss - pincer attack)
  | 'laser'       // Horizontal laser sweep (boss - sweeps left/right)
  | 'ring'        // Expanding rings (boss - circular waves)
  | 'homing'      // Homing missiles (boss - tracks player)
  | 'hydra'       // Multi-head attack (boss - alternating directional shots)
  | 'kraken'      // Tentacle swipe (boss - wave-like sweeping pattern)
  | 'meteor'      // Raining meteor shower (boss - random falling bullets)
  | 'mirror'      // Mirror shot (boss - aimed + reflected shots)
  | 'vortex';     // Vortex pull (boss - inward spiraling bullets)

export type BossType = 'demon' | 'mech' | 'dragon' | 'golem' | 'phantom' | 'sprite' | 'hydra' | 'kraken'
  | 'twins' | 'chimera' | 'reaper' | 'leviathan';

export interface Enemy {
  id: string;
  asset: WalletAsset;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  size: number;
  isBlock: boolean; // Destructible block
  isBoss: boolean;  // Boss enemy
  isShiny: boolean; // Rare shiny enemy (0.1% chance, more HP, drops 5 items)
  isElite: boolean; // Elite enemy (20% chance, 2x HP, 50% drop rate)
  bossType?: BossType; // Visual type for boss enemies
  hitbox?: { halfW: number; top: number; bottom: number }; // AABB hitbox for bosses (relative to position)
  attackPattern: EnemyAttackPattern;
  lastFireTime: number; // For enemy shooting cooldown
  fireRate: number;     // ms between shots
}

export interface EnemyBullet {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  size: number;
  color: string;
}

export interface Bullet {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  playerId: number; // Which player ship fired this
}

export interface PowerUp {
  id: string;
  type: 'extra_ship' | 'rapid_fire' | 'shield' | 'score_boost' | 'triple_shot' | 'heal';
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface Player {
  id: number;
  position: { x: number; y: number; z: number };
  isMain: boolean; // Main ship vs extra ships
}

export interface Coin {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number }; // Target for flying to score
  phase: 'drop' | 'fly'; // drop = falling down, fly = flying to score
  dropTime: number; // Time spent in drop phase
  size: number;
}

// Large fever coin - collect 5 to trigger Fever Time
export interface FeverCoin {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  phase: 'drop' | 'fly';
  dropTime: number;
}

export interface GameState {
  players: Player[];
  enemies: Enemy[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  powerUps: PowerUp[];
  coins: Coin[];
  feverCoins: FeverCoin[];    // Large gold coins for fever time
  score: number;
  lives: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isInvincible: boolean;
  invincibleUntil: number;
  activePowerUps: {
    rapidFire: boolean;
    shield: boolean;
    scoreBoost: boolean;
    tripleShot: boolean;
  };
  extraShipCount: number;
  killCount: number;       // Track kills for boss spawn
  bossActive: boolean;     // Is a boss currently on screen
  bossesDefeated: number;  // Number of bosses defeated (increases difficulty)
  feverCoinCount: number;  // Collected fever coins (0-5)
  isFeverTime: boolean;    // Is fever time active
  feverTimeUntil: number;  // When fever time ends
}

export type PowerUpType = PowerUp['type'];

export const POWER_UP_COLORS: Record<PowerUpType, string> = {
  extra_ship: '#FF9FF3', // Pink
  rapid_fire: '#FF8C42', // Orange
  shield: '#6ECBFF', // Blue
  score_boost: '#FFD93D', // Yellow
  triple_shot: '#54E6CB', // Cyan
  heal: '#FF4D6D', // Heart Red
};

export const POWER_UP_DURATION = 12000; // 12 seconds

export const POP_COLORS = [
  '#FFD93D', // Yellow
  '#FF8C42', // Orange
  '#FF6B6B', // Red
  '#FF9FF3', // Pink
  '#A66CFF', // Purple
  '#6ECBFF', // Blue
  '#54E6CB', // Cyan
  '#6BCB77', // Green
  '#C9E265', // Lime
];

export const BLOCK_COLORS = [
  '#5C5C5C', // Gray
  '#8B7355', // Brown
  '#4A4A4A', // Dark Gray
  '#6B5B4F', // Dark Brown
];

export const ENEMY_BULLET_COLORS = [
  '#FF6B6B', // Red
  '#FF9FF3', // Pink
  '#A66CFF', // Purple
  '#FF8C42', // Orange
];

export const BOSS_COLORS = [
  '#8B0000', // Dark Red
  '#4B0082', // Indigo
  '#191970', // Midnight Blue
];

export const KILLS_PER_BOSS = 20; // Boss spawns every 20 kills
export const MAX_EXTRA_SHIPS = 2; // Maximum number of extra ships (3 total including main)
export const SHIP_DECAY_INTERVAL = 30000; // 30 seconds - extra ships decay over time

// Fever Time constants
export const FEVER_COIN_DROP_CHANCE = 0.025; // 2.5% chance from any enemy
export const FEVER_COINS_REQUIRED = 5; // Collect 5 to trigger fever time
export const FEVER_TIME_DURATION = 12000; // 12 seconds
export const FEVER_SCORE_MULTIPLIER = 2; // 2x score during fever
