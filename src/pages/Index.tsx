import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { StoreCard } from '@/components/StoreCard';
import { StoreFilters } from '@/components/StoreFilters';
import { Input } from '@/components/ui/input';
import { Search, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import heroImage from '@/assets/hero-marketplace.jpg';

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
  const [category, setCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('name');
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
      const matchesCategory = !category || store.category === category;
      return matchesSearch && matchesCategory;
    });

    const storesWithDistance = filtered.map(store => ({
      ...store,
      distance: userLocation 
        ? calculateDistance(userLocation[0], userLocation[1], store.latitude, store.longitude)
        : null
    }));

    switch (sortBy) {
      case 'distance':
        return storesWithDistance.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      case 'rating':
        return storesWithDistance.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest':
        return storesWithDistance.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return storesWithDistance.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  const filteredStores = getFilteredAndSortedStores();
  const favoriteStores = filteredStores.filter(s => favoriteIds.includes(s.id));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Marketplace" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl opacity-90">
            {t('hero.subtitle')}
          </p>

          <div className="w-full max-w-xl">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('hero.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg bg-background/95 backdrop-blur"
              />
            </form>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <StoreFilters
          selectedCategory={category}
          selectedSort={sortBy}
          onCategoryChange={setCategory}
          onSortChange={setSortBy}
        />

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Stores ({filteredStores.length})</TabsTrigger>
            {user && (
              <TabsTrigger value="favorites" className="gap-2">
                <Heart className="h-4 w-4" />
                Favorites ({favoriteStores.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {searchQuery || category ? 'No stores found matching your criteria' : 'No stores yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <StoreCard key={store.id} {...store} />
                ))}
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="favorites">
              {favoriteStores.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-lg">No favorites yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Click the heart icon on stores to save them</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteStores.map((store) => (
                    <StoreCard key={store.id} {...store} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>
    </div>
  );
};

export default Index;
