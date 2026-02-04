'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useFarcaster } from '@/components/FarcasterSDK';

interface GameUIProps {
  score: number;
  lives: number;
  level: number;
  isPlaying: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onRestart: () => void;
  highScores: { address: string; score: number; timestamp: number }[];
  isSubmittingScore: boolean;
  onSubmitScore: () => void;
  hasSubmittedScore: boolean;
}

export default function GameUI({
  score,
  lives,
  level,
  isPlaying,
  isGameOver,
  onStart,
  onRestart,
  highScores,
  isSubmittingScore,
  onSubmitScore,
  hasSubmittedScore,
}: GameUIProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isInMiniApp, isLoading: isFarcasterLoading, username, avatarUrl } = useFarcaster();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Connect to Farcaster wallet in Mini App
  const handleConnect = async () => {
    if (isInMiniApp) {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          (window as unknown as { ethereum: typeof provider }).ethereum = provider;
        }
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      } catch (e) {
        console.error('Failed to connect Farcaster wallet:', e);
      }
    } else {
      // Use first available connector (usually injected/MetaMask)
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Heart icons for lives
  const heartsDisplay = Array(3).fill(0).map((_, i) => (
    <span key={i} className={`text-2xl ${i < lives ? 'opacity-100' : 'opacity-30'}`}>
      ❤️
    </span>
  ));

  // Start screen
  if (!isPlaying && !isGameOver) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 glass">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-4xl font-bold mb-2 text-pixel-shadow bg-gradient-to-r from-primary to-orange bg-clip-text text-transparent">
            Crypto Shooter
          </h1>
          <p className="text-secondary mb-6 text-lg">
            Shoot your wallet tokens & NFTs!
          </p>

          {/* Wallet connection */}
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isFarcasterLoading}
              className="btn-secondary w-full mb-4"
            >
              {isFarcasterLoading ? 'Loading...' : '🔗 Connect Wallet'}
            </button>
          ) : (
            <div className="mb-4 p-3 glass rounded-xl">
              <div className="flex items-center justify-center gap-3">
                {avatarUrl && (
                  <Image src={avatarUrl} alt="Avatar" width={40} height={40} className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <p className="text-sm text-secondary">
                    {username ? `@${username}` : formatAddress(address!)}
                  </p>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs text-primary hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onStart}
            disabled={!isConnected}
            className={`btn-pop w-full text-xl ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🎮 Start Game
          </button>

          {/* Instructions */}
          <div className="mt-6 text-left glass p-4 rounded-xl">
            <h3 className="font-bold text-accent mb-2">How to Play</h3>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>👆 Touch & hold to move</li>
              <li>🔫 Auto-fire while touching</li>
              <li>💎 Collect power-ups</li>
              <li>❤️ 3 lives - do not get hit!</li>
            </ul>
          </div>

          {/* Leaderboard button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="mt-4 text-secondary hover:text-accent transition-colors"
          >
            🏆 View Leaderboard
          </button>
        </div>

        {/* Leaderboard modal */}
        {showLeaderboard && (
          <LeaderboardModal
            highScores={highScores}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </div>
    );
  }

  // Game over screen
  if (isGameOver) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 glass">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-4xl font-bold mb-4 text-pixel-shadow text-primary">
            Game Over
          </h2>

          <div className="glass p-6 rounded-2xl mb-6">
            <p className="text-gray-400 mb-1">Final Score</p>
            <p className="text-5xl font-bold text-accent mb-4">{score.toLocaleString()}</p>
            <p className="text-gray-400">Level {level}</p>
          </div>

          {/* Submit score to blockchain */}
          {isConnected && !hasSubmittedScore && (
            <button
              onClick={onSubmitScore}
              disabled={isSubmittingScore}
              className="btn-secondary w-full mb-4"
            >
              {isSubmittingScore ? (
                <span className="loading-dots">Submitting to blockchain</span>
              ) : (
                '⛓️ Submit Score On-Chain'
              )}
            </button>
          )}

          {hasSubmittedScore && (
            <p className="text-green mb-4">✅ Score submitted on-chain!</p>
          )}

          <button onClick={onRestart} className="btn-pop w-full text-xl">
            🔄 Play Again
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="mt-4 text-secondary hover:text-accent transition-colors"
          >
            🏆 View Leaderboard
          </button>
        </div>

        {showLeaderboard && (
          <LeaderboardModal
            highScores={highScores}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </div>
    );
  }

  // In-game HUD
  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none">
      <div className="flex justify-between items-start">
        {/* Score */}
        <div className="glass px-4 py-2 rounded-xl">
          <p className="text-xs text-gray-400">SCORE</p>
          <p className="text-2xl font-bold text-accent">{score.toLocaleString()}</p>
        </div>

        {/* Lives */}
        <div className="glass px-4 py-2 rounded-xl">
          <div className="flex gap-1">{heartsDisplay}</div>
        </div>

        {/* Level */}
        <div className="glass px-4 py-2 rounded-xl">
          <p className="text-xs text-gray-400">LEVEL</p>
          <p className="text-2xl font-bold text-secondary">{level}</p>
        </div>
      </div>
    </div>
  );
}

// Leaderboard modal component
function LeaderboardModal({
  highScores,
  onClose,
}: {
  highScores: { address: string; score: number; timestamp: number }[];
  onClose: () => void;
}) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass p-6 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-accent">🏆 Leaderboard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        {highScores.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No scores yet. Be the first!</p>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            {highScores.map((entry, index) => (
              <div
                key={`${entry.address}-${entry.timestamp}`}
                className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/20'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </span>
                  <span className="font-mono text-sm">{formatAddress(entry.address)}</span>
                </div>
                <span className="font-bold text-accent">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center">
          Scores stored on Base blockchain
        </p>
      </div>
    </div>
  );
}
