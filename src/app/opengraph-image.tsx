import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Crypto Shooting Game - Farcaster Mini App';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        {/* Ship graphic above title */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 20 }}>
          {/* Left wing */}
          <div style={{ width: 35, height: 70, background: '#54E6CB', borderRadius: 8, marginTop: 25 }} />
          {/* Main body */}
          <div style={{ width: 80, height: 120, background: '#6ECBFF', borderRadius: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 18 }}>
            <div style={{ width: 45, height: 45, background: '#FFD93D', borderRadius: 8 }} />
          </div>
          {/* Right wing */}
          <div style={{ width: 35, height: 70, background: '#54E6CB', borderRadius: 8, marginTop: 25 }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #FFD93D, #FF8C42)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
          }}
        >
          CRYPTO
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: '#6ECBFF',
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          SHOOTING GAME
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#A66CFF',
            marginBottom: 24,
          }}
        >
          Your tokens become targets!
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: '#FFFFFF',
            opacity: 0.7,
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          A shooting game where your wallet tokens and NFTs become enemies
        </div>

        {/* Enemy blocks at bottom */}
        <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
          <div style={{ width: 40, height: 40, background: '#FF6B6B', borderRadius: 6, opacity: 0.8 }} />
          <div style={{ width: 48, height: 48, background: '#A66CFF', borderRadius: 6, opacity: 0.8 }} />
          <div style={{ width: 36, height: 36, background: '#FF9FF3', borderRadius: 6, opacity: 0.8 }} />
          <div style={{ width: 44, height: 44, background: '#54E6CB', borderRadius: 6, opacity: 0.8 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
