import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 60,
        }}
      >
        {/* Left side - Text */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #FFD93D, #FF8C42)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: 20,
            }}
          >
            CRYPTO
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#6ECBFF',
              marginBottom: 30,
            }}
          >
            SHOOTING GAME
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#A66CFF',
              marginBottom: 40,
            }}
          >
            Your tokens become targets!
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#FFFFFF',
              opacity: 0.8,
              lineHeight: 1.5,
            }}
          >
            A 3D shooting game where your wallet tokens and NFTs become enemies.
            Collect power-ups, defeat bosses, trigger Fever Time!
          </div>
        </div>

        {/* Right side - Ship graphic */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Bullets */}
          <div style={{ display: 'flex', gap: 40, marginBottom: -20 }}>
            <div style={{ width: 20, height: 60, background: '#FFD93D', borderRadius: 10 }} />
            <div style={{ width: 20, height: 80, background: '#FF8C42', borderRadius: 10, marginTop: -20 }} />
            <div style={{ width: 20, height: 60, background: '#FFD93D', borderRadius: 10 }} />
          </div>

          {/* Ship */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Left wing */}
            <div style={{ width: 60, height: 120, background: '#54E6CB', borderRadius: 10, marginTop: 40 }} />

            {/* Main body */}
            <div style={{ width: 130, height: 200, background: '#6ECBFF', borderRadius: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 25 }}>
              {/* Cockpit */}
              <div style={{ width: 70, height: 70, background: '#FFD93D', borderRadius: 10 }} />
            </div>

            {/* Right wing */}
            <div style={{ width: 60, height: 120, background: '#54E6CB', borderRadius: 10, marginTop: 40 }} />
          </div>

          {/* Enemy blocks below */}
          <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
            <div style={{ width: 50, height: 50, background: '#FF6B6B', borderRadius: 8, opacity: 0.8 }} />
            <div style={{ width: 60, height: 60, background: '#A66CFF', borderRadius: 8, opacity: 0.8 }} />
            <div style={{ width: 45, height: 45, background: '#FF9FF3', borderRadius: 8, opacity: 0.8 }} />
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
