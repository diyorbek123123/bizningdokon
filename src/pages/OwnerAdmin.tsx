import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, Users, Package, Eye, Trash2, UserCog, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface StoreOwner extends Profile {
  stores: { id: string; name: string }[];
  role: string;
}

const OwnerAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<StoreOwner[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<StoreOwner | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
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

      if (!roleData || roleData.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'You need admin privileges to access this page',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all profiles with roles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `);

      // Fetch all stores
      const { data: storesData } = await supabase
        .from('stores')
        .select('*');

      setStores(storesData || []);

      // Process owners
      if (profilesData) {
        const ownersWithStores = await Promise.all(
          profilesData.map(async (profile: any) => {
            const role = profile.user_roles?.[0]?.role || 'user';
            
            if (role === 'store_owner' || role === 'admin') {
              const { data: ownerStores } = await supabase
                .from('stores')
                .select('id, name')
                .eq('owner_id', profile.id);

              return {
                ...profile,
                role,
                stores: ownerStores || [],
              };
            }
            return null;
          })
        );

        setOwners(ownersWithStores.filter(Boolean) as StoreOwner[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignStoreToOwner = async (ownerId: string, storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ owner_id: ownerId })
        .eq('id', storeId);

      if (error) throw error;

      toast({ title: 'Store assigned successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error assigning store',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const createOwnerAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Assign store_owner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'store_owner'
        });

      if (roleError) throw roleError;

      toast({ 
        title: 'Store owner account created',
        description: `Email: ${email}, Password: ${password}`
      });
      
      setCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error creating account',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast({ title: 'Store deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error deleting store',
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
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Owner Management</h1>
        
        <div className="grid gap-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <Users className="h-8 w-8 mb-2 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Total Owners</h3>
              <p className="text-3xl font-bold">{owners.length}</p>
            </Card>
            
            <Card className="p-6">
              <Store className="h-8 w-8 mb-2 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Total Stores</h3>
              <p className="text-3xl font-bold">{stores.length}</p>
            </Card>

            <Card className="p-6">
              <Package className="h-8 w-8 mb-2 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Unassigned Stores</h3>
              <p className="text-3xl font-bold">{stores.filter(s => !s.owner_id).length}</p>
            </Card>
          </div>

          {/* Store Owners Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Store Owners & Their Stores
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Owner Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Store Owner Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createOwnerAccount} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          required 
                          placeholder="owner@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input 
                          id="password" 
                          name="password" 
                          type="text" 
                          required 
                          placeholder="Create a password"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Save this password - you'll need to share it with the owner
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                          id="fullName" 
                          name="fullName" 
                          type="text" 
                          required 
                          placeholder="Owner's full name"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Create Account
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owners.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No store owners found
                </p>
              ) : (
                <div className="space-y-4">
                  {owners.map((owner) => (
                    <Card key={owner.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{owner.full_name || 'No Name'}</h3>
                          <p className="text-sm text-muted-foreground">Email: {owner.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Role: <span className="capitalize">{owner.role}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            User ID: {owner.id}
                          </p>
                          
                          {owner.stores.length > 0 ? (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Manages:</p>
                              <div className="flex gap-2 flex-wrap">
                                {owner.stores.map(store => (
                                  <Link
                                    key={store.id}
                                    to={`/store/${store.id}`}
                                    className="text-sm px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                                  >
                                    {store.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-2">
                              No stores assigned
                            </p>
                          )}
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedOwner(owner)}
                            >
                              Assign Store
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Store to {owner.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Label>Select Store</Label>
                              <Select onValueChange={(storeId) => assignStoreToOwner(owner.id, storeId)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a store" />
                                </SelectTrigger>
                                <SelectContent>
                                  {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id}>
                                      {store.name} {store.owner_id ? '(Assigned)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Stores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                All Stores ({stores.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {stores.map(store => (
                  <Card key={store.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.address}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rating: {store.rating || 'N/A'} ⭐ ({store.review_count || 0} reviews)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(`/store/${store.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteStore(store.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OwnerAdmin;