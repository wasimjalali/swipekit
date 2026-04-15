export type SlideType = 'cover' | 'point' | 'quote' | 'stat' | 'cta';
export type Template = 'karko-navy' | 'karko-cream';

export interface Slide {
  id: number;              // 1–5
  type: SlideType;
  headline: string;        // Primary headline — displayed largest
  subtext: string;         // Secondary line — displayed below headline
  body: string;            // Supporting body text / closer line
  eyebrow?: string;        // Small label above headline
  cta?: string;            // CTA text on slide 5 only
  visual_theme: string;    // Sent to FLUX as part of background prompt
  accent_color: string;    // Hex color for text accents + dots
  background_url?: string; // Base64 data URL after generation
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

/* ── Karko AI Brand Palette ── */

export const KARKO_BRAND = {
  // Core
  navy:        '#0F1B3D',
  gold:        '#C8A44E',
  goldBright:  '#E8B84D',
  cream:       '#FAF8F5',

  // Primary — Deep Navy scale
  navy600:     '#1E3A5F',
  navy700:     '#182F4D',
  navy800:     '#12243B',

  // Background — Warm Cream
  cream100:    '#FAF7F2',
  cream50:     '#FEFDFB',

  // Accent — Soft Gold
  gold400:     '#D4A853',
  gold500:     '#C4932E',
  gold600:     '#A37824',

  // Supporting
  sage500:     '#5B8A72',
  charcoal:    '#2D3748',
  warmGray:    '#6B7280',
} as const;

/* ── Logo SVGs ── */

export const KARKO_LOGO_LIGHT = `<svg width="220" height="40" viewBox="0 0 192 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karko AI"><rect width="40" height="40" rx="10" fill="#0F1B3D"/><text x="20" y="29" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="24" fill="#E8B84D" text-anchor="middle">K</text><text x="50" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="34" fill="#0F1B3D" letter-spacing="-1">Karko</text><text x="156" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="34" fill="#C8A44E" letter-spacing="-1">AI</text></svg>`;

export const KARKO_LOGO_DARK = `<svg width="220" height="40" viewBox="0 0 192 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karko AI"><rect width="40" height="40" rx="10" fill="#C8A44E"/><text x="20" y="29" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="24" fill="#0F1B3D" text-anchor="middle">K</text><text x="50" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="34" fill="#FFFFFF" letter-spacing="-1">Karko</text><text x="156" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="34" fill="#C8A44E" letter-spacing="-1">AI</text></svg>`;
