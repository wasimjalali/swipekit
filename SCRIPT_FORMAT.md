# Karko AI Carousel — Script Format Guide

## Overview

Write your carousel script in plain text using the structure below. The AI will map your exact words onto slides — it will **not** rewrite, shorten, or paraphrase anything.

---

## Template

```
Slide 1
Title:
[Your headline — the big, bold text]
Subtitle:
[Your supporting line — smaller text below the headline]
[Any extra lines become body text — italic accent color]

Slide 2
Title:
[Headline]
Subtitle:
[Supporting line]
[Optional body lines]

Slide 3
Title:
[Headline]
Subtitle:
[Supporting line]
[Optional body lines]

Slide 4
Title:
[Headline]
Subtitle:
[Supporting line]
[Optional body lines]

Slide 5
Title:
[Headline]
Subtitle:
[Supporting line]
[CTA — e.g. "Try Karko today → karkoai.com"]
```

---

## Field Breakdown

| Field | Maps to | Max Characters | Notes |
|-------|---------|---------------|-------|
| **Title** | Headline (biggest text) | ~50 chars | Short, punchy. 1-2 lines max on the slide. |
| **Subtitle** | Subtext (medium text) | ~120 chars | 1-3 sentences. Supporting detail. |
| **Extra lines** | Body (italic accent text) | ~100 chars | Cliffhangers, closers, trust lines. Optional. |
| **Slide 5 extra line** | CTA button | ~40 chars | Only on the last slide. Becomes a gold button. |

### Character Limits Explained

These aren't hard limits — they're guidelines to prevent text from overflowing or getting too small on the 1080x1080 slide:

- **Headline (Title):** Aim for under 50 characters. Longer headlines wrap to 3+ lines and shrink visually.
- **Subtext (Subtitle):** Up to ~120 characters works well. Two short sentences is ideal.
- **Body lines:** Keep under 100 characters. These render in a smaller italic font.
- **CTA:** Keep short — it's rendered as a button. "Try Karko → karkoai.com" is perfect.

---

## What Gets Stripped

The AI removes these structural labels automatically — they **won't** appear on slides:

- `Slide 1`, `Slide 2`, etc.
- `Title:`, `Subtitle:`, `Headline:`, `Body:`, `CTA:`
- Numbering like `1.`, `2.` used for structure

Only the text **after** the label is used.

---

## Slide Types

The AI assigns a slide type based on content:

| Slide | Typical Type | Purpose |
|-------|-------------|---------|
| Slide 1 | `cover` | The hook — grabs attention, makes them stop scrolling |
| Slide 2-3 | `point` / `stat` | The problem, pain point, or surprising data |
| Slide 4 | `point` / `quote` | The solution, your product, the shift |
| Slide 5 | `cta` | Call to action — button with link/action |

---

## Example Script

```
Slide 1
Title:
50 applications sent. 3 replies.
Subtitle:
It's not your experience. It's not your qualifications.
It's something most applicants never fix. Keep swiping.

Slide 2
Title:
The first gate isn't a recruiter.
Subtitle:
75% of CVs are rejected before a human ever reads them.
ATS software scans for exact keywords first. You're writing for people — but the first reader is a machine.

Slide 3
Title:
One tailored application takes 45-60 minutes.
Subtitle:
Send 1 great app per day — too slow to scale. Send 20 generic ones — get ghosted.
There is a third option. And it takes 90 seconds.

Slide 4
Title:
Meet Karko — your AI career assistant.
Subtitle:
Karko reads the job description, then instantly creates a tailored, ATS-optimized CV, cover letter, and application email.
We built it because we needed it ourselves.

Slide 5
Title:
Get more interviews. Start in 2 minutes.
Subtitle:
No credit card needed. Cancel anytime.
Try Karko today → karkoai.com
```

---

## Tips for Strong Carousel Scripts

1. **Slide 1 — Hook hard.** Use a number, a bold claim, or a relatable pain. Make them stop scrolling.
2. **Slide 2-3 — Build tension.** Each slide should make them *need* to swipe. End with a cliffhanger or surprising fact.
3. **Slide 4 — Reveal the solution.** Introduce your product/idea. Be specific about what it does.
4. **Slide 5 — Clear CTA.** One action. One link. Remove friction ("No credit card", "Free", "2 minutes").
5. **Keep headlines short.** Under 6-7 words is ideal for maximum visual impact.
6. **Use the body line for cliffhangers.** Lines like "Keep swiping." or "There is a third option." create tension.
7. **Write for the format.** Each slide is one screen — one idea per slide. Don't cram.
