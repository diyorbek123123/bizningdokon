import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { StoreCard } from '@/components/StoreCard';
import { ProductCard } from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Heart, ChevronRight, UtensilsCrossed, Pizza, Coffee, IceCream, Apple } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  category: string | null;
  rating: number;
  review_count: number;
  open_time: string | null;
  close_time: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  store_id: string;
}

const CATEGORIES = [
  { name: 'fast_food', icon: Pizza, label: 'Fast Food' },
  { name: 'cafe', icon: Coffee, label: 'Café' },
  { name: 'restaurant', icon: UtensilsCrossed, label: 'Restaurant' },
  { name: 'dessert', icon: IceCream, label: 'Dessert' },
  { name: 'healthy', icon: Apple, label: 'Healthy' },
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const Index = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchStores();
    fetchFeaturedProducts();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadFavorites(data.user.id);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  const loadFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('user_favorites')
      .select('store_id')
      .eq('user_id', userId);
    setFavoriteIds(data?.map(f => f.store_id) || []);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getFilteredAndSortedStores = () => {
    let filtered = stores.filter((store) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = store.name.toLowerCase().includes(query) ||
        store.description?.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query);
      return matchesSearch;
    });

    const storesWithDistance = filtered.map(store => ({
      ...store,
      distance: userLocation 
        ? calculateDistance(userLocation[0], userLocation[1], store.latitude, store.longitude)
        : null
    }));

    return storesWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  };

  const filteredStores = getFilteredAndSortedStores();
  const favoriteStores = filteredStores.filter(s => favoriteIds.includes(s.id));

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className="flex-1 ml-16 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('hero.title')}</h1>
          <p className="text-muted-foreground text-lg mb-6">{t('hero.subtitle')}</p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('hero.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-border focus:border-primary text-base"
            />
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Browse by Category</h2>
            <Button variant="ghost" onClick={() => navigate('/search')} className="gap-2">
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.name}
                  onClick={() => navigate(`/search?category=${category.name}`)}
                  className="flex-shrink-0 group"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary hover:bg-primary/10 transition-colors flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Icon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-center">{category.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Featured Products</h2>
              <Button variant="ghost" onClick={() => navigate('/search')} className="gap-2">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {featuredProducts.slice(0, 12).map((product) => (
                <Card 
                  key={product.id}
                  className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/store/${product.store_id}`)}
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <span className="text-4xl font-bold text-muted-foreground">
                          {product.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate mb-1">{product.name}</p>
                    <p className="text-primary font-bold text-sm">{product.price.toLocaleString()} UZS</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 bg-secondary p-1.5 rounded-xl">
            <TabsTrigger 
              value="all" 
              className="rounded-lg px-6 py-2.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {t('common.allStores')} <span className="ml-2 text-xs opacity-70">({filteredStores.length})</span>
            </TabsTrigger>
            {user && (
              <TabsTrigger 
                value="favorites" 
                className="gap-2 rounded-lg px-6 py-2.5 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Heart className="h-4 w-4" />
                {t('common.favorites')} <span className="ml-2 text-xs opacity-70">({favoriteStores.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="animate-fade-in">
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <p className="text-muted-foreground text-lg">
                  {searchQuery ? t('common.noStoresFound') : t('common.noStores')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStores.map((store, index) => (
                  <div key={store.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <StoreCard {...store} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="favorites" className="animate-fade-in">
              {favoriteStores.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-foreground text-lg font-semibold mb-2">{t('common.noFavorites')}</p>
                  <p className="text-sm text-muted-foreground">{t('common.clickHeart')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {favoriteStores.map((store, index) => (
                    <div key={store.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <StoreCard {...store} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
