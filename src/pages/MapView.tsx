import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mapbox token handling: prefer user-provided token, fallback to demo
// Add your token in Settings -> Backend -> Secrets as MAPBOX_PUBLIC_TOKEN for production
const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNseDJ3NzQxMjBhMjYya3M2ZGNyODcxbmcifQ.9R0I_w8YE3B-4VQK5H8Z7g';

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

interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
}

const MapView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>(() => localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN);
  const [tokenInput, setTokenInput] = useState<string>(localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || stores.length === 0) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map centered on Uzbekistan
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [64.5853, 41.3775], // Tashkent, Uzbekistan
      zoom: 6,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add user location control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true
    });
    
    map.current.addControl(geolocate, 'top-right');
    
    // Trigger geolocation on map load
    map.current.on('load', () => {
      geolocate.trigger();
    });

    // Add markers for each store
    stores.forEach((store) => {
      const el = document.createElement('button');
      el.className = 'group relative -translate-y-2 rounded-full bg-primary text-primary-foreground shadow-md px-3 py-2 text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring';
      el.setAttribute('aria-label', `${store.name}`);
      el.innerText = t('map.shop', { defaultValue: 'Shop' });

      new mapboxgl.Marker({ element: el })
        .setLngLat([store.longitude, store.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedStore(store);
        setIsSheetOpen(true);
        fetchProductsForStore(store.id);
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
  }, [stores, navigate, mapboxToken, t]);

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
