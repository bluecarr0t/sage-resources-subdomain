import type { JpegBlobCaptureResult, JpegDownloadResult } from '@/lib/rv-industry-overview/jpeg-capture';

export type {
  ImageBlobFormat,
  JpegBlobCaptureResult,
  JpegDownloadResult,
  JpegCaptureProfile,
} from '@/lib/rv-industry-overview/jpeg-capture';

export type VisualizationJpgDownloadHandle = {
  downloadJpeg: () => Promise<JpegDownloadResult>;
  captureJpegBlob: () => Promise<JpegBlobCaptureResult>;
  captureImageBlob: (format?: ImageBlobFormat) => Promise<JpegBlobCaptureResult>;
};
