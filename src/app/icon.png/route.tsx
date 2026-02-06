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
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        {/* Ship */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Bullets */}
          <div style={{ display: 'flex', gap: 20, marginBottom: -10 }}>
            <div style={{ width: 8, height: 24, background: '#FFD93D', borderRadius: 4 }} />
            <div style={{ width: 8, height: 30, background: '#FF8C42', borderRadius: 4, marginTop: -6 }} />
            <div style={{ width: 8, height: 24, background: '#FFD93D', borderRadius: 4 }} />
          </div>

          {/* Ship body with wings */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Left wing */}
            <div style={{ width: 25, height: 50, background: '#54E6CB', borderRadius: 4, marginTop: 20 }} />

            {/* Main body */}
            <div style={{ width: 50, height: 80, background: '#6ECBFF', borderRadius: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10 }}>
              {/* Cockpit */}
              <div style={{ width: 30, height: 30, background: '#FFD93D', borderRadius: 4 }} />
            </div>

            {/* Right wing */}
            <div style={{ width: 25, height: 50, background: '#54E6CB', borderRadius: 4, marginTop: 20 }} />
          </div>
        </div>
      </div>
    ),
    { width: 200, height: 200 }
  );
}
