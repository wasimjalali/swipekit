'use client';

import { Slide, Template, KARKO_BRAND, KARKO_LOGO_LIGHT, KARKO_LOGO_DARK, PLATFORM_DIMS } from '@/lib/types';

interface SlidePreviewProps {
  slide: Slide;
  template: Template;
  platform: 'instagram' | 'linkedin' | 'both';
  totalSlides: number;
  scale?: number;
}

const textColor: Record<Template, { primary: string; muted: string; faint: string }> = {
  'karko-navy':  { primary: '#FFFFFF', muted: 'rgba(255,255,255,0.82)', faint: 'rgba(255,255,255,0.45)' },
  'karko-cream': { primary: KARKO_BRAND.navy, muted: KARKO_BRAND.charcoal, faint: 'rgba(15,27,61,0.35)' },
};

const overlayMap: Record<Template, string> = {
  'karko-navy':  `linear-gradient(160deg, rgba(15,27,61,0.82) 0%, rgba(15,27,61,0.55) 100%)`,
  'karko-cream': `linear-gradient(160deg, rgba(250,248,245,0.88) 0%, rgba(250,247,242,0.65) 100%)`,
};

function KarkoLogo({ template }: { template: Template }) {
  const svg = template === 'karko-navy' ? KARKO_LOGO_DARK : KARKO_LOGO_LIGHT;
  const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
  return (
    <img src={encoded} alt="Karko AI" style={{ width: 450, height: 'auto' }} />
  );
}

export function SlidePreview({ slide, template, platform, totalSlides, scale = 1 }: SlidePreviewProps) {
  const colors = textColor[template];
  const accentColor = slide.accent_color || KARKO_BRAND.gold;
  const dims = PLATFORM_DIMS[platform] || PLATFORM_DIMS.instagram;
  const W = dims.w;
  const H = dims.h;
  const isLastSlide = slide.id === totalSlides;
  const isCover = slide.type === 'cover';

  return (
    <div style={{ width: W * scale, height: H * scale, position: 'relative', flexShrink: 0 }}>
      <div
        id={`slide-${slide.id}`}
        style={{
          width: W,
          height: H,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Layer 1: Background image */}
        {slide.background_url ? (
          <img
            src={slide.background_url}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            alt=""
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: template === 'karko-navy' ? KARKO_BRAND.navy : KARKO_BRAND.cream100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: template === 'karko-navy' ? '#555' : '#bbb', fontSize: 28 }}>
              {slide.status === 'generating' ? 'Generating...' : ''}
            </span>
          </div>
        )}

        {/* Layer 2: Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: overlayMap[template] }} />

        {/* Layer 3: Content — simple block layout (html2canvas compatible) */}
        <div style={{
          position: 'absolute', zIndex: 10,
          top: 0, left: 0, right: 0,
          padding: '56px 80px 0 80px',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 48 }}>
            <KarkoLogo template={template} />
          </div>

          <div>
            {/* Eyebrow / category label */}
            {slide.eyebrow && (
              <p style={{
                fontSize: 28, color: accentColor,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontWeight: 700, marginBottom: 20,
              }}>
                {slide.eyebrow}
              </p>
            )}

            {/* Headline */}
            <h1 style={{
              fontSize: isCover ? 104 : 90,
              fontWeight: 800,
              lineHeight: 1.08,
              color: colors.primary,
              marginBottom: 0,
              maxWidth: 880,
            }}>
              {slide.headline}
            </h1>

            {/* Gold divider line between headline and subtext */}
            <div style={{
              width: 56, height: 4, borderRadius: 2,
              background: accentColor,
              margin: '32px 0',
            }} />

            {/* Subtext */}
            <p style={{
              fontSize: 42, lineHeight: 1.45,
              color: colors.muted,
              maxWidth: 840,
              margin: 0,
            }}>
              {slide.subtext}
            </p>

            {/* Body text — supporting lines, closers, cliffhangers */}
            {slide.body && (
              <p style={{
                marginTop: 28, fontSize: 34, lineHeight: 1.5,
                color: accentColor,
                maxWidth: 800,
                fontWeight: 600,
                fontStyle: 'italic',
                whiteSpace: 'pre-line',
              }}>
                {slide.body}
              </p>
            )}

            {/* CTA text — slide 5 only */}
            {slide.cta && (
              <div style={{ marginTop: 40 }}>
                <div style={{
                  display: 'inline-block',
                  background: accentColor,
                  borderRadius: 14,
                  padding: '18px 40px',
                }}>
                  <span style={{
                    fontSize: 38, fontWeight: 700,
                    color: template === 'karko-navy' ? KARKO_BRAND.navy : '#FFFFFF',
                    letterSpacing: '0.02em',
                  }}>
                    {slide.cta}
                  </span>
                </div>
              </div>
            )}

            {/* Swipe hint — below content, on slides 1-4 only */}
            {!isLastSlide && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginTop: 44,
              }}>
                <span style={{
                  fontSize: 24, fontWeight: 700,
                  color: colors.faint,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Swipe
                </span>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m0 0l-5-5m5 5l-5 5"
                    stroke={accentColor} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar area — progress + slide number */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 20, padding: '0 64px 56px',
        }}>
          {/* Progress bars — full-width thin bars like the Sonnet design */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= slide.id
                  ? (i === slide.id ? accentColor : (template === 'karko-navy' ? 'rgba(200,164,78,0.35)' : 'rgba(15,27,61,0.2)'))
                  : (template === 'karko-navy' ? 'rgba(255,255,255,0.12)' : 'rgba(15,27,61,0.08)'),
              }} />
            ))}
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 20, fontWeight: 600,
              color: colors.faint, letterSpacing: '0.05em',
            }}>
              {String(slide.id).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
            </span>
            {!isLastSlide && (
              <span style={{
                fontSize: 18, fontWeight: 500,
                color: colors.faint, letterSpacing: '0.05em',
              }}>
                swipe →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
