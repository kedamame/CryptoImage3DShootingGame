import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export interface TokenAsset {
  type: 'token';
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  imageUrl: string | null;
}

export interface NFTAsset {
  type: 'nft';
  contractAddress: string;
  tokenId: string;
  name: string;
  imageUrl: string | null;
  collectionName: string;
}

export type WalletAsset = TokenAsset | NFTAsset;

// Popular Base tokens with their logos
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number; logo: string }> = {
  '0x4200000000000000000000000000000000000006': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22': {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
  '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA': {
    symbol: 'USDbC',
    name: 'USD Base Coin',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/31164/small/baseusdc.png',
  },
};

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Generate a placeholder image URL with token symbol
function generatePlaceholderImage(symbol: string, color: string = '#4ECDC4'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${color}" rx="50"/>
    <text x="50" y="55" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${symbol.slice(0, 3).toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Fetch ETH balance
export async function getEthBalance(address: Address): Promise<TokenAsset | null> {
  try {
    const balance = await publicClient.getBalance({ address });
    if (balance === 0n) return null;

    return {
      type: 'token',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: formatUnits(balance, 18),
      decimals: 18,
      imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    };
  } catch (error) {
    console.error('Failed to fetch ETH balance:', error);
    return null;
  }
}

// Fetch ERC20 token balances for known tokens
export async function getTokenBalances(address: Address): Promise<TokenAsset[]> {
  const tokens: TokenAsset[] = [];

  for (const [tokenAddress, tokenInfo] of Object.entries(KNOWN_TOKENS)) {
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (balance > 0n) {
        tokens.push({
          type: 'token',
          address: tokenAddress,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          balance: formatUnits(balance, tokenInfo.decimals),
          decimals: tokenInfo.decimals,
          imageUrl: tokenInfo.logo,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch balance for ${tokenInfo.symbol}:`, error);
    }
  }

  return tokens;
}

// Fetch NFTs using Reservoir API (free tier)
export async function getNFTs(address: Address): Promise<NFTAsset[]> {
  try {
    // Using Reservoir API - free tier available
    const response = await fetch(
      `https://api-base.reservoir.tools/users/${address}/tokens/v7?limit=50`,
      {
        headers: {
          'x-api-key': 'demo-api-key', // Free demo key for development
        },
      }
    );

    if (!response.ok) {
      console.error('Reservoir API error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.tokens || []).map((item: { token: { contract: string; tokenId: string; name?: string; image?: string; collection?: { name?: string } } }) => ({
      type: 'nft' as const,
      contractAddress: item.token.contract,
      tokenId: item.token.tokenId,
      name: item.token.name || `NFT #${item.token.tokenId}`,
      imageUrl: item.token.image || generatePlaceholderImage('NFT', '#A855F7'),
      collectionName: item.token.collection?.name || 'Unknown Collection',
    }));
  } catch (error) {
    console.error('Failed to fetch NFTs:', error);
    return [];
  }
}

// Get all wallet assets
export async function getAllWalletAssets(address: Address): Promise<WalletAsset[]> {
  const [ethBalance, tokens, nfts] = await Promise.all([
    getEthBalance(address),
    getTokenBalances(address),
    getNFTs(address),
  ]);

  const assets: WalletAsset[] = [];

  if (ethBalance) {
    assets.push(ethBalance);
  }

  assets.push(...tokens);
  assets.push(...nfts);

  return assets;
}

// Generate fallback enemy images when wallet has no assets
export function generateFallbackEnemies(): WalletAsset[] {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#3B82F6', '#22C55E', '#F97316', '#EC4899'];
  const symbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'PEPE', 'APE', 'UNI'];

  return symbols.map((symbol, index) => ({
    type: 'token' as const,
    address: `0x${index.toString().padStart(40, '0')}`,
    symbol,
    name: `${symbol} Token`,
    balance: '0',
    decimals: 18,
    imageUrl: generatePlaceholderImage(symbol, colors[index % colors.length]),
  }));
}
