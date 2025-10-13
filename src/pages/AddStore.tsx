import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AddStore = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: t('auth.adminOnly'),
        description: t('auth.loginDescription'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      toast({
        title: t('auth.adminOnly'),
        description: 'You need admin privileges to add stores',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setChecking(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    photo_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('stores').insert([
        {
          name: formData.name,
          description: formData.description || null,
          phone: formData.phone,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          photo_url: formData.photo_url || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: t('addStore.success'),
        description: 'You can now view it on the map',
      });

      navigate('/');
    } catch (error) {
      console.error('Error adding store:', error);
      toast({
        title: t('addStore.error'),
        description: 'Please check your information and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">{t('addStore.title')}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('addStore.name')} *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Store"
              />
            </div>

            <div>
              <Label htmlFor="description">{t('addStore.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of your store..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('addStore.phone')} *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div>
              <Label htmlFor="address">{t('addStore.address')} *</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, City"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">{t('addStore.latitude')} *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="41.3775"
                />
              </div>
              <div>
                <Label htmlFor="longitude">{t('addStore.longitude')} *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="64.5853"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="photo">{t('addStore.photo')}</Label>
              <Input
                id="photo"
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding...' : t('addStore.submit')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddStore;
