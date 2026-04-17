import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

// Retry transient upstream failures instead of permanently failing later slides in a long run.
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_FLUX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 3000;
const SAFETY_REJECTION_PATTERN = /content rejected|violence detection|content filter|safety/i;

function buildFluxPrompt(visual_theme: string, template: string, accent_color: string): string {
  const colorGrade: Record<string, string> = {
    'karko-navy':
      'Color graded in deep midnight navy and dark blue-black tones with warm gold accent lighting. ' +
      'Dark moody atmosphere, cinematic shadows.',
    'karko-cream':
      'Color graded in warm ivory cream and soft champagne tones with golden hour warmth. ' +
      'Light airy atmosphere, soft luminous highlights.',
  };

  return [
    visual_theme,
    colorGrade[template] ?? colorGrade['karko-navy'],
    'Heavily blurred background with shallow depth of field, bokeh, editorial photography.',
    'Calm professional atmosphere only. No violence, no conflict, no weapons, no injury, no blood, no fire, no destruction, no threatening scenes.',
    'No readable text, no words, no letters, no logos, no recognizable faces.',
  ].join(' ');
}

function buildSafetyFallbackPrompt(template: string): string {
  const colorGrade: Record<string, string> = {
    'karko-navy':
      'Color graded in rich midnight navy with refined warm gold highlights, soft contrast, clean premium editorial mood.',
    'karko-cream':
      'Color graded in warm cream and champagne tones with soft navy accents, airy premium editorial mood.',
  };

  return [
    'Calm softly blurred professional workspace, elegant desk surface, subtle laptop silhouette, abstract depth of field, premium editorial photography.',
    colorGrade[template] ?? colorGrade['karko-navy'],
    'Peaceful non-threatening composition with gentle studio lighting and minimal shapes.',
    'No people, no faces, no hands, no vehicles, no roads, no conflict, no danger, no weapons, no injury, no destruction, no fire, no blood.',
    'No readable text, no letters, no logos, no brand names.',
  ].join(' ');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds * 1000));
  }

  const retryDate = Date.parse(value);
  if (Number.isFinite(retryDate)) {
    return Math.max(0, retryDate - Date.now());
  }

  return null;
}

function buildRetryDelayMs(attempt: number, retryAfterHeader: string | null) {
  return parseRetryAfterMs(retryAfterHeader) ?? (BASE_RETRY_DELAY_MS * attempt);
}

function isSafetyRejection(status: number, errorText: string) {
  return status === 400 && SAFETY_REJECTION_PATTERN.test(errorText);
}

function createFallbackBackgroundDataUrl(template: string, isPortrait: boolean) {
  const width = 1024;
  const height = isPortrait ? 1365 : 1024;

  const palette = template === 'karko-cream'
    ? {
        start: '#FAF7F2',
        end: '#F0E8DB',
        glowA: 'rgba(200, 164, 78, 0.22)',
        glowB: 'rgba(15, 27, 61, 0.12)',
        bar: 'rgba(15, 27, 61, 0.08)',
      }
    : {
        start: '#0F1B3D',
        end: '#08122B',
        glowA: 'rgba(212, 168, 83, 0.28)',
        glowB: 'rgba(255, 255, 255, 0.08)',
        bar: 'rgba(255, 255, 255, 0.06)',
      };

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

async function requestFluxImage(url: string, prompt: string, width: number, height: number) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AZURE_FOUNDRY_KEY!}`,
    },
    body: JSON.stringify({
      model: 'FLUX.2-pro',
      prompt,
      width,
      height,
      n: 1,
      prompt_upsampling: true,
      guidance: 3.5,
      steps: 30,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { visual_theme, template, accent_color, platform } = await req.json();

    const prompt = buildFluxPrompt(visual_theme, template, accent_color);

    // Platform-specific image dimensions (FLUX supports these sizes)
    const isPortrait = platform === 'instagram' || platform === 'both';
    const imgWidth = 1024;
    const imgHeight = isPortrait ? 1365 : 1024;  // 3:4 for Instagram, 1:1 for LinkedIn

    // AZURE_FOUNDRY_ENDPOINT should be the base URL (e.g. https://slideco-resource.services.ai.azure.com)
    // The full path is appended here
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT!;
    const url = endpoint.includes('/providers/')
      ? endpoint  // env var already contains full URL
      : `${endpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;

    let response: Response | null = null;
    let errorText = 'Failed to generate background';
    let currentPrompt = prompt;
    let usedSafetyFallbackPrompt = false;
    let sawSafetyRejection = false;

    for (let attempt = 1; attempt <= MAX_FLUX_ATTEMPTS; attempt++) {
      response = await requestFluxImage(url, currentPrompt, imgWidth, imgHeight);

      if (response.ok) break;

      errorText = await response.text();

      console.error('FLUX generation failed', {
        attempt,
        status: response.status,
        error: errorText.slice(0, 500),
      });

      if (isSafetyRejection(response.status, errorText)) {
        sawSafetyRejection = true;

        if (!usedSafetyFallbackPrompt) {
          currentPrompt = buildSafetyFallbackPrompt(template);
          usedSafetyFallbackPrompt = true;
          continue;
        }

        break;
      }

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === MAX_FLUX_ATTEMPTS) {
        break;
      }

      await sleep(buildRetryDelayMs(attempt, response.headers.get('retry-after')));
    }

    if (!response?.ok) {
      if (sawSafetyRejection) {
        return NextResponse.json({
          url: createFallbackBackgroundDataUrl(template, isPortrait),
          warning: 'content_safety_fallback',
          error: errorText || 'Background replaced with a safe fallback after content filtering',
        });
      }

      return NextResponse.json(
        { error: errorText || 'FLUX background generation failed after retries' },
        { status: response?.status ?? 500 },
      );
    }

    const result = await response.json();

    if (!result.data?.[0]?.b64_json) {
      return NextResponse.json({ error: 'Unexpected FLUX response format', result }, { status: 500 });
    }

    const dataUrl = `data:image/png;base64,${result.data[0].b64_json}`;
    return NextResponse.json({ url: dataUrl });
  } catch (err) {
    console.error('Generate BG error:', err);
    return NextResponse.json({ error: 'Failed to generate background' }, { status: 500 });
  }
}
