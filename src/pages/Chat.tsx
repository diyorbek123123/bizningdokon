import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
import { StoreMessages } from '@/components/StoreMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfileCard } from '@/components/UserProfileCard';
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
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 ml-16">
          <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-16">
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Chat Header */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/store/${store.id}`)}>
            <div 
              className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
              style={{ 
                backgroundImage: store.photo_url 
                  ? `url(${store.photo_url})` 
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)'
              }}
            >
              {!store.photo_url && (
                <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold rounded-full">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">
                {store.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {store.address}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                openDirections();
              }}
            >
              <NavigationIcon className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Sender Profile (for owners) */}
        {isOwner && recipientUserId && (
          <div className="mb-4">
            <UserProfileCard userId={recipientUserId} />
          </div>
        )}

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
    </div>
  );
};

export default Chat;
