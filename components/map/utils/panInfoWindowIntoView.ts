/**
 * Minimal map movement for InfoWindows: only pan when the popup would be clipped
 * or the pin would sit under safe margins. Uses MapCanvasProjection from a
 * short-lived OverlayView (Google Maps best practice for pixel ↔ lat/lng).
 */

/** Typical tall card (photo + text); second pass after ~700ms catches growth from images. */
const DEFAULT_CARD_ABOVE_PIN_PX = 400;
const DEFAULT_CARD_HALF_WIDTH_PX = 168; // ~max-w-xs (320px) / 2 + shadow
const DEFAULT_PIN_BELOW_ANCHOR_PX = 44;

export type InfoWindowViewportPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const defaultInfoWindowPadding = (isMobile: boolean): InfoWindowViewportPadding => ({
  top: isMobile ? 48 : 28,
  right: 16,
  bottom: 72,
  left: 16,
});

/**
 * Pixel delta to move the marker on screen (positive x = right, positive y = down)
 * so that the estimated popup rect fits inside the padded viewport.
 */
export function computeMarkerPixelDeltaToFitPopup(options: {
  markerX: number;
  markerY: number;
  mapWidth: number;
  mapHeight: number;
  padding: InfoWindowViewportPadding;
  cardAbovePinPx?: number;
  cardHalfWidthPx?: number;
  pinBelowAnchorPx?: number;
}): { dx: number; dy: number } {
  const {
    markerX,
    markerY,
    mapWidth,
    mapHeight,
    padding,
    cardAbovePinPx = DEFAULT_CARD_ABOVE_PIN_PX,
    cardHalfWidthPx = DEFAULT_CARD_HALF_WIDTH_PX,
    pinBelowAnchorPx = DEFAULT_PIN_BELOW_ANCHOR_PX,
  } = options;

  const safeLeft = padding.left;
  const safeTop = padding.top;
  const safeRight = mapWidth - padding.right;
  const safeBottom = mapHeight - padding.bottom;

  const popupLeft = markerX - cardHalfWidthPx;
  const popupRight = markerX + cardHalfWidthPx;
  const popupTop = markerY - cardAbovePinPx;
  const popupBottom = markerY + pinBelowAnchorPx;

  let dx = 0;
  let dy = 0;

  if (popupTop < safeTop) {
    dy += safeTop - popupTop;
  }
  if (popupBottom > safeBottom) {
    dy -= popupBottom - safeBottom;
  }
  if (popupLeft < safeLeft) {
    dx += safeLeft - popupLeft;
  }
  if (popupRight > safeRight) {
    dx -= popupRight - safeRight;
  }

  return { dx, dy };
}

/**
 * Google Maps panBy: positive x moves the map right (marker appears to move left).
 * To move the marker by (dx, dy) in screen space, use panBy(-dx, -dy).
 */
export function markerScreenDeltaToPanBy(dx: number, dy: number): { x: number; y: number } {
  return { x: -dx, y: -dy };
}

export function getMarkerContainerPixel(
  map: google.maps.Map,
  latLng: google.maps.LatLngLiteral
): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: { x: number; y: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    class PixelOverlay extends google.maps.OverlayView {
      onAdd() {}

      draw() {
        const projection = this.getProjection();
        if (!projection) {
          done(null);
          this.setMap(null);
          return;
        }
        const pt = projection.fromLatLngToContainerPixel(
          new google.maps.LatLng(latLng.lat, latLng.lng)
        );
        if (!pt) {
          done(null);
          this.setMap(null);
          return;
        }
        done({ x: pt.x, y: pt.y });
        this.setMap(null);
      }
    }

    const overlay = new PixelOverlay();
    overlay.setMap(map);
    window.setTimeout(() => done(null), 2000);
  });
}
