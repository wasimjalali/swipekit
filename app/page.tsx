'use client';

import { useState, useRef } from 'react';
import { CarouselConfig, Slide, Template, KARKO_BRAND, KARKO_LOGO_LIGHT, KARKO_LOGO_DARK, PLATFORM_DIMS } from '@/lib/types';
import { SlidePreview } from '@/components/SlidePreview';
import { exportCarousel } from '@/lib/export';

type Step = 'input' | 'structuring' | 'generating' | 'done';

const SLIDE_SCALE = 0.28;

function DashboardLogo() {
  const svg = KARKO_LOGO_LIGHT;
  const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
  return <img src={encoded} alt="Karko AI" style={{ width: 160, height: 'auto' }} />;
}

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState<Template>('karko-navy');
  const [platform, setPlatform] = useState<'instagram' | 'linkedin' | 'both'>('instagram');
  const [carousel, setCarousel] = useState<CarouselConfig | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [exportName, setExportName] = useState('');
  const abortRef = useRef(false);

  async function handleGenerate() {
    if (!content.trim()) return;
    setError('');
    setStep('structuring');
    abortRef.current = false;

    try {
      const structRes = await fetch('/api/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          template,
          platform,
          brand_color: template === 'karko-navy' ? KARKO_BRAND.gold : KARKO_BRAND.navy,
        }),
      });

      if (!structRes.ok) {
        const e = await structRes.json();
        throw new Error(e.error ?? 'Failed to structure content');
      }

      const config: CarouselConfig = await structRes.json();
      setCarousel(config);
      setExportName(config.topic || 'carousel');
      setStep('generating');
      setProgress(0);

      const slides = [...config.slides];
      for (let i = 0; i < slides.length; i++) {
        if (abortRef.current) break;

        slides[i] = { ...slides[i], status: 'generating' };
        setCarousel({ ...config, slides: [...slides] });

        try {
          if (i > 0) await new Promise(r => setTimeout(r, 300));

          const bgRes = await fetch('/api/generate-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visual_theme: slides[i].visual_theme,
              template: config.template,
              accent_color: slides[i].accent_color,
              platform: config.platform,
            }),
          });

          if (bgRes.ok) {
            const { url } = await bgRes.json();
            slides[i] = { ...slides[i], background_url: url, status: 'done' };
          } else {
            slides[i] = { ...slides[i], status: 'error' };
          }
        } catch {
          slides[i] = { ...slides[i], status: 'error' };
        }

        setProgress(i + 1);
        setCarousel({ ...config, slides: [...slides] });
      }

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('input');
    }
  }

  async function handleRegenerate(slideId: number) {
    if (!carousel || regenerating !== null) return;
    setRegenerating(slideId);

    const slides = [...carousel.slides];
    const idx = slides.findIndex(s => s.id === slideId);
    if (idx === -1) { setRegenerating(null); return; }

    slides[idx] = { ...slides[idx], status: 'generating', background_url: undefined };
    setCarousel({ ...carousel, slides: [...slides] });

    try {
      const bgRes = await fetch('/api/generate-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visual_theme: slides[idx].visual_theme,
          template: carousel.template,
          accent_color: slides[idx].accent_color,
          platform: carousel.platform,
        }),
      });

      if (bgRes.ok) {
        const { url } = await bgRes.json();
        slides[idx] = { ...slides[idx], background_url: url, status: 'done' };
      } else {
        slides[idx] = { ...slides[idx], status: 'error' };
      }
    } catch {
      slides[idx] = { ...slides[idx], status: 'error' };
    }

    setCarousel({ ...carousel, slides: [...slides] });
    setRegenerating(null);
  }

  async function handleExport() {
    if (!carousel) return;
    setExporting(true);
    try {
      await exportCarousel(exportName || carousel.topic, carousel.platform, carousel.slides.length);
    } finally {
      setExporting(false);
    }
  }

  function handleStartOver() {
    abortRef.current = true;
    setStep('input');
    setCarousel(null);
    setProgress(0);
    setError('');
    setContent('');
    setExportName('');
  }

  return (
    <main style={{ minHeight: '100vh', background: KARKO_BRAND.cream, color: KARKO_BRAND.charcoal }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid rgba(15,27,61,0.08)`,
        padding: '16px 24px',
        background: '#FFFFFF',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DashboardLogo />
            <span style={{
              fontSize: 12,
              color: KARKO_BRAND.warmGray,
              borderLeft: `1px solid rgba(15,27,61,0.12)`,
              paddingLeft: 16,
              fontWeight: 500,
            }}>
              Carousel Generator
            </span>
          </div>
{/* Start Over moved to action bar */}
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* ── Input Step ── */}
        {step === 'input' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: KARKO_BRAND.navy }}>
              Create a Carousel
            </h2>
            <p style={{ color: KARKO_BRAND.warmGray, marginBottom: 32, fontSize: 14 }}>
              Paste your content and we'll turn it into 5 polished slides with Karko AI branding.
            </p>

            {error && (
              <div style={{
                marginBottom: 24, padding: 16,
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 10, color: '#991B1B', fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Content textarea */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: KARKO_BRAND.navy, marginBottom: 8 }}>
                  Your Content
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your article, notes, ideas, or any raw text here. The AI will extract key insights and structure them into 5 carousel slides."
                  rows={8}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid rgba(15,27,61,0.15)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    color: KARKO_BRAND.charcoal,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Theme + Platform row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: KARKO_BRAND.navy, marginBottom: 8 }}>
                    Theme
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* Navy theme card */}
                    <button
                      onClick={() => setTemplate('karko-navy')}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        borderRadius: 10,
                        border: template === 'karko-navy'
                          ? `2px solid ${KARKO_BRAND.gold}`
                          : '2px solid rgba(15,27,61,0.12)',
                        background: template === 'karko-navy' ? KARKO_BRAND.navy : '#FFFFFF',
                        color: template === 'karko-navy' ? '#FFFFFF' : KARKO_BRAND.charcoal,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, margin: '0 auto 8px',
                        background: `linear-gradient(135deg, ${KARKO_BRAND.navy} 50%, ${KARKO_BRAND.gold} 50%)`,
                      }} />
                      Navy
                    </button>

                    {/* Cream theme card */}
                    <button
                      onClick={() => setTemplate('karko-cream')}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        borderRadius: 10,
                        border: template === 'karko-cream'
                          ? `2px solid ${KARKO_BRAND.gold}`
                          : '2px solid rgba(15,27,61,0.12)',
                        background: template === 'karko-cream' ? KARKO_BRAND.cream100 : '#FFFFFF',
                        color: KARKO_BRAND.charcoal,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, margin: '0 auto 8px',
                        background: `linear-gradient(135deg, ${KARKO_BRAND.cream} 50%, ${KARKO_BRAND.navy} 50%)`,
                      }} />
                      Cream
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: KARKO_BRAND.navy, marginBottom: 8 }}>
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as typeof platform)}
                    style={{
                      width: '100%',
                      background: '#FFFFFF',
                      border: '1px solid rgba(15,27,61,0.15)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 14,
                      color: KARKO_BRAND.charcoal,
                      outline: 'none',
                    }}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!content.trim()}
                style={{
                  width: '100%',
                  background: !content.trim()
                    ? 'rgba(15,27,61,0.3)'
                    : `linear-gradient(135deg, ${KARKO_BRAND.gold400}, ${KARKO_BRAND.gold500})`,
                  color: !content.trim() ? 'rgba(255,255,255,0.6)' : KARKO_BRAND.navy,
                  fontWeight: 700,
                  padding: '14px 0',
                  borderRadius: 10,
                  fontSize: 14,
                  border: 'none',
                  cursor: content.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                Generate Carousel
              </button>
            </div>
          </div>
        )}

        {/* ── Structuring Step ── */}
        {step === 'structuring' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 256, gap: 16 }}>
            <div style={{
              width: 36, height: 36,
              border: `3px solid ${KARKO_BRAND.gold}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: KARKO_BRAND.warmGray, fontSize: 14 }}>Structuring your content into 5 slides...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── Generating / Done Steps ── */}
        {(step === 'generating' || step === 'done') && carousel && (
          <div>
            {step === 'generating' && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, color: KARKO_BRAND.charcoal }}>Generating backgrounds...</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 14, color: KARKO_BRAND.warmGray }}>{progress} / {carousel.slides.length}</p>
                    <button
                      onClick={handleStartOver}
                      style={{
                        fontSize: 12,
                        color: KARKO_BRAND.navy600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: `1px solid rgba(15,27,61,0.15)`,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(15,27,61,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${KARKO_BRAND.gold400}, ${KARKO_BRAND.gold})`,
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                    width: `${(progress / carousel.slides.length) * 100}%`,
                  }} />
                </div>
              </div>
            )}

            {step === 'done' && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontWeight: 600, fontSize: 18, color: KARKO_BRAND.navy }}>{carousel.topic}</h2>
                    <p style={{ fontSize: 12, color: KARKO_BRAND.warmGray, marginTop: 4 }}>
                      {carousel.template === 'karko-navy' ? 'Navy' : 'Cream'} theme
                      {' '} {carousel.platform} {' '} {carousel.slides.length} slides
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={handleStartOver}
                    style={{
                      fontSize: 13,
                      color: KARKO_BRAND.navy600,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: `1px solid rgba(15,27,61,0.15)`,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Start Over
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: KARKO_BRAND.warmGray, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Export as:
                    </label>
                    <input
                      type="text"
                      value={exportName}
                      onChange={e => setExportName(e.target.value)}
                      placeholder="e.g. Day 1"
                      style={{
                        flex: 1,
                        maxWidth: 240,
                        background: '#FFFFFF',
                        border: '1px solid rgba(15,27,61,0.15)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 13,
                        color: KARKO_BRAND.charcoal,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: `linear-gradient(135deg, ${KARKO_BRAND.gold400}, ${KARKO_BRAND.gold500})`,
                      color: KARKO_BRAND.navy,
                      fontWeight: 700,
                      padding: '10px 20px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: 'none',
                      cursor: exporting ? 'wait' : 'pointer',
                      opacity: exporting ? 0.6 : 1,
                    }}
                  >
                    {exporting ? 'Exporting...' : 'Export All (ZIP)'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
              {carousel.slides.map(slide => {
                const dims = PLATFORM_DIMS[carousel.platform] || PLATFORM_DIMS.instagram;
                return (
                <div key={slide.id} style={{ flexShrink: 0 }}>
                  <SlidePreview
                    slide={slide}
                    template={carousel.template}
                    platform={carousel.platform}
                    totalSlides={carousel.slides.length}
                    scale={SLIDE_SCALE}
                  />
                  <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: dims.w * SLIDE_SCALE,
                  }}>
                    <span style={{ fontSize: 12, color: KARKO_BRAND.warmGray }}>Slide {slide.id}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {slide.status === 'error' && (
                        <span style={{ fontSize: 12, color: '#DC2626' }}>Error</span>
                      )}
                      {step === 'done' && (
                        <button
                          onClick={() => handleRegenerate(slide.id)}
                          disabled={regenerating !== null}
                          style={{
                            fontSize: 12,
                            color: KARKO_BRAND.navy600,
                            background: 'transparent',
                            border: 'none',
                            cursor: regenerating !== null ? 'not-allowed' : 'pointer',
                            opacity: regenerating !== null ? 0.4 : 1,
                            fontWeight: 500,
                          }}
                        >
                          {regenerating === slide.id ? 'Regenerating...' : 'Regenerate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
