import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { PLATFORM_DIMS, LINKEDIN_DIMS, SAFE_ZONES } from '@/lib/types';

interface CtaPillSnapshot {
  key: string;
  width: number;
  height: number;
  borderRadius: number;
  paddingLeft: number;
  backgroundColor: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  text: string;
}

function parsePx(value: string | null | undefined, fallback = 0): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function collectCtaPillSnapshots(el: HTMLElement): Map<string, CtaPillSnapshot> {
  const snapshots = new Map<string, CtaPillSnapshot>();
  const pills = el.querySelectorAll<HTMLElement>('[data-cta-pill]');

  pills.forEach(pill => {
    const key = pill.dataset.ctaPill;
    const label = pill.querySelector<HTMLElement>('[data-cta-label]');
    if (!key || !label) return;

    const text = label.textContent?.trim();
    if (!text) return;

    const pillRect = pill.getBoundingClientRect();
    if (!pillRect.width || !pillRect.height) return;

    const pillStyle = window.getComputedStyle(pill);
    const labelStyle = window.getComputedStyle(label);

    snapshots.set(key, {
      key,
      width: Math.ceil(pillRect.width),
      height: Math.ceil(pillRect.height),
      borderRadius: parsePx(pillStyle.borderTopLeftRadius, 14),
      paddingLeft: parsePx(pillStyle.paddingLeft, 36),
      backgroundColor: pillStyle.backgroundColor || '#C8A44E',
      color: labelStyle.color || '#0F1B3D',
      fontFamily: labelStyle.fontFamily || 'sans-serif',
      fontSize: labelStyle.fontSize || '34px',
      fontWeight: labelStyle.fontWeight || '700',
      letterSpacing: labelStyle.letterSpacing === 'normal' ? '0px' : labelStyle.letterSpacing,
      text,
    });
  });

  return snapshots;
}

