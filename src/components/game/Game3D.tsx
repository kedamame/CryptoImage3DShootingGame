'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrthographicCamera, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game-engine';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_COLORS, BOSS_COLORS, type PowerUpType } from '@/lib/game-types';

// Voxel-style box component
function VoxelBox({
  position,
  size = 1,
  color
}: {
  position: [number, number, number];
  size?: number;
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

// Player ship (voxel style)
function PlayerShip({
  position,
  targetPosition,
  isMain,
  avatarUrl,
  hasShield
}: {
  position: [number, number, number];
  targetPosition?: { x: number; y: number } | null;
  isMain: boolean;
  avatarUrl?: string | null;
  hasShield: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Direct position update for main ship - no lag
      if (isMain && targetPosition) {
        groupRef.current.position.x = targetPosition.x;
        groupRef.current.position.y = targetPosition.y;
      }
      // Slight floating animation
      groupRef.current.position.z = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
    if (shieldRef.current && hasShield) {
      shieldRef.current.rotation.y += 0.02;
      shieldRef.current.rotation.z += 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main body - smaller for bullet hell */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        <meshStandardMaterial color={isMain ? '#6ECBFF' : '#FF9FF3'} flatShading />
      </mesh>
      {/* Wings - smaller */}
      <mesh position={[-0.3, -0.05, 0]} castShadow>
        <boxGeometry args={[0.2, 0.3, 0.1]} />
        <meshStandardMaterial color={isMain ? '#54E6CB' : '#A66CFF'} flatShading />
      </mesh>
      <mesh position={[0.3, -0.05, 0]} castShadow>
        <boxGeometry args={[0.2, 0.3, 0.1]} />
        <meshStandardMaterial color={isMain ? '#54E6CB' : '#A66CFF'} flatShading />
      </mesh>
      {/* Cockpit - smaller */}
      <mesh position={[0, 0.1, 0.08]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color="#FFD93D" flatShading />
      </mesh>
      {/* Shield effect - smaller */}
      {hasShield && (
        <mesh ref={shieldRef}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshStandardMaterial
            color="#6ECBFF"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}

// Enemy component with token/NFT image
function Enemy({
  position,
  size,
  imageUrl,
  health,
  maxHealth,
  isBlock,
  isBoss
}: {
  position: [number, number, number];
  size: number;
  imageUrl: string;
  health: number;
  maxHealth: number;
  isBlock: boolean;
  isBoss: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => {
    if (isBoss) {
      return BOSS_COLORS[Math.floor(Math.random() * BOSS_COLORS.length)];
    }
    if (isBlock) {
      return BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    }
    return POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)];
  }, [isBlock, isBoss]);

  useFrame((state) => {
    if (meshRef.current) {
      if (isBoss) {
        // Boss has a menacing slow rotation
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
      } else if (!isBlock) {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.3;
        meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 1.5) * 0.1;
      }
    }
  });

  const healthPercent = health / maxHealth;

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        {isBoss ? (
          <octahedronGeometry args={[size * 0.7]} />
        ) : (
          <boxGeometry args={[size, size, size * 0.6]} />
        )}
        <meshStandardMaterial
          color={color}
          flatShading
          opacity={0.5 + healthPercent * 0.5}
          transparent
          emissive={isBoss ? color : undefined}
          emissiveIntensity={isBoss ? 0.3 : 0}
        />
      </mesh>
      {/* Boss has outer ring */}
      {isBoss && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 0.9, 0.1, 8, 16]} />
          <meshStandardMaterial color="#FF6B6B" emissive="#FF6B6B" emissiveIntensity={0.5} />
        </mesh>
      )}
      {/* Health indicator */}
      {health < maxHealth && (
        <mesh position={[0, size * 0.8, 0]}>
          <boxGeometry args={[size * healthPercent, 0.12, 0.12]} />
          <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
        </mesh>
      )}
      {/* Boss glow */}
      {isBoss && (
        <pointLight color="#FF6B6B" intensity={1} distance={5} />
      )}
    </group>
  );
}

// Player Bullet component
function Bullet({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.1, 0.25, 0.1]} />
      <meshStandardMaterial color="#FFD93D" emissive="#FF8C42" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Enemy Bullet component
