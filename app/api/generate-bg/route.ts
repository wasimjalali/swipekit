import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

function buildFluxPrompt(visual_theme: string, template: string, accent_color: string): string {
  const styleMap: Record<string, string> = {
    'karko-navy':
      'Dominant palette of deep midnight navy and ink-black tones with molten gold accent light bleeding through layered translucent surfaces. ' +
      'Volumetric backlighting casting warm amber god rays through atmospheric haze. ' +
      'Rich dimensional depth with tightly detailed foreground textures dissolving into dark void. ' +
      'Surfaces of brushed metal, dark silk fabric folds, and liquid mercury reflections. ' +
      'Cinematic chiaroscuro lighting, premium editorial luxury aesthetic, painterly impasto micro-detail.',
    'karko-cream':
      'Dominant palette of warm ivory cream and soft champagne tones with golden hour light suffusing through layered translucent mist. ' +
      'Volumetric soft-box lighting with warm subsurface scattering through organic flowing shapes. ' +
      'Rich textural depth from layered watercolor washes, marble veining, and draped silk fabric folds. ' +
      'Foreground detail of intricate organic patterns dissolving into luminous open space. ' +
      'Soft bokeh highlights, iridescent pearl sheen on surfaces, elegant editorial photography aesthetic, ultra-detailed.',
  };

  return [
    visual_theme,
    styleMap[template] ?? styleMap['karko-navy'],
    'Pure abstract visual composition devoid of any figures, symbols, letters, or legible elements.',
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
