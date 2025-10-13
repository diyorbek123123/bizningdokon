import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Navigation as NavigationIcon, Phone, MapPin } from 'lucide-react';

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
  const [productSearch, setProductSearch] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
 
  useEffect(() => {
    fetchStores();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          if (mapRef.current) {
            mapRef.current.setView(coords, 13);
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(coords);
            } else {
              const blueIcon = L.divIcon({
                html: '<div class="user-location-marker"></div>',
                className: 'user-location-container',
                iconSize: [20, 20],
              });
              userMarkerRef.current = L.marker(coords, { icon: blueIcon }).addTo(mapRef.current);
            }
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: 'Location error',
            description: 'Could not get your location',
            variant: 'destructive',
          });
        }
      );
    }
  };

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
    console.log('Fetching products for store:', storeId);
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      
      console.log('Products fetch result:', { data, error });
      
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

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const initialCenter: [number, number] = userLocation || [41.3775, 64.5853];
    mapRef.current = L.map(mapContainerRef.current).setView(initialCenter, userLocation ? 13 : 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
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
      const marker = L.marker([store.latitude, store.longitude], { icon: customIcon });
      marker.on('click', () => {
        console.log('Marker clicked for store:', store.id, store.name);
        setSelectedStore(store);
        setIsSheetOpen(true);
        fetchProductsForStore(store.id);
      });
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t('map.title', { defaultValue: 'Store Map' })}</h1>
            <p className="text-sm text-muted-foreground">{t('map.clickStore', { defaultValue: 'Click on a store to see details' })}</p>
          </div>
          <Button onClick={getUserLocation} variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" />
            {t('map.myLocation', { defaultValue: 'My Location' })}
          </Button>
        </div>

        <style>{`
          .custom-marker-container {
            background: transparent;
            border: none;
          }
          .custom-marker {
            width: 36px;
            height: 36px;
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: all 0.2s;
          }
          .custom-marker:hover {
            transform: scale(1.15);
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
          }
          .custom-marker::after {
            content: '🏪';
          }
          .user-location-container {
            background: transparent;
            border: none;
          }
          .user-location-marker {
            width: 20px;
            height: 20px;
            background: #4285F4;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .leaflet-container {
            font-family: inherit;
          }
        `}</style>

        <div className="w-full h-[calc(100vh-240px)] min-h-[400px] rounded-lg shadow-lg border overflow-hidden relative z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col z-[9999]">
          {selectedStore && (
            <>
              {selectedStore.photo_url && (
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={selectedStore.photo_url}
                    alt={selectedStore.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4 border-b bg-background">
                <h2 className="text-2xl font-bold mb-2">{selectedStore.name}</h2>
                {selectedStore.description && (
                  <p className="text-sm text-muted-foreground mb-3">{selectedStore.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStore.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedStore.phone}`} className="hover:underline">
                      {selectedStore.phone}
                    </a>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => openDirections(selectedStore.latitude, selectedStore.longitude)}
                  >
                    <NavigationIcon className="h-4 w-4 mr-2" />
                    {t('map.directions', { defaultValue: 'Get Directions' })}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/store/${selectedStore.id}`)}
                  >
                    {t('map.viewStore', { defaultValue: 'View Store' })}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-4">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold mb-2">{t('map.products', { defaultValue: 'Products' })}</h3>
                  <Input
                    placeholder={t('map.searchProducts', { defaultValue: 'Search products...' })}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                <ScrollArea className="flex-1">
                  {loadingProducts ? (
                    <div className="text-sm text-muted-foreground p-4">{t('common.loading', { defaultValue: 'Loading...' })}</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4">
                      {productSearch
                        ? t('map.noSearchResults', { defaultValue: 'No products found' })
                        : t('map.noProducts', { defaultValue: 'No products available' })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                      {filteredProducts.map((p) => (
                        <Card key={p.id} className="bg-card border shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-base mb-1">{p.name}</div>
                                {p.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-2">{p.description}</div>
                                )}
                              </div>
                              <div className="text-base font-bold text-primary whitespace-nowrap">
                                ${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MapView;
