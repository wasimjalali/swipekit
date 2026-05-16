import { NextRequest, NextResponse } from 'next/server';
import { brand } from '@/brand.config';
import { THEME_KEYS } from '@/lib/types';
import {
  buildStructureSystemPrompt,
  buildStructureUserPrompt,
} from '@/lib/prompts/structure';
import { getTextProvider } from '@/lib/llm';

const SYSTEM_PROMPT = buildStructureSystemPrompt(brand);

function buildCarouselSchema(slideCount: number) {
  return {
    type: 'object' as const,
    properties: {
      topic: { type: 'string' as const },
      template: { type: 'string' as const, enum: THEME_KEYS as unknown as string[] },
      brand_color: { type: 'string' as const },
      platform: { type: 'string' as const, enum: ['instagram', 'linkedin', 'both'] },
      slides: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'number' as const },
            type: { type: 'string' as const, enum: ['cover', 'point', 'quote', 'stat', 'cta'] },
            headline: { type: 'string' as const },
            subtext: { type: 'string' as const },
            body: { type: 'string' as const },
            eyebrow: { type: 'string' as const },
            cta: { type: 'string' as const },
            visual_theme: { type: 'string' as const },
            accent_color: { type: 'string' as const },
            status: { type: 'string' as const, enum: ['pending'] },
          },
          required: ['id', 'type', 'headline', 'subtext', 'body', 'eyebrow', 'cta', 'visual_theme', 'accent_color', 'status'] as const,
          additionalProperties: false,
        },
        minItems: slideCount,
        maxItems: slideCount,
      },
    },
    required: ['topic', 'template', 'brand_color', 'platform', 'slides'] as const,
    additionalProperties: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { content, template, platform, brand_color, slideCount: rawCount } = await req.json();
    const slideCount = Math.max(1, Math.min(8, Number(rawCount) || 5));

    const provider = getTextProvider();
    const result = await provider.structure({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildStructureUserPrompt({
        content,
        template,
        platform,
        slideCount,
        brand_color,
        brand,
      }),
      jsonSchema: buildCarouselSchema(slideCount),
      schemaName: 'carousel_config',
      maxTokens: 4000,
      temperature: 0.3,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Structure API error:', err);
    const message = err instanceof Error ? err.message : 'Failed to structure content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
