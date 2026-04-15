import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { PLATFORM_DIMS } from '@/lib/types';

export async function exportCarousel(
  exportName: string,
  platform: 'instagram' | 'linkedin' | 'both' = 'instagram',
  slideCount = 5,
): Promise<void> {
  const zip = new JSZip();
  const safeName = (exportName || 'carousel').slice(0, 40).replace(/[^a-z0-9]/gi, '_');
  const dims = PLATFORM_DIMS[platform] || PLATFORM_DIMS.instagram;

  for (let i = 1; i <= slideCount; i++) {
    const el = document.getElementById(`slide-${i}`) as HTMLElement;
    if (!el) continue;

    const prev = el.style.transform;
    el.style.transform = 'none';

    // html2canvas ignores flex/table centering — compute padding manually
    const box = el.querySelector(`[data-content-box="slide-${i}"]`) as HTMLElement | null;
    const inner = el.querySelector(`[data-content-inner="slide-${i}"]`) as HTMLElement | null;
    let savedBoxStyles: { display: string; justifyContent: string; paddingTop: string } | null = null;
    if (box && inner) {
      const boxH = box.offsetHeight;
      const innerH = inner.offsetHeight;
      const pad = Math.max(0, Math.floor((boxH - innerH) / 2));
      savedBoxStyles = {
        display: box.style.display,
        justifyContent: box.style.justifyContent,
        paddingTop: box.style.paddingTop,
      };
      box.style.display = 'block';
      box.style.justifyContent = '';
      box.style.paddingTop = `${pad}px`;
    }

    const canvas = await html2canvas(el, {
      width: dims.w,
      height: dims.h,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

    // Restore styles
    if (box && savedBoxStyles) {
      box.style.display = savedBoxStyles.display;
      box.style.justifyContent = savedBoxStyles.justifyContent;
      box.style.paddingTop = savedBoxStyles.paddingTop;
    }
    el.style.transform = prev;

    const blob = await new Promise<Blob>(resolve =>
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.96)
    );

    zip.file(`${safeName}_slide_${i}.jpg`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = `${safeName}_carousel.zip`;
  a.click();
}
