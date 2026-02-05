'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFarcaster } from '@/components/FarcasterSDK';
import { useGameStore } from '@/lib/game-engine';
import { GameUI, StartScreen, LeaderboardUI } from '@/components/game/GameUI';
import { fetchWalletAssets, generateDemoAssets } from '@/lib/wallet-assets';
import {
  getTopScores,
  submitScoreLocal,
  prepareSubmitScoreTransaction,
  LEADERBOARD_CONTRACT_ADDRESS,
  type LeaderboardEntry,
} from '@/lib/leaderboard';

// Dynamic import for 3D component (no SSR)
const Game3D = dynamic(() => import('@/components/game/Game3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-pop-dark">
      <div className="text-pop-yellow loading-pulse font-game">Loading 3D...</div>
    </div>
  ),
});

export default function Home() {
  const { isInMiniApp, isLoading: farcasterLoading, user, connectWallet } = useFarcaster();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    isPlaying,
    isGameOver,
    score,
    startGame,
    setWalletAssets,
    setPlayerAvatar,
  } = useGameStore();

  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

  // Contract write for on-chain score submission
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Load wallet assets
  const loadAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      if (address) {
        const assets = await fetchWalletAssets(address);
        if (assets.length > 0) {
          setWalletAssets(assets);
        } else {
          // Use demo assets if no tokens found
          setWalletAssets(generateDemoAssets());
        }
      } else {
        setWalletAssets(generateDemoAssets());
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      setWalletAssets(generateDemoAssets());
    } finally {
      setIsLoadingAssets(false);
    }
  }, [address, setWalletAssets]);

  // Set player avatar from Farcaster
  useEffect(() => {
    if (user?.pfpUrl) {
      setPlayerAvatar(user.pfpUrl);
    }
  }, [user, setPlayerAvatar]);

  // Load leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      const scores = await getTopScores(20);
      setLeaderboardScores(scores);
    };
    loadLeaderboard();
  }, [isGameOver, isTxSuccess]);

  // Handle game over - submit score
  useEffect(() => {
    if (isGameOver && score > 0 && !hasSubmittedScore) {
      setHasSubmittedScore(true);

      // Submit to local storage (always works)
      const playerAddress = address || `demo-${Date.now()}`;
      submitScoreLocal(playerAddress, score);

      // If contract is deployed and connected, submit on-chain
      if (
        isConnected &&
        address &&
        LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
      ) {
        const txData = prepareSubmitScoreTransaction(score);
        writeContract({
          address: LEADERBOARD_CONTRACT_ADDRESS,
          abi: [
            {
              inputs: [{ name: 'score', type: 'uint256' }],
              name: 'submitScore',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          functionName: 'submitScore',
          args: [BigInt(score)],
        });
      }

      // Show leaderboard after game over
      setTimeout(() => setShowLeaderboard(true), 1500);
    }
  }, [isGameOver, score, hasSubmittedScore, isConnected, address, writeContract]);

  // Reset submitted flag when starting new game
  useEffect(() => {
    if (isPlaying) {
      setHasSubmittedScore(false);
      setShowLeaderboard(false);
    }
  }, [isPlaying]);

  // Handle wallet connection
  const handleConnect = async () => {
    if (isInMiniApp) {
      await connectWallet();
      // Try to connect with injected (Farcaster wallet)
      const injectedConnector = connectors.find((c) => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    } else {
      // Show wallet options for web
      const coinbaseConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK');
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
    }
  };

  // Handle game start
  const handleStartGame = async () => {
    await loadAssets();
    startGame();
  };

  const isLoading = farcasterLoading || isLoadingAssets;

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      {/* 3D Game Canvas */}
      <Game3D />

      {/* Game UI Overlay */}
      <GameUI />

      {/* Start Screen */}
      {!isPlaying && !isGameOver && (
        <StartScreen
          onStart={handleStartGame}
          isConnected={isConnected}
          onConnect={handleConnect}
          isLoading={isLoading}
        />
      )}

      {/* Leaderboard */}
      <LeaderboardUI
        scores={leaderboardScores}
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        currentScore={isGameOver ? score : undefined}
      />

      {/* Transaction pending indicator */}
      {isTxPending && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 game-panel text-pop-yellow text-xs">
          Submitting score on-chain...
        </div>
      )}

      {/* Leaderboard button (when playing) */}
      {isPlaying && !showLeaderboard && (
        <button
          onClick={() => setShowLeaderboard(true)}
          className="absolute bottom-20 right-4 game-panel px-3 py-2 text-white text-xs pointer-events-auto"
        >
          🏆
        </button>
      )}

      {/* Connection status */}
      {isConnected && !isPlaying && (
        <div className="absolute top-4 right-4 game-panel text-xs">
          <div className="text-pop-green mb-1">Connected</div>
          <div className="text-white/70 truncate max-w-[100px]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <button
            onClick={() => disconnect()}
            className="text-pop-red text-xs mt-2 hover:underline"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Farcaster user info */}
      {user && !isPlaying && (
        <div className="absolute top-4 left-4 game-panel text-xs flex items-center gap-2">
          {user.pfpUrl && (
            <img
              src={user.pfpUrl}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <div className="text-white">{user.displayName || user.username}</div>
            <div className="text-white/50">@{user.username}</div>
          </div>
        </div>
      )}
    </main>
  );
}
