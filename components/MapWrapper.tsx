'use client';

import { SageProperty } from '@/lib/types/sage';

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };

interface MapWrapperProps {
  properties: PropertyWithCoords[];
  defaultCenter: [number, number];
  defaultZoom: number;
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
}

export default function MapWrapper({
  properties,
  defaultCenter,
  defaultZoom,
  MapContainer,
  TileLayer,
  Marker,
  Popup,
}: MapWrapperProps) {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '600px', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((property) => (
        <Marker key={property.id} position={property.coordinates}>
          <Popup>
            <div className="max-w-xs">
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {property.property_name || property.site_name || 'Unnamed Property'}
              </h3>
              {property.city && property.state && (
                <p className="text-sm text-gray-600 mb-2">
                  {property.city}, {property.state}
                </p>
              )}
              {property.property_type && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Type:</span> {property.property_type}
                </p>
              )}
              {property.unit_type && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Unit Type:</span> {property.unit_type}
                </p>
              )}
              {property.avg_retail_daily_rate_2024 && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Avg Rate (2024):</span> $
                  {property.avg_retail_daily_rate_2024}
                </p>
              )}
              {property.url && (
                <a
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

