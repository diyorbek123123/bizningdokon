import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Store, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  description: string | null;
  rating: number | null;
  review_count: number | null;
  is_open: boolean | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  store_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!roleData || (roleData.role !== 'store_owner' && roleData.role !== 'admin')) {
      toast({
        title: 'Access Denied',
        description: 'You need to be a store owner to access this page',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    fetchStores();
  };

  const fetchStores = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', session.user.id);

      if (error) throw error;
      setStores(data || []);
      if (data && data.length > 0) {
        setSelectedStore(data[0].id);
        fetchProducts(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    fetchProducts(storeId);
  };

  const handleImageUpload = async (productId: string) => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${productId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStore) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          price,
          description,
          store_id: selectedStore,
        })
        .select()
        .single();

      if (error) throw error;

      if (imageFile && data) {
        const imageUrl = await handleImageUpload(data.id);
        if (imageUrl) {
          await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('id', data.id);
        }
      }

      toast({ title: 'Product added successfully' });
      fetchProducts(selectedStore);
      setImageFile(null);
    } catch (error: any) {
      toast({
        title: 'Error adding product',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast({ title: 'Product deleted successfully' });
      if (selectedStore) fetchProducts(selectedStore);
    } catch (error: any) {
      toast({
        title: 'Error deleting product',
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
        <h1 className="text-3xl font-bold mb-8">Store Owner Dashboard</h1>

        {stores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                You don't own any stores yet. Contact an admin to assign you a store.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Store Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Your Stores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {stores.map((store) => (
                    <Button
                      key={store.id}
                      variant={selectedStore === store.id ? 'default' : 'outline'}
                      onClick={() => handleStoreChange(store.id)}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      {store.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Products Section */}
            {selectedStore && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Products</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Product</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={addProduct} className="space-y-4">
                          <div>
                            <Label htmlFor="name">Product Name</Label>
                            <Input id="name" name="name" required />
                          </div>
                          <div>
                            <Label htmlFor="price">Price (UZS)</Label>
                            <Input
                              id="price"
                              name="price"
                              type="number"
                              step="0.01"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" />
                          </div>
                          <div>
                            <Label htmlFor="image">Product Image (Optional)</Label>
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            Add Product
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No products yet. Add your first product!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {products.map((product) => (
                        <Card key={product.id}>
                          <CardContent className="p-4">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-48 object-cover rounded-lg mb-3"
                              />
                            )}
                            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                            <p className="text-2xl font-bold text-primary mb-2">
                              {product.price.toLocaleString()} UZS
                            </p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {product.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;