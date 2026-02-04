'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcaster } from '@/components/FarcasterSDK';
import {
  getAllWalletAssets,
  generateFallbackEnemies,
  type WalletAsset,
} from '@/lib/wallet-assets';
import {
  useTopScores,
  useSubmitScore,
  formatScore,
  truncateAddress,
  LEADERBOARD_CONTRACT_ADDRESS,
} from '@/lib/leaderboard';
import dynamic from 'next/dynamic';
import type { Address } from 'viem';

// Dynamic import for Game3D to avoid SSR issues with Three.js
const Game3D = dynamic(() => import('./Game3D'), { ssr: false });

type GameScreen = 'menu' | 'loading' | 'game' | 'gameOver' | 'leaderboard';

export default function GameUI() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [walletAssets, setWalletAssets] = useState<WalletAsset[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isInMiniApp, userAvatar, userName } = useFarcaster();

  const { data: topScores, refetch: refetchScores } = useTopScores(10);
  const { submitScore, isPending: isSubmitting, isSuccess: isSubmitted } = useSubmitScore();

  // Connect wallet (different behavior for Mini App vs Web)
  const handleConnect = useCallback(async () => {
    if (isInMiniApp) {
      try {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          (window as unknown as { ethereum: typeof provider }).ethereum = provider;
        }
        const injectedConnector = connectors.find((c) => c.id === 'injected');
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      } catch (error) {
        console.error('Failed to connect Farcaster wallet:', error);
      }
    } else {
      // Show connector options for web
      const coinbaseConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK');
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
    }
  }, [isInMiniApp, connectors, connect]);

  // Load wallet assets
  const loadAssets = useCallback(async () => {
    if (!address) {
      setWalletAssets(generateFallbackEnemies());
      return;
    }

    setIsLoadingAssets(true);
    try {
      const assets = await getAllWalletAssets(address);
      if (assets.length === 0) {
        setWalletAssets(generateFallbackEnemies());
      } else {
        setWalletAssets(assets);
      }
    } catch (error) {
      console.error('Failed to load wallet assets:', error);
      setWalletAssets(generateFallbackEnemies());
    } finally {
      setIsLoadingAssets(false);
    }
  }, [address]);

  // Start game
  const handleStartGame = useCallback(async () => {
    setScreen('loading');
    await loadAssets();
    setScreen('game');
  }, [loadAssets]);

  // Game over handler
  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setScreen('gameOver');
  }, []);

  // Submit score to leaderboard
  const handleSubmitScore = useCallback(() => {
    if (!isConnected) return;
    const displayName = userName || truncateAddress(address || '');
    submitScore(finalScore, displayName);
  }, [isConnected, finalScore, userName, address, submitScore]);

  // Refetch scores when submitted
  useEffect(() => {
    if (isSubmitted) {
      refetchScores();
    }
  }, [isSubmitted, refetchScores]);

  const isContractDeployed = LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="w-full h-full bg-darker text-white overflow-hidden">
      {/* Menu Screen */}
      {screen === 'menu' && (
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              CRYPTO
            </h1>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-secondary via-purple to-primary bg-clip-text text-transparent">
              SHOOTER
            </h1>
            <p className="text-gray-400 mt-4">
              Your wallet assets become enemies!
            </p>
          </div>

          {/* Wallet Status */}
          <div className="w-full max-w-xs">
            {isConnected ? (
              <div className="bg-dark rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {userAvatar && (
                    <img
                      src={userAvatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400">Connected</p>
                    <p className="text-secondary font-mono text-sm truncate">
                      {userName || truncateAddress(address || '')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full py-4 bg-secondary text-dark font-bold rounded-xl hover:bg-secondary/80 transition-colors"
              >
                {isInMiniApp ? 'Connect Farcaster Wallet' : 'Connect Wallet'}
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-primary to-orange text-white text-xl font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
            >
              🎮 START GAME
            </button>

            <button
              onClick={() => setScreen('leaderboard')}
              className="w-full py-3 bg-dark border-2 border-accent text-accent font-bold rounded-xl hover:bg-accent hover:text-dark transition-colors"
            >
              🏆 Leaderboard
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>Touch to move • Auto-fire while touching</p>
            <p className="mt-1">Collect items to power up!</p>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {screen === 'loading' && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="animate-spin w-16 h-16 border-4 border-secondary border-t-transparent rounded-full mb-4" />
          <p className="text-xl text-secondary">Loading your assets...</p>
          <p className="text-sm text-gray-400 mt-2">
            {isLoadingAssets ? 'Fetching wallet data...' : 'Preparing game...'}
          </p>
        </div>
      )}

      {/* Game Screen */}
      {screen === 'game' && (
        <Game3D
          walletAssets={walletAssets}
          avatarUrl={userAvatar}
          onGameOver={handleGameOver}
        />
      )}

      {/* Game Over Screen */}
      {screen === 'gameOver' && (
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
          <h2 className="text-4xl font-bold text-primary">GAME OVER</h2>

          <div className="text-center">
            <p className="text-gray-400">Your Score</p>
            <p className="text-6xl font-bold text-accent mt-2">
              {finalScore.toLocaleString()}
            </p>
          </div>

          {/* Submit Score */}
          {isConnected && isContractDeployed && (
            <div className="w-full max-w-xs">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitScore}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-purple text-white font-bold rounded-xl hover:bg-purple/80 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : '📤 Submit to Leaderboard'}
                </button>
              ) : (
                <p className="text-center text-green py-4">
                  ✅ Score submitted!
                </p>
              )}
            </div>
          )}

          {!isContractDeployed && (
            <p className="text-sm text-gray-500">
              Leaderboard coming soon!
            </p>
          )}

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-primary to-orange text-white text-xl font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              🔄 Play Again
            </button>

            <button
              onClick={() => setScreen('menu')}
              className="w-full py-3 bg-dark border border-gray-600 text-gray-300 font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              🏠 Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {screen === 'leaderboard' && (
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-accent">🏆 Leaderboard</h2>
            <button
              onClick={() => setScreen('menu')}
              className="p-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {!isContractDeployed ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-xl mb-2">Coming Soon!</p>
                <p className="text-sm">
                  On-chain leaderboard will be available after contract deployment
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {topScores?.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 bg-dark rounded-xl p-4"
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                      index === 0
                        ? 'bg-accent text-dark'
                        : index === 1
                        ? 'bg-gray-300 text-dark'
                        : index === 2
                        ? 'bg-orange text-dark'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">
                      {entry.username || truncateAddress(entry.player)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {truncateAddress(entry.player)}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-secondary">
                    {formatScore(entry.score)}
                  </p>
                </div>
              ))}

              {(!topScores || topScores.length === 0) && (
                <div className="text-center text-gray-400 py-10">
                  <p>No scores yet. Be the first!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
