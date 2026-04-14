import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

function buildFluxPrompt(visual_theme: string, template: string, accent_color: string): string {
  const styleMap: Record<string, string> = {
    'karko-navy':  'Deep navy and dark blue tones, rich shadows, warm gold accent lighting, premium luxury feel, moody atmospheric depth',
    'karko-cream': 'Warm cream and champagne tones with rich textural depth, soft golden light rays, subtle marble and silk fabric textures, watercolor washes, organic flowing shapes, warm shadows and highlights, elegant editorial feel with visual richness and dimension',
  };

  return [
    visual_theme,
    styleMap[template] ?? styleMap['karko-navy'],
    'Abstract background texture only.',
    'ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO LOGOS, NO WATERMARKS, NO WRITING OF ANY KIND.',
    'Zero legible characters. Pure abstract visual. No typography.',
    'Professional editorial graphic design aesthetic, high quality, clean.',
  ].join('. ');
}

export async function POST(req: NextRequest) {
  try {
    const { visual_theme, template, accent_color, platform } = await req.json();

    const prompt = buildFluxPrompt(visual_theme, template, accent_color);

    // All platforms use 1:1 square
    const imgWidth = 1024;
    const imgHeight = 1024;

    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT!;
    const url = `${endpoint}/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`;

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
