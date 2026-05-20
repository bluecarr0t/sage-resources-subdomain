import {
  getSageHqGoogleMapsUrl,
  getSageHqMapEmbedUrl,
  SAGE_HQ_BUSINESS_NAME,
  SAGE_HQ_STREET_ADDRESS,
} from '@/lib/sage-headquarters-location';

export default function FooterLocationMap() {
  const embedSrc = getSageHqMapEmbedUrl();
  if (!embedSrc) return null;

  const googleMapsUrl = getSageHqGoogleMapsUrl();

  return (
    <div className="mt-4" aria-labelledby="footer-location-map-heading">
      <h4 id="footer-location-map-heading" className="sr-only">
        {SAGE_HQ_BUSINESS_NAME} location map
      </h4>
      <div className="overflow-hidden rounded border border-gray-800 bg-neutral-900">
        <iframe
          title={`Map showing ${SAGE_HQ_BUSINESS_NAME} at ${SAGE_HQ_STREET_ADDRESS}, Chicago, Illinois`}
          src={embedSrc}
          className="aspect-[4/3] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <p className="mt-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 underline decoration-gray-600 underline-offset-2 transition-colors hover:text-white"
        >
          View on Google Maps
        </a>
      </p>
    </div>
  );
}
