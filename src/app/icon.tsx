import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 200, height: 200 };

export default function Icon() {
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {/* Bullets */}
          <div style={{ display: 'flex', gap: 20, marginBottom: -10 }}>
            <div style={{ width: 8, height: 24, background: '#FFD93D', borderRadius: 4 }} />
            <div style={{ width: 8, height: 30, background: '#FF8C42', borderRadius: 4, marginTop: -6 }} />
            <div style={{ width: 8, height: 24, background: '#FFD93D', borderRadius: 4 }} />
          </div>

          {/* Ship body with wings */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {/* Left wing */}
            <div style={{ width: 25, height: 50, background: '#54E6CB', borderRadius: 4, marginTop: 20 }} />

            {/* Main body */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 50, height: 80, background: '#6ECBFF', borderRadius: 8 }}>
                {/* Cockpit */}
                <div style={{ width: 30, height: 30, background: '#FFD93D', borderRadius: 4, margin: '10px auto' }} />
              </div>
            </div>

            {/* Right wing */}
            <div style={{ width: 25, height: 50, background: '#54E6CB', borderRadius: 4, marginTop: 20 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
