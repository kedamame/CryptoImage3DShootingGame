import { type Address, parseAbi } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';

// Contract ABI (simplified for frontend use)
export const LEADERBOARD_ABI = parseAbi([
  'function submitScore(uint256 score, string calldata username) external',
  'function getTopScores(uint256 count) external view returns ((address player, uint256 score, uint256 timestamp, string username)[])',
  'function getLeaderboardSize() external view returns (uint256)',
  'function getPlayerRank(address player) external view returns (uint256)',
  'function playerBestScore(address player) external view returns (uint256)',
]);

// Contract address - to be deployed
// For testing, you can deploy to Base Sepolia first
export const LEADERBOARD_CONTRACT_ADDRESS: Address = '0x0000000000000000000000000000000000000000'; // Update after deployment

export interface LeaderboardEntry {
  player: Address;
  score: bigint;
  timestamp: bigint;
  username: string;
}

// Hook to get top scores
export function useTopScores(count: number = 10) {
  return useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getTopScores',
    args: [BigInt(count)],
    chainId: base.id,
    query: {
      enabled: LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Hook to get player's rank
export function usePlayerRank(playerAddress: Address | undefined) {
  return useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getPlayerRank',
    args: playerAddress ? [playerAddress] : undefined,
    chainId: base.id,
    query: {
      enabled: !!playerAddress && LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Hook to get player's best score
export function usePlayerBestScore(playerAddress: Address | undefined) {
  return useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'playerBestScore',
    args: playerAddress ? [playerAddress] : undefined,
    chainId: base.id,
    query: {
      enabled: !!playerAddress && LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });
}

// Hook to submit score
export function useSubmitScore() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const submitScore = (score: number, username: string) => {
    if (LEADERBOARD_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('Leaderboard contract not deployed yet');
      return;
    }

    writeContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'submitScore',
      args: [BigInt(score), username],
      chainId: base.id,
    });
  };

  return {
    submitScore,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Format score for display
export function formatScore(score: bigint | number): string {
  return Number(score).toLocaleString();
}

// Truncate address for display
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
