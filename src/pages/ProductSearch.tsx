import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Navigation as NavigationIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductWithStore {
  id: string;
  name: string;
  price: number;
  description: string | null;
  store_id: string;
  store: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
  };
  distance?: number;
}

const ProductSearch = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState<ProductWithStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price');
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);

  useEffect(() => {
    // Get user location for distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // User denied location, that's okay
        }
      );
    }
  }, []);

  // Live search with debouncing
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchParams({ q: searchQuery });
        searchProducts(searchQuery);
      } else {
        setProducts([]);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          store_id,
          stores!inner (
            id,
            name,
            address,
            phone,
            latitude,
            longitude
          )
        `)
        .ilike('name', `%${query}%`);

      if (error) throw error;

      // Transform data and calculate distances
      const productsWithStores: ProductWithStore[] = (data || []).map((item: any) => {
        const product: ProductWithStore = {
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description,
          store_id: item.store_id,
          store: item.stores,
        };

        if (userLocation) {
          product.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            item.stores.latitude,
            item.stores.longitude
          );
        }

        return product;
      });

      setProducts(productsWithStores);
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to search products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission still works but search happens live now
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price') {
      return a.price - b.price;
    } else {
      return (a.distance || 0) - (b.distance || 0);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Search Products</h1>

          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for any product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </form>

          {products.length > 0 && (
            <div className="flex gap-2 mb-6">
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                onClick={() => setSortBy('price')}
              >
                Sort by Price
              </Button>
              <Button
                variant={sortBy === 'distance' ? 'default' : 'outline'}
                onClick={() => setSortBy('distance')}
                disabled={!userLocation}
              >
                Sort by Distance
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 && searchQuery ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                No products found for "{searchQuery}"
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map((product) => (
                <Card key={product.id} className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2">{product.name}</h3>
                      {product.description && (
                        <p className="text-muted-foreground mb-3">{product.description}</p>
                      )}
                      <div className="space-y-1 text-sm">
                        <Link 
                          to={`/store/${product.store.id}`}
                          className="font-semibold text-primary hover:underline block"
                        >
                          {product.store.name}
                        </Link>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{product.store.address}</span>
                          {product.distance && (
                            <span className="ml-2">({product.distance.toFixed(1)} km away)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-3">
                      <div className="text-2xl font-bold text-primary">
                        {product.price.toLocaleString()} UZS
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${product.store.latitude},${product.store.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <NavigationIcon className="mr-2 h-4 w-4" />
                        Directions
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSearch;
