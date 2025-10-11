import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { StoreCard } from '@/components/StoreCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-marketplace.jpg';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  photo_url: string | null;
}

const Index = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) => {
    const query = searchQuery.toLowerCase();
    return (
      store.name.toLowerCase().includes(query) ||
      store.description?.toLowerCase().includes(query) ||
      store.address.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Marketplace"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl opacity-90">
            {t('hero.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('hero.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg bg-background/95 backdrop-blur"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stores Grid */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? 'No stores found matching your search' : 'No stores yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                description={store.description || undefined}
                phone={store.phone}
                address={store.address}
                photo_url={store.photo_url || undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
