import MapLoading from '@/components/MapLoading';

/** Route-level loading UI while map data and client bundles hydrate. */
export default function MapRouteLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-100/40">
      <MapLoading />
    </div>
  );
}
