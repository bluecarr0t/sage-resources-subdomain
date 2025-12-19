/**
 * Resource Hints Component
 * Adds preconnect, dns-prefetch, and preload hints for performance optimization
 * Ordered by priority: most critical first (Supabase, Maps API)
 */
export default function ResourceHints() {
  return (
    <>
      {/* Preconnect to critical origins first (ordered by priority) */}
      {/* Supabase - Highest priority (90ms+ LCP savings) */}
      <link rel="preconnect" href="https://mdlniwrgrszdhzwxjdal.supabase.co" crossOrigin="anonymous" />
      {/* Google Maps API - Critical for map page */}
      <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
      {/* Analytics and other resources */}
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://sageoutdooradvisory.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for additional third-party resources */}
      <link rel="dns-prefetch" href="https://mdlniwrgrszdhzwxjdal.supabase.co" />
      <link rel="dns-prefetch" href="https://maps.googleapis.com" />
      <link rel="dns-prefetch" href="https://maps.gstatic.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      <link rel="dns-prefetch" href="https://sageoutdooradvisory.com" />
      
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