'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture, Assets } from 'pixi.js';
import {
  GameState,
  PlayerState,
  Enemy,
  Bullet,
  PowerUp,
  Particle,
  ScorePopup,
  POWER_UP_CONFIG,
} from '@/lib/game-types';
import {
  createInitialGameState,
  createInitialPlayerState,
  createEnemy,
  updateEnemyPosition,
  createBullet,
  createPowerUp,
  createExplosionParticles,
  createScorePopup,
  checkCollision,
  calculateScore,
  shouldDropPowerUp,
  hasActivePowerUp,
  addPowerUp,
  updatePlayerPowerUps,
  generateId,
} from '@/lib/game-engine';
import { WalletAsset, DEFAULT_ENEMIES } from '@/lib/wallet-assets';

interface GameProps {
  walletAssets: WalletAsset[];
  playerAvatarUrl: string | null;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

// Pop colors for Unrailed style
const COLORS = {
  primary: 0xFF6B6B,
  secondary: 0x4ECDC4,
  accent: 0xFFE66D,
  purple: 0xA855F7,
  blue: 0x3B82F6,
  green: 0x22C55E,
  orange: 0xF97316,
  pink: 0xEC4899,
  dark: 0x1A1A2E,
  darker: 0x16213E,
};

export default function Game({ walletAssets, playerAvatarUrl, onGameOver, onScoreUpdate }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Game state refs (using refs to avoid re-renders during game loop)
  const gameStateRef = useRef<GameState>(createInitialGameState());
  const playerRef = useRef<PlayerState | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);

  // Touch/mouse state
  const touchRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Sprite containers
  const spritesRef = useRef<{
    player: Container | null;
    enemies: Map<string, Container>;
    bullets: Map<string, Graphics>;
    powerUps: Map<string, Container>;
    particles: Map<string, Graphics>;
    scorePopups: Map<string, Text>;
    ui: Container | null;
  }>({
    player: null,
    enemies: new Map(),
    bullets: new Map(),
    powerUps: new Map(),
    particles: new Map(),
    scorePopups: new Map(),
    ui: null,
  });

  // Texture cache
  const texturesRef = useRef<Map<string, Texture>>(new Map());

  // Enemy spawn timer
  const lastSpawnRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(2000);

  // Get enemy images from wallet assets or use defaults
  const enemyImages = walletAssets.length > 0
    ? walletAssets.map(a => ({ imageUrl: a.type === 'token' ? a.imageUrl : a.imageUrl, name: a.type === 'token' ? a.symbol : a.name }))
    : DEFAULT_ENEMIES;

  // Load texture with caching
  const loadTexture = useCallback(async (url: string): Promise<Texture> => {
    if (texturesRef.current.has(url)) {
      return texturesRef.current.get(url)!;
    }
    try {
      const texture = await Assets.load(url);
      texturesRef.current.set(url, texture);
      return texture;
    } catch (e) {
      console.error('Failed to load texture:', url, e);
      // Return a placeholder
      return Texture.WHITE;
    }
  }, []);

