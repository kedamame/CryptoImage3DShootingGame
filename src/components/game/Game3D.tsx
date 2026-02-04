'use client';

import { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, useTexture, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  type GameState,
  type Enemy,
  type Obstacle,
  type DropItem,
  type PlayerShip,
  type Bullet,
  GAME_CONFIG,
  createInitialGameState,
  generateId,
} from '@/lib/game-types';
import {
  updateGameState,
  spawnEnemy,
  spawnObstacle,
  createBullet,
} from '@/lib/game-engine';
import type { WalletAsset } from '@/lib/wallet-assets';

// Player Ship Component
function PlayerShipMesh({
  ship,
  avatarUrl,
  isInvincible,
}: {
  ship: PlayerShip;
  avatarUrl: string | null;
  isInvincible: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (avatarUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        avatarUrl,
        (tex) => setTexture(tex),
        undefined,
        () => setTexture(null)
      );
    }
  }, [avatarUrl]);

  useFrame((state) => {
    if (meshRef.current) {
      // Bobbing animation
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      // Invincibility flash
      if (isInvincible) {
        meshRef.current.visible = Math.floor(state.clock.elapsedTime * 10) % 2 === 0;
      } else {
        meshRef.current.visible = true;
      }
    }
  });

  return (
    <group position={[ship.position.x, ship.position.y, ship.position.z]}>
      {/* Ship body */}
      <mesh ref={meshRef}>
        <coneGeometry args={[0.5, 1.2, 6]} />
        <meshStandardMaterial color="#4ECDC4" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Avatar display */}
      {texture && (
        <Billboard position={[0, 0.3, 0.6]}>
          <mesh>
            <circleGeometry args={[0.35, 32]} />
            <meshBasicMaterial map={texture} />
          </mesh>
        </Billboard>
      )}
      {/* Engine glow */}
      <mesh position={[0, -0.7, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#FFE66D" />
      </mesh>
      <pointLight position={[0, -0.7, 0]} color="#FFE66D" intensity={1} distance={2} />
    </group>
  );
}

// Enemy Component
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const imageUrl = enemy.asset.imageUrl;
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        imageUrl,
        (tex) => setTexture(tex),
        undefined,
        () => setTexture(null)
      );
    }
  }, [enemy.asset.imageUrl]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  const healthPercent = enemy.health / enemy.maxHealth;

  return (
    <group position={[enemy.position.x, enemy.position.y, enemy.position.z]}>
      {/* Enemy body - cube with rounded edges feel */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 0.5]} />
        <meshStandardMaterial
          color={enemy.asset.type === 'nft' ? '#A855F7' : '#FF6B6B'}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>
      {/* Asset image */}
      {texture && (
        <Billboard position={[0, 0, 0.3]}>
          <mesh>
            <planeGeometry args={[0.8, 0.8]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
        </Billboard>
      )}
      {/* Health bar */}
      <group position={[0, 0.8, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 0.1, 0.05]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[(healthPercent - 1) * 0.5, 0, 0.03]}>
          <boxGeometry args={[healthPercent, 0.08, 0.05]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
      </group>
    </group>
  );
}

// Obstacle Component
function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.7;
    }
  });

  const healthPercent = obstacle.health / obstacle.maxHealth;

  return (
    <group position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
        <meshStandardMaterial
          color={obstacle.color}
          metalness={0.3}
          roughness={0.7}
          opacity={0.5 + healthPercent * 0.5}
          transparent
        />
      </mesh>
      {/* Outline effect */}
      <mesh ref={meshRef} scale={1.05}>
        <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
        <meshBasicMaterial color="#fff" wireframe />
      </mesh>
    </group>
  );
}

