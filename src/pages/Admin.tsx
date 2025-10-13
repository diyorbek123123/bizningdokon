import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Store {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

const Admin = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin — Manage Stores & Products';
  }, []);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    const current = stores.find(s => s.id === selectedStoreId);
    setStoreName(current?.name || '');
    loadProducts(selectedStoreId);
  }, [selectedStoreId]);

  const loadStores = async () => {
    const { data, error } = await supabase.from('stores').select('id, name').order('created_at', { ascending: false });
    if (error) {
      toast({ title: t('errors.error', { defaultValue: 'Error' }), description: 'Failed to load stores', variant: 'destructive' });
      return;
    }
    setStores(data || []);
  };

  const loadProducts = async (storeId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: t('errors.error', { defaultValue: 'Error' }), description: 'Failed to load products', variant: 'destructive' });
      return;
    }
    setProducts((data || []).map(p => ({ ...p, price: typeof p.price === 'number' ? p.price : Number(p.price) })));
  };

  const saveStoreName = async () => {
    if (!selectedStoreId) return;
    if (!storeName.trim()) {
      toast({ title: 'Validation', description: 'Store name cannot be empty', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('stores').update({ name: storeName.trim() }).eq('id', selectedStoreId);
    if (error) {
      toast({ title: t('errors.error', { defaultValue: 'Error' }), description: 'Failed to rename store', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Store name updated' });
    await loadStores();
  };

  const saveProduct = async (p: Product) => {
    if (!p.name.trim() || isNaN(p.price) || p.price < 0) {
      toast({ title: 'Validation', description: 'Provide valid name and non-negative price', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('products').update({ name: p.name.trim(), price: p.price }).eq('id', p.id);
    if (error) {
      toast({ title: t('errors.error', { defaultValue: 'Error' }), description: 'Failed to save product', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Product updated' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin — Edit Stores & Products</h1>
          <p className="text-muted-foreground">Rename stores and change existing products and prices.</p>
        </header>

        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <div className="sm:col-span-1">
                <label className="text-sm text-muted-foreground">Select store</label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1">
                <label className="text-sm text-muted-foreground">Store name</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Enter new store name" />
              </div>
              <div className="sm:col-span-1">
                <Button onClick={saveStoreName} disabled={!selectedStoreId}>Save Store</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedStoreId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Products</h2>
                <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${products.length} items`}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Price</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
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
                        <Button size="sm" onClick={() => saveProduct(products[idx])}>Save</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