  // Create player sprite
  const createPlayerSprite = useCallback(async (app: Application): Promise<Container> => {
    const container = new Container();

    // Base ship shape (isometric style)
    const ship = new Graphics();

    // Ship body - isometric diamond shape
    ship.beginFill(COLORS.secondary);
    ship.moveTo(0, -25);
    ship.lineTo(20, 0);
    ship.lineTo(0, 15);
    ship.lineTo(-20, 0);
    ship.closePath();
    ship.endFill();

    // Cockpit
    ship.beginFill(COLORS.accent);
    ship.drawEllipse(0, -5, 8, 12);
    ship.endFill();

    // Wings glow
    ship.beginFill(COLORS.primary, 0.5);
    ship.drawEllipse(-15, 5, 5, 8);
    ship.drawEllipse(15, 5, 5, 8);
    ship.endFill();

    container.addChild(ship);

    // Add avatar if available
    if (playerAvatarUrl) {
      try {
        const avatarTexture = await loadTexture(playerAvatarUrl);
        const avatar = new Sprite(avatarTexture);
        avatar.width = 30;
        avatar.height = 30;
        avatar.anchor.set(0.5);
        avatar.y = -5;

        // Circular mask for avatar
        const mask = new Graphics();
        mask.beginFill(0xffffff);
        mask.drawCircle(0, -5, 15);
        mask.endFill();
        avatar.mask = mask;

        container.addChild(mask);
        container.addChild(avatar);
      } catch (e) {
        console.error('Failed to load avatar:', e);
      }
    }

    // Engine flames
    const flames = new Graphics();
    flames.beginFill(COLORS.orange, 0.8);
    flames.moveTo(-8, 15);
    flames.lineTo(0, 30);
    flames.lineTo(8, 15);
    flames.closePath();
    flames.endFill();
    flames.name = 'flames';
    container.addChild(flames);

    return container;
  }, [playerAvatarUrl, loadTexture]);

  // Create enemy sprite
  const createEnemySprite = useCallback(async (enemy: Enemy): Promise<Container> => {
    const container = new Container();

    // Enemy base (3D-ish cube effect)
    const base = new Graphics();

    // Shadow
    base.beginFill(0x000000, 0.3);
    base.drawEllipse(0, enemy.height / 2 + 5, enemy.width / 2, 10);
    base.endFill();

    // Isometric box sides
    const halfW = enemy.width / 2;
    const halfH = enemy.height / 2;
    const depth = 15;

    // Left face
    base.beginFill(COLORS.purple, 0.6);
    base.moveTo(-halfW, -halfH);
    base.lineTo(-halfW, halfH);
    base.lineTo(-halfW + depth, halfH + depth);
    base.lineTo(-halfW + depth, -halfH + depth);
    base.closePath();
    base.endFill();

    // Bottom face
    base.beginFill(COLORS.pink, 0.6);
    base.moveTo(-halfW, halfH);
    base.lineTo(halfW, halfH);
    base.lineTo(halfW + depth, halfH + depth);
    base.lineTo(-halfW + depth, halfH + depth);
    base.closePath();
    base.endFill();

    container.addChild(base);

    // Enemy image
    try {
      const texture = await loadTexture(enemy.imageUrl);
      const sprite = new Sprite(texture);
      sprite.width = enemy.width;
      sprite.height = enemy.height;
      sprite.anchor.set(0.5);
      container.addChild(sprite);
    } catch (e) {
      // Fallback shape
      const fallback = new Graphics();
      fallback.beginFill(COLORS.primary);
      fallback.drawRoundedRect(-halfW, -halfH, enemy.width, enemy.height, 10);
      fallback.endFill();
      container.addChild(fallback);
    }

    // Health bar
    const healthBg = new Graphics();
    healthBg.beginFill(0x333333);
    healthBg.drawRoundedRect(-halfW, -halfH - 15, enemy.width, 8, 4);
    healthBg.endFill();
    healthBg.name = 'healthBg';
    container.addChild(healthBg);

    const healthBar = new Graphics();
    healthBar.name = 'healthBar';
    container.addChild(healthBar);

    return container;
  }, [loadTexture]);

  // Update health bar
  const updateHealthBar = (container: Container, enemy: Enemy) => {
    const healthBar = container.getChildByName('healthBar') as Graphics;
    if (healthBar) {
      healthBar.clear();
      const healthPercent = enemy.health / enemy.maxHealth;
      const color = healthPercent > 0.5 ? COLORS.green : healthPercent > 0.25 ? COLORS.orange : COLORS.primary;
      healthBar.beginFill(color);
      healthBar.drawRoundedRect(
        -enemy.width / 2,
        -enemy.height / 2 - 15,
        enemy.width * healthPercent,
        8,
        4
      );
      healthBar.endFill();
    }
  };

