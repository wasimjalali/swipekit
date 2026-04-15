import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  try {
    const { visual_theme, template, accent_color, platform } = await req.json();

    const prompt = buildFluxPrompt(visual_theme, template, accent_color);

    // All platforms use 1:1 square
    const imgWidth = 1024;
    const imgHeight = 1024;

    // AZURE_FOUNDRY_ENDPOINT should be the base URL (e.g. https://slideco-resource.services.ai.azure.com)
    // The full path is appended here
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT!;
    const url = endpoint.includes('/providers/')
      ? endpoint  // env var already contains full URL
      : `${endpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;

    const response = await fetch(url, {
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

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
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
