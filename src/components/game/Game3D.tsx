'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrthographicCamera, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game-engine';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_COLORS, type PowerUpType } from '@/lib/game-types';

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
  isMain,
  avatarUrl,
  hasShield
}: {
  position: [number, number, number];
  isMain: boolean;
  avatarUrl?: string | null;
  hasShield: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
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
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1, 0.4]} />
        <meshStandardMaterial color={isMain ? '#6ECBFF' : '#FF9FF3'} flatShading />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.6, -0.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color={isMain ? '#54E6CB' : '#A66CFF'} flatShading />
      </mesh>
      <mesh position={[0.6, -0.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color={isMain ? '#54E6CB' : '#A66CFF'} flatShading />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.2, 0.15]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.2]} />
        <meshStandardMaterial color="#FFD93D" flatShading />
      </mesh>
      {/* Shield effect */}
      {hasShield && (
        <mesh ref={shieldRef}>
          <sphereGeometry args={[1.2, 8, 8]} />
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
  isBlock
}: {
  position: [number, number, number];
  size: number;
  imageUrl: string;
  health: number;
  maxHealth: number;
  isBlock: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => {
    if (isBlock) {
      return BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    }
    return POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)];
  }, [isBlock]);

  useFrame((state) => {
    if (meshRef.current && !isBlock) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.3;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const healthPercent = health / maxHealth;

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[size, size, size * 0.6]} />
        <meshStandardMaterial
          color={color}
          flatShading
          opacity={0.5 + healthPercent * 0.5}
          transparent
        />
      </mesh>
      {/* Health indicator */}
      {health < maxHealth && (
        <mesh position={[0, size * 0.7, 0]}>
          <boxGeometry args={[size * healthPercent, 0.1, 0.1]} />
          <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
        </mesh>
      )}
    </group>
  );
}

// Bullet component
function Bullet({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.15, 0.4, 0.15]} />
      <meshStandardMaterial color="#FFD93D" emissive="#FF8C42" emissiveIntensity={0.5} />
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
  const powerUps = useGameStore((s) => s.powerUps);
  const activePowerUps = useGameStore((s) => s.activePowerUps);
  const playerAvatar = useGameStore((s) => s.playerAvatar);

  const lastFireTime = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

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

      // Always move player to cursor position
      store.movePlayer(mousePos.current.x, mousePos.current.y);
    }
  });

  // Touch/mouse controls - convert screen to game coordinates
  useEffect(() => {
    const canvas = gl.domElement;

    // Convert screen coordinates to game world coordinates
    const screenToGame = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      // Normalize to 0-1
      const normalizedX = (clientX - rect.left) / rect.width;
      const normalizedY = (clientY - rect.top) / rect.height;
      // Map to game bounds (x: -8 to 8, y: 8 to -5 - note Y is inverted)
      const gameX = GAME_BOUNDS.minX + normalizedX * (GAME_BOUNDS.maxX - GAME_BOUNDS.minX);
      const gameY = GAME_BOUNDS.maxY - normalizedY * (GAME_BOUNDS.maxY - GAME_BOUNDS.minY);
      return { x: gameX, y: gameY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = screenToGame(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        mousePos.current = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        mousePos.current = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
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
        />
      ))}

      {/* Bullets */}
      {bullets.map((bullet) => (
        <Bullet
          key={bullet.id}
          position={[bullet.position.x, bullet.position.y, bullet.position.z]}
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