  // Create power-up sprite
  const createPowerUpSprite = (powerUp: PowerUp): Container => {
    const container = new Container();
    const config = POWER_UP_CONFIG[powerUp.type];

    // Glowing background
    const glow = new Graphics();
    glow.beginFill(parseInt(config.color.slice(1), 16), 0.3);
    glow.drawCircle(0, 0, 25);
    glow.endFill();
    glow.name = 'glow';
    container.addChild(glow);

    // Box shape
    const box = new Graphics();
    box.beginFill(parseInt(config.color.slice(1), 16));
    box.drawRoundedRect(-15, -15, 30, 30, 8);
    box.endFill();
    box.lineStyle(2, 0xffffff);
    box.drawRoundedRect(-15, -15, 30, 30, 8);
    container.addChild(box);

    // Emoji text
    const style = new TextStyle({
      fontSize: 20,
    });
    const text = new Text(config.emoji, style);
    text.anchor.set(0.5);
    container.addChild(text);

    return container;
  };

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    const initGame = async () => {
      const app = new Application();
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: COLORS.dark,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Create background with grid
      const bg = new Graphics();
      const gridSize = 50;
      bg.lineStyle(1, 0x2a2a4a, 0.5);
      for (let x = 0; x < app.screen.width; x += gridSize) {
        bg.moveTo(x, 0);
        bg.lineTo(x, app.screen.height);
      }
      for (let y = 0; y < app.screen.height; y += gridSize) {
        bg.moveTo(0, y);
        bg.lineTo(app.screen.width, y);
      }
      app.stage.addChild(bg);

      // Create game container
      const gameContainer = new Container();
      gameContainer.name = 'gameContainer';
      app.stage.addChild(gameContainer);

      // Create UI container
      const uiContainer = new Container();
      uiContainer.name = 'uiContainer';
      app.stage.addChild(uiContainer);
      spritesRef.current.ui = uiContainer;

      // Initialize player
      playerRef.current = createInitialPlayerState(app.screen.width, app.screen.height);
      const playerSprite = await createPlayerSprite(app);
      playerSprite.x = playerRef.current.x;
      playerSprite.y = playerRef.current.y;
      spritesRef.current.player = playerSprite;
      gameContainer.addChild(playerSprite);

      // Set up touch/mouse events
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      const handlePointerDown = (e: PointerEvent) => {
        touchRef.current = { x: e.clientX, y: e.clientY, active: true };
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (touchRef.current.active) {
          touchRef.current.x = e.clientX;
          touchRef.current.y = e.clientY;
        }
      };

      const handlePointerUp = () => {
        touchRef.current.active = false;
      };

      containerRef.current!.addEventListener('pointerdown', handlePointerDown);
      containerRef.current!.addEventListener('pointermove', handlePointerMove);
      containerRef.current!.addEventListener('pointerup', handlePointerUp);
      containerRef.current!.addEventListener('pointerleave', handlePointerUp);

      // Start game
      gameStateRef.current.isPlaying = true;
      lastSpawnRef.current = Date.now();

      // Game loop
      let lastTime = performance.now();

      const gameLoop = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        if (!gameStateRef.current.isPlaying || gameStateRef.current.isPaused) {
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        const player = playerRef.current!;
        const app = appRef.current!;
        const slowMotion = hasActivePowerUp(player, 'slowMotion');

        // Update player position based on touch
        if (touchRef.current.active) {
          const rect = containerRef.current!.getBoundingClientRect();
          const targetX = touchRef.current.x - rect.left;
          const targetY = touchRef.current.y - rect.top;

          const dx = targetX - player.x;
          const dy = targetY - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 5) {
            const speed = player.speed * (slowMotion ? 1.5 : 1);
            player.x += (dx / dist) * Math.min(speed, dist);
            player.y += (dy / dist) * Math.min(speed, dist);

            // Keep player in bounds
            player.x = Math.max(30, Math.min(app.screen.width - 30, player.x));
            player.y = Math.max(30, Math.min(app.screen.height - 30, player.y));
          }

          // Auto-fire
          const now = Date.now();
          if (now - player.lastFireTime > player.fireRate) {
            player.lastFireTime = now;

            if (hasActivePowerUp(player, 'multiShot')) {
              // Triple shot
              bulletsRef.current.push(
                createBullet(player.x - 15, player.y - 20, true),
                createBullet(player.x, player.y - 25, true),
                createBullet(player.x + 15, player.y - 20, true)
              );
            } else {
              bulletsRef.current.push(createBullet(player.x, player.y - 25, true));
            }
          }
        }

        // Update player sprite
        if (spritesRef.current.player) {
          spritesRef.current.player.x = player.x;
          spritesRef.current.player.y = player.y;

          // Invincibility flash effect
          if (player.isInvincible) {
            spritesRef.current.player.alpha = Math.sin(currentTime * 0.02) * 0.3 + 0.7;
          } else {
            spritesRef.current.player.alpha = 1;
          }

          // Animate flames
          const flames = spritesRef.current.player.getChildByName('flames') as Graphics;
          if (flames) {
            flames.scale.y = 0.8 + Math.sin(currentTime * 0.01) * 0.3;
          }
        }

        // Update player power-ups
        playerRef.current = updatePlayerPowerUps(player);

        // Spawn enemies
        const now = Date.now();
        if (now - lastSpawnRef.current > spawnIntervalRef.current) {
          lastSpawnRef.current = now;
          const enemyData = enemyImages[Math.floor(Math.random() * enemyImages.length)];
          const enemy = createEnemy(app.screen.width, enemyData.imageUrl, enemyData.name, gameStateRef.current.level);
          enemiesRef.current.push(enemy);

          // Create sprite for new enemy
          createEnemySprite(enemy).then(sprite => {
            sprite.x = enemy.x;
            sprite.y = enemy.y;
            spritesRef.current.enemies.set(enemy.id, sprite);
            (app.stage.getChildByName('gameContainer') as Container).addChild(sprite);
          });

          // Decrease spawn interval as game progresses (min 500ms)
          spawnIntervalRef.current = Math.max(500, 2000 - gameStateRef.current.level * 100);
        }

        // Update enemies
        const gameContainer = app.stage.getChildByName('gameContainer') as Container;

        enemiesRef.current = enemiesRef.current.filter(enemy => {
          updateEnemyPosition(enemy, player.x, deltaTime, slowMotion);

          const sprite = spritesRef.current.enemies.get(enemy.id);
          if (sprite) {
            sprite.x = enemy.x;
            sprite.y = enemy.y;
            sprite.rotation = enemy.rotation;
            updateHealthBar(sprite, enemy);
          }

          // Remove if off screen
          if (enemy.y > app.screen.height + 100) {
            if (sprite) {
              gameContainer.removeChild(sprite);
              spritesRef.current.enemies.delete(enemy.id);
            }
            // Reset combo when enemy escapes
            gameStateRef.current.combo = 0;
            return false;
          }

          // Check collision with player
          if (!player.isInvincible && checkCollision(enemy, player)) {
            // Player hit
            gameStateRef.current.lives--;
            gameStateRef.current.combo = 0;

            // Create explosion
            particlesRef.current.push(...createExplosionParticles(player.x, player.y, '#FF6B6B'));

            // Invincibility frames
            playerRef.current!.isInvincible = true;
            playerRef.current!.invincibleUntil = Date.now() + 2000;

            if (gameStateRef.current.lives <= 0) {
              gameStateRef.current.isPlaying = false;
              gameStateRef.current.isGameOver = true;
              onGameOver(gameStateRef.current.score);
            }

            // Remove enemy
            if (sprite) {
              gameContainer.removeChild(sprite);
              spritesRef.current.enemies.delete(enemy.id);
            }
            return false;
          }

          return true;
        });

        // Update bullets
        bulletsRef.current = bulletsRef.current.filter(bullet => {
          bullet.y += bullet.isPlayerBullet ? -bullet.speed : bullet.speed;

          // Update or create bullet sprite
          let sprite = spritesRef.current.bullets.get(bullet.id);
          if (!sprite) {
            sprite = new Graphics();
            if (bullet.isPlayerBullet) {
              sprite.beginFill(COLORS.accent);
              sprite.drawRoundedRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height, 4);
              sprite.endFill();
              // Glow effect
              sprite.beginFill(COLORS.accent, 0.3);
              sprite.drawRoundedRect(-bullet.width, -bullet.height, bullet.width * 2, bullet.height * 2, 8);
              sprite.endFill();
            } else {
              sprite.beginFill(COLORS.primary);
              sprite.drawCircle(0, 0, bullet.width / 2);
              sprite.endFill();
            }
            spritesRef.current.bullets.set(bullet.id, sprite);
            gameContainer.addChild(sprite);
          }
          sprite.x = bullet.x;
          sprite.y = bullet.y;

          // Remove if off screen
          if (bullet.y < -20 || bullet.y > app.screen.height + 20) {
            if (sprite) {
              gameContainer.removeChild(sprite);
              spritesRef.current.bullets.delete(bullet.id);
            }
            return false;
          }

          // Check collision with enemies (player bullets only)
          if (bullet.isPlayerBullet) {
            for (const enemy of enemiesRef.current) {
              if (checkCollision(bullet, enemy)) {
                enemy.health -= bullet.damage;

                // Create hit particles
                particlesRef.current.push(...createExplosionParticles(bullet.x, bullet.y, '#FFE66D', 5));

                if (enemy.health <= 0) {
                  // Enemy destroyed
                  gameStateRef.current.combo++;
                  const score = calculateScore(enemy, gameStateRef.current.combo);
                  gameStateRef.current.score += score;
                  onScoreUpdate(gameStateRef.current.score);

                  // Level up every 1000 points
                  gameStateRef.current.level = Math.floor(gameStateRef.current.score / 1000) + 1;

                  // Create score popup
                  scorePopupsRef.current.push(createScorePopup(enemy.x, enemy.y, score));

                  // Create explosion
                  particlesRef.current.push(...createExplosionParticles(enemy.x, enemy.y, '#A855F7', 15));

                  // Maybe drop power-up
                  if (shouldDropPowerUp()) {
                    const powerUp = createPowerUp(enemy.x, enemy.y);
                    powerUpsRef.current.push(powerUp);
                    const powerUpSprite = createPowerUpSprite(powerUp);
                    powerUpSprite.x = powerUp.x;
                    powerUpSprite.y = powerUp.y;
                    spritesRef.current.powerUps.set(powerUp.id, powerUpSprite);
                    gameContainer.addChild(powerUpSprite);
                  }

                  // Remove enemy
                  const enemySprite = spritesRef.current.enemies.get(enemy.id);
                  if (enemySprite) {
                    gameContainer.removeChild(enemySprite);
                    spritesRef.current.enemies.delete(enemy.id);
                  }
                  enemiesRef.current = enemiesRef.current.filter(e => e.id !== enemy.id);
                }

                // Remove bullet
                if (sprite) {
                  gameContainer.removeChild(sprite);
                  spritesRef.current.bullets.delete(bullet.id);
                }
                return false;
              }
            }
          }

          return true;
        });

