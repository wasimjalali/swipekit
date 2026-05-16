import { NextRequest, NextResponse } from 'next/server';
import { brand } from '@/brand.config';
import type { ThemeKey } from '@/lib/brand';
import { getImageProvider } from '@/lib/llm';

export const maxDuration = 120;

function resolveTheme(template: string) {
  const key = (template === 'primary' || template === 'secondary') ? template as ThemeKey : 'primary';
  return brand.themes[key];
}

function buildFluxPrompt(visual_theme: string, template: string): string {
  const theme = resolveTheme(template);

  return [
    visual_theme,
    theme.fluxColorGrade,
    'Heavily blurred background with shallow depth of field, bokeh, editorial photography.',
    'Calm professional atmosphere only. No violence, no conflict, no weapons, no injury, no blood, no fire, no destruction, no threatening scenes.',
    'No readable text, no words, no letters, no logos, no recognizable faces.',
  ].join(' ');
}

function createFallbackBackgroundDataUrl(template: string, isPortrait: boolean) {
  const width = 1024;
  const height = isPortrait ? 1365 : 1024;
  const theme = resolveTheme(template);
  const palette = theme.fallbackPalette;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <filter id="blur-xl" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="72" />
        </filter>
        <filter id="blur-md" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="36" />
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <ellipse cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.26)}" rx="${Math.round(width * 0.18)}" ry="${Math.round(height * 0.1)}" fill="${palette.glowA}" filter="url(#blur-xl)" />
      <ellipse cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.74)}" rx="${Math.round(width * 0.16)}" ry="${Math.round(height * 0.09)}" fill="${palette.glowB}" filter="url(#blur-xl)" />
      <rect x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.58)}" width="${Math.round(width * 0.84)}" height="${Math.round(height * 0.035)}" rx="${Math.round(height * 0.017)}" fill="${palette.bar}" filter="url(#blur-md)" />
      <rect x="${Math.round(width * 0.22)}" y="${Math.round(height * 0.42)}" width="${Math.round(width * 0.36)}" height="${Math.round(height * 0.22)}" rx="28" fill="${palette.bar}" filter="url(#blur-md)" transform="rotate(-4 ${Math.round(width * 0.4)} ${Math.round(height * 0.53)})" />
      <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.3)}" r="${Math.round(width * 0.045)}" fill="${palette.glowA}" filter="url(#blur-md)" />
      <circle cx="${Math.round(width * 0.28)}" cy="${Math.round(height * 0.78)}" r="${Math.round(width * 0.05)}" fill="${palette.glowB}" filter="url(#blur-md)" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { visual_theme, template, platform } = await req.json();

    const prompt = buildFluxPrompt(visual_theme, template);
    const isPortrait = platform === 'instagram' || platform === 'both';
    const imgWidth = 1024;
    const imgHeight = isPortrait ? 1365 : 1024;

    const provider = getImageProvider();
    const result = await provider.generate({
      prompt,
      width: imgWidth,
      height: imgHeight,
      template,
    });

    // If the upstream model safety-filtered the prompt, return our own brand-aware
    // SVG fallback rather than the provider's generic one.
    if (result.safetyFiltered) {
      return NextResponse.json({
        url: createFallbackBackgroundDataUrl(template, isPortrait),
        warning: 'content_safety_fallback',
      });
    }

    return NextResponse.json({ url: result.dataUrl });
  } catch (err) {
    console.error('Generate BG error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate background';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
