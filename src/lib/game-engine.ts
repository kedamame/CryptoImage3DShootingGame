import {
  type GameState,
  type Bullet,
  type Enemy,
  type Obstacle,
  type DropItem,
  type PlayerShip,
  type ItemType,
  GAME_CONFIG,
  generateId,
} from './game-types';

// Spawn a new enemy from wallet assets
export function spawnEnemy(state: GameState): Enemy | null {
  if (state.walletAssets.length === 0) return null;

  const asset = state.walletAssets[Math.floor(Math.random() * state.walletAssets.length)];
  const x = (Math.random() - 0.5) * (GAME_CONFIG.GAME_WIDTH - 2);

  return {
    id: generateId(),
    position: { x, y: GAME_CONFIG.GAME_HEIGHT / 2 + 2, z: 0 },
    velocity: {
      x: (Math.random() - 0.5) * 0.02,
      y: -(GAME_CONFIG.ENEMY_BASE_SPEED * (1 + state.difficulty * 0.1)),
      z: 0,
    },
    health: GAME_CONFIG.ENEMY_BASE_HEALTH + Math.floor(state.difficulty / 2),
    maxHealth: GAME_CONFIG.ENEMY_BASE_HEALTH + Math.floor(state.difficulty / 2),
    asset,
    scoreValue: GAME_CONFIG.ENEMY_BASE_SCORE * state.difficulty,
    dropChance: GAME_CONFIG.ENEMY_DROP_CHANCE,
  };
}

// Spawn a destructible obstacle
export function spawnObstacle(state: GameState): Obstacle {
  const x = (Math.random() - 0.5) * (GAME_CONFIG.GAME_WIDTH - 4);
  const colors = Object.values(GAME_CONFIG.COLORS);
  const color = colors[Math.floor(Math.random() * colors.length)];

  return {
    id: generateId(),
    position: { x, y: GAME_CONFIG.GAME_HEIGHT / 2 + 2, z: 0 },
    velocity: {
      x: 0,
      y: -(GAME_CONFIG.OBSTACLE_BASE_SPEED * (1 + state.difficulty * 0.05)),
      z: 0,
    },
    health: GAME_CONFIG.OBSTACLE_BASE_HEALTH,
    maxHealth: GAME_CONFIG.OBSTACLE_BASE_HEALTH,
    size: {
      x: 1 + Math.random() * 1.5,
      y: 1 + Math.random() * 1.5,
      z: 1 + Math.random() * 0.5,
    },
    color,
  };
}

// Create a bullet
export function createBullet(
  x: number,
  y: number,
  isPlayerBullet: boolean,
  state: GameState
): Bullet {
  const hasRapidFire = state.activeEffects.some((e) => e.type === 'rapidFire');
  const speed = isPlayerBullet
    ? GAME_CONFIG.BULLET_SPEED * (hasRapidFire ? 1.5 : 1)
    : GAME_CONFIG.BULLET_SPEED * 0.5;

  return {
    id: generateId(),
    position: { x, y, z: 0 },
    velocity: { x: 0, y: isPlayerBullet ? speed : -speed, z: 0 },
    isPlayerBullet,
    damage: isPlayerBullet ? 1 : 1,
  };
}

// Create a drop item
export function createDropItem(x: number, y: number): DropItem {
  const itemTypes: ItemType[] = ['extraShip', 'speedUp', 'shield', 'rapidFire', 'scoreMultiplier'];
  const weights = [0.15, 0.25, 0.2, 0.2, 0.2]; // extraShip is rarer

  let random = Math.random();
  let itemType: ItemType = 'speedUp';

  for (let i = 0; i < itemTypes.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      itemType = itemTypes[i];
      break;
    }
  }

  return {
    id: generateId(),
    position: { x, y, z: 0 },
    velocity: { x: 0, y: -GAME_CONFIG.ITEM_FALL_SPEED, z: 0 },
    itemType,
    duration: itemType === 'extraShip' ? 0 : GAME_CONFIG.EFFECT_DURATION,
  };
}

// Add an extra ship
export function addExtraShip(state: GameState): PlayerShip {
  const shipCount = state.playerShips.length;
  const side = shipCount % 2 === 0 ? 1 : -1;
  const level = Math.floor((shipCount + 1) / 2);

  return {
    id: generateId(),
    position: { ...state.player.position },
    offset: {
      x: side * level * GAME_CONFIG.EXTRA_SHIP_OFFSET,
      y: -level * 0.3,
      z: 0,
    },
  };
}