        // Update power-ups
        powerUpsRef.current = powerUpsRef.current.filter(powerUp => {
          powerUp.y += powerUp.speed;

          const sprite = spritesRef.current.powerUps.get(powerUp.id);
          if (sprite) {
            sprite.x = powerUp.x;
            sprite.y = powerUp.y;
            sprite.rotation = Math.sin(currentTime * 0.003) * 0.2;

            // Pulse glow
            const glow = sprite.getChildByName('glow') as Graphics;
            if (glow) {
              glow.scale.set(1 + Math.sin(currentTime * 0.005) * 0.2);
            }
          }

          // Remove if off screen
          if (powerUp.y > app.screen.height + 50) {
            if (sprite) {
              gameContainer.removeChild(sprite);
              spritesRef.current.powerUps.delete(powerUp.id);
            }
            return false;
          }

          // Check collision with player
          if (checkCollision(powerUp, player)) {
            // Handle bomb immediately
            if (powerUp.type === 'bomb') {
              // Destroy all enemies on screen
              for (const enemy of enemiesRef.current) {
                const score = calculateScore(enemy, gameStateRef.current.combo);
                gameStateRef.current.score += score;
                gameStateRef.current.combo++;
                scorePopupsRef.current.push(createScorePopup(enemy.x, enemy.y, score));
                particlesRef.current.push(...createExplosionParticles(enemy.x, enemy.y, '#FFE66D', 20));

                const enemySprite = spritesRef.current.enemies.get(enemy.id);
                if (enemySprite) {
                  gameContainer.removeChild(enemySprite);
                  spritesRef.current.enemies.delete(enemy.id);
                }
              }
              enemiesRef.current = [];
              onScoreUpdate(gameStateRef.current.score);
            } else {
              playerRef.current = addPowerUp(player, powerUp.type);
            }

            // Remove power-up
            if (sprite) {
              gameContainer.removeChild(sprite);
              spritesRef.current.powerUps.delete(powerUp.id);
            }
            return false;
          }

          return true;
        });

