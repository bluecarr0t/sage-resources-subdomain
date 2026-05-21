'use client';

import { useEffect, type ReactNode } from 'react';

/** Makes html/body fill the parent iframe when `?embed=1`. */
export default function MapEmbedShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.dataset.mapEmbed = 'true';
    html.style.height = '100%';
    html.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.overflow = 'hidden';

    return () => {
      delete html.dataset.mapEmbed;
      html.style.height = prevHtmlHeight;
      html.style.overflow = prevHtmlOverflow;
      body.style.height = prevBodyHeight;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return <div className="h-full min-h-0 w-full">{children}</div>;
}
