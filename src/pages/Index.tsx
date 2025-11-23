import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { QuickAccessCategories } from '@/components/QuickAccessCategories';
import { StoreCard } from '@/components/StoreCard';
import { ProductCard } from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Heart, ChevronRight, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import categoryAll from '@/assets/category-all.jpg';
import categoryFood from '@/assets/category-food.jpg';
import categoryClothing from '@/assets/category-clothing.jpg';
import categoryElectronics from '@/assets/category-electronics.jpg';
import categoryHome from '@/assets/category-home.jpg';

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
  { name: 'all', image: categoryAll, label: 'All' },
  { name: 'food', image: categoryFood, label: 'Food' },
  { name: 'clothing', image: categoryClothing, label: 'Clothing' },
  { name: 'electronics', image: categoryElectronics, label: 'Electronics' },
  { name: 'home', image: categoryHome, label: 'Home & Garden' },
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

  useEffect(() => {
    fetchStores();
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
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <Navigation />
      <Sidebar />
      
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <main className="lg:ml-16 lg:pt-24 pt-16 pb-20 lg:pb-8">
        {/* Mobile Search Bar */}
        <div className="lg:hidden px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Shops, Products, Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full bg-muted border-0"
            />
          </div>
        </div>

        {/* Mobile Hero Section */}
        <div className="lg:hidden px-4 pt-4">
          <Card className="bg-accent text-accent-foreground p-8 rounded-3xl text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">Find Your Branch Now!</h2>
              <p className="text-sm opacity-90 mb-6">See all 0 sites near you</p>
              <Button 
                onClick={() => navigate('/map')}
                variant="secondary"
                size="lg"
                className="rounded-full px-8"
              >
                Open Full Map
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Access Categories */}
        <div className="lg:hidden">
          <QuickAccessCategories />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block px-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('hero.title')}</h1>
          <p className="text-muted-foreground text-lg mb-6">{t('hero.subtitle')}</p>
          
          {/* Desktop Search Bar */}
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

        {/* Desktop Categories Section */}
        <div className="hidden lg:block px-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Browse by Category</h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map((category) => {
              return (
                <button
                  key={category.name}
                  onClick={() => {
                    if (category.name === 'all') {
                      navigate('/search');
                    } else {
                      navigate(`/search?category=${category.name}`);
                    }
                  }}
                  className="flex-shrink-0 group"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-secondary hover:bg-primary/10 transition-colors mb-2 group-hover:scale-105 transition-transform border-2 border-border">
                    <img 
                      src={category.image} 
                      alt={category.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-center">{category.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stores Section */}
        <div className="px-4 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-2xl font-bold">
              Recommended ({filteredStores.length})
            </h2>
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/favorites')}
                className="text-primary"
              >
                See All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground text-lg">
                {searchQuery ? t('common.noStoresFound') : 'Fetching shop data...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStores.slice(0, 10).map((store, index) => (
                <div key={store.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <StoreCard {...store} />
                </div>
              ))}
            </div>
          )}

          {/* Promotions Section */}
          <div className="mt-8">
            <h2 className="text-lg lg:text-2xl font-bold mb-4">Promotions & Products</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <Card className="flex-shrink-0 w-40 h-40 bg-accent flex items-center justify-center rounded-2xl">
                <span className="text-white font-bold text-lg">Coming Soon</span>
              </Card>
              <Card className="flex-shrink-0 w-40 h-40 bg-secondary flex items-center justify-center rounded-2xl">
                <span className="font-semibold">New Products</span>
              </Card>
              <Card className="flex-shrink-0 w-40 h-40 bg-muted flex items-center justify-center rounded-2xl">
                <span className="font-semibold">Special Offers</span>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Index;