function EnemyBulletMesh({
  position,
  size,
  color
}: {
  position: [number, number, number];
  size: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}

// Power-up component
function PowerUpItem({
  position,
  type
}: {
  position: [number, number, number];
  type: PowerUpType;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = POWER_UP_COLORS[type];

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          flatShading
        />
      </mesh>
      {/* Glow effect */}
      <pointLight color={color} intensity={0.5} distance={2} />
    </group>
  );
}

// Background grid
function BackgroundGrid() {
  return (
    <group position={[0, 0, -3]}>
      <gridHelper args={[30, 30, '#2D2D2D', '#1a1a2e']} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

// Game bounds must match game-engine.ts
const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -5,
  maxY: 8,
};

// Game scene
function GameScene() {
  const { gl, camera, size } = useThree();
  // Get render data from store (triggers re-render)
  const players = useGameStore((s) => s.players);
  const enemies = useGameStore((s) => s.enemies);
  const bullets = useGameStore((s) => s.bullets);
  const enemyBullets = useGameStore((s) => s.enemyBullets);
  const powerUps = useGameStore((s) => s.powerUps);
  const activePowerUps = useGameStore((s) => s.activePowerUps);
  const playerAvatar = useGameStore((s) => s.playerAvatar);

  const lastFireTime = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });
  // Direct position ref for lag-free rendering
  const [targetPos, setTargetPos] = useState({ x: 0, y: -3 });

  // Game loop - always runs when playing
  useFrame((state, delta) => {
    // Get latest state directly from store
    const store = useGameStore.getState();

    if (store.isPlaying && !store.isPaused) {
      // Update game state (spawns enemies, moves objects, etc.)
      store.updateGame(delta);

      // Always fire bullets continuously
      const fireRate = store.activePowerUps.rapidFire ? 80 : 150;
      if (Date.now() - lastFireTime.current > fireRate) {
        store.fireBullet();
        lastFireTime.current = Date.now();
      }

      // Update store for collision detection (less frequent)
      store.movePlayer(mousePos.current.x, mousePos.current.y);
    }
  });

  // Touch/mouse controls - convert screen to game coordinates
  useEffect(() => {
    const canvas = gl.domElement;

    // Convert screen coordinates to game world coordinates
    // Ship appears slightly above cursor so player can see what they're aiming at
    const SHIP_OFFSET_Y = 1.5;

    const screenToGame = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      // Normalize to 0-1
      const normalizedX = (clientX - rect.left) / rect.width;
      const normalizedY = (clientY - rect.top) / rect.height;
      // Map to game bounds (x: -8 to 8, y: 8 to -5 - note Y is inverted)
      const gameX = GAME_BOUNDS.minX + normalizedX * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX);
      const gameY = GAME_BOUNDS.maxY - normalizedY * (GAME_BOUNDS.maxY - GAME_BOUNDS.minY) + SHIP_OFFSET_Y;
      return { x: gameX, y: gameY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pos = screenToGame(e.clientX, e.clientY);
      mousePos.current = pos;
      setTargetPos(pos); // Immediate update for lag-free rendering
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        mousePos.current = pos;
        setTargetPos(pos);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        mousePos.current = pos;
        setTargetPos(pos);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gl]);

  return (
    <>
      {/* Top-down orthographic camera */}
      <OrthographicCamera
        makeDefault
        position={[0, 1.5, 20]}
        zoom={45}
        near={0.1}
        far={100}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#FF9FF3" />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#6ECBFF" />

      {/* Background */}
      <BackgroundGrid />

      {/* Players */}
      {players.map((player) => (
        <PlayerShip
          key={player.id}
          position={[player.position.x, player.position.y, player.position.z]}
          targetPosition={player.isMain ? targetPos : null}
          isMain={player.isMain}
          avatarUrl={player.isMain ? playerAvatar : null}
          hasShield={activePowerUps.shield}
        />
      ))}

      {/* Enemies */}
      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          position={[enemy.position.x, enemy.position.y, enemy.position.z]}
          size={enemy.size}
          imageUrl={enemy.asset.imageUrl}
          health={enemy.health}
          maxHealth={enemy.maxHealth}
          isBlock={enemy.isBlock}
          isBoss={enemy.isBoss}
        />
      ))}

      {/* Player Bullets */}
      {bullets.map((bullet) => (
        <Bullet
          key={bullet.id}
          position={[bullet.position.x, bullet.position.y, bullet.position.z]}
        />
      ))}

      {/* Enemy Bullets */}
      {enemyBullets.map((bullet) => (
        <EnemyBulletMesh
          key={bullet.id}
          position={[bullet.position.x, bullet.position.y, bullet.position.z]}
          size={bullet.size}
          color={bullet.color}
        />
      ))}

      {/* Power-ups */}
      {powerUps.map((powerUp) => (
        <PowerUpItem
          key={powerUp.id}
          position={[powerUp.position.x, powerUp.position.y, powerUp.position.z]}
          type={powerUp.type}
        />
      ))}
    </>
  );
}

export default function Game3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <GameScene />
      </Canvas>
    </div>
  );
}
