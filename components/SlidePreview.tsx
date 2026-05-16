'use client';

import { Slide, Template, PLATFORM_DIMS, SAFE_ZONES } from '@/lib/types';
import { svgToDataUrl } from '@/lib/brand';
import { brand } from '@/brand.config';

interface SlidePreviewProps {
  slide: Slide;
  template: Template;
  platform: 'instagram' | 'linkedin' | 'both';
  totalSlides: number;
  scale?: number;
}

function BrandLogo({ template }: { template: Template }) {
  const theme = brand.themes[template];
  // Dark themes get the light logo (light text on dark); light themes get the dark logo.
  const isDark = theme.text === '#FFFFFF' || theme.text.toLowerCase() === '#ffffff';
  const svg = isDark ? brand.logo.light : brand.logo.dark;
  return (
    <img src={svgToDataUrl(svg)} alt={`${brand.name} logo`} style={{ width: brand.logoSlideWidth, height: 'auto' }} />
  );
}

export function SlidePreview({ slide, template, platform, totalSlides, scale = 1 }: SlidePreviewProps) {
  const theme = brand.themes[template];
  const accentColor = slide.accent_color || theme.accent;
  const ctaFillColor = theme.ctaFill;
  const dims = PLATFORM_DIMS[platform] || PLATFORM_DIMS.instagram;
  const sz = SAFE_ZONES[platform] || SAFE_ZONES.instagram;
  const W = dims.w;
  const H = dims.h;
  const isLastSlide = slide.id === totalSlides;
  const isCover = slide.type === 'cover';
  const isIg = platform !== 'linkedin';
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
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
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
            background: theme.background,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: theme.textFaint, fontSize: 28 }}>
              {slide.status === 'generating' ? 'Generating...' : ''}
            </span>
          </div>
        )}

        {/* Layer 2: Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: theme.overlay }} />

        {/* Layer 3a: Logo — pinned at top */}
        <div style={{
          position: 'absolute', zIndex: 10,
          top: sz.top + 6, left: sz.left,
        }}>
          <BrandLogo template={template} />
        </div>

        {/* Layer 3b: Content — use the same absolute centering in preview and export */}
        <div
          data-content-box={`slide-${slide.id}`}
          style={{
            position: 'absolute', zIndex: 10,
            top: sz.top + 120, left: sz.left, right: sz.right, bottom: sz.bottom + 50,
            width: contentWidth,
            overflow: 'hidden',
          }}
        >
          <div
            data-content-inner={`slide-${slide.id}`}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              transform: 'translateY(-50%)',
            }}
          >
            {/* Eyebrow / category label */}
            {slide.eyebrow && (
              <p style={{
                margin: 0,
                marginBottom: isIg ? 28 : 20,
                fontSize: 28, color: accentColor,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontWeight: 700,
              }}>
                {slide.eyebrow}
              </p>
            )}

            {/* Headline */}
            <h1 style={{
              margin: 0,
              fontSize: isCover ? (isIg ? 112 : 104) : (isIg ? 96 : 90),
              fontWeight: 800,
              lineHeight: 1.08,
              color: theme.text,
              maxWidth: 880,
            }}>
              {slide.headline}
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: isIg ? 44 : 42, lineHeight: 1.45,
              color: theme.textMuted,
              maxWidth: 840,
              margin: 0,
              marginTop: isIg ? 52 : 40,
            }}>
              {slide.subtext}
            </p>

            {/* Body text — supporting lines, closers, cliffhangers (hidden on CTA slide when button is shown) */}
            {slide.body && !slide.cta && (
              <p style={{
                margin: 0,
                marginTop: isIg ? 48 : 36, fontSize: 34, lineHeight: 1.5,
                color: accentColor,
                maxWidth: 800,
                fontWeight: 600,
                fontStyle: 'italic',
                whiteSpace: 'pre-line',
              }}>
                {slide.body}
              </p>
            )}

            {/* CTA — last slide only, each line rendered separately */}
            {slide.cta && (
              <div style={{ marginTop: isIg ? 72 : 56, display: 'flex', flexDirection: 'column', gap: isIg ? 24 : 20 }}>
                {slide.cta.split('\n').filter(Boolean).map((line, idx) => (
                  <div key={idx} data-cta-pill={`slide-${slide.id}-cta-${idx}`} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    background: ctaFillColor,
                    borderRadius: 14,
                    padding: '14px 36px',
                    minHeight: 62,
                  }}>
                    <span data-cta-label style={{
                      display: 'block',
                      lineHeight: 1.2,
                      fontSize: 34, fontWeight: 700,
                      color: theme.ctaText,
                      letterSpacing: '0.02em',
                    }}>
                      {line.trim()}
                    </span>
                  </div>
                ))}
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
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map(i => {
              const isDarkTheme = theme.text === '#FFFFFF' || theme.text.toLowerCase() === '#ffffff';
              const completed = isDarkTheme ? 'rgba(200,164,78,0.35)' : 'rgba(15,27,61,0.2)';
              const upcoming = isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(15,27,61,0.08)';
              return (
                <div key={i} style={{
                  display: 'inline-block',
                  width: `calc(${100 / totalSlides}% - 6px)`,
                  marginRight: i < totalSlides ? 6 : 0,
                  height: 3, borderRadius: 2,
                  background: i <= slide.id
                    ? (i === slide.id ? accentColor : completed)
                    : upcoming,
                }} />
              );
            })}
          </div>

          {/* Footer row */}
          <div style={{ position: 'relative' }}>
            <span style={{
              fontSize: 22, fontWeight: 600,
              color: theme.textFaint, letterSpacing: '0.05em',
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
