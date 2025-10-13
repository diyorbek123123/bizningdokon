import { useEffect, useState, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, AlertCircle, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
}

interface Owner {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  stores: Array<{ id: string; name: string }>;
}

interface AboutUs {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [aboutUs, setAboutUs] = useState<AboutUs | null>(null);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'store' | 'product'; id: string } | null>(null);
  const adminMapRef = useRef<HTMLDivElement>(null);
  const adminMapInstanceRef = useRef<L.Map | null>(null);
  const adminMarkerRef = useRef<L.Marker | null>(null);
  
  // New product form
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, category: '', image_url: '' });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  useEffect(() => {
    document.title = 'Admin — Full Management';
    loadStores();
    loadOwners();
    loadAboutUs();
  }, []);

  useEffect(() => {
    if (!selectedStoreId) {
      setSelectedStore(null);
      if (adminMapInstanceRef.current) {
        adminMapInstanceRef.current.remove();
        adminMapInstanceRef.current = null;
        adminMarkerRef.current = null;
      }
      return;
    }
    const store = stores.find(s => s.id === selectedStoreId);
    setSelectedStore(store || null);
    loadProducts(selectedStoreId);
    
    // Initialize map for this store
    if (store) {
      setTimeout(() => initializeAdminMap(store.latitude, store.longitude), 100);
    }
  }, [selectedStoreId, stores]);

  const initializeAdminMap = (lat: number, lng: number) => {
    if (!adminMapRef.current) return;
    
    // Clean up existing map
    if (adminMapInstanceRef.current) {
      adminMapInstanceRef.current.remove();
    }

    // Create new map
    const map = L.map(adminMapRef.current).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Add marker
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    adminMarkerRef.current = marker;

    // Update coordinates when marker is dragged
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      if (selectedStore) {
        setSelectedStore({
          ...selectedStore,
          latitude: position.lat,
          longitude: position.lng,
        });
      }
    });

    // Update coordinates when map is clicked
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      if (selectedStore) {
        setSelectedStore({
          ...selectedStore,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      }
    });

    adminMapInstanceRef.current = map;
    
    // Ensure proper sizing
    setTimeout(() => map.invalidateSize(), 100);
  };

  const loadStores = async () => {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load stores', variant: 'destructive' });
      return;
    }
    setStores(data || []);
  };

  const loadProducts = async (storeId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
      return;
    }
    setProducts((data || []).map(p => ({ ...p, price: typeof p.price === 'number' ? p.price : Number(p.price) })));
  };

  const loadOwners = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-store-owners');
      if (error) throw error;
      setOwners(data?.owners || []);
    } catch (error) {
      console.error('Error loading owners:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load store owners', 
        variant: 'destructive' 
      });
    }
  };

  const loadAboutUs = async () => {
    try {
      const { data, error } = await supabase
        .from('about_us')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setAboutUs(data);
    } catch (error) {
      console.error('Error loading about us:', error);
    }
  };

  const saveAboutUs = async () => {
    if (!aboutUs) return;
    
    if (!aboutUs.title.trim() || !aboutUs.content.trim()) {
      toast({ title: 'Validation', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    setAboutLoading(true);
    try {
      if (aboutUs.id) {
        // Update existing
        const { error } = await supabase
          .from('about_us')
          .update({
            title: aboutUs.title.trim(),
            content: aboutUs.content.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', aboutUs.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('about_us')
          .insert({
            title: aboutUs.title.trim(),
            content: aboutUs.content.trim(),
          });
        
        if (error) throw error;
      }
      
      toast({ title: 'Success', description: 'About Us section updated successfully' });
      await loadAboutUs();
    } catch (error) {
      console.error('Error saving about us:', error);
      toast({ title: 'Error', description: 'Failed to save About Us section', variant: 'destructive' });
    } finally {
      setAboutLoading(false);
    }
  };

  const saveStore = async () => {
    if (!selectedStore || !selectedStoreId) return;
    
    if (!selectedStore.name.trim() || !selectedStore.address.trim() || !selectedStore.phone.trim()) {
      toast({ title: 'Validation', description: 'Name, address, and phone are required', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('stores').update({
      name: selectedStore.name.trim(),
      description: selectedStore.description?.trim() || null,
      phone: selectedStore.phone.trim(),
      address: selectedStore.address.trim(),
      latitude: selectedStore.latitude,
      longitude: selectedStore.longitude,
      photo_url: selectedStore.photo_url?.trim() || null,
    }).eq('id', selectedStoreId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update store', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Success', description: 'Store updated successfully' });
    await loadStores();
  };

  const deleteStore = async () => {
    if (!itemToDelete || itemToDelete.type !== 'store') return;
    
    const { error } = await supabase.from('stores').delete().eq('id', itemToDelete.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete store', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Success', description: 'Store deleted' });
    setSelectedStoreId('');
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    await loadStores();
  };

  const saveProduct = async (p: Product) => {
    if (!p.name.trim() || isNaN(p.price) || p.price < 0) {
      toast({ title: 'Validation', description: 'Valid name and non-negative price required', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase.from('products').update({
      name: p.name.trim(),
      description: p.description?.trim() || null,
      price: p.price,
      category: p.category as any || null,
    }).eq('id', p.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save product', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Success', description: 'Product updated' });
  };

  const addProduct = async () => {
    if (!selectedStoreId) return;
    
    if (!newProduct.name.trim() || isNaN(newProduct.price) || newProduct.price < 0) {
      toast({ title: 'Validation', description: 'Valid name and non-negative price required', variant: 'destructive' });
      return;
    }

    if (!newProduct.category) {
      toast({ title: 'Validation', description: 'Please select a category', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.from('products').insert({
        store_id: selectedStoreId,
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || null,
        price: newProduct.price,
        category: newProduct.category as any,
      }).select().single();

      if (error) throw error;

      // Upload image if provided
      if (newProductImage && data) {
        const fileExt = newProductImage.name.split('.').pop();
        const fileName = `${data.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, newProductImage);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          
          await supabase.from('products')
            .update({ image_url: urlData.publicUrl })
            .eq('id', data.id);
        }
      }

      toast({ title: 'Success', description: 'Product added' });
      setNewProduct({ name: '', description: '', price: 0, category: '', image_url: '' });
      setNewProductImage(null);
      await loadProducts(selectedStoreId);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add product', variant: 'destructive' });
    }
  };

  const deleteProduct = async () => {
    if (!itemToDelete || itemToDelete.type !== 'product') return;
    
    const { error } = await supabase.from('products').delete().eq('id', itemToDelete.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Success', description: 'Product deleted' });
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    if (selectedStoreId) await loadProducts(selectedStoreId);
  };

  const confirmDelete = (type: 'store' | 'product', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Complete control over stores and products</p>
        </header>

        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Select Store</label>
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a store to manage" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stores">Stores & Products</TabsTrigger>
            <TabsTrigger value="about">About Us Section</TabsTrigger>
            <TabsTrigger value="owners">Store Owners</TabsTrigger>
          </TabsList>

          <TabsContent value="stores" className="space-y-4">
            {selectedStore ? (
              <Tabs defaultValue="store" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="store">Store Details</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Store Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Store Name *</label>
                          <Input
                            value={selectedStore.name}
                            onChange={(e) => setSelectedStore({ ...selectedStore, name: e.target.value })}
                            placeholder="Store name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone *</label>
                          <Input
                            value={selectedStore.phone}
                            onChange={(e) => setSelectedStore({ ...selectedStore, phone: e.target.value })}
                            placeholder="+998..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Address *</label>
                        <Input
                          value={selectedStore.address}
                          onChange={(e) => setSelectedStore({ ...selectedStore, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={selectedStore.description || ''}
                          onChange={(e) => setSelectedStore({ ...selectedStore, description: e.target.value })}
                          placeholder="Store description"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          <MapPin className="inline h-4 w-4 mr-1" />
                          Location on Map (Click or drag marker to set coordinates)
                        </label>
                        <div className="h-[300px] rounded-lg border overflow-hidden mb-2">
                          <div ref={adminMapRef} className="w-full h-full" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Current: {selectedStore.latitude.toFixed(6)}°N, {selectedStore.longitude.toFixed(6)}°E
                        </p>
                      </div>


                      <div>
                        <label className="text-sm font-medium">Photo URL</label>
                        <Input
                          value={selectedStore.photo_url || ''}
                          onChange={(e) => setSelectedStore({ ...selectedStore, photo_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={saveStore} className="flex-1 sm:flex-none">
                          <Save className="h-4 w-4 mr-2" />
                          Save Store
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => confirmDelete('store', selectedStoreId)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Store
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Product</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Product Name *</label>
                            <Input
                              placeholder="Enter product name"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Price (UZS) *</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={newProduct.price}
                              onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Category *</label>
                          <select
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Select category</option>
                            <option value="food">Food</option>
                            <option value="electronics">Electronics</option>
                            <option value="clothing">Clothing</option>
                            <option value="health">Health</option>
                            <option value="home">Home</option>
                            <option value="sports">Sports</option>
                            <option value="books">Books</option>
                            <option value="toys">Toys</option>
                            <option value="beauty">Beauty</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                          <Textarea
                            placeholder="Enter product description"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Product Image (Optional)</label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewProductImage(e.target.files?.[0] || null)}
                          />
                        </div>
                        <Button onClick={addProduct} className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Products</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {loading ? 'Loading…' : `${products.length} items`}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No products yet. Add one above.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[150px]">Name</TableHead>
                                <TableHead className="min-w-[120px]">Category</TableHead>
                                <TableHead className="min-w-[200px]">Description</TableHead>
                                <TableHead className="min-w-[100px]">Price</TableHead>
                                <TableHead className="min-w-[140px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map((prod, idx) => (
                                <TableRow key={prod.id}>
                                  <TableCell>
                                    <Input
                                      value={prod.name}
                                      onChange={(e) => {
                                        const copy = [...products];
                                        copy[idx] = { ...copy[idx], name: e.target.value };
                                        setProducts(copy);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <select
                                      value={prod.category || ''}
                                      onChange={(e) => {
                                        const copy = [...products];
                                        copy[idx] = { ...copy[idx], category: e.target.value };
                                        setProducts(copy);
                                      }}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="">None</option>
                                      <option value="food">Food</option>
                                      <option value="electronics">Electronics</option>
                                      <option value="clothing">Clothing</option>
                                      <option value="health">Health</option>
                                      <option value="home">Home</option>
                                      <option value="sports">Sports</option>
                                      <option value="books">Books</option>
                                      <option value="toys">Toys</option>
                                      <option value="beauty">Beauty</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={prod.description || ''}
                                      onChange={(e) => {
                                        const copy = [...products];
                                        copy[idx] = { ...copy[idx], description: e.target.value };
                                        setProducts(copy);
                                      }}
                                      placeholder="Description"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={Number(prod.price).toString()}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        const copy = [...products];
                                        copy[idx] = { ...copy[idx], price: isNaN(val) ? 0 : val };
                                        setProducts(copy);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => saveProduct(products[idx])} title="Save changes">
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => confirmDelete('product', prod.id)}
                                        title="Delete product"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a store to manage its details and products</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit About Us Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aboutUs ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title *</label>
                      <Input
                        value={aboutUs.title}
                        onChange={(e) => setAboutUs({ ...aboutUs, title: e.target.value })}
                        placeholder="About Us"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Content *</label>
                      <Textarea
                        value={aboutUs.content}
                        onChange={(e) => setAboutUs({ ...aboutUs, content: e.target.value })}
                        placeholder="Enter about us content..."
                        rows={10}
                      />
                    </div>

                    <Button onClick={saveAboutUs} disabled={aboutLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {aboutLoading ? 'Saving...' : 'Save About Us'}
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No About Us content yet.</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setAboutUs({
                        id: '',
                        title: '',
                        content: '',
                        created_at: '',
                        updated_at: ''
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create About Us Section
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owners" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Store Owners</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {owners.length} owner{owners.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {owners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No store owners registered yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Stores</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell className="font-medium">{owner.full_name}</TableCell>
                          <TableCell>{owner.email}</TableCell>
                          <TableCell>
                            {owner.stores.length === 0 ? (
                              <span className="text-muted-foreground">No stores</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {owner.stores.map((store) => (
                                  <span key={store.id} className="text-sm">
                                    {store.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(owner.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {!selectedStoreId && (
          <Card style={{ display: 'none' }}>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a store to manage its details and products</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'store'
                ? 'This will permanently delete the store and all its products. This action cannot be undone.'
                : 'This will permanently delete this product. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={itemToDelete?.type === 'store' ? deleteStore : deleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
