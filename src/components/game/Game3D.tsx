'use client';

import { useRef, useEffect, useMemo, useState, memo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { useGameStore } from '@/lib/game-engine';
import { POP_COLORS, BLOCK_COLORS, POWER_UP_COLORS, BOSS_COLORS, type PowerUpType, type Coin, type BossType, type FeverCoin, FEVER_COINS_REQUIRED } from '@/lib/game-types';

// Cache for loaded textures
const textureCache = new Map<string, THREE.Texture>();

// Preload and cache textures
export function preloadTextures(imageUrls: string[]): Promise<void> {
  const loader = new TextureLoader();
  const promises = imageUrls.filter(url => url && !textureCache.has(url)).map(url => {
    return new Promise<void>((resolve) => {
      loader.load(
        url,
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          textureCache.set(url, texture);
          resolve();
        },
        undefined,
        () => {
          // Failed to load, just resolve
          resolve();
        }
      );
    });
  });
  return Promise.all(promises).then(() => {});
}

// Get cached texture or null
function getCachedTexture(url: string): THREE.Texture | null {
  return textureCache.get(url) || null;
}

// Unrailed-style color palettes
const TERRAIN_COLORS = {
  grass: ['#4CAF50', '#388E3C', '#2E7D32', '#43A047'],
  dirt: ['#8D6E63', '#6D4C41', '#795548', '#5D4037'],
  stone: ['#78909C', '#607D8B', '#546E7A', '#455A64'],
  water: ['#29B6F6', '#03A9F4', '#0288D1', '#039BE5'],
  sand: ['#FFD54F', '#FFCA28', '#FFC107', '#FFB300'],
};

// Voxel-style box component with edge highlighting
function VoxelBox({
  position,
  size = 1,
  color,
  highlight = false
}: {
  position: [number, number, number];
  size?: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size * 0.98, size * 0.98, size * 0.98]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {highlight && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </lineSegments>
      )}
    </group>
  );
}

// Ref for main ship position (avoids React state lag)
const mainShipPositionRef = { current: { x: 0, y: -3 } };

// Player ship (Unrailed voxel style - stacked cubes like a character)
// Rainbow color cycle for shield effect
const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];

