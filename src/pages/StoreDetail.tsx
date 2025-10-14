import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Phone, Search, Clock, Navigation as NavigationIcon, Star, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoreMessages } from '@/components/StoreMessages';

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
  } | null;
}

const StoreDetail = () => {
  const { id } = useParams<{ id: string }>();
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
            .select('full_name')
            .eq('id', review.user_id)
            .single();
          
          return {
            ...review,
            profiles: profile || { full_name: 'Anonymous' }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Store not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

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
              <Button 
                className="mt-4"
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                <NavigationIcon className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </div>
          </div>
        </Card>

        {/* Products Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('store.products')}</h2>
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
        </div>

        {/* Reviews Section */}
        <div className="space-y-6 mt-8">
          <h2 className="text-2xl font-bold">Reviews</h2>
          
          {/* Review Form */}
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

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{review.profiles?.full_name || 'Anonymous'}</p>
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
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;
