import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { StoreCard } from '@/components/StoreCard';

import { Input } from '@/components/ui/input';
import { Search, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import heroImage from '@/assets/hero-marketplace.jpg';
import marketplaceBg from '@/assets/marketplace-bg.png';

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

    // Sort by distance by default
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
      <Navigation />

      <section className="relative h-[500px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${marketplaceBg})` }}
        />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
        
        <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-center text-white">
          <div className="inline-block mb-4 px-4 py-2 rounded-full glass-card shadow-glow-primary animate-fade-in">
            <span className="text-sm font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              🌟 Professional Marketplace Platform
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-5 animate-fade-up drop-shadow-2xl">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-10 max-w-2xl font-medium drop-shadow-xl animate-fade-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            {t('hero.subtitle')}
          </p>

          <div className="w-full max-w-2xl animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
              }}
              className="relative group"
            >
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary group-focus-within:text-primary transition-smooth" />
              <Input
                type="text"
                placeholder={t('hero.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 pr-5 h-16 text-base bg-white/95 backdrop-blur-md rounded-2xl border-2 border-white/50 shadow-float hover:shadow-glow-primary focus:shadow-glow-primary transition-smooth font-medium"
              />
            </form>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-10 glass-card glass-card-dark p-1.5 shadow-md border border-border/50">
            <TabsTrigger value="all" className="rounded-xl px-8 py-3 font-semibold data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-smooth">
              {t('common.allStores')} <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">({filteredStores.length})</span>
            </TabsTrigger>
            {user && (
              <TabsTrigger value="favorites" className="gap-2 rounded-xl px-8 py-3 font-semibold data-[state=active]:gradient-warm data-[state=active]:text-white data-[state=active]:shadow-md transition-smooth">
                <Heart className="h-4 w-4" />
                {t('common.favorites')} <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">({favoriteStores.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="animate-fade-in">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-96 bg-gradient-to-br from-muted to-muted/50 animate-pulse rounded-2xl shadow-md" />
                ))}
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-20 glass-card glass-card-dark rounded-2xl shadow-elegant">
                <p className="text-muted-foreground text-xl font-medium">
                  {searchQuery ? t('common.noStoresFound') : t('common.noStores')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
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
                <div className="text-center py-20 glass-card glass-card-dark rounded-2xl shadow-elegant">
                  <Heart className="h-20 w-20 mx-auto mb-6 text-accent animate-float" />
                  <p className="text-foreground text-xl font-semibold mb-2">{t('common.noFavorites')}</p>
                  <p className="text-sm text-muted-foreground">{t('common.clickHeart')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
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
      </section>
    </div>
  );
};

export default Index;
