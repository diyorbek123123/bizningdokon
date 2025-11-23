import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, LogOut, MessageSquare, Star, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRef } from 'react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [ownedStores, setOwnedStores] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    setUser(user);
    await loadProfile(user.id);
    await loadReviewCount(user.id);
    await loadOwnedStores(user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // If profile doesn't exist, create it
      if (!data) {
        const { data: userData } = await supabase.auth.getUser();
        const newProfile = {
          id: userId,
          email: userData.user?.email || '',
          full_name: userData.user?.user_metadata?.full_name || '',
          bio: null,
          avatar_url: null,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;

        setProfile(createdProfile);
        setFullName(createdProfile.full_name || '');
        setBio(createdProfile.bio || '');
        setAvatarUrl(createdProfile.avatar_url || '');
      } else {
        setProfile(data);
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviewCount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('*, stores(name, photo_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserReviews(data || []);
      setReviewCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadOwnedStores = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      setOwnedStores(data || []);
    } catch (error) {
      console.error('Error loading owned stores:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate avatar URL if provided
    if (avatarUrl && avatarUrl.trim() !== '') {
      // Check if it's a valid image URL format
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
      if (!urlPattern.test(avatarUrl)) {
        toast({
          title: 'Invalid Image URL',
          description: 'Please provide a direct image URL (ending in .jpg, .png, etc.) or use the upload button',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio: bio,
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      // Reload profile to ensure avatar updates
      await loadProfile(user.id);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Update avatar URL
      setAvatarUrl(publicUrl);

      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 ml-16">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <Sidebar />

      <main className="lg:ml-16 pt-16 pb-20 lg:pb-8 lg:pt-24">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt={fullName || 'User'} />
                  <AvatarFallback className="text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">
                    {fullName || 'Anonymous User'}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <Mail className="h-3 w-3" />
                      {user?.email}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      {reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}
                    </Badge>
                  </div>
                  {bio && (
                    <p className="text-muted-foreground mt-3">{bio}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/messages')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Messages</h3>
                    <p className="text-sm text-muted-foreground">View your conversations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/favorites')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Favorites</h3>
                    <p className="text-sm text-muted-foreground">Your saved stores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Profile Card */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Profile Photo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Paste an image URL or click upload to select a photo'}
                  </p>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Owned Stores */}
          {ownedStores.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>My Stores ({ownedStores.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ownedStores.map((store) => (
                    <Card 
                      key={store.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/store/${store.id}`)}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ 
                            backgroundImage: store.photo_url 
                              ? `url(${store.photo_url})` 
                              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)'
                          }}
                        >
                          {!store.photo_url && (
                            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                              {store.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{store.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">{store.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {store.rating?.toFixed(1) || '0.0'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {store.review_count || 0} reviews
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>My Reviews ({reviewCount})</CardTitle>
            </CardHeader>
            <CardContent>
              {userReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  You haven't posted any reviews yet
                </div>
              ) : (
                <div className="space-y-4">
                  {userReviews.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex gap-4">
                        {review.stores?.photo_url && (
                          <img 
                            src={review.stores.photo_url} 
                            alt={review.stores.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{review.stores?.name || 'Unknown Store'}</h4>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{review.rating}</span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default Profile;
