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
import { MapPicker } from '@/components/MapPicker';

const OwnerAddStore = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    checkOwnerAccess();
  }, []);

  const checkOwnerAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: 'Login Required',
        description: 'Please login as a store owner',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setUserId(session.user.id);

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'store_owner')
      .maybeSingle();

    if (!data) {
      toast({
        title: 'Access Denied',
        description: 'You need store owner privileges',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Check if owner already has a store
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', session.user.id)
      .maybeSingle();

    if (existingStore) {
      toast({
        title: 'Store Already Exists',
        description: 'You already have a store. Redirecting to dashboard...',
      });
      navigate('/dashboard');
      return;
    }

    setIsOwner(true);
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
    open_time: '',
    close_time: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: 'Location Required',
        description: 'Please select your store location on the map',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let photoUrl = formData.photo_url;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `stores/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      const { error } = await supabase.from('stores').insert([
        {
          name: formData.name,
          description: formData.description || null,
          phone: formData.phone,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          photo_url: photoUrl || null,
          open_time: formData.open_time || null,
          close_time: formData.close_time || null,
          owner_id: userId,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Store Created!',
        description: 'Your store has been added successfully',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding store:', error);
      toast({
        title: 'Error',
        description: 'Failed to create store. Please try again.',
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

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Create Your Store</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Store"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of your store..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, City"
              />
            </div>

            <div>
              <Label>Store Location *</Label>
              <MapPicker
                onLocationSelect={(lat, lng) => {
                  setFormData({ 
                    ...formData, 
                    latitude: lat.toString(), 
                    longitude: lng.toString() 
                  });
                }}
                initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
                initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
              />
            </div>

            <div>
              <Label htmlFor="photo">Store Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="open_time">Opening Time</Label>
                <Input
                  id="open_time"
                  type="time"
                  value={formData.open_time}
                  onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="close_time">Closing Time</Label>
                <Input
                  id="close_time"
                  type="time"
                  value={formData.close_time}
                  onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Store...' : 'Create Store'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default OwnerAddStore;
