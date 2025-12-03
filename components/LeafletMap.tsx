'use client';

import { useEffect, useState } from 'react';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import MapWrapper from './MapWrapper';

interface LeafletMapProps {
  properties: SageProperty[];
  defaultCenter: [number, number];
  defaultZoom: number;
}

export default function LeafletMap({
  properties,
  defaultCenter,
  defaultZoom,
}: LeafletMapProps) {
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      try {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Fix Leaflet icon issue - must happen before react-leaflet imports
        const L = await import('leaflet');
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Small delay to ensure Leaflet is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        // Import react-leaflet components dynamically
        const reactLeaflet = await import('react-leaflet');
        
        // Verify components exist
        if (
          reactLeaflet.MapContainer &&
          reactLeaflet.TileLayer &&
          reactLeaflet.Marker &&
          reactLeaflet.Popup
        ) {
          setMapComponents({
            MapContainer: reactLeaflet.MapContainer,
            TileLayer: reactLeaflet.TileLayer,
            Marker: reactLeaflet.Marker,
            Popup: reactLeaflet.Popup,
          });
          setIsReady(true);
        } else {
          console.error('Failed to load react-leaflet components');
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      // Cleanup: remove the link tag when component unmounts
      const existingLink = document.querySelector('link[href*="leaflet"]');
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  if (!isReady || !MapComponents) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  const propertiesWithCoords = filterPropertiesWithCoordinates(properties);

  return (
    <MapWrapper
      properties={propertiesWithCoords}
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      MapContainer={MapComponents.MapContainer}
      TileLayer={MapComponents.TileLayer}
      Marker={MapComponents.Marker}
      Popup={MapComponents.Popup}
    />
  );
}

