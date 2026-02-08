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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ship only - no text */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Bullets */}
          <div style={{ display: 'flex', gap: 30, marginBottom: -15 }}>
            <div style={{ width: 12, height: 35, background: '#FFD93D', borderRadius: 6 }} />
            <div style={{ width: 12, height: 45, background: '#FF8C42', borderRadius: 6, marginTop: -10 }} />
            <div style={{ width: 12, height: 35, background: '#FFD93D', borderRadius: 6 }} />
          </div>

          {/* Ship body with wings */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Left wing */}
            <div style={{ width: 40, height: 70, background: '#54E6CB', borderRadius: 6, marginTop: 25 }} />

            {/* Main body */}
            <div style={{ width: 80, height: 120, background: '#6ECBFF', borderRadius: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 15 }}>
              {/* Cockpit */}
              <div style={{ width: 45, height: 45, background: '#FFD93D', borderRadius: 6 }} />
            </div>

            {/* Right wing */}
            <div style={{ width: 40, height: 70, background: '#54E6CB', borderRadius: 6, marginTop: 25 }} />
          </div>
        </div>
      </div>
    ),
    { width: 200, height: 200 }
  );
}
