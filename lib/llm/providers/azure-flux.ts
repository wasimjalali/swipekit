import type { ImageGenerateInput, ImageGenerateResult, ImageProvider } from '../types';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_FLUX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 3000;
const SAFETY_REJECTION_PATTERN = /content rejected|violence detection|content filter|safety/i;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
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

function buildSafetyFallbackPrompt(_template: string | undefined): string {
  // Brand-agnostic neutral retry prompt. The route owns the brand-aware
  // SVG fallback when this retry also fails, so the colour grading here
  // just needs to be safe and generic.
  return [
    'Calm softly blurred professional workspace, elegant desk surface, subtle laptop silhouette, abstract depth of field, premium editorial photography.',
    'Soft neutral colour grading, gentle contrast, clean premium editorial mood.',
    'Peaceful non-threatening composition with gentle studio lighting and minimal shapes.',
    'No people, no faces, no hands, no vehicles, no roads, no conflict, no danger, no weapons, no injury, no destruction, no fire, no blood.',
    'No readable text, no letters, no logos, no brand names.',
  ].join(' ');
}

function createFallbackBackgroundDataUrl(_template: string | undefined, width: number, height: number): string {
  // Neutral charcoal/grey fallback. The API route emits its own brand-aware
  // SVG fallback when safetyFiltered is true, so this only surfaces if a
  // caller uses the provider directly without orchestration.
  const palette = {
    start: '#1F2530',
    end: '#10141C',
    glowA: 'rgba(255, 255, 255, 0.10)',
    glowB: 'rgba(255, 255, 255, 0.06)',
    bar: 'rgba(255, 255, 255, 0.05)',
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

async function requestFluxImage(url: string, key: string, prompt: string, width: number, height: number) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
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

export class AzureFluxProvider implements ImageProvider {
  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const key = requireEnv('AZURE_FOUNDRY_KEY');
    const endpoint = requireEnv('AZURE_FOUNDRY_ENDPOINT');

    const url = endpoint.includes('/providers/')
      ? endpoint
      : `${endpoint.replace(/\/$/, '')}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;

    let response: Response | null = null;
    let errorText = 'Failed to generate background';
    let currentPrompt = input.prompt;
    let usedSafetyFallbackPrompt = false;
    let sawSafetyRejection = false;

    for (let attempt = 1; attempt <= MAX_FLUX_ATTEMPTS; attempt++) {
      response = await requestFluxImage(url, key, currentPrompt, input.width, input.height);

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
          currentPrompt = buildSafetyFallbackPrompt(input.template);
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
        return {
          dataUrl: createFallbackBackgroundDataUrl(input.template, input.width, input.height),
          safetyFiltered: true,
        };
      }
      throw new Error(errorText || 'FLUX background generation failed after retries');
    }

    const result = (await response.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('Unexpected FLUX response format');
    }

    return {
      dataUrl: `data:image/png;base64,${b64}`,
      safetyFiltered: false,
    };
  }
}