// Check collision between two objects
export function checkCollision(
  pos1: { x: number; y: number },
  size1: number,
  pos2: { x: number; y: number },
  size2: number
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (size1 + size2) / 2;
}

// Main game update function
export function updateGameState(
  state: GameState,
  deltaTime: number,
  currentTime: number,
  touchPosition: { x: number; y: number } | null,
  isTouching: boolean
): GameState {
  if (state.status !== 'playing') return state;

  const newState = { ...state };
  newState.gameTime += deltaTime;

  // Update difficulty
  newState.difficulty = Math.min(
    GAME_CONFIG.MAX_DIFFICULTY,
    1 + Math.floor(newState.gameTime / GAME_CONFIG.DIFFICULTY_INCREASE_INTERVAL)
  );

  // Update player position based on touch
  if (touchPosition && isTouching) {
    const targetX = touchPosition.x;
    const targetY = touchPosition.y;
    const hasSpeedUp = newState.activeEffects.some((e) => e.type === 'speedUp');
    const speed = GAME_CONFIG.PLAYER_SPEED * (hasSpeedUp ? 1.5 : 1);

    const dx = targetX - newState.player.position.x;
    const dy = targetY - newState.player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
      newState.player.position.x += (dx / distance) * speed;
      newState.player.position.y += (dy / distance) * speed;
    }

    // Clamp position
    const halfWidth = GAME_CONFIG.GAME_WIDTH / 2 - 1;
    const halfHeight = GAME_CONFIG.GAME_HEIGHT / 2 - 1;
    newState.player.position.x = Math.max(-halfWidth, Math.min(halfWidth, newState.player.position.x));
    newState.player.position.y = Math.max(-halfHeight, Math.min(halfHeight, newState.player.position.y));
  }

  // Update player ships positions
  newState.playerShips = newState.playerShips.map((ship) => ({
    ...ship,
    position: {
      x: newState.player.position.x + ship.offset.x,
      y: newState.player.position.y + ship.offset.y,
      z: newState.player.position.z + ship.offset.z,
    },
  }));

  // Update invincibility
  if (newState.player.isInvincible && currentTime > newState.player.invincibleUntil) {
    newState.player.isInvincible = false;
  }

  // Remove expired effects
  newState.activeEffects = newState.activeEffects.filter((e) => e.expiresAt > currentTime);

  // Update bullets
  newState.bullets = newState.bullets
    .map((bullet) => ({
      ...bullet,
      position: {
        x: bullet.position.x + bullet.velocity.x,
        y: bullet.position.y + bullet.velocity.y,
        z: bullet.position.z + bullet.velocity.z,
      },
    }))
    .filter(
      (bullet) =>
        bullet.position.y < GAME_CONFIG.GAME_HEIGHT / 2 + 2 &&
        bullet.position.y > -GAME_CONFIG.GAME_HEIGHT / 2 - 2
    );

  // Update enemies
  newState.enemies = newState.enemies
    .map((enemy) => ({
      ...enemy,
      position: {
        x: enemy.position.x + enemy.velocity.x,
        y: enemy.position.y + enemy.velocity.y,
        z: enemy.position.z + enemy.velocity.z,
      },
    }))
    .filter((enemy) => enemy.position.y > -GAME_CONFIG.GAME_HEIGHT / 2 - 3);

  // Update obstacles
  newState.obstacles = newState.obstacles
    .map((obstacle) => ({
      ...obstacle,
      position: {
        x: obstacle.position.x + obstacle.velocity.x,
        y: obstacle.position.y + obstacle.velocity.y,
        z: obstacle.position.z + obstacle.velocity.z,
      },
    }))
    .filter((obstacle) => obstacle.position.y > -GAME_CONFIG.GAME_HEIGHT / 2 - 3);

  // Update drop items
  newState.dropItems = newState.dropItems
    .map((item) => ({
      ...item,
      position: {
        x: item.position.x + item.velocity.x,
        y: item.position.y + item.velocity.y,
        z: item.position.z + item.velocity.z,
      },
    }))
    .filter((item) => item.position.y > -GAME_CONFIG.GAME_HEIGHT / 2 - 2);

  // Check bullet-enemy collisions
  const bulletsToRemove = new Set<string>();
  const enemiesToRemove = new Set<string>();

  for (const bullet of newState.bullets) {
    if (!bullet.isPlayerBullet) continue;

    for (const enemy of newState.enemies) {
      if (checkCollision(bullet.position, 0.3, enemy.position, 1.2)) {
        bulletsToRemove.add(bullet.id);
        enemy.health -= bullet.damage;

        if (enemy.health <= 0) {
          enemiesToRemove.add(enemy.id);
          const hasMultiplier = newState.activeEffects.some((e) => e.type === 'scoreMultiplier');
          newState.player.score += enemy.scoreValue * (hasMultiplier ? 2 : 1);

          // Check for drop
          if (Math.random() < enemy.dropChance) {
            newState.dropItems.push(createDropItem(enemy.position.x, enemy.position.y));
          }
        }
        break;
      }
    }
  }

  // Check bullet-obstacle collisions
  const obstaclesToRemove = new Set<string>();

  for (const bullet of newState.bullets) {
    if (!bullet.isPlayerBullet) continue;

    for (const obstacle of newState.obstacles) {
      if (checkCollision(bullet.position, 0.3, obstacle.position, Math.max(obstacle.size.x, obstacle.size.y))) {
        bulletsToRemove.add(bullet.id);
        obstacle.health -= bullet.damage;

        if (obstacle.health <= 0) {
          obstaclesToRemove.add(obstacle.id);
          newState.player.score += 50;

          // Small chance to drop item from obstacles
          if (Math.random() < 0.1) {
            newState.dropItems.push(createDropItem(obstacle.position.x, obstacle.position.y));
          }
        }
        break;
      }
    }
  }

  // Check player-enemy collisions
  if (!newState.player.isInvincible) {
    for (const enemy of newState.enemies) {
      if (checkCollision(newState.player.position, 0.8, enemy.position, 1.0)) {
        const hasShield = newState.activeEffects.some((e) => e.type === 'shield');

        if (hasShield) {
          newState.activeEffects = newState.activeEffects.filter((e) => e.type !== 'shield');
        } else {
          newState.player.lives -= 1;
          newState.player.isInvincible = true;
          newState.player.invincibleUntil = currentTime + GAME_CONFIG.INVINCIBILITY_DURATION;

          // Remove one extra ship if any
          if (newState.playerShips.length > 1) {
            newState.playerShips.pop();
          }
        }

        enemiesToRemove.add(enemy.id);
        break;
      }
    }
  }

  // Check player-obstacle collisions
  if (!newState.player.isInvincible) {
    for (const obstacle of newState.obstacles) {
      if (
        checkCollision(
          newState.player.position,
          0.8,
          obstacle.position,
          Math.max(obstacle.size.x, obstacle.size.y)
        )
      ) {
        const hasShield = newState.activeEffects.some((e) => e.type === 'shield');

        if (hasShield) {
          newState.activeEffects = newState.activeEffects.filter((e) => e.type !== 'shield');
        } else {
          newState.player.lives -= 1;
          newState.player.isInvincible = true;
          newState.player.invincibleUntil = currentTime + GAME_CONFIG.INVINCIBILITY_DURATION;

          if (newState.playerShips.length > 1) {
            newState.playerShips.pop();
          }
        }

        obstaclesToRemove.add(obstacle.id);
        break;
      }
    }
  }

  // Check player-item collisions
  const itemsToRemove = new Set<string>();

  for (const item of newState.dropItems) {
    if (checkCollision(newState.player.position, 1.0, item.position, 0.8)) {
      itemsToRemove.add(item.id);

      if (item.itemType === 'extraShip') {
        newState.playerShips.push(addExtraShip(newState));
      } else {
        // Remove existing effect of same type and add new one
        newState.activeEffects = newState.activeEffects.filter((e) => e.type !== item.itemType);
        newState.activeEffects.push({
          type: item.itemType,
          expiresAt: currentTime + item.duration,
        });
      }
    }
  }

  // Apply removals
  newState.bullets = newState.bullets.filter((b) => !bulletsToRemove.has(b.id));
  newState.enemies = newState.enemies.filter((e) => !enemiesToRemove.has(e.id));
  newState.obstacles = newState.obstacles.filter((o) => !obstaclesToRemove.has(o.id));
  newState.dropItems = newState.dropItems.filter((i) => !itemsToRemove.has(i.id));

  // Check game over
  if (newState.player.lives <= 0) {
    newState.status = 'gameOver';
  }

  return newState;
}
