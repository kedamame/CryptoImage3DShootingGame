import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import type { WalletAsset } from './game-types';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Alchemy API (free tier available)
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_URL = ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : 'https://base-mainnet.g.alchemy.com/v2/demo';

// Reservoir API for NFTs (free tier available)
const RESERVOIR_API_KEY = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY || '';
const RESERVOIR_BASE_URL = 'https://api-base.reservoir.tools';

// Fallback known tokens (used if API fails)
const KNOWN_TOKENS: { address: `0x${string}`; name: string; symbol: string; decimals: number; logo: string }[] = [
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  {
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    name: 'Coinbase Wrapped Staked ETH',
    symbol: 'cbETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
  {
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    name: 'USD Base Coin',
    symbol: 'USDbC',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/31212/small/USDC.png',
  },
];

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

interface ReservoirNFT {
  token: {
    tokenId: string;
    name: string;
    image: string;
    collection: {
      id: string;
      name: string;
      image: string;
    };
  };
}

// Generate a colorful placeholder image URL based on token symbol
function getPlaceholderImageUrl(symbol: string): string {
  // Use dicebear API for generating unique avatars based on symbol
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(symbol)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

// Check if a known token has a logo
function getKnownTokenLogo(contractAddress: string): string | null {
  const knownToken = KNOWN_TOKENS.find(t => t.address.toLowerCase() === contractAddress.toLowerCase());
  return knownToken?.logo || null;
}

// Fetch all ERC-20 token balances using Alchemy
async function fetchTokensViaAlchemy(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  try {
    // Get all token balances
    const balanceResponse = await fetch(ALCHEMY_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });

    const balanceData = await balanceResponse.json();
    const tokenBalances: AlchemyTokenBalance[] = balanceData.result?.tokenBalances || [];

    console.log(`Alchemy returned ${tokenBalances.length} token balances`);

    // Filter tokens with non-zero balance
    const nonZeroTokens = tokenBalances.filter(
      (token) => token.tokenBalance && token.tokenBalance !== '0x0' && !token.error
    );

    console.log(`${nonZeroTokens.length} tokens have non-zero balance`);

    // Fetch metadata for each token (batch if possible)
    for (const token of nonZeroTokens.slice(0, 50)) { // Limit to 50 tokens
      try {
        const metadataResponse = await fetch(ALCHEMY_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenMetadata',
            params: [token.contractAddress],
          }),
        });

        const metadataData = await metadataResponse.json();
        const metadata: AlchemyTokenMetadata = metadataData.result;

        if (metadata && metadata.name) {
          const balance = BigInt(token.tokenBalance);
          if (balance > 0n) {
            // Try multiple sources for the logo
            let imageUrl = metadata.logo;

            // If no Alchemy logo, check known tokens
            if (!imageUrl) {
              imageUrl = getKnownTokenLogo(token.contractAddress);
            }

            // If still no logo, use placeholder
            if (!imageUrl) {
              imageUrl = getPlaceholderImageUrl(metadata.symbol || metadata.name);
            }

            assets.push({
              id: `token-${token.contractAddress}`,
              type: 'token',
              name: metadata.name,
              symbol: metadata.symbol || 'TOKEN',
              imageUrl,
              balance: formatUnits(balance, metadata.decimals || 18),
              contractAddress: token.contractAddress,
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch metadata for ${token.contractAddress}:`, e);
      }
    }
  } catch (e) {
    console.error('Failed to fetch tokens via Alchemy:', e);
  }

  return assets;
}

// Fetch NFTs using Reservoir API
async function fetchNFTsViaReservoir(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  try {
    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (RESERVOIR_API_KEY) {
      headers['x-api-key'] = RESERVOIR_API_KEY;
    }

    // Fetch user's NFTs
    const response = await fetch(
      `${RESERVOIR_BASE_URL}/users/${address}/tokens/v7?limit=100&includeAttributes=false&includeTopBid=false`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Reservoir API error: ${response.status}`);
    }

    const data = await response.json();
    const tokens: ReservoirNFT[] = data.tokens || [];

    for (const item of tokens) {
      const token = item.token;
      if (token && token.image) {
        // Convert IPFS URLs to HTTP gateway
        let imageUrl = token.image;
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }

        assets.push({
          id: `nft-${token.collection.id}-${token.tokenId}`,
          type: 'nft',
          name: token.name || `${token.collection.name} #${token.tokenId}`,
          symbol: token.collection.name || 'NFT',
          imageUrl,
          contractAddress: token.collection.id,
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch NFTs via Reservoir:', e);
  }

  return assets;
}

// Fetch NFTs using Alchemy NFT API v3 (REST endpoint)
async function fetchNFTsViaAlchemy(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  if (!ALCHEMY_API_KEY) {
    console.log('No Alchemy API key, skipping NFT fetch');
    return assets;
  }

  try {
    // Use Alchemy NFT API v3 REST endpoint
    const nftApiUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;

    const response = await fetch(nftApiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('Alchemy NFT API error:', response.status);
      return assets;
    }

    const data = await response.json();
    const nfts = data.ownedNfts || [];

    console.log(`Alchemy NFT API returned ${nfts.length} NFTs`);

    for (const nft of nfts) {
      // Try multiple image sources
      let imageUrl = nft.image?.cachedUrl ||
                     nft.image?.thumbnailUrl ||
                     nft.image?.pngUrl ||
                     nft.image?.originalUrl ||
                     nft.raw?.metadata?.image ||
                     nft.raw?.metadata?.image_url ||
                     '';

      // Convert IPFS URLs
      if (imageUrl.startsWith('ipfs://')) {
        imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      // Skip data URIs (too large and often broken)
      if (imageUrl.startsWith('data:')) {
        continue;
      }

      if (imageUrl) {
        assets.push({
          id: `nft-${nft.contract.address}-${nft.tokenId}`,
          type: 'nft',
          name: nft.name || nft.title || nft.raw?.metadata?.name || `#${nft.tokenId}`,
          symbol: nft.contract.name || nft.contract.symbol || 'NFT',
          imageUrl,
          contractAddress: nft.contract.address,
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch NFTs via Alchemy:', e);
  }

  return assets;
}

// Fallback: fetch only known tokens directly from blockchain
async function fetchKnownTokens(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  for (const token of KNOWN_TOKENS) {
    try {
      const balance = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      if (balance > 0n) {
        assets.push({
          id: `token-${token.address}`,
          type: 'token',
          name: token.name,
          symbol: token.symbol,
          imageUrl: token.logo,
          balance: formatUnits(balance, token.decimals),
          contractAddress: token.address,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch ${token.symbol} balance:`, e);
    }
  }

  return assets;
}

// Quick fetch: Get NFTs and known tokens fast (for immediate game start)
export async function fetchQuickAssets(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];
  console.log('Quick fetch: Starting...');

  // Add native ETH first (fast)
  try {
    const ethBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    if (ethBalance > 0n) {
      assets.push({
        id: 'eth-native',
        type: 'token',
        name: 'Ethereum',
        symbol: 'ETH',
        imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
        balance: formatUnits(ethBalance, 18),
        contractAddress: '0x0000000000000000000000000000000000000000',
      });
    }
  } catch (e) {
    console.error('Failed to fetch ETH balance:', e);
  }

  // Fetch known tokens in parallel (fast, direct blockchain reads)
  const knownTokens = await fetchKnownTokens(address);
  assets.push(...knownTokens);

  // Fetch NFTs via Alchemy (usually fast with good images)
  const nfts = await fetchNFTsViaAlchemy(address);
  assets.push(...nfts);

  console.log(`Quick fetch complete: ${assets.length} assets (${knownTokens.length} known tokens, ${nfts.length} NFTs)`);

  return filterAndPrioritizeAssets(assets);
}

// Full fetch: Get all tokens via Alchemy API (slower but comprehensive)
export async function fetchAllTokens(address: string): Promise<WalletAsset[]> {
  console.log('Full fetch: Starting token fetch via Alchemy...');
  const tokens = await fetchTokensViaAlchemy(address);
  console.log(`Full fetch complete: ${tokens.length} tokens`);
  return filterAndPrioritizeAssets(tokens);
}

export async function fetchWalletAssets(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  // Add native ETH first
  try {
    const ethBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    if (ethBalance > 0n) {
      assets.push({
        id: 'eth-native',
        type: 'token',
        name: 'Ethereum',
        symbol: 'ETH',
        imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
        balance: formatUnits(ethBalance, 18),
        contractAddress: '0x0000000000000000000000000000000000000000',
      });
    }
  } catch (e) {
    console.error('Failed to fetch ETH balance:', e);
  }

  // Try to fetch all tokens via Alchemy
  let tokens = await fetchTokensViaAlchemy(address);

  // If Alchemy failed, fall back to known tokens
  if (tokens.length === 0) {
    console.log('Alchemy token fetch failed, using fallback known tokens');
    tokens = await fetchKnownTokens(address);
  }

  assets.push(...tokens);

  // Fetch NFTs - try Reservoir first, then Alchemy
  let nfts = await fetchNFTsViaReservoir(address);

  if (nfts.length === 0) {
    console.log('Reservoir NFT fetch failed, trying Alchemy');
    nfts = await fetchNFTsViaAlchemy(address);
  }

  assets.push(...nfts);

  console.log(`Fetched ${assets.length} assets (${tokens.length} tokens, ${nfts.length} NFTs)`);

  return filterAndPrioritizeAssets(assets);
}

// Helper function to filter and prioritize assets by image quality
function filterAndPrioritizeAssets(assets: WalletAsset[]): WalletAsset[] {
  // Prioritize assets with valid images
  // Filter out assets without images or with placeholder/broken image URLs
  const hasValidImage = (asset: WalletAsset): boolean => {
    if (!asset.imageUrl) return false;
    if (asset.imageUrl.trim() === '') return false;
    // Filter out common placeholder or broken image patterns
    if (asset.imageUrl.includes('undefined')) return false;
    if (asset.imageUrl.includes('null')) return false;
    return true;
  };

  // Separate assets: prefer real images (not dicebear) over generated ones
  const hasRealImage = (asset: WalletAsset): boolean => {
    return hasValidImage(asset) && !asset.imageUrl.includes('dicebear');
  };

  const assetsWithRealImages = assets.filter(hasRealImage);
  const assetsWithGeneratedImages = assets.filter((a) => hasValidImage(a) && a.imageUrl.includes('dicebear'));
  const assetsWithoutImages = assets.filter((a) => !hasValidImage(a));

  console.log(`Assets with real images: ${assetsWithRealImages.length}, generated: ${assetsWithGeneratedImages.length}, without: ${assetsWithoutImages.length}`);

  // Prioritize assets with real images, then generated, then without
  const prioritizedAssets = [
    ...assetsWithRealImages,
    ...assetsWithGeneratedImages,
    ...assetsWithoutImages
  ];

  // If we have any assets with real images, use only those (for better visual experience)
  if (assetsWithRealImages.length > 0) {
    return assetsWithRealImages;
  }

  // Otherwise use all assets (generated images will at least show something)
  return prioritizedAssets;
}

// Generate placeholder assets for demo mode
export function generateDemoAssets(): WalletAsset[] {
  const demoAssets: WalletAsset[] = [
    {
      id: 'demo-eth',
      type: 'token',
      name: 'Ethereum',
      symbol: 'ETH',
      imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      balance: '1.5',
      contractAddress: '0x0000000000000000000000000000000000000000',
    },
    {
      id: 'demo-usdc',
      type: 'token',
      name: 'USD Coin',
      symbol: 'USDC',
      imageUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      balance: '1000',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    {
      id: 'demo-weth',
      type: 'token',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      imageUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      balance: '0.5',
      contractAddress: '0x4200000000000000000000000000000000000006',
    },
    {
      id: 'demo-dai',
      type: 'token',
      name: 'Dai',
      symbol: 'DAI',
      imageUrl: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
      balance: '500',
      contractAddress: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    },
    {
      id: 'demo-base',
      type: 'token',
      name: 'Base',
      symbol: 'BASE',
      imageUrl: 'https://assets.coingecko.com/coins/images/32106/small/Base_Logo.png',
      balance: '100',
      contractAddress: '0x0000000000000000000000000000000000000001',
    },
  ];

  return demoAssets;
}
