/** Public glamping map "Client Work" layer — points load from `/api/map/client-work` (reports). */
export interface ClientWorkMapPoint {
  id: string;
  lat: number;
  lng: number;
  location: string;
  resortType: string;
  service: string;
}
