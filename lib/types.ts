import type { ThemeKey } from './brand';

export type SlideType = 'cover' | 'point' | 'quote' | 'stat' | 'cta';

/**
 * A theme key. Defined as a string union so it's stable across the API
 * boundary; the actual palette values live in `brand.config.ts`.
 */
export type Template = ThemeKey;

export interface Slide {
  id: number;
  type: SlideType;
  headline: string;        // Primary headline — displayed largest
  subtext: string;         // Secondary line — displayed below headline
  body: string;            // Supporting body text / closer line
  eyebrow?: string;        // Small label above headline
  cta?: string;            // CTA text on last slide only
  visual_theme: string;    // Sent to FLUX as part of background prompt
  accent_color: string;    // Hex color for text accents + dots
  background_url?: string; // Base64 data URL after generation
  error_message?: string;  // Optional background generation failure detail
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface CarouselConfig {
  topic: string;
  template: Template;
  brand_color?: string;
  platform: 'instagram' | 'linkedin' | 'both';
  slides: Slide[];
}

/* ── Platform Dimensions ── */

export const PLATFORM_DIMS: Record<string, { w: number; h: number; label: string }> = {
  instagram: { w: 1080, h: 1440, label: '3:4 Portrait' },   // 2026 Instagram standard
  linkedin:  { w: 1080, h: 1080, label: '1:1 Square' },     // LinkedIn doc carousel (PDF)
  both:      { w: 1080, h: 1440, label: '3:4 Portrait' },   // Preview uses Instagram size; exports both
};

/* ── Safe Zones (per-platform content padding) ── */

export interface SafeZone { top: number; right: number; bottom: number; left: number }

export const SAFE_ZONES: Record<string, SafeZone> = {
  instagram: { top: 50,  right: 120, bottom: 180, left: 120 },
  linkedin:  { top: 80,  right: 80,  bottom: 80,  left: 80  },
  both:      { top: 50,  right: 120, bottom: 180, left: 120 },  // Preview uses IG zones
};

/* ── LinkedIn-specific dimensions for dual export ── */

export const LINKEDIN_DIMS = { w: 1080, h: 1080 } as const;

/* ── Slide Count Limits ── */

export const MAX_SLIDES: Record<string, number> = {
  instagram: 5,
  linkedin:  8,
  both:      8,
};

export const DEFAULT_SLIDES: Record<string, number> = {
  instagram: 5,
  linkedin:  5,
  both:      5,
};

/** Allowed theme keys — must mirror the keys in `brand.config.ts → themes`. */
export const THEME_KEYS: readonly ThemeKey[] = ['primary', 'secondary'] as const;
