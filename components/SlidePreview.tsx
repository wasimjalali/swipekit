'use client';

import { Slide, Template, KARKO_BRAND, KARKO_LOGO_LIGHT, KARKO_LOGO_DARK, PLATFORM_DIMS, SAFE_ZONES } from '@/lib/types';

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
  const sz = SAFE_ZONES[platform] || SAFE_ZONES.instagram;
  const W = dims.w;
  const H = dims.h;
  const isLastSlide = slide.id === totalSlides;
  const isCover = slide.type === 'cover';
  const contentWidth = W - sz.left - sz.right;

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

        {/* Layer 3a: Logo — pinned at top */}
        <div style={{
          position: 'absolute', zIndex: 10,
          top: sz.top + 6, left: sz.left,
        }}>
          <KarkoLogo template={template} />
        </div>

        {/* Layer 3b: Content — flex centering for preview; export.ts computes padding for html2canvas */}
        <div
          data-content-box={`slide-${slide.id}`}
          style={{
            position: 'absolute', zIndex: 10,
            top: sz.top + 120, left: sz.left, right: sz.right, bottom: sz.bottom + 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: contentWidth,
          }}
        >
          <div data-content-inner={`slide-${slide.id}`}>
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

            {/* Subtext */}
            <p style={{
              fontSize: 42, lineHeight: 1.45,
              color: colors.muted,
              maxWidth: 840,
              margin: 0,
              marginTop: 28,
            }}>
              {slide.subtext}
            </p>

            {/* Body text — supporting lines, closers, cliffhangers (hidden on CTA slide when button is shown) */}
            {slide.body && !slide.cta && (
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

          </div>
        </div>

        {/* Bottom bar area — progress + slide number (Instagram only; LinkedIn PDFs use page-turn) */}
        {platform !== 'linkedin' && <div
          data-bottom-bar={`slide-${slide.id}`}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            zIndex: 20, padding: `0 ${sz.left}px ${Math.min(sz.bottom, 56)}px`,
          }}>
          {/* Progress bars — inline-block for html2canvas compatibility */}
          <div style={{ marginBottom: 20, whiteSpace: 'nowrap' }}>
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map(i => (
              <div key={i} style={{
                display: 'inline-block',
                width: `calc(${100 / totalSlides}% - 6px)`,
                marginRight: i < totalSlides ? 6 : 0,
                height: 3, borderRadius: 2,
                background: i <= slide.id
                  ? (i === slide.id ? accentColor : (template === 'karko-navy' ? 'rgba(200,164,78,0.35)' : 'rgba(15,27,61,0.2)'))
                  : (template === 'karko-navy' ? 'rgba(255,255,255,0.12)' : 'rgba(15,27,61,0.08)'),
              }} />
            ))}
          </div>

          {/* Footer row */}
          <div style={{ position: 'relative' }}>
            <span style={{
              fontSize: 22, fontWeight: 600,
              color: colors.faint, letterSpacing: '0.05em',
            }}>
              {String(slide.id).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
            </span>
            {!isLastSlide && (
              <span style={{
                position: 'absolute', right: 0, top: -2,
                fontSize: 26, fontWeight: 700,
                color: accentColor,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Swipe →
              </span>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
