'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type QuizQrCodeSize = 'md' | 'sm';

type QuizQrCodeProps = {
  url: string;
  label: string;
  hint: string;
  size?: QuizQrCodeSize;
};

const SIZE_CLASS: Record<QuizQrCodeSize, string> = {
  md: 'h-52 w-52 sm:h-60 sm:w-60',
  sm: 'h-40 w-40 sm:h-44 sm:w-44',
};

export function QuizQrCode({ url, label, hint, size = 'md' }: QuizQrCodeProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const boxClass = SIZE_CLASS[size];

  useEffect(() => {
    let cancelled = false;
    void QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      width: size === 'sm' ? 180 : 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#2c362c', light: '#00000000' },
    })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <figure className="flex flex-col items-center gap-3">
      {svg ? (
        <div
          className={`${boxClass} bg-transparent`}
          role="img"
          aria-label={`QR code for ${label}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div
          className={`flex ${boxClass} items-center justify-center bg-transparent p-4 text-center text-xs text-neutral-500`}
          aria-hidden
        >
          Preparing QR code…
        </div>
      )}
      <figcaption className="max-w-[15rem] text-center">
        <p className="font-[Georgia] text-base font-medium tracking-tight text-sage-800 sm:text-lg">
          {label}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
          {hint}
        </p>
      </figcaption>
    </figure>
  );
}
