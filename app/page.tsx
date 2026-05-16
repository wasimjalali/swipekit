'use client';

import { useState, useRef, useEffect } from 'react';
import { CarouselConfig, Slide, Template, PLATFORM_DIMS, MAX_SLIDES, DEFAULT_SLIDES } from '@/lib/types';
import { svgToDataUrl } from '@/lib/brand';
import { brand } from '@/brand.config';
import { SlidePreview } from '@/components/SlidePreview';
import { exportCarousel } from '@/lib/export';

type Step = 'input' | 'structuring' | 'generating' | 'done';

const STORAGE_KEY = 'slideco_session';
// FLUX.2-pro low tier allows 15 RPM, so keep request starts ~4s apart for reliability.
const FLUX_MIN_REQUEST_INTERVAL_MS = 4200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveSession(data: { step: Step; carousel: CarouselConfig | null; content: string; exportName: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage quota exceeded (large base64 images) — try without background images
    try {
      const slim = {
        ...data,
        carousel: data.carousel ? {
          ...data.carousel,
          slides: data.carousel.slides.map(s => ({ ...s, background_url: undefined })),
        } : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // give up silently
    }
  }
}

function loadSession(): { step: Step; carousel: CarouselConfig | null; content: string; exportName: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SLIDE_SCALE: Record<string, number> = {
  instagram: 0.21,  // 1080×1440 → ~227×302 preview
  linkedin:  0.28,  // 1080×1080 → ~302×302 preview
  both:      0.21,  // Preview uses Instagram (tallest)
};

function DashboardLogo() {
  return (
    <img
      src={svgToDataUrl(brand.logo.light)}
      alt={brand.name}
      style={{ width: brand.logoDashboardWidth, height: 'auto' }}
    />
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState<Template>(brand.defaultTheme);
  const [platform, setPlatform] = useState<'instagram' | 'linkedin' | 'both'>('instagram');
  const [slideCount, setSlideCount] = useState(5);
  const [carousel, setCarousel] = useState<CarouselConfig | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [exportName, setExportName] = useState('');
  const abortRef = useRef(false);
  const lastBgRequestStartedAtRef = useRef(0);
  const maxSlides = MAX_SLIDES[platform] || 5;

  const primaryTheme = brand.themes.primary;
  const activeTheme = brand.themes[template];
  const ui = brand.ui;

  async function waitForFluxRequestSlot() {
    const now = Date.now();
    const elapsed = now - lastBgRequestStartedAtRef.current;

    if (lastBgRequestStartedAtRef.current && elapsed < FLUX_MIN_REQUEST_INTERVAL_MS) {
      await sleep(FLUX_MIN_REQUEST_INTERVAL_MS - elapsed);
    }

    lastBgRequestStartedAtRef.current = Date.now();
  }

  async function requestBackgroundImage(slide: Slide, selectedTemplate: Template, selectedPlatform: CarouselConfig['platform']) {
    await waitForFluxRequestSlot();

    const bgRes = await fetch('/api/generate-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visual_theme: slide.visual_theme,
        template: selectedTemplate,
        accent_color: slide.accent_color,
        platform: selectedPlatform,
      }),
    });

    const payload = await bgRes.json().catch(() => null);
    if (!bgRes.ok) {
      throw new Error(payload?.error || `Background generation failed (${bgRes.status})`);
    }

    if (!payload?.url) {
      throw new Error('Background generation returned no image');
    }

    return payload.url as string;
  }

  function handlePlatformChange(newPlatform: typeof platform) {
    setPlatform(newPlatform);
    const newMax = MAX_SLIDES[newPlatform] || 5;
    const newDefault = DEFAULT_SLIDES[newPlatform] || 5;
    // If current count exceeds new max, clamp it; otherwise set to new default
    if (slideCount > newMax) {
      setSlideCount(newMax);
    } else if (slideCount === MAX_SLIDES[platform] || slideCount === DEFAULT_SLIDES[platform]) {
      // User was at the old default/max — switch to new platform's default
      setSlideCount(newDefault);
    }
  }

  // Restore session from localStorage on first load
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    // Only restore if there's meaningful state (carousel or content)
    if (saved.carousel) {
      setCarousel(saved.carousel);
      if (saved.carousel.template) setTemplate(saved.carousel.template);
      if (saved.carousel.platform) setPlatform(saved.carousel.platform as typeof platform);
    }
    if (saved.content) setContent(saved.content);
    if (saved.exportName) setExportName(saved.exportName);
    // Don't restore mid-generation states; treat them as done or input
    const restoredStep = (saved.step === 'generating' || saved.step === 'structuring')
      ? (saved.carousel ? 'done' : 'input')
      : saved.step;
    setStep(restoredStep as Step);
  }, []);

  // Persist session whenever key state changes
  useEffect(() => {
    // Don't persist transient loading states
    if (step === 'structuring') return;
    saveSession({ step, carousel, content, exportName });
  }, [step, carousel, content, exportName]);

  async function handleGenerate() {
    if (!content.trim()) return;
    setError('');
    setStep('structuring');
    abortRef.current = false;
    lastBgRequestStartedAtRef.current = 0;

    try {
      const structRes = await fetch('/api/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          template,
          platform,
          slideCount,
          brand_color: activeTheme.accent,
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
          const url = await requestBackgroundImage(slides[i], config.template, config.platform);
          slides[i] = { ...slides[i], background_url: url, error_message: undefined, status: 'done' };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Background generation failed';
          console.error(`Slide ${slides[i].id} background generation failed`, errorMessage);
          slides[i] = { ...slides[i], error_message: errorMessage, status: 'error' };
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
      const url = await requestBackgroundImage(slides[idx], carousel.template, carousel.platform);
      slides[idx] = { ...slides[idx], background_url: url, error_message: undefined, status: 'done' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Background generation failed';
      console.error(`Slide ${slides[idx].id} background regeneration failed`, errorMessage);
      slides[idx] = { ...slides[idx], error_message: errorMessage, status: 'error' };
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
    setSlideCount(DEFAULT_SLIDES[platform] || 5);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <main style={{ minHeight: '100vh', background: ui.pageBackground, color: ui.text }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${ui.border}`,
        padding: '16px 24px',
        background: ui.headerBackground,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DashboardLogo />
            <span style={{
              fontSize: 12,
              color: ui.textMuted,
              borderLeft: `1px solid ${ui.border}`,
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
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: primaryTheme.background }}>
              Create a Carousel
            </h2>
            <p style={{ color: ui.textMuted, marginBottom: 28, fontSize: 14 }}>
              Paste your content and we'll turn it into polished carousel slides with {brand.name} branding.
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
              {/* Left: Content textarea */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: primaryTheme.background, marginBottom: 8 }}>
                  Your Content
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your article, notes, ideas, or any raw text here. The AI will extract key insights and structure them into carousel slides."
                  rows={14}
                  style={{
                    width: '100%',
                    background: ui.headerBackground,
                    border: `1px solid ${ui.border}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    color: ui.text,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Right: Controls panel */}
              <div style={{
                background: ui.headerBackground,
                border: `1px solid ${ui.border}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}>
                {/* Theme */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: primaryTheme.background, marginBottom: 10 }}>
                    Theme
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['primary', 'secondary'] as Template[]).map(themeKey => {
                      const t = brand.themes[themeKey];
                      const selected = template === themeKey;
                      return (
                        <button
                          key={themeKey}
                          onClick={() => setTemplate(themeKey)}
                          style={{
                            flex: 1,
                            padding: '12px 10px',
                            borderRadius: 10,
                            border: selected
                              ? `2px solid ${primaryTheme.accent}`
                              : `2px solid ${ui.border}`,
                            background: selected ? t.background : ui.inputBackground,
                            color: selected ? t.text : ui.text,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            textAlign: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, margin: '0 auto 8px',
                            background: `linear-gradient(135deg, ${t.background} 50%, ${t.accent} 50%)`,
                          }} />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Platform */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: primaryTheme.background, marginBottom: 10 }}>
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={e => handlePlatformChange(e.target.value as typeof platform)}
                    style={{
                      width: '100%',
                      background: ui.inputBackground,
                      border: `1px solid ${ui.border}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontSize: 14,
                      color: ui.text,
                      outline: 'none',
                    }}
                  >
                    <option value="instagram">Instagram (1080×1440)</option>
                    <option value="linkedin">LinkedIn PDF (1080×1080)</option>
                    <option value="both">Both Platforms</option>
                  </select>
                </div>

                {/* Slide count */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: primaryTheme.background, marginBottom: 10 }}>
                    Number of Slides
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Array.from({ length: maxSlides }, (_, i) => i + 1).map(n => {
                      const selected = slideCount === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setSlideCount(n)}
                          style={{
                            flex: 1,
                            padding: '9px 0',
                            borderRadius: 8,
                            border: selected
                              ? `2px solid ${primaryTheme.accent}`
                              : `2px solid ${ui.border}`,
                            background: selected ? activeTheme.background : ui.inputBackground,
                            color: selected ? activeTheme.text : ui.text,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: ui.textMuted, marginTop: 6 }}>
                    Max {MAX_SLIDES.instagram} for Instagram, {MAX_SLIDES.linkedin} for LinkedIn
                  </p>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!content.trim()}
                  style={{
                    width: '100%',
                    background: !content.trim()
                      ? 'rgba(15,27,61,0.3)'
                      : `linear-gradient(135deg, ${primaryTheme.accent}, ${primaryTheme.accentBright})`,
                    color: !content.trim() ? 'rgba(255,255,255,0.6)' : primaryTheme.ctaText,
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
          </div>
        )}

        {/* ── Structuring Step ── */}
        {step === 'structuring' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 256, gap: 16 }}>
            <div style={{
              width: 36, height: 36,
              border: `3px solid ${primaryTheme.accent}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: ui.textMuted, fontSize: 14 }}>Structuring your content into {slideCount} slide{slideCount !== 1 ? 's' : ''}...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── Generating / Done Steps ── */}
        {(step === 'generating' || step === 'done') && carousel && (
          <div>
            {step === 'generating' && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, color: ui.text }}>Generating backgrounds...</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 14, color: ui.textMuted }}>{progress} / {carousel.slides.length}</p>
                    <button
                      onClick={handleStartOver}
                      style={{
                        fontSize: 12,
                        color: primaryTheme.surface,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: `1px solid ${ui.border}`,
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
                    background: `linear-gradient(90deg, ${primaryTheme.accent}, ${primaryTheme.accentBright})`,
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
                    <h2 style={{ fontWeight: 600, fontSize: 18, color: primaryTheme.background }}>{carousel.topic}</h2>
                    <p style={{ fontSize: 12, color: ui.textMuted, marginTop: 4 }}>
                      {brand.themes[carousel.template]?.label ?? carousel.template} theme
                      {' '} {carousel.platform} {' '} {carousel.slides.length} slides
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={handleStartOver}
                    style={{
                      fontSize: 13,
                      color: primaryTheme.surface,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: `1px solid ${ui.border}`,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Start Over
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: ui.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>
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
                        background: ui.headerBackground,
                        border: `1px solid ${ui.border}`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 13,
                        color: ui.text,
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
                      background: `linear-gradient(135deg, ${primaryTheme.accent}, ${primaryTheme.accentBright})`,
                      color: primaryTheme.ctaText,
                      fontWeight: 700,
                      padding: '10px 20px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: 'none',
                      cursor: exporting ? 'wait' : 'pointer',
                      opacity: exporting ? 0.6 : 1,
                    }}
                  >
                    {exporting
                      ? 'Exporting...'
                      : carousel.platform === 'linkedin'
                        ? 'Export as PDF'
                        : carousel.platform === 'both'
                          ? 'Export Both'
                          : 'Export as Images'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
              {carousel.slides.map(slide => {
                const dims = PLATFORM_DIMS[carousel.platform] || PLATFORM_DIMS.instagram;
                const previewScale = SLIDE_SCALE[carousel.platform] || SLIDE_SCALE.instagram;
                return (
                <div key={slide.id} style={{ flexShrink: 0 }}>
                  <SlidePreview
                    slide={slide}
                    template={carousel.template}
                    platform={carousel.platform}
                    totalSlides={carousel.slides.length}
                    scale={previewScale}
                  />
                  <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: dims.w * previewScale,
                  }}>
                    <span style={{ fontSize: 12, color: ui.textMuted }}>Slide {slide.id}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {slide.status === 'error' && (
                        <span
                          title={slide.error_message || 'Background generation failed'}
                          style={{ fontSize: 12, color: '#DC2626' }}
                        >
                          Error
                        </span>
                      )}
                      {step === 'done' && (
                        <button
                          onClick={() => handleRegenerate(slide.id)}
                          disabled={regenerating !== null}
                          style={{
                            fontSize: 12,
                            color: primaryTheme.surface,
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
