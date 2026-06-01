export type JpegCaptureProfile = 'chart' | 'map';

export type JpegDownloadResult =
  | { ok: true }
  | { ok: false; error: string; blankCapture?: boolean };

export type ImageBlobFormat = 'jpeg' | 'png';

export type JpegBlobCaptureResult =
  | { ok: true; blob: Blob; fileName: string }
  | { ok: false; error: string; blankCapture?: boolean };

export function safeRvOverviewExportFileStem(fileStem: string): string {
  const safe = fileStem.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return safe.length > 0 ? safe : 'chart';
}

function safeFileStem(fileStem: string): string {
  return safeRvOverviewExportFileStem(fileStem);
}

function canvasLooksMostlyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return true;

  const x0 = Math.floor(w * 0.15);
  const y0 = Math.floor(h * 0.15);
  const sw = Math.max(1, Math.floor(w * 0.7));
  const sh = Math.max(1, Math.floor(h * 0.7));
  const sample = ctx.getImageData(x0, y0, sw, sh);
  let light = 0;
  let opaque = 0;
  for (let i = 0; i < sample.data.length; i += 4) {
    const a = sample.data[i + 3];
    if (a < 16) continue;
    opaque++;
    const r = sample.data[i];
    const g = sample.data[i + 1];
    const b = sample.data[i + 2];
    if (r > 248 && g > 248 && b > 248) light++;
  }
  if (opaque < 50) return true;
  return light / opaque > 0.94;
}

function inlineExternalImagesInClone(clonedDoc: Document): void {
  const images = clonedDoc.querySelectorAll('img');
  images.forEach((img) => {
    if (img.src && !img.src.startsWith(window.location.origin)) {
      img.removeAttribute('crossorigin');
    }
  });
}

async function renderElementToCanvas(
  element: HTMLElement,
  profile: JpegCaptureProfile
): Promise<HTMLCanvasElement> {
  if (profile === 'map') {
    const { fetchUsStatesTopology } = await import('@/lib/rv-industry-overview/us-states-topology');
    await fetchUsStatesTopology();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
  }

  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: profile === 'map',
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering: false,
    onclone: (clonedDoc) => {
      inlineExternalImagesInClone(clonedDoc);
    },
  });
}

function canvasToImageBlob(
  canvas: HTMLCanvasElement,
  format: ImageBlobFormat
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? undefined : 0.92;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode image'));
      },
      mime,
      quality
    );
  });
}

export async function captureElementAsImageBlob(
  element: HTMLElement,
  fileStem: string,
  profile: JpegCaptureProfile = 'chart',
  format: ImageBlobFormat = 'jpeg'
): Promise<JpegBlobCaptureResult> {
  const ext = format === 'png' ? 'png' : 'jpg';
  const fileName = `${safeFileStem(fileStem)}.${ext}`;
  try {
    const canvas = await renderElementToCanvas(element, profile);
    if (canvasLooksMostlyBlank(canvas)) {
      return {
        ok: false,
        blankCapture: true,
        error:
          profile === 'map'
            ? 'Map export appears blank. Use Export pack for server map fallback.'
            : 'Chart export appears blank.',
      };
    }
    const blob = await canvasToImageBlob(canvas, format);
    return { ok: true, blob, fileName };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return { ok: false, error: message };
  }
}

export async function captureElementAsJpegBlob(
  element: HTMLElement,
  fileStem: string,
  profile: JpegCaptureProfile = 'chart'
): Promise<JpegBlobCaptureResult> {
  return captureElementAsImageBlob(element, fileStem, profile, 'jpeg');
}

export async function captureElementAsJpeg(
  element: HTMLElement,
  fileStem: string,
  profile: JpegCaptureProfile = 'chart'
): Promise<JpegDownloadResult> {
  const result = await captureElementAsJpegBlob(element, fileStem, profile);
  if (!result.ok) {
    return { ok: false, error: result.error, blankCapture: result.blankCapture };
  }

  const link = document.createElement('a');
  link.href = URL.createObjectURL(result.blob);
  link.download = result.fileName;
  link.click();
  URL.revokeObjectURL(link.href);

  return { ok: true };
}
