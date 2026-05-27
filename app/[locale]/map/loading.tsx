/** Route transition shell — client MapPageLoadingOverlay owns the spinner. */
export default function MapRouteLoading() {
  return <div className="h-screen w-full bg-neutral-100/40" aria-busy="true" />;
}
