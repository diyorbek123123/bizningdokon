import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Store, Package, Eye, MessageSquare, Edit } from 'lucide-react';
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
  open_time: string | null;
  close_time: string | null;
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
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

    if (!roleData || roleData.role !== 'store_owner') {
      toast({
        title: 'Access Denied',
        description: 'You need to be a store owner to access this page',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    fetchStoreData(session.user.id);
  };

  const fetchStoreData = async (userId: string) => {
    try {
      // Fetch store owned by this user
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (storeError) throw storeError;

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData);

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeData.id);

      setProducts(productsData || []);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('store_reviews')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('store_id', storeData.id)
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
    if (!store) return;

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
          store_id: store.id,
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
      setProducts([...products, data]);
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
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast({ title: 'Product deleted successfully' });
      setProducts(products.filter(p => p.id !== productId));
    } catch (error: any) {
      toast({
        title: 'Error deleting product',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!store) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const description = formData.get('description') as string;
    const open_time = formData.get('open_time') as string;
    const close_time = formData.get('close_time') as string;

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name,
          address,
          phone,
          description,
          open_time: open_time || null,
          close_time: close_time || null,
        })
        .eq('id', store.id);

      if (error) throw error;

      toast({ title: 'Store updated successfully' });
      setStore({ ...store, name, address, phone, description });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error updating store',
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

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Store Assigned</h2>
            <p className="text-muted-foreground">
              You don't have a store assigned yet. Please contact an administrator.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Store Dashboard</h1>

        <div className="grid gap-6">
          {/* Store Overview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  {store.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Store
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Store Details</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={updateStore} className="space-y-4">
                        <div>
                          <Label htmlFor="edit-name">Store Name</Label>
                          <Input 
                            id="edit-name" 
                            name="name" 
                            defaultValue={store.name}
                            required 
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-address">Address</Label>
                          <Input 
                            id="edit-address" 
                            name="address" 
                            defaultValue={store.address}
                            required 
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-phone">Phone</Label>
                          <Input 
                            id="edit-phone" 
                            name="phone" 
                            type="tel"
                            defaultValue={store.phone}
                            required 
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea 
                            id="edit-description" 
                            name="description" 
                            defaultValue={store.description || ''}
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-open-time">Opening Time</Label>
                            <Input 
                              id="edit-open-time" 
                              name="open_time" 
                              type="time"
                              defaultValue={store.open_time || ''}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-close-time">Closing Time</Label>
                            <Input 
                              id="edit-close-time" 
                              name="close_time" 
                              type="time"
                              defaultValue={store.close_time || ''}
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full">
                          Save Changes
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" onClick={() => navigate(`/store/${store.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Public Page
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{store.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{store.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="font-medium">
                    {store.rating ? `${store.rating} ⭐` : 'No ratings yet'} ({store.review_count || 0} reviews)
                  </p>
                </div>
              </div>
              {store.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{store.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Customer Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {review.profiles?.full_name || review.profiles?.email || 'Anonymous'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < review.rating ? '⭐' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm">{review.comment}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products ({products.length})
                </CardTitle>
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;