// Bullet Component
function BulletMesh({ bullet }: { bullet: Bullet }) {
  return (
    <mesh position={[bullet.position.x, bullet.position.y, bullet.position.z]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color={bullet.isPlayerBullet ? '#FFE66D' : '#FF6B6B'} />
      <pointLight
        color={bullet.isPlayerBullet ? '#FFE66D' : '#FF6B6B'}
        intensity={0.5}
        distance={1}
      />
    </mesh>
  );
}

// Drop Item Component
function DropItemMesh({ item }: { item: DropItem }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = GAME_CONFIG.ITEM_COLORS[item.itemType];

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 3;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
  });

  const getItemShape = () => {
    switch (item.itemType) {
      case 'extraShip':
        return <octahedronGeometry args={[0.4]} />;
      case 'speedUp':
        return <coneGeometry args={[0.3, 0.6, 4]} />;
      case 'shield':
        return <torusGeometry args={[0.3, 0.1, 8, 16]} />;
      case 'rapidFire':
        return <cylinderGeometry args={[0.15, 0.15, 0.6, 8]} />;
      case 'scoreMultiplier':
        return <dodecahedronGeometry args={[0.35]} />;
      default:
        return <sphereGeometry args={[0.3]} />;
    }
  };

  return (
    <group position={[item.position.x, item.position.y, item.position.z]}>
      <mesh ref={meshRef}>
        {getItemShape()}
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <pointLight color={color} intensity={1} distance={2} />
    </group>
  );
}

// Background stars
function Stars() {
  const starsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = -5 - Math.random() * 10;
    }
    return pos;
  });

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.z += 0.0002;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#fff" transparent opacity={0.8} />
    </points>
  );
}

// Game Scene
function GameScene({
  gameState,
  avatarUrl,
}: {
  gameState: GameState;
  avatarUrl: string | null;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#4ECDC4" />

      {/* Background */}
      <Stars />
      <color attach="background" args={['#0F0F1A']} />

      {/* Player ships */}
      {gameState.playerShips.map((ship) => (
        <PlayerShipMesh
          key={ship.id}
          ship={ship}
          avatarUrl={avatarUrl}
          isInvincible={gameState.player.isInvincible}
        />
      ))}

      {/* Bullets */}
      {gameState.bullets.map((bullet) => (
        <BulletMesh key={bullet.id} bullet={bullet} />
      ))}

      {/* Enemies */}
      {gameState.enemies.map((enemy) => (
        <EnemyMesh key={enemy.id} enemy={enemy} />
      ))}

      {/* Obstacles */}
      {gameState.obstacles.map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}

      {/* Drop Items */}
      {gameState.dropItems.map((item) => (
        <DropItemMesh key={item.id} item={item} />
      ))}

      {/* Game boundary visualization */}
      <mesh position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT]} />
        <meshStandardMaterial color="#1A1A2E" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

// Main Game Component
interface Game3DProps {
  walletAssets: WalletAsset[];
  avatarUrl: string | null;
  onGameOver: (score: number) => void;
}

