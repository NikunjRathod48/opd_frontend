import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: '#175CD3', // MedCore Primary Blue
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '8px', // ~25% radius for soft look
                }}
            >
                {/* CSS-based Cross for perfect centering/rendering without SVG complexity */}
                <div style={{
                    position: 'absolute',
                    width: '18px',
                    height: '4px',
                    background: 'white',
                    borderRadius: '2px'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '4px',
                    height: '18px',
                    background: 'white',
                    borderRadius: '2px'
                }} />
            </div>
        ),
        {
            ...size,
        }
    )
}