        // Update particles
        particlesRef.current = particlesRef.current.filter(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.1; // Gravity
          particle.life -= 0.02;

          let sprite = spritesRef.current.particles.get(particle.id);
          if (!sprite) {
            sprite = new Graphics();
            sprite.beginFill(parseInt(particle.color.slice(1), 16));
            sprite.drawCircle(0, 0, particle.size);
            sprite.endFill();
            spritesRef.current.particles.set(particle.id, sprite);
            gameContainer.addChild(sprite);
          }
          sprite.x = particle.x;
          sprite.y = particle.y;
          sprite.alpha = particle.life;
          sprite.scale.set(particle.life);

          if (particle.life <= 0) {
            gameContainer.removeChild(sprite);
            spritesRef.current.particles.delete(particle.id);
            return false;
          }

          return true;
        });

        // Update score popups
        const uiContainer = spritesRef.current.ui;
        scorePopupsRef.current = scorePopupsRef.current.filter(popup => {
          popup.y -= 1;
          popup.life -= 0.02;

          let text = spritesRef.current.scorePopups.get(popup.id);
          if (!text) {
            const style = new TextStyle({
              fontSize: 24,
              fontWeight: 'bold',
              fill: COLORS.accent,
              stroke: { color: '#000000', width: 3 },
            });
            text = new Text(`+${popup.value}`, style);
            text.anchor.set(0.5);
            spritesRef.current.scorePopups.set(popup.id, text);
            if (uiContainer) uiContainer.addChild(text);
          }
          text.x = popup.x;
          text.y = popup.y;
          text.alpha = popup.life;
          text.scale.set(1 + (1 - popup.life) * 0.5);

          if (popup.life <= 0) {
            if (uiContainer) uiContainer.removeChild(text);
            spritesRef.current.scorePopups.delete(popup.id);
            return false;
          }

          return true;
        });

        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    initGame();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
      }
    };
  }, [walletAssets, playerAvatarUrl, onGameOver, onScoreUpdate, createPlayerSprite, createEnemySprite, enemyImages]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full touch-none"
      style={{ touchAction: 'none' }}
    />
  );
}