function replaceCloneCtaPills(documentClone: Document, snapshots: Map<string, CtaPillSnapshot>) {
  snapshots.forEach(snapshot => {
    const clonePill = documentClone.querySelector<HTMLElement>(`[data-cta-pill="${snapshot.key}"]`);
    if (!clonePill) return;

    const svg = documentClone.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', `${snapshot.width}`);
    svg.setAttribute('height', `${snapshot.height}`);
    svg.setAttribute('viewBox', `0 0 ${snapshot.width} ${snapshot.height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'block';
    svg.style.width = `${snapshot.width}px`;
    svg.style.height = `${snapshot.height}px`;

    const rect = documentClone.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', `${snapshot.width}`);
    rect.setAttribute('height', `${snapshot.height}`);
    rect.setAttribute('rx', `${snapshot.borderRadius}`);
    rect.setAttribute('fill', snapshot.backgroundColor);

    const text = documentClone.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = snapshot.text;
    text.setAttribute('x', `${snapshot.paddingLeft}`);
    text.setAttribute('y', `${snapshot.height / 2}`);
    text.setAttribute('fill', snapshot.color);
    text.setAttribute('font-family', snapshot.fontFamily);
    text.setAttribute('font-size', snapshot.fontSize);
    text.setAttribute('font-weight', snapshot.fontWeight);
    text.setAttribute('letter-spacing', snapshot.letterSpacing);
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('alignment-baseline', 'middle');

    svg.append(rect, text);

    clonePill.style.width = `${snapshot.width}px`;
    clonePill.style.height = `${snapshot.height}px`;
    clonePill.style.minHeight = `${snapshot.height}px`;
    clonePill.style.display = 'block';
    clonePill.style.padding = '0';
    clonePill.style.background = 'transparent';
    clonePill.style.borderRadius = '0';
    clonePill.replaceChildren(svg);
  });
}

async function waitForSlideAssets(el: HTMLElement): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }

  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(images.map(async img => {
    if ('decode' in img) {
      try {
        await img.decode();
        return;
      } catch {
        // Fall back to load/error listeners below.
      }
    }

    if (img.complete) return;

    await new Promise<void>(resolve => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }));

  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Temporarily patch a slide's layout to LinkedIn dimensions (1080×1080 with LI safe zones).
 * Used when the DOM is rendered at Instagram size but we need a LinkedIn capture.
 * Returns a restore function.
 */
function patchSlideForLinkedIn(el: HTMLElement, slideId: number): () => void {
  const liSz = SAFE_ZONES.linkedin;
  const liH = LINKEDIN_DIMS.h;

  // Save and patch slide element height
  const savedHeight = el.style.height;
  el.style.height = `${liH}px`;

  // Patch logo position
  const logoDiv = el.children[2] as HTMLElement | undefined; // 3rd child = logo wrapper
  const savedLogoTop = logoDiv?.style.top;
  const savedLogoLeft = logoDiv?.style.left;
  if (logoDiv) {
    logoDiv.style.top = `${liSz.top + 6}px`;
    logoDiv.style.left = `${liSz.left}px`;
  }

  // Patch content box
  const box = el.querySelector(`[data-content-box="slide-${slideId}"]`) as HTMLElement | null;
  const savedBox = box ? {
    top: box.style.top, left: box.style.left, right: box.style.right,
    bottom: box.style.bottom, width: box.style.width,
  } : null;
  if (box) {
    box.style.top = `${liSz.top + 120}px`;
    box.style.left = `${liSz.left}px`;
    box.style.right = `${liSz.right}px`;
    box.style.bottom = `${liSz.bottom + 50}px`;
    box.style.width = `${LINKEDIN_DIMS.w - liSz.left - liSz.right}px`;
  }

  // Hide bottom bar (progress bars, slide counter, swipe hint) — not needed in LinkedIn PDFs
  const bottomBar = el.querySelector(`[data-bottom-bar="slide-${slideId}"]`) as HTMLElement | null;
  const savedBottomDisplay = bottomBar?.style.display;
  if (bottomBar) {
    bottomBar.style.display = 'none';
  }

  return () => {
    el.style.height = savedHeight;
    if (logoDiv) {
      logoDiv.style.top = savedLogoTop!;
      logoDiv.style.left = savedLogoLeft!;
    }
    if (box && savedBox) {
      box.style.top = savedBox.top;
      box.style.left = savedBox.left;
      box.style.right = savedBox.right;
      box.style.bottom = savedBox.bottom;
      box.style.width = savedBox.width;
    }
    if (bottomBar) {
      bottomBar.style.display = savedBottomDisplay!;
    }
  };
}

/**
 * Capture a single slide element as an HTMLCanvasElement.
 * If patchLinkedIn is true, temporarily adjusts layout for LinkedIn dimensions.
 */
async function captureSlide(
  slideId: number,
  width: number,
  height: number,
  patchLinkedIn = false,
): Promise<HTMLCanvasElement | null> {
  const el = document.getElementById(`slide-${slideId}`) as HTMLElement | null;
  if (!el) return null;

  const prevTransform = el.style.transform;
  el.style.transform = 'none';

  const restoreLinkedIn = patchLinkedIn ? patchSlideForLinkedIn(el, slideId) : () => {};
  await waitForSlideAssets(el);
  const ctaPills = collectCtaPillSnapshots(el);

  const canvas = await html2canvas(el, {
    width,
    height,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    onclone: documentClone => {
      replaceCloneCtaPills(documentClone, ctaPills);
    },
  });

  restoreLinkedIn();
  el.style.transform = prevTransform;

  return canvas;
}

/**
 * Export slides as a ZIP of JPEG images (Instagram format).
 */
async function exportImagesZip(
  safeName: string,
  slideCount: number,
  dims: { w: number; h: number },
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 1; i <= slideCount; i++) {
    const canvas = await captureSlide(i, dims.w, dims.h);
    if (!canvas) continue;

    const blob = await new Promise<Blob>(resolve =>
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.96),
    );
    zip.file(`${safeName}_slide_${i}.jpg`, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Export slides as a single multi-page PDF (LinkedIn format).
 * Each page is 1080×1080 px at 150 DPI.
 */
async function exportPdf(
  safeName: string,
  slideCount: number,
  dims: { w: number; h: number },
  patchLinkedIn = false,
): Promise<Blob> {
  // Convert px to mm at 150 DPI for high-res output
  const DPI = 150;
  const PX_TO_MM = 25.4 / DPI;
  const pageW = dims.w * PX_TO_MM;
  const pageH = dims.h * PX_TO_MM;

  const pdf = new jsPDF({
    orientation: pageW >= pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  });

  for (let i = 1; i <= slideCount; i++) {
    if (i > 1) pdf.addPage([pageW, pageH]);

    const canvas = await captureSlide(i, dims.w, dims.h, patchLinkedIn);
    if (!canvas) continue;

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  }

  return pdf.output('blob');
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportCarousel(
  exportName: string,
  platform: 'instagram' | 'linkedin' | 'both' = 'instagram',
  slideCount = 5,
): Promise<void> {
  const safeName = (exportName || 'carousel').slice(0, 40).replace(/[^a-z0-9]/gi, '_');

  if (platform === 'instagram') {
    const dims = PLATFORM_DIMS.instagram;
    const zipBlob = await exportImagesZip(safeName, slideCount, dims);
    triggerDownload(zipBlob, `${safeName}_carousel.zip`);
  } else if (platform === 'linkedin') {
    const dims = LINKEDIN_DIMS;
    const pdfBlob = await exportPdf(safeName, slideCount, dims);
    triggerDownload(pdfBlob, `${safeName}_carousel.pdf`);
  } else {
    // "both" — export Instagram images ZIP first (DOM is already at IG size)
    const igDims = PLATFORM_DIMS.instagram;
    const zipBlob = await exportImagesZip(safeName, slideCount, igDims);
    triggerDownload(zipBlob, `${safeName}_instagram.zip`);

    // Then LinkedIn PDF — patch DOM layout temporarily for each slide
    const liDims = LINKEDIN_DIMS;
    const pdfBlob = await exportPdf(safeName, slideCount, liDims, true);
    triggerDownload(pdfBlob, `${safeName}_linkedin.pdf`);
  }
}
