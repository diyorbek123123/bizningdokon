import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { StoreCard } from '@/components/StoreCard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, Package, MapPin, Navigation as NavigationIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  is_open: boolean | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  store_id: string;
  stores: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

const Favorites = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favoriteStores, setFavoriteStores] = useState<Store[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    fetchFavorites();
  };

  const fetchFavorites = async () => {
    try {
      // Fetch favorite stores
      const { data: favStoresData, error: favError } = await supabase
        .from('user_favorites')
        .select('store_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (favError) throw favError;

      if (favStoresData && favStoresData.length > 0) {
        const storeIds = favStoresData.map(f => f.store_id);
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .in('id', storeIds);

        if (storesError) throw storesError;
        setFavoriteStores(storesData || []);
      }

      // Note: We don't have a product favorites table yet, so this is a placeholder
      // You can add a user_favorite_products table later if needed

    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load favorites',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeStoreFavorite = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setFavoriteStores(favoriteStores.filter(s => s.id !== storeId));
      toast({ title: 'Removed from favorites' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Favorites</h1>

        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stores">
              <Heart className="mr-2 h-4 w-4" />
              Stores ({favoriteStores.length})
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Products (Coming Soon)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores" className="mt-6">
            {favoriteStores.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    You haven't added any favorite stores yet
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Browse Stores
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {favoriteStores.map((store) => (
                  <div key={store.id}>
                    <StoreCard
                      id={store.id}
                      name={store.name}
                      address={store.address}
                      phone={store.phone}
                      category={store.category}
                      rating={store.rating || undefined}
                      review_count={store.review_count || undefined}
                      latitude={store.latitude}
                      longitude={store.longitude}
                      photo_url={store.photo_url}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Product favorites feature coming soon!
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Favorites;