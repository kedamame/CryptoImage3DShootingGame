'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/game-engine';
import { POWER_UP_COLORS, POWER_UP_DURATION } from '@/lib/game-types';

// Component to show power-up timer with circular progress
function PowerUpTimer({ expireTime, color, label }: { expireTime: number; color: string; label: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (expireTime === 0) {
      setRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const left = Math.max(0, expireTime - Date.now());
      setRemaining(left);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 100);
    return () => clearInterval(interval);
  }, [expireTime]);

  if (remaining === 0) return null;

  const progress = remaining / POWER_UP_DURATION;

  return (
    <div className="flex items-center gap-1">
      <div className="relative w-8 h-8">
        {/* Background circle */}
        <svg className="w-8 h-8 -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="3"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={75.4}
            strokeDashoffset={75.4 * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        {/* Inner timer number */}
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color }}
        >
          {Math.ceil(remaining / 1000)}
        </div>
      </div>
      <span className="text-white/70 text-xs">{label}</span>
    </div>
  );
}

export function GameUI() {
  const {
    score,
    lives,
    isPlaying,
    isPaused,
    isGameOver,
    activePowerUps,
    powerUpExpireTimes,
    extraShipCount,
    startGame,
    pauseGame,
    resumeGame,
  } = useGameStore();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top HUD */}
      {isPlaying && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
          {/* Score */}
          <div className="game-panel">
            <div className="text-pop-yellow text-xs mb-1">SCORE</div>
            <div className="score-display">{score.toLocaleString()}</div>
          </div>

          {/* Lives & Power-ups */}
          <div className="game-panel flex flex-col items-end gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded ${
                    i < lives ? 'bg-pop-red' : 'bg-pop-gray/50'
                  }`}
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 35%, 80% 100%, 20% 100%, 0% 35%)',
                  }}
                />
              ))}
            </div>

            {/* Extra ships indicator */}
            {extraShipCount > 0 && (
              <div className="text-pop-pink text-xs">
                +{extraShipCount} SHIPS
              </div>
            )}

            {/* Active power-ups with timers */}
            <div className="flex flex-col gap-1">
              {activePowerUps.rapidFire && (
                <PowerUpTimer
                  expireTime={powerUpExpireTimes?.rapidFire || 0}
                  color={POWER_UP_COLORS.rapid_fire}
                  label="Rapid"
                />
              )}
              {activePowerUps.shield && (
                <PowerUpTimer
                  expireTime={powerUpExpireTimes?.shield || 0}
                  color={POWER_UP_COLORS.shield}
                  label="Shield"
                />
              )}
              {activePowerUps.scoreBoost && (
                <PowerUpTimer
                  expireTime={powerUpExpireTimes?.scoreBoost || 0}
                  color={POWER_UP_COLORS.score_boost}
                  label="x2"
                />
              )}
              {activePowerUps.tripleShot && (
                <PowerUpTimer
                  expireTime={powerUpExpireTimes?.tripleShot || 0}
                  color={POWER_UP_COLORS.triple_shot}
                  label="Triple"
                />
              )}
            </div>
          </div>

          {/* Pause button */}
          <button
            onClick={() => (isPaused ? resumeGame() : pauseGame())}
            className="game-panel px-3 py-2 text-white text-sm hover:bg-pop-gray/50 transition-colors"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-auto">
          <div className="game-panel text-center p-8">
            <h2 className="text-pop-yellow text-2xl mb-6">PAUSED</h2>
            <button onClick={resumeGame} className="btn-pop">
              RESUME
            </button>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="game-panel text-center p-8 max-w-sm">
            <h2 className="text-pop-red text-3xl mb-4">GAME OVER</h2>
            <div className="text-pop-yellow text-xl mb-6">
              SCORE: {score.toLocaleString()}
            </div>
            <button onClick={startGame} className="btn-pop">
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Power-up legend (bottom) */}
      {isPlaying && !isPaused && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="game-panel inline-flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: POWER_UP_COLORS.extra_ship }} />
              <span className="text-white/70">+Ship</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: POWER_UP_COLORS.rapid_fire }} />
              <span className="text-white/70">Rapid</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: POWER_UP_COLORS.shield }} />
              <span className="text-white/70">Shield</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: POWER_UP_COLORS.score_boost }} />
              <span className="text-white/70">x2</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: POWER_UP_COLORS.triple_shot }} />
              <span className="text-white/70">Triple</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StartScreen({
  onStart,
  isConnected,
  onConnect,
  isLoading,
}: {
  onStart: () => void;
  isConnected: boolean;
  onConnect: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-pop-dark to-black flex items-center justify-center">
      <div className="text-center p-8">
        {/* Title */}
        <h1 className="text-pop-yellow text-2xl md:text-4xl mb-2 font-game">
          CRYPTO
        </h1>
        <h1 className="text-pop-orange text-xl md:text-3xl mb-8 font-game">
          SHOOTING
        </h1>

        {/* Decorative ship */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-16 h-20 bg-pop-blue rounded-lg float-animation" />
            <div className="absolute -left-4 top-4 w-6 h-12 bg-pop-cyan rounded" />
            <div className="absolute -right-4 top-4 w-6 h-12 bg-pop-cyan rounded" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-pop-yellow rounded" />
          </div>
        </div>

        {/* Instructions */}
        <div className="game-panel mb-8 text-left text-xs text-white/80 space-y-2 max-w-xs mx-auto">
          <p>🎮 Touch & drag to move</p>
          <p>🔫 Auto-fire while touching</p>
          <p>💎 Collect power-ups</p>
          <p>🎯 Destroy your tokens!</p>
        </div>

        {/* Buttons */}
        {isLoading ? (
          <div className="text-pop-yellow loading-pulse">Loading...</div>
        ) : isConnected ? (
          <button onClick={onStart} className="btn-pop text-lg">
            START GAME
          </button>
        ) : (
          <div className="space-y-4">
            <button onClick={onConnect} className="btn-pop">
              CONNECT WALLET
            </button>
            <div className="text-white/50 text-xs">or</div>
            <button
              onClick={onStart}
              className="btn-pop bg-gradient-to-b from-pop-gray to-pop-dark"
            >
              DEMO MODE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaderboardUI({
  scores,
  isOpen,
  onClose,
  currentScore,
}: {
  scores: { address: string; score: number; timestamp: number }[];
  isOpen: boolean;
  onClose: () => void;
  currentScore?: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
      <div className="game-panel p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-pop-yellow text-xl">LEADERBOARD</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {currentScore !== undefined && (
          <div className="mb-4 p-3 bg-pop-purple/20 rounded-lg text-center">
            <div className="text-pop-purple text-xs">YOUR SCORE</div>
            <div className="text-pop-yellow text-2xl">
              {currentScore.toLocaleString()}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {scores.length === 0 ? (
            <div className="text-white/50 text-center py-8">
              No scores yet. Be the first!
            </div>
          ) : (
            scores.map((entry, index) => (
              <div
                key={`${entry.address}-${entry.timestamp}`}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0
                    ? 'bg-pop-yellow/20'
                    : index === 1
                    ? 'bg-pop-gray/30'
                    : index === 2
                    ? 'bg-pop-orange/20'
                    : 'bg-pop-dark/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg font-bold ${
                      index === 0
                        ? 'text-pop-yellow'
                        : index === 1
                        ? 'text-white/70'
                        : index === 2
                        ? 'text-pop-orange'
                        : 'text-white/50'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-white text-sm truncate max-w-[120px]">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  </span>
                </div>
                <span className="text-pop-yellow font-bold">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