export default function Game3D({ walletAssets, avatarUrl, onGameOver }: Game3DProps) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(walletAssets)
  );
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const lastFireTime = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert screen coordinates to game coordinates
  const screenToGame = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    return {
      x: x * (GAME_CONFIG.GAME_WIDTH / 2),
      y: y * (GAME_CONFIG.GAME_HEIGHT / 2),
    };
  }, []);

  // Touch/Mouse handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsTouching(true);
      const pos = screenToGame(e.clientX, e.clientY);
      if (pos) setTouchPosition(pos);
    },
    [screenToGame]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isTouching) {
        const pos = screenToGame(e.clientX, e.clientY);
        if (pos) setTouchPosition(pos);
      }
    },
    [isTouching, screenToGame]
  );

  const handlePointerUp = useCallback(() => {
    setIsTouching(false);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...createInitialGameState(walletAssets),
      status: 'playing',
    }));
  }, [walletAssets]);

  // Game loop
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const gameLoop = setInterval(() => {
      const currentTime = Date.now();

      setGameState((prev) => {
        let newState = updateGameState(prev, 16, currentTime, touchPosition, isTouching);

        // Spawn enemies
        if (currentTime - newState.lastSpawnTime > GAME_CONFIG.ENEMY_SPAWN_INTERVAL / newState.difficulty) {
          const enemy = spawnEnemy(newState);
          if (enemy) {
            newState = {
              ...newState,
              enemies: [...newState.enemies, enemy],
              lastSpawnTime: currentTime,
            };
          }
        }

        // Spawn obstacles
        if (currentTime - newState.lastObstacleSpawnTime > GAME_CONFIG.OBSTACLE_SPAWN_INTERVAL) {
          const obstacle = spawnObstacle(newState);
          newState = {
            ...newState,
            obstacles: [...newState.obstacles, obstacle],
            lastObstacleSpawnTime: currentTime,
          };
        }

        // Auto-fire when touching
        if (isTouching && currentTime - lastFireTime.current > GAME_CONFIG.FIRE_RATE) {
          const hasRapidFire = newState.activeEffects.some((e) => e.type === 'rapidFire');
          const fireRate = hasRapidFire ? GAME_CONFIG.FIRE_RATE / 2 : GAME_CONFIG.FIRE_RATE;

          if (currentTime - lastFireTime.current > fireRate) {
            const newBullets = newState.playerShips.map((ship) =>
              createBullet(ship.position.x, ship.position.y + 0.7, true, newState)
            );
            newState = {
              ...newState,
              bullets: [...newState.bullets, ...newBullets],
            };
            lastFireTime.current = currentTime;
          }
        }

        // Check game over
        if (newState.status === 'gameOver') {
          onGameOver(newState.player.score);
        }

        return newState;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameState.status, touchPosition, isTouching, onGameOver]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 0, 15], fov: 60 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          <GameScene gameState={gameState} avatarUrl={avatarUrl} />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      {gameState.status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-accent mb-4">
              Crypto Shooter
            </h1>
            <p className="text-secondary mb-6">
              Your wallet assets are the enemies!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-primary text-white text-xl font-bold rounded-lg hover:bg-primary/80 transition-colors"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {gameState.status === 'gameOver' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center p-8">
            <h2 className="text-4xl font-bold text-primary mb-4">GAME OVER</h2>
            <p className="text-3xl text-accent mb-6">
              Score: {gameState.player.score.toLocaleString()}
            </p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-secondary text-dark text-xl font-bold rounded-lg hover:bg-secondary/80 transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {gameState.status === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          {/* Score */}
          <div className="bg-dark/80 px-4 py-2 rounded-lg">
            <p className="text-accent text-2xl font-bold">
              {gameState.player.score.toLocaleString()}
            </p>
          </div>

          {/* Lives */}
          <div className="bg-dark/80 px-4 py-2 rounded-lg flex gap-2">
            {Array.from({ length: gameState.player.lives }).map((_, i) => (
              <span key={i} className="text-primary text-2xl">❤️</span>
            ))}
          </div>
        </div>
      )}

      {/* Active Effects */}
      {gameState.status === 'playing' && gameState.activeEffects.length > 0 && (
        <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
          {gameState.activeEffects.map((effect, i) => (
            <div
              key={i}
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ backgroundColor: GAME_CONFIG.ITEM_COLORS[effect.type] }}
            >
              {effect.type === 'speedUp' && '⚡ Speed'}
              {effect.type === 'shield' && '🛡️ Shield'}
              {effect.type === 'rapidFire' && '🔥 Rapid'}
              {effect.type === 'scoreMultiplier' && '✨ 2x'}
            </div>
          ))}
        </div>
      )}

      {/* Ships count */}
      {gameState.status === 'playing' && gameState.playerShips.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-dark/80 px-4 py-2 rounded-lg pointer-events-none">
          <p className="text-accent font-bold">
            Ships: {gameState.playerShips.length}
          </p>
        </div>
      )}
    </div>
  );
}
