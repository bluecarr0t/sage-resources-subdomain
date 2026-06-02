import type {
  ImageBlobFormat,
  JpegBlobCaptureResult,
  JpegCaptureProfile,
  JpegDownloadResult,
} from '@/lib/rv-industry-overview/jpeg-capture';

export type { ImageBlobFormat, JpegBlobCaptureResult, JpegDownloadResult, JpegCaptureProfile };

export type VisualizationJpgDownloadHandle = {
  downloadJpeg: () => Promise<JpegDownloadResult>;
  captureJpegBlob: () => Promise<JpegBlobCaptureResult>;
  captureImageBlob: (format?: ImageBlobFormat) => Promise<JpegBlobCaptureResult>;
};
