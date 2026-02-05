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
  | 'spiral'      // Spiral pattern (boss)
  | 'barrage';    // Heavy barrage (boss)

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
  type: 'extra_ship' | 'rapid_fire' | 'shield' | 'score_boost';
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface Player {
  id: number;
  position: { x: number; y: number; z: number };
  isMain: boolean; // Main ship vs extra ships
}

export interface GameState {
  players: Player[];
  enemies: Enemy[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  activePowerUps: {
    rapidFire: boolean;
    shield: boolean;
    scoreBoost: boolean;
  };
  extraShipCount: number;
  killCount: number;       // Track kills for boss spawn
  bossActive: boolean;     // Is a boss currently on screen
  bossesDefeated: number;  // Number of bosses defeated (increases difficulty)
}

export type PowerUpType = PowerUp['type'];

export const POWER_UP_COLORS: Record<PowerUpType, string> = {
  extra_ship: '#FF9FF3', // Pink
  rapid_fire: '#FF8C42', // Orange
  shield: '#6ECBFF', // Blue
  score_boost: '#FFD93D', // Yellow
};

export const POWER_UP_DURATION = 10000; // 10 seconds

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
