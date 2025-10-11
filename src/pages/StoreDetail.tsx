import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, Phone, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  photo_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

const StoreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStoreAndProducts();
    }
  }, [id]);

  const fetchStoreAndProducts = async () => {
    try {
      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', id)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load store details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Store not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        {/* Store Header */}
        <Card className="overflow-hidden mb-8">
          <div className="aspect-[21/9] w-full overflow-hidden bg-muted">
            {store.photo_url ? (
              <img
                src={store.photo_url}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-9xl font-bold text-muted-foreground opacity-20">
                  {store.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <h1 className="text-4xl font-bold">{store.name}</h1>
            
            {store.description && (
              <p className="text-muted-foreground text-lg">{store.description}</p>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <span className="font-medium">{store.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">{store.address}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Products Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('store.products')}</h2>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('store.searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">{t('store.noProducts')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-4 space-y-2">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  )}
                  <p className="text-xl font-bold text-primary">
                    {product.price.toLocaleString()} UZS
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;
