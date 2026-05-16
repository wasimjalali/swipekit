/**
 * Brand configuration.
 *
 * Edit this file to make the carousel generator your own. Every visible
 * colour, the logo, the brand name in the LLM prompt, and the example
 * CTA copy all flow from here.
 *
 * Tips:
 * - Keep both `themes.primary` (dark) and `themes.secondary` (light) — the
 *   theme picker depends on them, and the LLM is prompted to choose one
 *   per slide. Rename them visually via `label`, not the keys.
 * - Logos are inline SVG strings. Paste your own `<svg>...</svg>` markup.
 * - `domain` and `tone` are concatenated into the LLM system prompt, so
 *   they control how slide copy gets written when the user pastes content.
 */

import type { BrandConfig } from './lib/brand';

const NAVY = '#0F1B3D';
const NAVY600 = '#1E3A5F';
const GOLD = '#C8A44E';
const GOLD400 = '#D4A853';
const GOLD500 = '#C4932E';
const GOLD_BRIGHT = '#E8B84D';
const CREAM = '#FAF8F5';
const CREAM100 = '#FAF7F2';
const CHARCOAL = '#2D3748';
const WARM_GRAY = '#6B7280';

const LOGO_LIGHT = `<svg width="220" height="40" viewBox="0 0 192 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carousel Generator"><rect width="40" height="40" rx="10" fill="${NAVY}"/><text x="20" y="29" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="24" fill="${GOLD_BRIGHT}" text-anchor="middle">C</text><text x="50" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="34" fill="${NAVY}" letter-spacing="-1">Carousel</text></svg>`;

const LOGO_DARK = `<svg width="220" height="40" viewBox="0 0 192 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carousel Generator"><rect width="40" height="40" rx="10" fill="${GOLD}"/><text x="20" y="29" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="24" fill="${NAVY}" text-anchor="middle">C</text><text x="50" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="34" fill="#FFFFFF" letter-spacing="-1">Carousel</text></svg>`;

export const brand: BrandConfig = {
  name: 'Your Brand',
  url: 'yourbrand.com',
  domain: 'general-purpose content',
  tone: 'clear, confident, and concise',

  defaultTheme: 'primary',

  themes: {
    primary: {
      label: 'Navy',
      background: NAVY,
      surface: NAVY600,
      accent: GOLD,
      accentBright: GOLD_BRIGHT,
      text: '#FFFFFF',
      textMuted: 'rgba(255,255,255,0.82)',
      textFaint: 'rgba(255,255,255,0.45)',
      overlay: 'linear-gradient(160deg, rgba(15,27,61,0.82) 0%, rgba(15,27,61,0.55) 100%)',
      ctaFill: GOLD400,
      ctaText: NAVY,
      fluxColorGrade:
        'Color graded in deep midnight navy and dark blue-black tones with warm gold accent lighting. ' +
        'Dark moody atmosphere, cinematic shadows.',
      fluxFallbackColorGrade:
        'Color graded in rich midnight navy with refined warm gold highlights, soft contrast, clean premium editorial mood.',
      fallbackPalette: {
        start: NAVY,
        end: '#08122B',
        glowA: 'rgba(212, 168, 83, 0.28)',
        glowB: 'rgba(255, 255, 255, 0.08)',
        bar: 'rgba(255, 255, 255, 0.06)',
      },
    },

    secondary: {
      label: 'Cream',
      background: CREAM,
      surface: CREAM100,
      accent: NAVY,
      accentBright: GOLD500,
      text: NAVY,
      textMuted: CHARCOAL,
      textFaint: 'rgba(15,27,61,0.35)',
      overlay: 'linear-gradient(160deg, rgba(250,248,245,0.88) 0%, rgba(250,247,242,0.65) 100%)',
      ctaFill: GOLD,
      ctaText: '#FFFFFF',
      fluxColorGrade:
        'Color graded in warm ivory cream and soft champagne tones with golden hour warmth. ' +
        'Light airy atmosphere, soft luminous highlights.',
      fluxFallbackColorGrade:
        'Color graded in warm cream and champagne tones with soft navy accents, airy premium editorial mood.',
      fallbackPalette: {
        start: CREAM100,
        end: '#F0E8DB',
        glowA: 'rgba(200, 164, 78, 0.22)',
        glowB: 'rgba(15, 27, 61, 0.12)',
        bar: 'rgba(15, 27, 61, 0.08)',
      },
    },
  },

  logo: { light: LOGO_LIGHT, dark: LOGO_DARK },
  logoSlideWidth: 450,
  logoDashboardWidth: 160,

  ui: {
    pageBackground: CREAM,
    headerBackground: '#FFFFFF',
    text: CHARCOAL,
    textMuted: WARM_GRAY,
    border: 'rgba(15,27,61,0.12)',
    inputBackground: '#FAFAFA',
  },
};
