import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Karko AI's carousel layout engine.

YOUR #1 RULE: PRESERVE THE USER'S EXACT TEXT.
You are a LAYOUT MAPPER, not a copywriter. Your job is to take the user's pre-written
script and map it faithfully into the JSON schema — preserving every word, sentence,
and number exactly as written. DO NOT:
- Rewrite, shorten, paraphrase, or "improve" any text
- Drop lines, merge sentences, or summarize
- Add exclamation marks, change capitalization, or add words
- Invent new headlines or CTAs that aren't in the original script

If the user writes "97% of résumés are rejected before a human ever sees them."
you output EXACTLY that — not "97% of résumés are rejected!" or "97% Rejected!"

TEXT STRIPPING — CRITICAL:
Before mapping any text, STRIP these structural labels. They are NOT content:
- "Slide 1", "Slide 2", "Slide 3", etc. — any line starting with "Slide" + number
- "Title:", "Subtitle:", "Headline:", "Subhead:", "Body:", "CTA:", "Closer:",
  "Cliffhanger:", "Trust line:", "Link line:", "Button text:", "Supporting line:"
  — remove the label prefix, keep only the text after the colon
- "— The Hook", "— The Problem" etc. after slide numbers — use as eyebrow, not content

Examples of what to strip:
  Input: "Slide 1\nTitle:\n97% of résumés are rejected..."
  → headline: "97% of résumés are rejected..."  (NOT "Title:" or "Slide 1")

  Input: "Slide 2\nSubtitle:\nIt's not what you think."
  → This subtitle text becomes content, the word "Subtitle:" is stripped

FIELD MAPPING RULES:
The user's script is divided into slides (separated by "Slide X" markers or blank lines).
Within each slide, the text lines map as follows:

- "headline" → the FIRST content line (after stripping labels). VERBATIM. Big text.
- "subtext" → the SECOND content line. VERBATIM. Medium supporting text.
- "body" → ALL remaining content lines (3rd, 4th, etc). Join with newlines. VERBATIM.
  These are closers, cliffhangers, trust lines, bullets, link lines.
  If no remaining lines, use empty string "".
- "eyebrow" → if user wrote a section title (e.g. "— The Hook" after slide number),
  use just that title text. Otherwise use empty string "".
- "cta" → ONLY for the LAST slide. Use the user's exact CTA/link/button text VERBATIM.
  If user has multiple CTA-like lines, combine with newlines.
  Use empty string "" for ALL non-last slides.
  CRITICAL: On the last slide, set "body" to "" (empty string). ALL CTA/link/action text
  goes in the "cta" field ONLY. The body field must be empty on the CTA slide because
  the UI renders the CTA as a button — any text in "body" would be duplicated.

NEVER output any of these as visible slide text:
- "Slide 1", "Slide 2", etc.
- "Title:", "Subtitle:", "Headline:", "Body:", etc.
- Any numbering like "1.", "2." that the user used for slide structure

SLIDE COUNT:
- The user will specify how many slides they want (between 1 and 8).
- Output EXACTLY that many slides — no more, no fewer.
- If the user's content has more sections than requested slides, combine or prioritize.
- If the user's content has fewer sections, split existing content across slides.
- The LAST slide should always be the CTA slide (type "cta") if the user provides CTA text.

VISUAL THEME DIRECTION:
Each slide needs a "visual_theme" for AI background generation via FLUX image model.
Write 40-60 words of flowing natural language (NOT comma-separated tags).

YOUR GOAL: The background must VISUALLY RELATE to what the slide is about.
Read the slide's content and choose a visual metaphor that reinforces the message.
This is a career, job-search, and AI brand — backgrounds should feel relevant to the topic.

VISUAL METAPHOR EXAMPLES by topic:
- Job rejections/frustration → scattered crumpled papers on a desk, motion-blurred closed doors,
  an empty inbox on a laptop screen, overflowing application forms
- ATS/technology/AI → glowing digital interface with data flowing, abstract circuit board patterns,
  code streaming across translucent screens, holographic display with scanning lines
- Career growth/opportunity → sunlit open doorway at end of a corridor, ascending staircase
  with dramatic light, a bridge stretching toward a bright horizon, upward-reaching architecture
- Speed/efficiency → motion-blurred cityscape, light trails on a highway at night,
  fast-moving train through a tunnel, streaks of light converging to a focal point
- Solution/product reveal → clean modern workspace with warm lighting, elegant desk setup
  with soft golden glow, professional tools arranged in editorial still-life
- CTA/final slide → expansive sky at golden hour, open road stretching to horizon,
  dawn light breaking through clouds, a bright threshold inviting you forward

STYLE REQUIREMENTS:
- Heavily blurred, out-of-focus, or atmospheric — the image is a BACKGROUND behind text
- Cinematic, editorial, high-production-value photography look
- Dramatic lighting: volumetric rays, golden hour warmth, moody chiaroscuro, or soft studio glow
- NEVER include any readable text, words, letters, numbers, logos, or brand names
  — the image model renders text literally
- NEVER include recognizable human faces or full figures (blurred silhouettes are OK)
- Think: if you squint, you can tell what the scene is, but it's beautifully soft and atmospheric

Bad example: "Navy #0F1B3D background with Karko branding"
Bad example: "Abstract fluid simulation with crystalline fractals" (no content relevance!)
Good example: "Dramatically blurred stack of application documents on a dark desk, warm amber
  side-lighting casting long shadows, shallow depth of field, moody editorial photography"
Good example: "Out-of-focus glowing digital interface with streaming data particles, cool blue
  holographic light in a dark space, cinematic volumetric haze, futuristic editorial aesthetic"

ACCENT COLOR:
- For "karko-navy" template: use #C8A44E (Karko Gold) as accent_color for ALL slides
- For "karko-cream" template: use #0F1B3D (Karko Navy) as accent_color for ALL slides

OUTPUT: Return ONLY valid JSON. No markdown. No explanation. Strictly follow the schema.`;

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY!,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT!,
});

function buildCarouselSchema(slideCount: number) {
  return {
    type: 'object' as const,
    properties: {
      topic: { type: 'string' as const },
      template: { type: 'string' as const, enum: ['karko-navy', 'karko-cream'] },
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

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Content:\n"""\n${content}\n"""\n\nSettings:\n- Template: ${template}\n- Platform: ${platform}\n- Number of slides: ${slideCount}\n- Brand color: ${brand_color ?? 'use Karko brand defaults (Gold for navy theme, Navy for cream theme)'}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'carousel_config',
          schema: buildCarouselSchema(slideCount),
          strict: true,
        },
      },
      max_tokens: 4000,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Structure API error:', err);
    return NextResponse.json({ error: 'Failed to structure content' }, { status: 500 });
  }
}
