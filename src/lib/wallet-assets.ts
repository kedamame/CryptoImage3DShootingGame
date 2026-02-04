import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ERC-20 ABI for balanceOf
const erc20Abi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
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
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC-721 ABI
const erc721Abi = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface TokenAsset {
  type: 'token';
  address: string;
  symbol: string;
  balance: string;
  imageUrl: string;
}

export interface NFTAsset {
  type: 'nft';
  address: string;
  tokenId: string;
  name: string;
  imageUrl: string;
}

export type WalletAsset = TokenAsset | NFTAsset;

// Popular tokens on Base with their logos
const POPULAR_TOKENS: { address: `0x${string}`; symbol: string; logo: string; decimals: number }[] = [
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    decimals: 6,
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    logo: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
    decimals: 18,
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    decimals: 18,
  },
  {
    address: '0x532f27101965dd16442e59d40670faf5ebb142e4',
    symbol: 'BRETT',
    logo: 'https://assets.coingecko.com/coins/images/35529/small/1000050750.png',
    decimals: 18,
  },
  {
    address: '0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4',
    symbol: 'TOSHI',
    logo: 'https://assets.coingecko.com/coins/images/31126/small/toshi.png',
    decimals: 18,
  },
];

// Fetch token balances
export async function fetchTokenAssets(address: `0x${string}`): Promise<TokenAsset[]> {
  const assets: TokenAsset[] = [];

  // Get ETH balance
  try {
    const ethBalance = await publicClient.getBalance({ address });
    if (ethBalance > 0n) {
      assets.push({
        type: 'token',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        balance: formatUnits(ethBalance, 18),
        imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      });
    }
  } catch (e) {
    console.error('Failed to fetch ETH balance:', e);
  }

  // Check popular tokens
  for (const token of POPULAR_TOKENS) {
    try {
      const balance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });

      if (balance > 0n) {
        assets.push({
          type: 'token',
          address: token.address,
          symbol: token.symbol,
          balance: formatUnits(balance, token.decimals),
          imageUrl: token.logo,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch ${token.symbol} balance:`, e);
    }
  }

  return assets;
}

// Parse IPFS URL to HTTP URL
function parseIPFSUrl(url: string): string {
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  if (url.startsWith('ar://')) {
    return `https://arweave.net/${url.slice(5)}`;
  }
  return url;
}

// Fetch NFT metadata
async function fetchNFTMetadata(tokenURI: string): Promise<{ name?: string; image?: string }> {
  try {
    const url = parseIPFSUrl(tokenURI);
    const response = await fetch(url);
    const metadata = await response.json();
    return {
      name: metadata.name,
      image: metadata.image ? parseIPFSUrl(metadata.image) : undefined,
    };
  } catch (e) {
    console.error('Failed to fetch NFT metadata:', e);
    return {};
  }
}

// Popular NFT collections on Base
const POPULAR_NFTS: `0x${string}`[] = [
  '0xd4307E0acD12CF46fD6Cf93BC264f5b5500Fcae9', // Base, Pair with Purpose
  '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83', // BASE Day One
  '0x1fc10ef15e041c5d3c54042e52eb0c54cb9b710c', // Base Gods
];

// Fetch NFT assets
export async function fetchNFTAssets(address: `0x${string}`): Promise<NFTAsset[]> {
  const assets: NFTAsset[] = [];

  for (const nftAddress of POPULAR_NFTS) {
    try {
      const balance = await publicClient.readContract({
        address: nftAddress,
        abi: erc721Abi,
        functionName: 'balanceOf',
        args: [address],
      });

      if (balance > 0n) {
        // Get first 3 tokens owned
        const tokensToFetch = Math.min(Number(balance), 3);
        for (let i = 0; i < tokensToFetch; i++) {
          try {
            const tokenId = await publicClient.readContract({
              address: nftAddress,
              abi: erc721Abi,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, BigInt(i)],
            });

            const tokenURI = await publicClient.readContract({
              address: nftAddress,
              abi: erc721Abi,
              functionName: 'tokenURI',
              args: [tokenId],
            });

            const metadata = await fetchNFTMetadata(tokenURI);

            if (metadata.image) {
              assets.push({
                type: 'nft',
                address: nftAddress,
                tokenId: tokenId.toString(),
                name: metadata.name || `NFT #${tokenId}`,
                imageUrl: metadata.image,
              });
            }
          } catch (e) {
            console.error('Failed to fetch token:', e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch NFT balance:', e);
    }
  }

  return assets;
}

// Fetch all wallet assets
export async function fetchWalletAssets(address: `0x${string}`): Promise<WalletAsset[]> {
  const [tokens, nfts] = await Promise.all([
    fetchTokenAssets(address),
    fetchNFTAssets(address),
  ]);

  return [...tokens, ...nfts];
}

// Default enemy images when wallet has no assets
export const DEFAULT_ENEMIES = [
  { imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', name: 'ETH' },
  { imageUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png', name: 'USDC' },
  { imageUrl: 'https://assets.coingecko.com/coins/images/35529/small/1000050750.png', name: 'BRETT' },
  { imageUrl: 'https://assets.coingecko.com/coins/images/31126/small/toshi.png', name: 'TOSHI' },
  { imageUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', name: 'BNB' },
  { imageUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', name: 'SOL' },
];
