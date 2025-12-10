/**
 * Resource Hints Component
 * Adds preconnect, dns-prefetch, and preload hints for performance optimization
 */
export default function ResourceHints() {
  return (
    <>
      {/* Preconnect to external domains for faster connection */}
      <link rel="preconnect" href="https://sageoutdooradvisory.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for additional third-party resources */}
      <link rel="dns-prefetch" href="https://sageoutdooradvisory.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://maps.googleapis.com" />
      <link rel="dns-prefetch" href="https://maps.gstatic.com" />
      
      {/* Preload critical logo image - using blob storage URL */}
      <link
        rel="preload"
        href="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/logos/sage-logo-black-header.webp"
        as="image"
        type="image/webp"
      />
    </>
  );
}