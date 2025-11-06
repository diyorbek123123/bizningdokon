import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
import { ShoppingCart } from '@/components/ShoppingCart';
import { ProductCard } from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Search, Pizza, Coffee, IceCream, Cake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  store_id: string;
  category: string | null;
}

const categoryIcons: Record<string, any> = {
  Pizzas: Pizza,
  Empanadas: Coffee,
  Bebidas: IceCream,
  Postres: Cake,
};

const Index = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className="flex-1 ml-16 mr-80">
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Busco algo de nuestro menú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-full border-2 border-border focus:border-primary"
              />
            </div>
          </div>

          {/* Categories Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Categorías</h2>
            <p className="text-sm text-muted-foreground">Elige nuestras deliciosas pizzas</p>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="bg-transparent gap-6 h-auto p-0 border-b border-border w-full justify-start">
              {categories.map(category => {
                const Icon = categoryIcons[category] || Pizza;
                return (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3 gap-2 data-[state=active]:text-primary font-semibold"
                  >
                    <Icon className="h-5 w-5" />
                    {category === 'all' ? 'Todo' : category}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image_url={product.image_url}
                  storeId={product.store_id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ShoppingCart />
    </div>
  );
};

export default Index;
