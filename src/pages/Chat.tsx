import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { StoreMessages } from '@/components/StoreMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Star, Navigation as NavigationIcon, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Store {
  id: string;
  name: string;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  address: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const Chat = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [store, setStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const recipientUserId = searchParams.get('with');

  useEffect(() => {
    if (storeId) {
      fetchStore();
      checkOwnership();
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const location: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(location);
      });
    }
  }, [storeId]);

  useEffect(() => {
    if (store && userLocation) {
      const dist = calculateDistance(userLocation[0], userLocation[1], store.latitude, store.longitude);
      setDistance(dist);
    }
  }, [store, userLocation]);

  const fetchStore = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, photo_url, latitude, longitude, rating, review_count, address')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      setStore(data);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const checkOwnership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: store } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', storeId)
      .single();

    setIsOwner(store?.owner_id === user.id);
  };

  const openDirections = () => {
    if (store) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Smart Store Header */}
        <Card className="p-3 md:p-4 mb-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Store Photo */}
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-cover bg-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                backgroundImage: store.photo_url 
                  ? `url(${store.photo_url})` 
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)'
              }}
              onClick={() => navigate(`/store/${store.id}`)}
            >
              {!store.photo_url && (
                <div className="w-full h-full flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="flex-1 min-w-0">
              <h2 
                className="text-base md:text-lg font-bold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/store/${store.id}`)}
              >
                {store.name}
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Rating */}
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {store.rating?.toFixed(1) || '0.0'} ({store.review_count || 0})
                </Badge>
                
                {/* Distance */}
                {distance !== null && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {distance.toFixed(1)} km
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 md:line-clamp-2">
                {store.address}
              </p>
            </div>

            {/* Direction Button */}
            <Button
              size="sm"
              onClick={openDirections}
              className="flex-shrink-0 h-9 w-9 md:h-10 md:w-auto md:px-4"
            >
              <NavigationIcon className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('store.getDirections')}</span>
            </Button>
          </div>
        </Card>

        {/* Messages Component */}
        <Card className="overflow-hidden">
          <StoreMessages 
            storeId={storeId!} 
            isOwner={isOwner}
            recipientUserId={recipientUserId || undefined}
          />
        </Card>
      </div>
    </div>
  );
};

export default Chat;
