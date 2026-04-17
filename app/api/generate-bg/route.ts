import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

// Retry transient upstream failures instead of permanently failing later slides in a long run.
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_FLUX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 3000;

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
    'No readable text, no words, no letters, no logos, no recognizable faces.',
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

    for (let attempt = 1; attempt <= MAX_FLUX_ATTEMPTS; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AZURE_FOUNDRY_KEY!}`,
        },
        body: JSON.stringify({
          model: 'FLUX.2-pro',
          prompt,
          width: imgWidth,
          height: imgHeight,
          n: 1,
          prompt_upsampling: true,
          guidance: 3.5,
          steps: 30,
        }),
      });

      if (response.ok) break;

      errorText = await response.text();

      console.error('FLUX generation failed', {
        attempt,
        status: response.status,
        error: errorText.slice(0, 500),
      });

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === MAX_FLUX_ATTEMPTS) {
        break;
      }

      await sleep(buildRetryDelayMs(attempt, response.headers.get('retry-after')));
    }

    if (!response?.ok) {
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
