import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Phone, Search, Clock, Navigation as NavigationIcon, Star, MessageCircle, Heart, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoreMessages } from '@/components/StoreMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Store {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  open_time: string | null;
  close_time: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const StoreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withUser = searchParams.get('with') || undefined;
  const { t } = useTranslation();
  const { toast } = useToast();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(234); // Placeholder

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchStoreAndProducts();
      fetchReviews();
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

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select(`
          id,
          user_id,
          rating,
          comment,
          created_at
        `)
        .eq('store_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', review.user_id)
            .single();
          
          return {
            ...review,
            profiles: profile || { full_name: 'Anonymous', avatar_url: null }
          };
        })
      );
      
      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to leave a review',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('store_reviews')
        .insert({
          store_id: id,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your review has been submitted',
      });

      setRating(5);
      setComment('');
      fetchReviews();
      fetchStoreAndProducts(); // Refresh to update rating
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);
  };

  const handleCall = () => {
    if (store?.phone) {
      window.location.href = `tel:${store.phone}`;
    }
  };

  const handleMessage = () => {
    navigate(`/chat/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader />
        <Sidebar />
        <main className="lg:ml-16 pt-16 pb-20 lg:pb-8 lg:pt-24">
          <div className="animate-pulse space-y-4 px-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader />
        <Sidebar />
        <main className="lg:ml-16 pt-16 pb-20 lg:pb-8 lg:pt-24">
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-muted-foreground">Store not found</p>
            <Button asChild className="mt-4">
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Mobile View */}
      <div className="lg:hidden">
        {/* Hero Image with Back Button */}
        <div className="relative h-64 w-full overflow-hidden">
          {store.photo_url ? (
            <img
              src={store.photo_url}
              alt={store.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-6xl font-bold text-muted-foreground opacity-20">
                {store.name.charAt(0)}
              </span>
            </div>
          )}
          
          <Button 
            asChild 
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 rounded-full"
          >
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* Store Info Card */}
        <div className="bg-card rounded-t-3xl -mt-6 relative z-10 px-4 pt-6 pb-24">
          {/* Store Name and Avatar */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{store.name}</h1>
              <p className="text-sm text-muted-foreground mb-3">{store.address}</p>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-accent">
                  Restaurant
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>0m away</span>
                </div>
              </div>
            </div>
            
            {store.photo_url && (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                <img
                  src={store.photo_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {store.description && (
            <p className="text-sm text-muted-foreground mb-4">{store.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              <span className="font-semibold">{followersCount}</span>
              <span className="text-sm text-muted-foreground">followers</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{products.length}</span>
              <span className="text-sm text-muted-foreground">products</span>
            </div>
          </div>

          {/* Store Details */}
          <div className="space-y-3 mb-6">
            {store.open_time && store.close_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hours</p>
                  <p className="text-sm text-muted-foreground">
                    {store.open_time} - {store.close_time}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{store.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <a href={`tel:${store.phone}`} className="text-sm text-muted-foreground hover:text-primary">
                  {store.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div>
            <h2 className="text-xl font-bold mb-4">Products</h2>
            
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No products available</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    {product.image_url && (
                      <div className="aspect-square w-full overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold mb-1 text-sm">{product.name}</h3>
                      <p className="text-sm font-bold text-primary">
                        {product.price.toLocaleString()} UZS
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-50">
          <div className="flex gap-2">
            <Button
              onClick={toggleFollow}
              variant={isFollowing ? "default" : "secondary"}
              className="flex-1 gap-2"
            >
              <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button
              onClick={handleCall}
              size="icon"
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleMessage}
              size="icon"
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing tabs layout */}
      <div className="hidden lg:block ml-16 pt-24">
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

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <span className="font-medium">{store.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">{store.address}</span>
              </div>
              {store.open_time && store.close_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {store.open_time.substring(0, 5)} - {store.close_time.substring(0, 5)}
                  </span>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Get Directions:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <NavigationIcon className="mr-2 h-4 w-4" />
                    Google Maps
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = `https://yandex.com/maps/?rtext=~${store.latitude},${store.longitude}&rtt=auto`;
                      window.open(url, '_blank');
                    }}
                  >
                    <NavigationIcon className="mr-2 h-4 w-4" />
                    Yandex Maps
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = `https://2gis.com/directions?m=${store.longitude}%2C${store.latitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <NavigationIcon className="mr-2 h-4 w-4" />
                    2GIS
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const url = `https://maps.apple.com/?daddr=${store.latitude},${store.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <NavigationIcon className="mr-2 h-4 w-4" />
                    Apple Maps
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">{t('store.products')}</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
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
                  <Card key={product.id} className="overflow-hidden">
                    {product.image_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      <p className="text-xl font-bold text-primary">
                        {product.price.toLocaleString()} UZS
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            {user ? (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Leave a Review</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="transition-colors"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Comment (optional)</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience..."
                      rows={4}
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Sign in to leave a review</p>
                <Button asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </Card>
            )}

            {reviews.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Clickable Avatar */}
                      <button
                        onClick={() => navigate(`/user/${review.user_id}`)}
                        className="flex-shrink-0 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={review.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {review.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {/* Clickable Name */}
                            <button
                              onClick={() => navigate(`/user/${review.user_id}`)}
                              className="font-semibold hover:text-primary transition-colors"
                            >
                              {review.profiles?.full_name || 'Anonymous'}
                            </button>
                            <div className="flex gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <Card className="p-6 text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
              <p className="text-lg font-semibold mb-2">Start a conversation</p>
              <p className="text-muted-foreground mb-4">Click the button below to message this store</p>
              <Button onClick={() => navigate(`/chat/${id}`)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Open Chat
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;