function PlayerShip({
  position,
  isMain,
  avatarUrl,
  hasShield,
  isInvincible
}: {
  position: [number, number, number];
  isMain: boolean;
  avatarUrl?: string | null;
  hasShield: boolean;
  isInvincible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const shieldRef2 = useRef<THREE.Mesh>(null);
  const shieldRef3 = useRef<THREE.Mesh>(null);
  const rainbowGlowRef = useRef<THREE.Mesh>(null);
  const hitboxCoreRef = useRef<THREE.Mesh>(null);
  const hitboxRingRef = useRef<THREE.Mesh>(null);
  const mainColor = isMain ? '#6ECBFF' : '#FF9FF3';
  const accentColor = isMain ? '#54E6CB' : '#A66CFF';
  const darkColor = isMain ? '#4AA8D8' : '#D080D0';

  useFrame((state) => {
    if (groupRef.current) {
      if (isMain) {
        groupRef.current.position.x = mainShipPositionRef.current.x;
        groupRef.current.position.y = mainShipPositionRef.current.y;
      }
      groupRef.current.position.z = Math.sin(state.clock.elapsedTime * 4) * 0.03;

      if (isInvincible && isMain) {
        const blinkOn = Math.floor(state.clock.elapsedTime * 10) % 2 === 0;
        groupRef.current.visible = blinkOn;
      } else {
        groupRef.current.visible = true;
      }
    }
    // Shield rainbow glow animation
    if (rainbowGlowRef.current && hasShield) {
      const t = state.clock.elapsedTime * 3;
      const idx = Math.floor(t) % RAINBOW_COLORS.length;
      const nextIdx = (idx + 1) % RAINBOW_COLORS.length;
      const frac = t - Math.floor(t);
      const c1 = new THREE.Color(RAINBOW_COLORS[idx]);
      const c2 = new THREE.Color(RAINBOW_COLORS[nextIdx]);
      c1.lerp(c2, frac);
      (rainbowGlowRef.current.material as THREE.MeshBasicMaterial).color = c1;
    }
    if (shieldRef.current && hasShield) {
      const t = state.clock.elapsedTime * 3;
      const idx = Math.floor(t) % RAINBOW_COLORS.length;
      const nextIdx = (idx + 1) % RAINBOW_COLORS.length;
      const frac = t - Math.floor(t);
      const c1 = new THREE.Color(RAINBOW_COLORS[idx]);
      const c2 = new THREE.Color(RAINBOW_COLORS[nextIdx]);
      c1.lerp(c2, frac);
      (shieldRef.current.material as THREE.MeshBasicMaterial).color = c1.clone();
      shieldRef.current.rotation.y += 0.02;
      if (shieldRef2.current) {
        (shieldRef2.current.material as THREE.MeshBasicMaterial).color = c1.clone();
        shieldRef2.current.rotation.y += 0.015;
      }
      if (shieldRef3.current) {
        (shieldRef3.current.material as THREE.MeshBasicMaterial).color = c1.clone();
        shieldRef3.current.rotation.y += 0.025;
      }
    }
    // Pulsing hitbox core
    if (hitboxCoreRef.current && isMain) {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
      (hitboxCoreRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
    if (hitboxRingRef.current && isMain) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.3;
      (hitboxRingRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });

  return (
    <group ref={groupRef} position={isMain ? [mainShipPositionRef.current.x, mainShipPositionRef.current.y, 0] : position}>
      {/* Voxel ship body */}
      {/* Base layer (bottom) */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.3]} />
        <meshBasicMaterial color={darkColor} />
      </mesh>
      {/* Middle body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.2, 0.25]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      {/* Top/cockpit */}
      <mesh position={[0, 0.15, 0.05]}>
        <boxGeometry args={[0.25, 0.15, 0.2]} />
        <meshBasicMaterial color="#FFD93D" />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[-0.4, -0.05, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.15]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.2]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.4, -0.05, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.15]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
      {/* Engine glow (back) */}
      <mesh position={[0, -0.25, -0.05]}>
        <boxGeometry args={[0.2, 0.1, 0.15]} />
        <meshBasicMaterial color="#FF8C42" />
      </mesh>

      {/* Hitbox indicator - bright red pulsing core */}
      {isMain && (
        <>
          {/* Inner core - bright red pulsing center (actual hitbox) */}
          <mesh ref={hitboxCoreRef} position={[0, 0, 0.2]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.9} />
          </mesh>
          {/* Outer ring - red pulsing hitbox area */}
          <mesh ref={hitboxRingRef} position={[0, 0, 0.15]}>
            <ringGeometry args={[0.1, 0.18, 8]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.6} side={2} />
          </mesh>
          {/* Hitbox boundary - red border */}
          <lineSegments position={[0, 0, 0.1]}>
            <edgesGeometry args={[new THREE.CircleGeometry(0.18, 8)]} />
            <lineBasicMaterial color="#FF3333" transparent opacity={0.7} />
          </lineSegments>
        </>
      )}

      {/* Shield effect - rainbow glow overlay on ship body */}
      {hasShield && (
        <>
          {/* Rainbow glow around ship body */}
          <mesh ref={rainbowGlowRef} position={[0, 0, 0.05]}>
            <boxGeometry args={[0.55, 0.4, 0.35]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.3} />
          </mesh>
          {/* Rainbow wireframe shield - multiple layers for thicker lines */}
          <mesh ref={shieldRef}>
            <boxGeometry args={[0.9, 0.7, 0.5]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.4} wireframe />
          </mesh>
          <mesh ref={shieldRef2}>
            <boxGeometry args={[0.92, 0.72, 0.52]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.3} wireframe />
          </mesh>
          <mesh ref={shieldRef3}>
            <boxGeometry args={[0.88, 0.68, 0.48]} />
            <meshBasicMaterial color="#FF0000" transparent opacity={0.3} wireframe />
          </mesh>
        </>
      )}
    </group>
  );
}

// Enemy component - Unrailed voxel style (stacked cubes like characters)
function Enemy({
  position,
  size,
  imageUrl,
  health,
  maxHealth,
  isBlock,
  isBoss,
  isShiny,
  isElite,
  bossType
}: {
  position: [number, number, number];
  size: number;
  imageUrl: string;
  health: number;
  maxHealth: number;
  isBlock: boolean;
  isBoss: boolean;
  isShiny: boolean;
  isElite: boolean;
  bossType?: BossType;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load texture for blocks with token images
  useEffect(() => {
    if (imageUrl && isBlock) {
      const cached = getCachedTexture(imageUrl);
      if (cached) {
        setTexture(cached);
      } else {
        // Dynamically load if not cached
        const loader = new TextureLoader();
        loader.load(imageUrl, (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          textureCache.set(imageUrl, tex);
          setTexture(tex);
        }, undefined, () => {
          // Load failed, use fallback color
          setTexture(null);
        });
      }
    }
  }, [imageUrl, isBlock]);

  const colors = useMemo(() => {
    if (isBoss) {
      // Different color schemes for each boss type
      switch (bossType) {
        case 'demon':
          return { main: '#8B0000', accent: '#FF4444', dark: '#400010', eye: '#FFD93D', glow: '#FF6B6B' };
        case 'mech':
          return { main: '#4A5568', accent: '#A0AEC0', dark: '#2D3748', eye: '#00FF00', glow: '#6ECBFF' };
        case 'dragon':
          return { main: '#1E6E50', accent: '#54E6CB', dark: '#0D3D2D', eye: '#FF8C42', glow: '#54E6CB' };
        case 'golem':
          return { main: '#5D4E37', accent: '#8B7355', dark: '#3D3020', eye: '#6BCB77', glow: '#6BCB77' };
        case 'phantom':
          return { main: '#4B0082', accent: '#A66CFF', dark: '#2A0050', eye: '#FF9FF3', glow: '#A66CFF' };
        case 'sprite':
          return { main: '#00CED1', accent: '#7FFFD4', dark: '#008B8B', eye: '#FFFFFF', glow: '#00FFFF' };
        default:
          return { main: '#8B0000', accent: '#FF6B6B', dark: '#400010', eye: '#FFD93D', glow: '#FF6B6B' };
      }
    }
    if (isBlock) {
      const base = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
      return { main: base, accent: '#5C5C5C', dark: '#3A3A3A', eye: '#000000', glow: '#FFFFFF' };
    }
    const base = POP_COLORS[Math.floor(Math.random() * POP_COLORS.length)];
    return { main: base, accent: '#FFFFFF', dark: '#333333', eye: '#000000', glow: '#FFFFFF' };
  }, [isBlock, isBoss, bossType]);

  useFrame((state) => {
    if (groupRef.current) {
      if (isBoss) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        groupRef.current.position.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else if (!isBlock) {
        // Bobbing animation like Unrailed
        groupRef.current.position.z = Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.05;
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
      }
    }
  });

  const healthPercent = health / maxHealth;
  const s = size * 0.8; // Scale factor

  // Block enemy (destructible obstacle) - displays wallet token/NFT image
  if (isBlock) {
    return (
      <group ref={groupRef} position={position}>
        {/* Main block body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[s * 1.2, s * 1.2, s * 0.8]} />
          <meshBasicMaterial color={colors.main} />
        </mesh>
        {/* Token/NFT image on front face */}
        {texture ? (
          <mesh position={[0, 0, s * 0.41]}>
            <planeGeometry args={[s * 1.0, s * 1.0]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
        ) : (
          <>
            {/* Cross detail on block (fallback when no image) */}
            <mesh position={[0, 0, s * 0.41]}>
              <boxGeometry args={[s * 0.8, s * 0.15, 0.02]} />
              <meshBasicMaterial color={colors.dark} />
            </mesh>
            <mesh position={[0, 0, s * 0.41]}>
              <boxGeometry args={[s * 0.15, s * 0.8, 0.02]} />
              <meshBasicMaterial color={colors.dark} />
            </mesh>
          </>
        )}
        {/* Frame around image */}
        {texture && (
          <lineSegments position={[0, 0, s * 0.42]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(s * 1.05, s * 1.05)]} />
            <lineBasicMaterial color="#FFD93D" linewidth={2} />
          </lineSegments>
        )}
        {/* Health bar */}
        {health < maxHealth && (
          <mesh position={[0, s * 0.9, 0]}>
            <boxGeometry args={[s * 1.2 * healthPercent, 0.08, 0.08]} />
            <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
          </mesh>
        )}
      </group>
    );
  }

  // Boss enemy (different designs based on bossType)
  if (isBoss) {
    // Demon boss - horned demon with wings
    if (bossType === 'demon') {
      return (
        <group ref={groupRef} position={position}>
          {/* Main body */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 2, s * 1.5, s * 1.2]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Head */}
          <mesh position={[0, s * 1, 0]}>
            <boxGeometry args={[s * 1.5, s * 1, s * 1]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Horns */}
          <mesh position={[-s * 0.5, s * 1.6, 0]}>
            <boxGeometry args={[s * 0.2, s * 0.7, s * 0.2]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          <mesh position={[s * 0.5, s * 1.6, 0]}>
            <boxGeometry args={[s * 0.2, s * 0.7, s * 0.2]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          <mesh position={[-s * 0.55, s * 1.9, 0.1]}>
            <boxGeometry args={[s * 0.15, s * 0.3, s * 0.15]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 0.55, s * 1.9, 0.1]}>
            <boxGeometry args={[s * 0.15, s * 0.3, s * 0.15]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Glowing eyes */}
          <mesh position={[-s * 0.35, s * 1.1, s * 0.51]}>
            <boxGeometry args={[s * 0.35, s * 0.25, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          <mesh position={[s * 0.35, s * 1.1, s * 0.51]}>
            <boxGeometry args={[s * 0.35, s * 0.25, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Mouth with fangs */}
          <mesh position={[0, s * 0.65, s * 0.51]}>
            <boxGeometry args={[s * 0.7, s * 0.2, 0.1]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          <mesh position={[-s * 0.2, s * 0.55, s * 0.55]}>
            <boxGeometry args={[s * 0.1, s * 0.15, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[s * 0.2, s * 0.55, s * 0.55]}>
            <boxGeometry args={[s * 0.1, s * 0.15, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          {/* Wings */}
          <mesh position={[-s * 1.4, s * 0.5, -s * 0.3]}>
            <boxGeometry args={[s * 0.8, s * 1.2, s * 0.15]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 1.4, s * 0.5, -s * 0.3]}>
            <boxGeometry args={[s * 0.8, s * 1.2, s * 0.15]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 2.3, 0]}>
              <boxGeometry args={[s * 2 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Mech boss - robotic with cannons
    if (bossType === 'mech') {
      return (
        <group ref={groupRef} position={position}>
          {/* Main body - boxy and mechanical */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 2.2, s * 1.6, s * 1.4]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Head/cockpit */}
          <mesh position={[0, s * 1.1, s * 0.2]}>
            <boxGeometry args={[s * 1.2, s * 0.8, s * 0.8]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          {/* Visor */}
          <mesh position={[0, s * 1.1, s * 0.61]}>
            <boxGeometry args={[s * 1.0, s * 0.3, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Shoulder cannons */}
          <mesh position={[-s * 1.3, s * 0.8, 0]}>
            <boxGeometry args={[s * 0.5, s * 0.5, s * 1.2]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 1.3, s * 0.8, 0]}>
            <boxGeometry args={[s * 0.5, s * 0.5, s * 1.2]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Cannon barrels */}
          <mesh position={[-s * 1.3, s * 0.8, s * 0.7]}>
            <boxGeometry args={[s * 0.25, s * 0.25, s * 0.4]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          <mesh position={[s * 1.3, s * 0.8, s * 0.7]}>
            <boxGeometry args={[s * 0.25, s * 0.25, s * 0.4]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          {/* Arms */}
          <mesh position={[-s * 1.5, s * 0.1, 0]}>
            <boxGeometry args={[s * 0.4, s * 1.0, s * 0.6]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          <mesh position={[s * 1.5, s * 0.1, 0]}>
            <boxGeometry args={[s * 0.4, s * 1.0, s * 0.6]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Chest lights */}
          <mesh position={[0, s * 0.2, s * 0.71]}>
            <boxGeometry args={[s * 0.6, s * 0.4, 0.1]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 1.8, 0]}>
              <boxGeometry args={[s * 2.2 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Dragon boss - serpentine with wings
    if (bossType === 'dragon') {
      return (
        <group ref={groupRef} position={position}>
          {/* Body - elongated */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 2.4, s * 1.2, s * 1.0]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Long neck */}
          <mesh position={[0, s * 0.8, s * 0.3]}>
            <boxGeometry args={[s * 0.6, s * 0.8, s * 0.5]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Head */}
          <mesh position={[0, s * 1.4, s * 0.5]}>
            <boxGeometry args={[s * 1.0, s * 0.6, s * 0.8]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Snout */}
          <mesh position={[0, s * 1.3, s * 1.0]}>
            <boxGeometry args={[s * 0.6, s * 0.4, s * 0.5]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-s * 0.35, s * 1.5, s * 0.85]}>
            <boxGeometry args={[s * 0.2, s * 0.25, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          <mesh position={[s * 0.35, s * 1.5, s * 0.85]}>
            <boxGeometry args={[s * 0.2, s * 0.25, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Spikes on back */}
          {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
            <mesh key={i} position={[s * x, s * 0.5, -s * 0.4]}>
              <boxGeometry args={[s * 0.15, s * (0.4 - Math.abs(x) * 0.2), s * 0.15]} />
              <meshBasicMaterial color={colors.accent} />
            </mesh>
          ))}
          {/* Wings */}
          <mesh position={[-s * 1.5, s * 0.3, -s * 0.2]}>
            <boxGeometry args={[s * 1.0, s * 1.4, s * 0.1]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 1.5, s * 0.3, -s * 0.2]}>
            <boxGeometry args={[s * 1.0, s * 1.4, s * 0.1]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, -s * 0.2, -s * 0.8]}>
            <boxGeometry args={[s * 0.4, s * 0.4, s * 0.8]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 1.9, 0]}>
              <boxGeometry args={[s * 2.4 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Golem boss - bulky rock monster
    if (bossType === 'golem') {
      return (
        <group ref={groupRef} position={position}>
          {/* Massive body */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 2.5, s * 1.8, s * 1.5]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Head - smaller and embedded in body */}
          <mesh position={[0, s * 1.1, s * 0.3]}>
            <boxGeometry args={[s * 1.2, s * 0.9, s * 1.0]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Glowing eyes */}
          <mesh position={[-s * 0.3, s * 1.2, s * 0.81]}>
            <boxGeometry args={[s * 0.3, s * 0.2, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          <mesh position={[s * 0.3, s * 1.2, s * 0.81]}>
            <boxGeometry args={[s * 0.3, s * 0.2, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Massive arms */}
          <mesh position={[-s * 1.6, s * 0.2, 0]}>
            <boxGeometry args={[s * 0.8, s * 1.4, s * 0.9]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          <mesh position={[s * 1.6, s * 0.2, 0]}>
            <boxGeometry args={[s * 0.8, s * 1.4, s * 0.9]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Fists */}
          <mesh position={[-s * 1.6, -s * 0.6, 0]}>
            <boxGeometry args={[s * 0.7, s * 0.6, s * 0.7]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 1.6, -s * 0.6, 0]}>
            <boxGeometry args={[s * 0.7, s * 0.6, s * 0.7]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Crystal formations */}
          <mesh position={[-s * 0.5, s * 1.7, 0]}>
            <boxGeometry args={[s * 0.25, s * 0.5, s * 0.25]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          <mesh position={[s * 0.5, s * 1.6, 0]}>
            <boxGeometry args={[s * 0.2, s * 0.4, s * 0.2]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          <mesh position={[0, s * 1.5, -s * 0.3]}>
            <boxGeometry args={[s * 0.3, s * 0.6, s * 0.3]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 2.2, 0]}>
              <boxGeometry args={[s * 2.5 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Sprite boss - small, fast, agile fairy-like creature
    if (bossType === 'sprite') {
      return (
        <group ref={groupRef} position={position}>
          {/* Compact body - small and round */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 1.0, s * 0.9, s * 0.7]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Head */}
          <mesh position={[0, s * 0.6, 0]}>
            <boxGeometry args={[s * 0.8, s * 0.7, s * 0.6]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Big expressive eyes */}
          <mesh position={[-s * 0.2, s * 0.7, s * 0.31]}>
            <boxGeometry args={[s * 0.25, s * 0.3, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          <mesh position={[s * 0.2, s * 0.7, s * 0.31]}>
            <boxGeometry args={[s * 0.25, s * 0.3, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Eye pupils */}
          <mesh position={[-s * 0.2, s * 0.68, s * 0.35]}>
            <boxGeometry args={[s * 0.12, s * 0.15, 0.05]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          <mesh position={[s * 0.2, s * 0.68, s * 0.35]}>
            <boxGeometry args={[s * 0.12, s * 0.15, 0.05]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          {/* Antennae */}
          <mesh position={[-s * 0.15, s * 1.0, 0]}>
            <boxGeometry args={[s * 0.08, s * 0.35, s * 0.08]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 0.15, s * 1.0, 0]}>
            <boxGeometry args={[s * 0.08, s * 0.35, s * 0.08]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Antenna tips (glowing) */}
          <mesh position={[-s * 0.15, s * 1.2, 0]}>
            <boxGeometry args={[s * 0.12, s * 0.12, s * 0.12]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          <mesh position={[s * 0.15, s * 1.2, 0]}>
            <boxGeometry args={[s * 0.12, s * 0.12, s * 0.12]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          {/* Wings (translucent-looking) */}
          <mesh position={[-s * 0.7, s * 0.3, -s * 0.1]}>
            <boxGeometry args={[s * 0.5, s * 0.8, s * 0.1]} />
            <meshBasicMaterial color={colors.accent} transparent opacity={0.7} />
          </mesh>
          <mesh position={[s * 0.7, s * 0.3, -s * 0.1]}>
            <boxGeometry args={[s * 0.5, s * 0.8, s * 0.1]} />
            <meshBasicMaterial color={colors.accent} transparent opacity={0.7} />
          </mesh>
          {/* Lower wings */}
          <mesh position={[-s * 0.55, -s * 0.1, -s * 0.1]}>
            <boxGeometry args={[s * 0.35, s * 0.5, s * 0.08]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.6} />
          </mesh>
          <mesh position={[s * 0.55, -s * 0.1, -s * 0.1]}>
            <boxGeometry args={[s * 0.35, s * 0.5, s * 0.08]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.6} />
          </mesh>
          {/* Sparkle trail */}
          <mesh position={[0, -s * 0.5, 0]}>
            <boxGeometry args={[s * 0.15, s * 0.15, s * 0.15]} />
            <meshBasicMaterial color={colors.glow} />
          </mesh>
          <mesh position={[-s * 0.2, -s * 0.7, 0]}>
            <boxGeometry args={[s * 0.1, s * 0.1, s * 0.1]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.7} />
          </mesh>
          <mesh position={[s * 0.2, -s * 0.65, 0]}>
            <boxGeometry args={[s * 0.1, s * 0.1, s * 0.1]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.7} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 1.4, 0]}>
              <boxGeometry args={[s * 1.0 * healthPercent, 0.12, 0.12]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Phantom boss - ghostly ethereal being
    if (bossType === 'phantom') {
      return (
        <group ref={groupRef} position={position}>
          {/* Ethereal body - semi-transparent look via wireframe accents */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 1.8, s * 2.0, s * 1.0]} />
            <meshBasicMaterial color={colors.main} />
          </mesh>
          {/* Ghostly hood/head */}
          <mesh position={[0, s * 1.3, s * 0.1]}>
            <boxGeometry args={[s * 1.4, s * 1.0, s * 0.9]} />
            <meshBasicMaterial color={colors.dark} />
          </mesh>
          {/* Glowing eyes */}
          <mesh position={[-s * 0.3, s * 1.3, s * 0.51]}>
            <boxGeometry args={[s * 0.3, s * 0.15, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          <mesh position={[s * 0.3, s * 1.3, s * 0.51]}>
            <boxGeometry args={[s * 0.3, s * 0.15, 0.1]} />
            <meshBasicMaterial color={colors.eye} />
          </mesh>
          {/* Floating hands */}
          <mesh position={[-s * 1.3, s * 0.5, s * 0.3]}>
            <boxGeometry args={[s * 0.5, s * 0.5, s * 0.4]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          <mesh position={[s * 1.3, s * 0.5, s * 0.3]}>
            <boxGeometry args={[s * 0.5, s * 0.5, s * 0.4]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
          {/* Cloak trails/wisps */}
          <mesh position={[-s * 0.5, -s * 0.8, 0]}>
            <boxGeometry args={[s * 0.4, s * 0.8, s * 0.3]} />
            <meshBasicMaterial color={colors.main} transparent opacity={0.7} />
          </mesh>
          <mesh position={[s * 0.5, -s * 0.9, 0]}>
            <boxGeometry args={[s * 0.35, s * 0.7, s * 0.25]} />
            <meshBasicMaterial color={colors.main} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, -s * 1.0, 0]}>
            <boxGeometry args={[s * 0.5, s * 0.6, s * 0.3]} />
            <meshBasicMaterial color={colors.dark} transparent opacity={0.6} />
          </mesh>
          {/* Ethereal glow aura */}
          <mesh position={[0, s * 0.5, 0]}>
            <boxGeometry args={[s * 2.2, s * 2.5, s * 1.4]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.15} wireframe />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 2.0, 0]}>
              <boxGeometry args={[s * 1.8 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Hydra boss - three-headed serpent beast
    if (bossType === 'hydra') {
      const hydraColors = {
        main: '#8B4513', // Saddle brown
        dark: '#654321', // Dark brown
        accent: '#CD853F', // Peru
        eye: '#FF4500', // Orange red
        glow: '#FFD700', // Gold
      };
      return (
        <group ref={groupRef} position={position}>
          {/* Main body - large serpentine */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s * 2.2, s * 1.4, s * 1.2]} />
            <meshBasicMaterial color={hydraColors.main} />
          </mesh>
          {/* Left head */}
          <mesh position={[-s * 0.8, s * 0.7, s * 0.2]}>
            <boxGeometry args={[s * 0.5, s * 0.6, s * 0.5]} />
            <meshBasicMaterial color={hydraColors.main} />
          </mesh>
          <mesh position={[-s * 0.8, s * 1.1, s * 0.4]}>
            <boxGeometry args={[s * 0.6, s * 0.5, s * 0.6]} />
            <meshBasicMaterial color={hydraColors.accent} />
          </mesh>
          <mesh position={[-s * 0.8, s * 1.2, s * 0.7]}>
            <boxGeometry args={[s * 0.15, s * 0.2, 0.08]} />
            <meshBasicMaterial color={hydraColors.eye} />
          </mesh>
          {/* Center head (tallest) */}
          <mesh position={[0, s * 0.9, s * 0.2]}>
            <boxGeometry args={[s * 0.5, s * 0.8, s * 0.5]} />
            <meshBasicMaterial color={hydraColors.main} />
          </mesh>
          <mesh position={[0, s * 1.5, s * 0.4]}>
            <boxGeometry args={[s * 0.7, s * 0.6, s * 0.7]} />
            <meshBasicMaterial color={hydraColors.accent} />
          </mesh>
          <mesh position={[0, s * 1.6, s * 0.75]}>
            <boxGeometry args={[s * 0.2, s * 0.25, 0.1]} />
            <meshBasicMaterial color={hydraColors.eye} />
          </mesh>
          {/* Right head */}
          <mesh position={[s * 0.8, s * 0.7, s * 0.2]}>
            <boxGeometry args={[s * 0.5, s * 0.6, s * 0.5]} />
            <meshBasicMaterial color={hydraColors.main} />
          </mesh>
          <mesh position={[s * 0.8, s * 1.1, s * 0.4]}>
            <boxGeometry args={[s * 0.6, s * 0.5, s * 0.6]} />
            <meshBasicMaterial color={hydraColors.accent} />
          </mesh>
          <mesh position={[s * 0.8, s * 1.2, s * 0.7]}>
            <boxGeometry args={[s * 0.15, s * 0.2, 0.08]} />
            <meshBasicMaterial color={hydraColors.eye} />
          </mesh>
          {/* Scales on back */}
          {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
            <mesh key={i} position={[s * x, s * 0.6, -s * 0.5]}>
              <boxGeometry args={[s * 0.2, s * 0.3, s * 0.15]} />
              <meshBasicMaterial color={hydraColors.glow} />
            </mesh>
          ))}
          {/* Tail */}
          <mesh position={[0, -s * 0.3, -s * 0.8]}>
            <boxGeometry args={[s * 0.6, s * 0.5, s * 0.8]} />
            <meshBasicMaterial color={hydraColors.main} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 2.1, 0]}>
              <boxGeometry args={[s * 2.2 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Kraken boss - massive tentacled sea creature
    if (bossType === 'kraken') {
      const krakenColors = {
        main: '#191970', // Midnight blue
        dark: '#0D0D3D', // Darker blue
        accent: '#4169E1', // Royal blue
        eye: '#00FFFF', // Cyan
        glow: '#7B68EE', // Medium slate blue
      };
      return (
        <group ref={groupRef} position={position}>
          {/* Main body - bulbous head */}
          <mesh position={[0, s * 0.3, 0]}>
            <boxGeometry args={[s * 2.5, s * 1.8, s * 1.4]} />
            <meshBasicMaterial color={krakenColors.main} />
          </mesh>
          {/* Mantle/top of head */}
          <mesh position={[0, s * 1.3, 0]}>
            <boxGeometry args={[s * 2.0, s * 0.8, s * 1.1]} />
            <meshBasicMaterial color={krakenColors.accent} />
          </mesh>
          {/* Giant eyes */}
          <mesh position={[-s * 0.6, s * 0.5, s * 0.71]}>
            <boxGeometry args={[s * 0.5, s * 0.6, 0.1]} />
            <meshBasicMaterial color={krakenColors.eye} />
          </mesh>
          <mesh position={[s * 0.6, s * 0.5, s * 0.71]}>
            <boxGeometry args={[s * 0.5, s * 0.6, 0.1]} />
            <meshBasicMaterial color={krakenColors.eye} />
          </mesh>
          {/* Eye pupils */}
          <mesh position={[-s * 0.6, s * 0.4, s * 0.75]}>
            <boxGeometry args={[s * 0.2, s * 0.3, 0.05]} />
            <meshBasicMaterial color={krakenColors.dark} />
          </mesh>
          <mesh position={[s * 0.6, s * 0.4, s * 0.75]}>
            <boxGeometry args={[s * 0.2, s * 0.3, 0.05]} />
            <meshBasicMaterial color={krakenColors.dark} />
          </mesh>
          {/* Tentacles (4 pairs) */}
          {[-1.0, -0.5, 0.5, 1.0].map((x, i) => (
            <group key={i}>
              <mesh position={[s * x, -s * 0.5, s * 0.3]}>
                <boxGeometry args={[s * 0.3, s * 0.8, s * 0.25]} />
                <meshBasicMaterial color={krakenColors.main} />
              </mesh>
              <mesh position={[s * x * 1.1, -s * 1.0, s * 0.4]}>
                <boxGeometry args={[s * 0.25, s * 0.5, s * 0.2]} />
                <meshBasicMaterial color={krakenColors.accent} />
              </mesh>
              {/* Suction cups */}
              <mesh position={[s * x, -s * 0.5, s * 0.45]}>
                <boxGeometry args={[s * 0.1, s * 0.1, 0.05]} />
                <meshBasicMaterial color={krakenColors.glow} />
              </mesh>
            </group>
          ))}
          {/* Beak */}
          <mesh position={[0, -s * 0.1, s * 0.6]}>
            <boxGeometry args={[s * 0.4, s * 0.3, s * 0.25]} />
            <meshBasicMaterial color={krakenColors.dark} />
          </mesh>
          {/* Glowing spots */}
          <mesh position={[-s * 0.9, s * 1.0, s * 0.4]}>
            <boxGeometry args={[s * 0.15, s * 0.15, s * 0.1]} />
            <meshBasicMaterial color={krakenColors.glow} />
          </mesh>
          <mesh position={[s * 0.9, s * 1.0, s * 0.4]}>
            <boxGeometry args={[s * 0.15, s * 0.15, s * 0.1]} />
            <meshBasicMaterial color={krakenColors.glow} />
          </mesh>
          {/* Health bar */}
          {health < maxHealth && (
            <mesh position={[0, s * 2.0, 0]}>
              <boxGeometry args={[s * 2.5 * healthPercent, 0.15, 0.15]} />
              <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
            </mesh>
          )}
        </group>
      );
    }

    // Default boss (fallback)
    return (
      <group ref={groupRef} position={position}>
        {/* Boss body - large stacked voxels */}
        {/* Main body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[s * 2, s * 1.5, s * 1.2]} />
          <meshBasicMaterial color={colors.main} />
        </mesh>
        {/* Head */}
        <mesh position={[0, s * 1, 0]}>
          <boxGeometry args={[s * 1.5, s * 1, s * 1]} />
          <meshBasicMaterial color={colors.main} />
        </mesh>
        {/* Eyes (glowing) */}
        <mesh position={[-s * 0.4, s * 1.1, s * 0.51]}>
          <boxGeometry args={[s * 0.4, s * 0.3, 0.1]} />
          <meshBasicMaterial color={colors.eye} />
        </mesh>
        <mesh position={[s * 0.4, s * 1.1, s * 0.51]}>
          <boxGeometry args={[s * 0.4, s * 0.3, 0.1]} />
          <meshBasicMaterial color={colors.eye} />
        </mesh>
        {/* Mouth/teeth */}
        <mesh position={[0, s * 0.65, s * 0.51]}>
          <boxGeometry args={[s * 0.8, s * 0.2, 0.1]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
        {/* Arms/shoulders */}
        <mesh position={[-s * 1.3, s * 0.3, 0]}>
          <boxGeometry args={[s * 0.6, s * 1, s * 0.8]} />
          <meshBasicMaterial color={colors.main} />
        </mesh>
        <mesh position={[s * 1.3, s * 0.3, 0]}>
          <boxGeometry args={[s * 0.6, s * 1, s * 0.8]} />
          <meshBasicMaterial color={colors.main} />
        </mesh>
        {/* Crown/spikes */}
        <mesh position={[0, s * 1.7, 0]}>
          <boxGeometry args={[s * 0.4, s * 0.5, s * 0.4]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
        <mesh position={[-s * 0.5, s * 1.55, 0]}>
          <boxGeometry args={[s * 0.3, s * 0.4, s * 0.3]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
        <mesh position={[s * 0.5, s * 1.55, 0]}>
          <boxGeometry args={[s * 0.3, s * 0.4, s * 0.3]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
        {/* Health bar */}
        {health < maxHealth && (
          <mesh position={[0, s * 2.2, 0]}>
            <boxGeometry args={[s * 2 * healthPercent, 0.15, 0.15]} />
            <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
          </mesh>
        )}
      </group>
    );
  }

  // Regular enemy (cute voxel creature like Unrailed characters)
  return (
    <group ref={groupRef} position={position}>
      {/* Shiny enemy glow effect */}
      {isShiny && (
        <>
          {/* Rainbow pulsing aura */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[s * 1.3, s * 1.1, s * 0.9]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.3} />
          </mesh>
          {/* Sparkle particles */}
          <mesh position={[-s * 0.4, s * 0.3, s * 0.3]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[s * 0.4, s * 0.5, s * 0.2]}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          <mesh position={[-s * 0.3, s * 0.7, s * 0.1]}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[s * 0.35, -s * 0.1, s * 0.25]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          {/* Star indicator above */}
          <mesh position={[0, s * 1.0, 0]}>
            <boxGeometry args={[s * 0.2, s * 0.2, s * 0.2]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        </>
      )}
      {/* Elite enemy glow effect - purple/magenta aura */}
      {isElite && !isShiny && (
        <>
          {/* Ominous purple aura */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[s * 1.2, s * 1.0, s * 0.8]} />
            <meshBasicMaterial color="#8B008B" transparent opacity={0.25} />
          </mesh>
          {/* Subtle particles */}
          <mesh position={[-s * 0.35, s * 0.4, s * 0.25]}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshBasicMaterial color="#A66CFF" />
          </mesh>
          <mesh position={[s * 0.35, s * 0.3, s * 0.2]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="#FF69B4" />
          </mesh>
          {/* Skull/danger indicator above */}
          <mesh position={[0, s * 0.9, 0]}>
            <boxGeometry args={[s * 0.15, s * 0.15, s * 0.15]} />
            <meshBasicMaterial color="#A66CFF" />
          </mesh>
        </>
      )}
      {/* Body (main cube) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[s * 0.9, s * 0.7, s * 0.6]} />
        <meshBasicMaterial color={isShiny ? '#FFD700' : (isElite ? '#9932CC' : colors.main)} />
      </mesh>
      {/* Head */}
      <mesh position={[0, s * 0.5, s * 0.05]}>
        <boxGeometry args={[s * 0.7, s * 0.5, s * 0.5]} />
        <meshBasicMaterial color={isShiny ? '#FFF8DC' : colors.main} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-s * 0.18, s * 0.55, s * 0.28]}>
        <boxGeometry args={[s * 0.15, s * 0.15, 0.05]} />
        <meshBasicMaterial color={isShiny ? '#FFFFFF' : colors.accent} />
      </mesh>
      <mesh position={[s * 0.18, s * 0.55, s * 0.28]}>
        <boxGeometry args={[s * 0.15, s * 0.15, 0.05]} />
        <meshBasicMaterial color={isShiny ? '#FFFFFF' : colors.accent} />
      </mesh>
      {/* Pupils */}
      <mesh position={[-s * 0.18, s * 0.55, s * 0.31]}>
        <boxGeometry args={[s * 0.08, s * 0.08, 0.02]} />
        <meshBasicMaterial color={colors.eye} />
      </mesh>
      <mesh position={[s * 0.18, s * 0.55, s * 0.31]}>
        <boxGeometry args={[s * 0.08, s * 0.08, 0.02]} />
        <meshBasicMaterial color={colors.eye} />
      </mesh>
      {/* Feet/legs */}
      <mesh position={[-s * 0.2, -s * 0.45, 0]}>
        <boxGeometry args={[s * 0.25, s * 0.2, s * 0.3]} />
        <meshBasicMaterial color={isShiny ? '#DAA520' : colors.dark} />
      </mesh>
      <mesh position={[s * 0.2, -s * 0.45, 0]}>
        <boxGeometry args={[s * 0.25, s * 0.2, s * 0.3]} />
        <meshBasicMaterial color={isShiny ? '#DAA520' : colors.dark} />
      </mesh>
      {/* Health indicator */}
      {health < maxHealth && (
        <mesh position={[0, s * (isShiny ? 1.2 : 0.9), 0]}>
          <boxGeometry args={[s * 0.9 * healthPercent, 0.08, 0.08]} />
          <meshBasicMaterial color={healthPercent > 0.5 ? '#6BCB77' : '#FF6B6B'} />
        </mesh>
      )}
    </group>
  );
}

// Player Bullet component - Unrailed voxel style
const Bullet = memo(function Bullet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main bullet body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.12, 0.2, 0.12]} />
        <meshBasicMaterial color="#FFD93D" />
      </mesh>
      {/* Bullet tip */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshBasicMaterial color="#FFEB3B" />
      </mesh>
      {/* Trail glow */}
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.08]} />
        <meshBasicMaterial color="#FF8C42" />
      </mesh>
    </group>
  );
});

// Enemy Bullet component - Unrailed voxel style (cube-based)
const EnemyBulletMesh = memo(function EnemyBulletMesh({
  position,
  size,
  color
}: {
  position: [number, number, number];
  size: number;
  color: string;
}) {
  return (
    <group position={position}>
      {/* Main cube bullet */}
      <mesh>
        <boxGeometry args={[size * 1.5, size * 1.5, size * 1.5]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <boxGeometry args={[size * 0.8, size * 0.8, size * 2]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
      </mesh>
    </group>
  );
});

// Power-up component - Unrailed voxel style (chest/crate-like, or heart for heal)
const PowerUpItem = memo(function PowerUpItem({
  position,
  type
}: {
  position: [number, number, number];
  type: PowerUpType;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = POWER_UP_COLORS[type];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.03;
      // Floating bobbing animation
      groupRef.current.position.z = Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }
  });

  // Special heart shape for heal power-up
  if (type === 'heal') {
    return (
      <group ref={groupRef} position={position}>
        {/* Voxel heart shape made of cubes */}
        {/* Top row - two bumps */}
        <mesh position={[-0.15, 0.15, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.3]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0.15, 0.15, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.3]} />
          <meshBasicMaterial color={color} />
        </mesh>
        {/* Middle row - connected */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.2, 0.3]} />
          <meshBasicMaterial color={color} />
        </mesh>
        {/* Bottom rows - tapering down */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.35, 0.15, 0.3]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.15, 0.12, 0.3]} />
          <meshBasicMaterial color={color} />
        </mesh>
        {/* Shine/highlight */}
        <mesh position={[-0.1, 0.1, 0.16]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {/* Main crate body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Top lid */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.55, 0.1, 0.45]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Lock/decoration */}
      <mesh position={[0, 0, 0.21]}>
        <boxGeometry args={[0.15, 0.2, 0.05]} />
        <meshBasicMaterial color="#FFD93D" />
      </mesh>
      {/* Side stripes */}
      <mesh position={[0.26, 0, 0]}>
        <boxGeometry args={[0.05, 0.35, 0.35]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-0.26, 0, 0]}>
        <boxGeometry args={[0.05, 0.35, 0.35]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
      </mesh>
    </group>
  );
});

// Coin component - 3D voxel coin that drops and flies to score
const CoinMesh = memo(function CoinMesh({
  position,
  size,
  phase
}: {
  position: [number, number, number];
  size: number;
  phase: 'drop' | 'fly';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = phase === 'fly' ? 0.7 : 1; // Coins shrink as they fly to score

  useFrame((state) => {
    if (groupRef.current) {
      // Spin animation
      groupRef.current.rotation.y += 0.15;
      // Wobble during drop phase
      if (phase === 'drop') {
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.3;
      }
    }
  });

  const coinSize = size * scale;

  return (
    <group ref={groupRef} position={position}>
      {/* Main coin body (cylinder-like stack of boxes) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[coinSize * 2, coinSize * 2, coinSize * 0.4]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Coin edge highlight */}
      <mesh position={[0, 0, coinSize * 0.15]}>
        <boxGeometry args={[coinSize * 1.6, coinSize * 1.6, coinSize * 0.15]} />
        <meshBasicMaterial color="#FFF8DC" />
      </mesh>
      {/* Coin center detail */}
      <mesh position={[0, 0, coinSize * 0.22]}>
        <boxGeometry args={[coinSize * 0.8, coinSize * 0.8, coinSize * 0.1]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      {/* Back of coin */}
      <mesh position={[0, 0, -coinSize * 0.15]}>
        <boxGeometry args={[coinSize * 1.6, coinSize * 1.6, coinSize * 0.15]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
    </group>
  );
});

// Large Fever Coin - collect 5 to trigger Fever Time (classic gold coin design)
const FeverCoinMesh = memo(function FeverCoinMesh({
  position,
  phase
}: {
  position: [number, number, number];
  phase: 'drop' | 'fly';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coinSize = 0.5; // Large coin

  useFrame((state) => {
    if (groupRef.current) {
      // Smooth spin
      groupRef.current.rotation.y += 0.15;
      // Gentle pulsing glow effect
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.08;
      groupRef.current.scale.setScalar(pulse);
      // Gentle wobble in drop phase
      if (phase === 'drop') {
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * 0.2;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Outer golden glow */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[coinSize * 2.8, coinSize * 2.8, coinSize * 0.2]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.25} />
      </mesh>
      {/* Main coin body - thick gold disk */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[coinSize * 2.2, coinSize * 2.2, coinSize * 0.35]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Coin front face - lighter gold */}
      <mesh position={[0, 0, coinSize * 0.18]}>
        <boxGeometry args={[coinSize * 1.9, coinSize * 1.9, coinSize * 0.05]} />
        <meshBasicMaterial color="#FFEC8B" />
      </mesh>
      {/* Inner ring detail */}
      <mesh position={[0, 0, coinSize * 0.21]}>
        <boxGeometry args={[coinSize * 1.5, coinSize * 1.5, coinSize * 0.03]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      {/* Center emblem - $ symbol voxel style */}
      {/* Vertical bar of $ */}
      <mesh position={[0, 0, coinSize * 0.24]}>
        <boxGeometry args={[coinSize * 0.15, coinSize * 0.9, coinSize * 0.04]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
      {/* Top curve of S */}
      <mesh position={[0, coinSize * 0.25, coinSize * 0.24]}>
        <boxGeometry args={[coinSize * 0.5, coinSize * 0.15, coinSize * 0.04]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
      {/* Middle bar of S */}
      <mesh position={[0, 0, coinSize * 0.24]}>
        <boxGeometry args={[coinSize * 0.45, coinSize * 0.12, coinSize * 0.04]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
      {/* Bottom curve of S */}
      <mesh position={[0, -coinSize * 0.25, coinSize * 0.24]}>
        <boxGeometry args={[coinSize * 0.5, coinSize * 0.15, coinSize * 0.04]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
      {/* Coin back - darker gold */}
      <mesh position={[0, 0, -coinSize * 0.18]}>
        <boxGeometry args={[coinSize * 1.9, coinSize * 1.9, coinSize * 0.05]} />
        <meshBasicMaterial color="#B8860B" />
      </mesh>
      {/* Edge rims - gives coin 3D depth (voxel style) */}
      <mesh position={[coinSize * 1.0, 0, 0]}>
        <boxGeometry args={[coinSize * 0.12, coinSize * 1.8, coinSize * 0.3]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      <mesh position={[-coinSize * 1.0, 0, 0]}>
        <boxGeometry args={[coinSize * 0.12, coinSize * 1.8, coinSize * 0.3]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      <mesh position={[0, coinSize * 1.0, 0]}>
        <boxGeometry args={[coinSize * 1.8, coinSize * 0.12, coinSize * 0.3]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      <mesh position={[0, -coinSize * 1.0, 0]}>
        <boxGeometry args={[coinSize * 1.8, coinSize * 0.12, coinSize * 0.3]} />
        <meshBasicMaterial color="#DAA520" />
      </mesh>
      {/* Subtle sparkle particles */}
      <mesh position={[coinSize * 1.2, coinSize * 0.6, 0.2]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-coinSize * 1.1, -coinSize * 0.5, 0.15]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshBasicMaterial color="#FFFACD" />
      </mesh>
    </group>
  );
});

// Unrailed-style voxel terrain background with side walls
const VoxelTerrain = memo(function VoxelTerrain() {
  // Seeded random for consistent terrain
  const seededRandom = (x: number, y: number) => {
    const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return seed - Math.floor(seed);
  };

  // Generate terrain blocks with varied heights
  const terrainBlocks = useMemo(() => {
    const blocks: { pos: [number, number, number]; color: string; height: number }[] = [];
    const gridSize = 1.2;
    const xRange = 18;
    const yRange = 16;

    for (let gx = -xRange / 2; gx < xRange / 2; gx++) {
      for (let gy = -yRange / 2; gy < yRange / 2; gy++) {
        const worldX = gx * gridSize;
        const worldY = gy * gridSize + 1.5;

        const noise1 = seededRandom(gx * 0.3, gy * 0.3);
        const noise2 = seededRandom(gx * 0.1 + 100, gy * 0.1 + 100);
        const heightNoise = noise1 * 0.6 + noise2 * 0.4;

        let height = -2 - heightNoise * 1.5;
        const biomeT = (gy + yRange / 2) / yRange;
        let color: string;

        if (biomeT < 0.3) {
          const colors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a40'];
          color = colors[Math.floor(seededRandom(gx + 50, gy + 50) * colors.length)];
          height -= 0.5;
        } else if (biomeT < 0.6) {
          const colors = ['#2D4A6E', '#3D5A7E', '#1E3A5E', '#2A4A6A'];
          color = colors[Math.floor(seededRandom(gx + 30, gy + 30) * colors.length)];
        } else {
          const colors = ['#2E5A4A', '#3E6A5A', '#1E4A3A', '#2A5A48'];
          color = colors[Math.floor(seededRandom(gx + 10, gy + 10) * colors.length)];
          height += 0.3;
        }

        blocks.push({ pos: [worldX, worldY, height], color, height: gridSize * (0.8 + heightNoise * 0.4) });
      }
    }
    return blocks;
  }, []);

  // Side walls - stacked voxel blocks to create depth with shadows
  const sideWalls = useMemo(() => {
    const walls: { pos: [number, number, number]; color: string; size: [number, number, number]; isShadow?: boolean }[] = [];
    const wallColors = ['#1E2A3A', '#2A3A4A', '#1A2A38', '#2E3E4E', '#162636'];
    const accentColors = ['#3A4A5A', '#4A5A6A', '#2A3A4A'];
    const shadowColor = '#080810'; // Very dark shadow color

    // Left wall - multiple layers of stacked blocks
    for (let y = -8; y <= 12; y += 1.0) {
      for (let layer = 0; layer < 3; layer++) {
        const xPos = -9.5 - layer * 0.8;
        const zBase = -1 + layer * 0.8;
        const heightVar = seededRandom(y * 10, layer) * 0.4;

        // Shadow block (offset towards play area and down)
        if (layer === 0) {
          walls.push({
            pos: [xPos + 0.6, y - 0.1, zBase - 0.3],
            color: shadowColor,
            size: [0.8, 0.9, 1.2],
            isShadow: true
          });
        }

        // Main wall block
        walls.push({
          pos: [xPos, y, zBase],
          color: wallColors[Math.floor(seededRandom(y + layer, 0) * wallColors.length)],
          size: [0.9, 0.95, 1.5 + heightVar]
        });

        // Add some protruding blocks for depth
        if (seededRandom(y, layer + 10) > 0.7) {
          walls.push({
            pos: [xPos + 0.3, y, zBase + 0.8],
            color: accentColors[Math.floor(seededRandom(y * 2, layer) * accentColors.length)],
            size: [0.4, 0.4, 0.5]
          });
        }
      }
    }

    // Right wall - multiple layers of stacked blocks
    for (let y = -8; y <= 12; y += 1.0) {
      for (let layer = 0; layer < 3; layer++) {
        const xPos = 9.5 + layer * 0.8;
        const zBase = -1 + layer * 0.8;
        const heightVar = seededRandom(y * 10 + 100, layer) * 0.4;

        // Shadow block (offset towards play area and down)
        if (layer === 0) {
          walls.push({
            pos: [xPos - 0.6, y - 0.1, zBase - 0.3],
            color: shadowColor,
            size: [0.8, 0.9, 1.2],
            isShadow: true
          });
        }

        // Main wall block
        walls.push({
          pos: [xPos, y, zBase],
          color: wallColors[Math.floor(seededRandom(y + layer + 100, 0) * wallColors.length)],
          size: [0.9, 0.95, 1.5 + heightVar]
        });

        // Add some protruding blocks for depth
        if (seededRandom(y + 100, layer + 10) > 0.7) {
          walls.push({
            pos: [xPos - 0.3, y, zBase + 0.8],
            color: accentColors[Math.floor(seededRandom(y * 2 + 100, layer) * accentColors.length)],
            size: [0.4, 0.4, 0.5]
          });
        }
      }
    }

    return walls;
  }, []);

  // Top wall/ceiling blocks - thick enough to hide enemy spawns
  const topWall = useMemo(() => {
    const blocks: { pos: [number, number, number]; color: string; size: [number, number, number] }[] = [];
    const wallColors = ['#0f1a2a', '#1a2a3a', '#0a1520', '#152535'];

    // Voxel-style top wall (visible edge)
    for (let x = -10; x <= 10; x += 1.0) {
      for (let layer = 0; layer < 2; layer++) {
        const yPos = 9.5 + layer * 0.8;
        const heightVar = seededRandom(x * 10, layer + 50) * 0.3;

        blocks.push({
          pos: [x, yPos, -0.5 + layer * 0.5],
          color: wallColors[Math.floor(seededRandom(x + layer, 50) * wallColors.length)],
          size: [0.95, 0.9, 1.2 + heightVar]
        });
      }
    }
    return blocks;
  }, []);

  // Decorative elements on walls
  const wallDecorations = useMemo(() => {
    const decs: { pos: [number, number, number]; color: string }[] = [];
    const glowColors = ['#6ECBFF', '#A66CFF', '#54E6CB', '#FFD93D', '#FF9FF3'];

    // Add glowing crystals/lights on walls
    for (let i = 0; i < 15; i++) {
      const side = seededRandom(i, 200) > 0.5 ? 1 : -1;
      const y = seededRandom(i, 201) * 18 - 7;
      decs.push({
        pos: [side * 9.2, y, 0.5],
        color: glowColors[Math.floor(seededRandom(i, 202) * glowColors.length)]
      });
    }
    return decs;
  }, []);

  return (
    <group>
      {/* Main terrain blocks */}
      {terrainBlocks.map((block, i) => (
        <mesh key={i} position={block.pos}>
          <boxGeometry args={[1.15, 1.15, block.height]} />
          <meshBasicMaterial color={block.color} />
        </mesh>
      ))}

      {/* Side walls */}
      {sideWalls.map((wall, i) => (
        <mesh key={`wall-${i}`} position={wall.pos}>
          <boxGeometry args={wall.size} />
          <meshBasicMaterial color={wall.color} />
        </mesh>
      ))}

      {/* Top wall */}
      {topWall.map((block, i) => (
        <mesh key={`top-${i}`} position={block.pos}>
          <boxGeometry args={block.size} />
          <meshBasicMaterial color={block.color} />
        </mesh>
      ))}

      {/* Wall decorations (glowing elements) */}
      {wallDecorations.map((dec, i) => (
        <mesh key={`deco-${i}`} position={dec.pos}>
          <boxGeometry args={[0.15, 0.15, 0.3]} />
          <meshBasicMaterial color={dec.color} />
        </mesh>
      ))}

      {/* Large solid cover above top wall to hide enemy spawns */}
      <mesh position={[0, 14, 0]}>
        <boxGeometry args={[22, 8, 3]} />
        <meshBasicMaterial color="#0a1520" />
      </mesh>
      {/* Gradient fade at top edge for smooth transition */}
      <mesh position={[0, 9.8, 1]}>
        <planeGeometry args={[22, 1.5]} />
        <meshBasicMaterial color="#0a1520" transparent opacity={0.6} />
      </mesh>
    </group>
  );
});

// Game bounds must match game-engine.ts
const GAME_BOUNDS = {
  minX: -8,
  maxX: 8,
  minY: -5,
  maxY: 8,
};

// Calculate responsive camera zoom based on screen width
// Game world is ~20 units wide (walls at -10 to 10), ensure it fits the screen
function getResponsiveZoom(screenWidth: number, screenHeight: number): number {
  const targetWorldWidth = 20; // Full game width including walls
  const zoomForWidth = screenWidth / targetWorldWidth;
  // Cap at 45 for large screens, minimum 15 for very small screens
  return Math.max(15, Math.min(45, zoomForWidth));
}

// Game scene
function GameScene() {
  const { gl, size } = useThree();
  // Get render data from store (triggers re-render)
  const players = useGameStore((s) => s.players);
  const enemies = useGameStore((s) => s.enemies);
  const bullets = useGameStore((s) => s.bullets);
  const enemyBullets = useGameStore((s) => s.enemyBullets);
  const powerUps = useGameStore((s) => s.powerUps);
  const coins = useGameStore((s) => s.coins);
  const feverCoins = useGameStore((s) => s.feverCoins);
  const activePowerUps = useGameStore((s) => s.activePowerUps);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const isInvincible = useGameStore((s) => s.isInvincible);
  const isFeverTime = useGameStore((s) => s.isFeverTime);
  const feverCoinCount = useGameStore((s) => s.feverCoinCount);

  const lastFireTime = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  // Responsive zoom based on screen width
  const cameraZoom = useMemo(() => getResponsiveZoom(size.width, size.height), [size.width, size.height]);

  // Update camera zoom when it changes
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom = cameraZoom;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraZoom]);

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

  // Target position for smooth movement (used for touch re-tap interpolation)
  const shipTargetRef = useRef({ x: 0, y: -3 });
  const isTouchDraggingRef = useRef(false); // true once touchmove fires (finger dragging)

  // Smooth ship movement for re-tap only (not during drag)
  useFrame(() => {
    const store = useGameStore.getState();
    if (!store.isPlaying || store.isPaused) return;

    // Only interpolate when NOT dragging (i.e. re-tap transition before first touchmove)
    if (!isTouchDraggingRef.current) {
      const target = shipTargetRef.current;
      const current = mainShipPositionRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.01) {
        const lerpSpeed = 0.15;
        const newX = current.x + dx * lerpSpeed;
        const newY = current.y + dy * lerpSpeed;
        mainShipPositionRef.current = { x: newX, y: newY };
        mousePos.current = { x: newX, y: newY };
      } else {
        mainShipPositionRef.current = target;
        mousePos.current = target;
      }
    }
  });

  // Touch/mouse controls - convert screen to game coordinates
  useEffect(() => {
    const canvas = gl.domElement;

    // Ship offset: higher for touch (finger obscures ship) vs mouse
    const SHIP_OFFSET_Y_MOUSE = 0.8;
    const SHIP_OFFSET_Y_TOUCH = 4.0; // 1.6x offset so ship is visible above finger

    // Camera settings for coordinate calculation
    const CAMERA_Y = 1.5; // Camera y position

    const screenToGame = (clientX: number, clientY: number, isTouch: boolean) => {
      const rect = canvas.getBoundingClientRect();

      // Use responsive zoom for coordinate calculation
      const currentZoom = cameraRef.current?.zoom || cameraZoom;

      // Calculate visible area based on orthographic camera
      const visibleWidth = rect.width / currentZoom;
      const visibleHeight = rect.height / currentZoom;

      // Normalize cursor position (0 to 1)
      const normalizedX = (clientX - rect.left) / rect.width;
      const normalizedY = (clientY - rect.top) / rect.height;

      // Convert to world coordinates (centered on camera position)
      const offsetY = isTouch ? SHIP_OFFSET_Y_TOUCH : SHIP_OFFSET_Y_MOUSE;
      const worldX = (normalizedX - 0.5) * visibleWidth;
      const worldY = CAMERA_Y + (0.5 - normalizedY) * visibleHeight + offsetY;

      // Clamp to game bounds
      const gameX = Math.max(GAME_BOUNDS.minX, Math.min(GAME_BOUNDS.maxX, worldX));
      const gameY = Math.max(GAME_BOUNDS.minY, Math.min(GAME_BOUNDS.maxY, worldY));
      return { x: gameX, y: gameY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pos = screenToGame(e.clientX, e.clientY, false);
      // Mouse: direct position (no interpolation)
      mousePos.current = pos;
      mainShipPositionRef.current = pos;
      shipTargetRef.current = pos;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        isTouchDraggingRef.current = true;
        const pos = screenToGame(e.touches[0].clientX, e.touches[0].clientY, true);
        // Direct position update during drag - no lag
        mainShipPositionRef.current = pos;
        mousePos.current = pos;
        shipTargetRef.current = pos;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      // Don't set dragging yet - let useFrame interpolate to target
      // isTouchDraggingRef becomes true on first touchmove
      isTouchDraggingRef.current = false;
      if (e.touches.length > 0) {
        const pos = screenToGame(e.touches[0].clientX, e.touches[0].clientY, true);
        // Set target only - ship will smoothly interpolate there
        shipTargetRef.current = pos;
      }
    };

    const handleTouchEnd = () => {
      isTouchDraggingRef.current = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl, cameraZoom]);

  return (
    <>
      {/* Orthographic camera - responsive zoom for mobile/mini app */}
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={[0, 1.5, 20]}
        zoom={cameraZoom}
        near={0.1}
        far={100}
      />

      {/* Minimal lighting - meshBasicMaterial doesn't need lights */}
      <ambientLight intensity={1} />

      {/* Voxel Terrain Background */}
      <VoxelTerrain />

      {/* Players */}
      {players.map((player) => (
        <PlayerShip
          key={player.id}
          position={[player.position.x, player.position.y, player.position.z]}
          isMain={player.isMain}
          avatarUrl={player.isMain ? playerAvatar : null}
          hasShield={activePowerUps.shield}
          isInvincible={isInvincible}
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
          isShiny={enemy.isShiny}
          isElite={enemy.isElite}
          bossType={enemy.bossType}
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

      {/* Coins - larger and more dramatic during fever time */}
      {coins.map((coin) => (
        <CoinMesh
          key={coin.id}
          position={[coin.position.x, coin.position.y, coin.position.z]}
          size={isFeverTime ? coin.size * 1.5 : coin.size}
          phase={coin.phase}
        />
      ))}

      {/* Fever Coins (large golden coins) */}
      {feverCoins.map((fc) => (
        <FeverCoinMesh
          key={fc.id}
          position={[fc.position.x, fc.position.y, fc.position.z]}
          phase={fc.phase}
        />
      ))}

      {/* Fever Time visual effect - screen border glow */}
      {isFeverTime && (
        <>
          {/* Golden screen border effect */}
          <mesh position={[0, 0, 5]}>
            <planeGeometry args={[20, 16]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.15} />
          </mesh>
          {/* Pulsing "FEVER" text effect represented by floating golden blocks */}
          <group position={[0, 6, 2]}>
            {/* F */}
            <mesh position={[-3.5, 0, 0]}><boxGeometry args={[0.3, 1, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-3.3, 0.35, 0]}><boxGeometry args={[0.5, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-3.35, 0, 0]}><boxGeometry args={[0.4, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            {/* E */}
            <mesh position={[-2.3, 0, 0]}><boxGeometry args={[0.3, 1, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-2.1, 0.35, 0]}><boxGeometry args={[0.5, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-2.15, 0, 0]}><boxGeometry args={[0.4, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-2.1, -0.35, 0]}><boxGeometry args={[0.5, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            {/* V */}
            <mesh position={[-1.0, 0.2, 0]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.25, 0.9, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[-0.6, 0.2, 0]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.25, 0.9, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            {/* E */}
            <mesh position={[0.3, 0, 0]}><boxGeometry args={[0.3, 1, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[0.5, 0.35, 0]}><boxGeometry args={[0.5, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[0.45, 0, 0]}><boxGeometry args={[0.4, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[0.5, -0.35, 0]}><boxGeometry args={[0.5, 0.25, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            {/* R */}
            <mesh position={[1.5, 0, 0]}><boxGeometry args={[0.3, 1, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[1.7, 0.25, 0]}><boxGeometry args={[0.5, 0.45, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
            <mesh position={[1.85, -0.2, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[0.25, 0.55, 0.2]} /><meshBasicMaterial color="#FFD700" /></mesh>
          </group>
          {/* Rainbow particle effects during fever */}
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh
              key={`fever-particle-${i}`}
              position={[
                Math.sin(i * 0.5) * 7,
                Math.cos(i * 0.3) * 5 + 2,
                1 + Math.sin(i) * 0.5
              ]}
            >
              <boxGeometry args={[0.15, 0.15, 0.15]} />
              <meshBasicMaterial color={POP_COLORS[i % POP_COLORS.length]} />
            </mesh>
          ))}
        </>
      )}

      {/* Fever coin counter display (show collected/required) - positioned lower to avoid gameplay overlap */}
      {feverCoinCount > 0 && !isFeverTime && (
        <group position={[0, -6, 3]}>
          {/* Counter background - larger and more visible */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[2.5, 0.7, 0.1]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.85} />
          </mesh>
          {/* Gold border */}
          <mesh position={[0, 0.35, -0.05]}>
            <boxGeometry args={[2.6, 0.08, 0.1]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          <mesh position={[0, -0.35, -0.05]}>
            <boxGeometry args={[2.6, 0.08, 0.1]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          {/* "FEVER" label using small blocks */}
          <mesh position={[-0.9, 0.12, 0]}>
            <boxGeometry args={[0.08, 0.18, 0.05]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
          {/* Show fever coins collected as coin shapes */}
          {Array.from({ length: FEVER_COINS_REQUIRED }).map((_, i) => (
            <group key={`fc-indicator-${i}`} position={[-0.5 + i * 0.4, -0.05, 0]}>
              {/* Coin circle approximation with boxes */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.28, 0.28, 0.08]} />
                <meshBasicMaterial color={i < feverCoinCount ? '#FFD700' : '#2a2a3e'} />
              </mesh>
              {/* Inner detail */}
              <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[0.18, 0.18, 0.03]} />
                <meshBasicMaterial color={i < feverCoinCount ? '#FFF8DC' : '#1a1a2e'} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </>
  );
}

export default function Game3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <GameScene />
      </Canvas>
    </div>
  );
}
