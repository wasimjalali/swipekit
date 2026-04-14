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

    const canvas = await html2canvas(el, {
      width: dims.w,
      height: dims.h,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

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
