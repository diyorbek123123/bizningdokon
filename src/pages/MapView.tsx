import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// You'll need to add your Mapbox token here
// Get one at https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNseDJ3NzQxMjBhMjYya3M2ZGNyODcxbmcifQ.9R0I_w8YE3B-4VQK5H8Z7g';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
}

const MapView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || stores.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map centered on Uzbekistan
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [64.5853, 41.3775], // Tashkent, Uzbekistan
      zoom: 6,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for each store
    stores.forEach((store) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `
          <div class="p-2">
            <h3 class="font-bold text-lg mb-1">${store.name}</h3>
            <p class="text-sm text-gray-600 mb-2">${store.address}</p>
            <p class="text-sm mb-2">${store.phone}</p>
            <button 
              onclick="window.location.href='/store/${store.id}'"
              class="w-full px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm"
            >
              View Details
            </button>
          </div>
        `
      );

      const marker = new mapboxgl.Marker({ color: '#2aa89a' })
        .setLngLat([store.longitude, store.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        marker.togglePopup();
      });
    });

    // Fit map to show all markers
    if (stores.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      stores.forEach((store) => {
        bounds.extend([store.longitude, store.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }

    return () => {
      map.current?.remove();
    };
  }, [stores, navigate]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stores',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('map.title')}</h1>
          <p className="text-muted-foreground">{t('map.clickStore')}</p>
        </div>

        <div
          ref={mapContainer}
          className="w-full h-[calc(100vh-250px)] rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
};

export default MapView;
