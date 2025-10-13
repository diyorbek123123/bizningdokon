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
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>(() => localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN);
  const [tokenInput, setTokenInput] = useState<string>(localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

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

    // Map error handling & fallback
    map.current.on('error', (e) => {
      const msg = (e as any)?.error?.message || 'Unknown map error';
      toast({
        title: t('map.loadError', { defaultValue: 'Map failed to load' }),
        description: msg.includes('Unauthorized') || msg.includes('forbidden')
          ? t('map.tokenIssue', { defaultValue: 'Your token may be invalid or domain-restricted. Try saving a different Mapbox public token.' })
          : msg,
        variant: 'destructive',
      });
      try {
        // Try a different style as fallback
        map.current?.setStyle('mapbox://styles/mapbox/streets-v12');
      } catch {}
    });
    
    // Trigger geolocation and ensure proper sizing
    map.current.on('load', () => {
      geolocate.trigger();
      map.current?.resize();
      setTimeout(() => map.current?.resize(), 50);
    });

    // Resize on window resize to avoid blank map
    const onResize = () => map.current?.resize();
    window.addEventListener('resize', onResize);

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
      window.removeEventListener('resize', onResize);
      map.current?.remove();
    };
  }, [mapboxToken, t]);

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

  const fetchProductsForStore = async (storeId: string) => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: t('errors.error', { defaultValue: 'Error' }),
        description: t('map.failedProducts', { defaultValue: 'Failed to load products' }),
        variant: 'destructive',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSaveToken = () => {
    try {
      localStorage.setItem('mapbox_token', tokenInput);
      setMapboxToken(tokenInput);
      toast({
        title: t('map.tokenSaved', { defaultValue: 'Map token saved' }),
        description: t('map.tokenSavedDesc', { defaultValue: 'Reloaded with your token.' }),
      });
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!stores || stores.length === 0) return;

    stores.forEach((store) => {
      const el = document.createElement('button');
      el.className = 'group relative -translate-y-2 rounded-full bg-primary text-primary-foreground shadow-md px-3 py-2 text-xs font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring';
      el.setAttribute('aria-label', `${store.name}`);
      el.innerText = t('map.shop', { defaultValue: 'Shop' });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([store.longitude, store.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);

      el.addEventListener('click', () => {
        setSelectedStore(store);
        setIsSheetOpen(true);
        fetchProductsForStore(store.id);
      });
    });

    const bounds = new mapboxgl.LngLatBounds();
    stores.forEach((s) => bounds.extend([s.longitude, s.latitude]));
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [stores, t]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{t('map.title')}</h1>
            <p className="text-muted-foreground">{t('map.clickStore')}</p>
          </div>

          <Card className="mb-4 bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-muted-foreground">{t('map.tokenLabel', { defaultValue: 'Mapbox public token' })}</div>
                <div className="flex w-full gap-2">
                  <Input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="pk.XXXXXXXXXXXXXXXXXXXX"
                    aria-label={t('map.tokenAria', { defaultValue: 'Mapbox public token' })}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={handleSaveToken}>
                    {t('common.save', { defaultValue: 'Save' })}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            ref={mapContainer}
            className="w-full h-[calc(100vh-280px)] rounded-lg shadow-lg border relative"
          >
            {mapError && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center text-center p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{mapError}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('map.tokenHint', { defaultValue: 'If this persists, save a different Mapbox public token above or allow this domain in your Mapbox token settings.' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom" className="h-[75vh] p-0">
            <SheetHeader className="p-4 border-b bg-card/60 backdrop-blur">
              <SheetTitle>{selectedStore?.name}</SheetTitle>
              <SheetDescription>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{selectedStore?.address}</p>
                  <p>{selectedStore?.phone}</p>
                </div>
              </SheetDescription>
            </SheetHeader>
            <div className="p-4">
              {selectedStore?.description && (
                <p className="mb-4 text-sm text-foreground/90">{selectedStore.description}</p>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t('map.products', { defaultValue: 'Products' })}</h2>
                {selectedStore && (
                  <Button size="sm" onClick={() => navigate(`/store/${selectedStore.id}`)}>
                    {t('map.viewStore', { defaultValue: 'View store' })}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[52vh] pr-4">
                {loadingProducts ? (
                  <div className="text-sm text-muted-foreground">{t('common.loading', { defaultValue: 'Loading...' })}</div>
                ) : products.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('map.noProducts', { defaultValue: 'No products available' })}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((p) => (
                      <Card key={p.id} className="bg-card border shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{p.name}</div>
                              {p.description && (
                                <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</div>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-foreground">
                              {typeof p.price === 'number' ? p.price.toFixed(2) : p.price}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
    </div>
  );
};

export default MapView;
