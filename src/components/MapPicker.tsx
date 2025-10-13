import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapPicker = ({ onLocationSelect, initialLat = 41.2995, initialLng = 69.2401 }: MapPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainer.current).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add initial marker
    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapRef.current = map;

    // Handle marker drag
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onLocationSelect(position.lat, position.lng);
      reverseGeocode(position.lat, position.lng);
    });

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Initial reverse geocode
    reverseGeocode(initialLat, initialLng);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      setAddress(data.display_name || 'Address not found');
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress('Unable to fetch address');
    }
  };

  return (
    <div className="space-y-2">
      <div ref={mapContainer} className="h-[400px] rounded-lg border" />
      <p className="text-sm text-muted-foreground">
        Click on the map or drag the marker to select your store location
      </p>
      {address && (
        <p className="text-sm font-medium">Selected: {address}</p>
      )}
    </div>
  );
};
