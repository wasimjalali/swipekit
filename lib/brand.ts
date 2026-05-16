/**
 * Brand configuration types.
 *
 * The runtime brand config lives in `brand.config.ts` at the repo root.
 * Fork the project and edit that file (or supply your own) to customise
 * colours, logo, copy, and the LLM prompt voice for your own brand.
 */

export type ThemeKey = 'primary' | 'secondary';

export interface ThemePalette {
  /** Display name shown in the UI theme picker (e.g. "Navy", "Cream"). */
  label: string;
  /** Main slide background colour. */
  background: string;
  /** Surface tint used for the cards/panels in the dashboard. */
  surface: string;
  /** Accent colour used for highlights, CTA buttons, progress dots. */
  accent: string;
  /** Secondary accent — typically a slightly brighter or warmer variant. */
  accentBright: string;
  /** Primary text colour on this theme's background. */
  text: string;
  /** Muted text colour on this theme's background. */
  textMuted: string;
  /** Faint / disabled text colour on this theme's background. */
  textFaint: string;
  /** CSS gradient string layered over the AI background image. */
  overlay: string;
  /** Background colour for `accent` CTA pills (often equals `accent`). */
  ctaFill: string;
  /** Text colour on top of a CTA pill. */
  ctaText: string;
  /** Color grading phrase appended to the FLUX background prompt. */
  fluxColorGrade: string;
  /** Color grading phrase for the safe-content fallback FLUX prompt. */
  fluxFallbackColorGrade: string;
  /** Palette used for the local SVG fallback when FLUX is unavailable. */
  fallbackPalette: {
    start: string;
    end: string;
    glowA: string;
    glowB: string;
    bar: string;
  };
}

export interface BrandConfig {
  /** Brand display name, e.g. "Acme AI". Used in metadata and prompts. */
  name: string;
  /** Public URL, e.g. "acme.com". Used in CTA examples and docs. */
  url: string;
  /** What the brand does, in one short phrase — feeds the LLM system prompt. */
  domain: string;
  /** Voice/tone hint for generated copy — feeds the LLM system prompt. */
  tone: string;
  /** Two themes shipped with the app: a dark variant and a light variant. */
  themes: Record<ThemeKey, ThemePalette>;
  /** Default theme selected on first load. */
  defaultTheme: ThemeKey;
  /** Inline SVG markup for the logo, in light and dark variants.
   *  `light` is used on dark backgrounds; `dark` is used on light backgrounds. */
  logo: { light: string; dark: string };
  /** Width in pixels for the logo when rendered on a slide. */
  logoSlideWidth: number;
  /** Width in pixels for the logo when rendered in the dashboard header. */
  logoDashboardWidth: number;
  /** Neutral UI palette — colours used by the dashboard chrome, not the slides. */
  ui: {
    pageBackground: string;
    headerBackground: string;
    text: string;
    textMuted: string;
    border: string;
    inputBackground: string;
  };
}

/** Encode an SVG string as a data URL suitable for use in an `<img src>`. */
export function svgToDataUrl(svg: string): string {
  if (typeof window !== 'undefined') {
    return `data:image/svg+xml;base64,${window.btoa(svg)}`;
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
