// Game state types
export interface GameState {
  score: number;
  lives: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  level: number;
  combo: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  fireRate: number;
  lastFireTime: number;
  isInvincible: boolean;
  invincibleUntil: number;
  powerUps: ActivePowerUp[];
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  imageUrl: string;
  name: string;
  rotation: number;
  rotationSpeed: number;
  pattern: EnemyPattern;
  patternData: Record<string, number>;
}

export type EnemyPattern = 'straight' | 'zigzag' | 'sine' | 'spiral' | 'chase';

export interface Bullet {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  damage: number;
  isPlayerBullet: boolean;
  color: string;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export type PowerUpType = 'rapidFire' | 'shield' | 'multiShot' | 'bomb' | 'slowMotion';

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  value: number;
  life: number;
}

// Power-up configurations
export const POWER_UP_CONFIG: Record<PowerUpType, { duration: number; color: string; emoji: string }> = {
  rapidFire: { duration: 5000, color: '#FF6B6B', emoji: '🔥' },
  shield: { duration: 8000, color: '#4ECDC4', emoji: '🛡️' },
  multiShot: { duration: 6000, color: '#A855F7', emoji: '✨' },
  bomb: { duration: 0, color: '#FFE66D', emoji: '💣' },
  slowMotion: { duration: 4000, color: '#3B82F6', emoji: '⏱️' },
};

// Isometric projection helpers
export const ISO_ANGLE = Math.PI / 6; // 30 degrees
export const ISO_SCALE_Y = 0.5;

export function toIsometric(x: number, y: number): { isoX: number; isoY: number } {
  return {
    isoX: (x - y) * Math.cos(ISO_ANGLE),
    isoY: (x + y) * Math.sin(ISO_ANGLE) * ISO_SCALE_Y,
  };
}

export function fromIsometric(isoX: number, isoY: number): { x: number; y: number } {
  const cosA = Math.cos(ISO_ANGLE);
  const sinA = Math.sin(ISO_ANGLE) * ISO_SCALE_Y;
  return {
    x: (isoX / cosA + isoY / sinA) / 2,
    y: (isoY / sinA - isoX / cosA) / 2,
  };
}
