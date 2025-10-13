import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// Removed react-leaflet usage
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.DivIcon({
  html: '<div class="custom-marker"></div>',
  className: 'custom-marker-container',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// MapController removed - using imperative Leaflet API

const MapView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
 
   useEffect(() => {
     fetchStores();
   }, []);

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

  const handleMarkerClick = (store: Store) => {
    setSelectedStore(store);
    setIsSheetOpen(true);
    fetchProductsForStore(store.id);
  };

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current).setView([41.3775, 64.5853], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers when stores change
  useEffect(() => {
    if (!mapRef.current) return;

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    } else {
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    if (!stores || stores.length === 0) return;

    const bounds = L.latLngBounds([]);

    stores.forEach((store) => {
      const marker = L.marker([store.latitude, store.longitude], { icon: customIcon }).on('click', () => handleMarkerClick(store));
      marker.addTo(markersLayerRef.current!);
      bounds.extend([store.latitude, store.longitude] as any);
    });

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [stores]);

   return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('map.title')}</h1>
          <p className="text-muted-foreground">{t('map.clickStore')}</p>
        </div>

        <style>{`
          .custom-marker-container {
            background: transparent;
            border: none;
          }
          .custom-marker {
            width: 32px;
            height: 32px;
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
          }
          .custom-marker:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          .custom-marker::after {
            content: '📍';
          }
          .leaflet-container {
            font-family: inherit;
          }
        `}</style>

        <div className="w-full h-[calc(100vh-280px)] min-h-[300px] rounded-lg shadow-lg border overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />
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
