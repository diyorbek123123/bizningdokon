import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Star, Heart, Clock, Navigation2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface StoreCardProps {
  id: string;
  name: string;
  description?: string | null;
  phone: string;
  address: string;
  photo_url?: string | null;
  category?: string | null;
  rating?: number;
  review_count?: number;
  open_time?: string | null;
  close_time?: string | null;
  distance?: number | null;
  latitude: number;
  longitude: number;
}

const getStatusFromHours = (openTime?: string | null, closeTime?: string | null): { open: boolean; text: string } => {
  if (!openTime || !closeTime) return { open: true, text: '' };
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  
  const isOpen = currentTime >= openMinutes && currentTime <= closeMinutes;
  
  return {
    open: isOpen,
    text: isOpen ? `Open until ${closeTime}` : `Opens at ${openTime}`
  };
};

export const StoreCard = ({ 
  id, name, description, phone, address, photo_url, category, rating, review_count,
  open_time, close_time, distance, latitude, longitude
}: StoreCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const status = getStatusFromHours(open_time, close_time);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) checkFavorite(data.user.id);
    });
  }, []);

  const checkFavorite = async (userId: string) => {
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', id)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please login to save favorites', variant: 'destructive' });
      return;
    }

    if (isFavorite) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('store_id', id);
      setIsFavorite(false);
      toast({ title: 'Removed from favorites' });
    } else {
      await supabase.from('user_favorites').insert({ user_id: user.id, store_id: id });
      setIsFavorite(true);
      toast({ title: 'Added to favorites' });
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative">
      <button
        onClick={toggleFavorite}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
      >
        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
      </button>

      <div className="aspect-video w-full overflow-hidden bg-muted">
        {photo_url ? (
          <img
            src={photo_url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <span className="text-6xl font-bold text-muted-foreground opacity-20">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold line-clamp-1 flex-1">{name}</h3>
          {category && (
            <Badge variant="secondary" className="capitalize text-xs">
              {category}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {rating && rating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating.toFixed(1)}</span>
              {review_count && review_count > 0 && (
                <span className="text-muted-foreground">({review_count})</span>
              )}
            </div>
          ) : null}

          {distance !== null && distance !== undefined && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Navigation2 className="h-3 w-3" />
              <span className="text-xs">{distance.toFixed(1)} km</span>
            </div>
          )}

          {status.text && (
            <div className={`flex items-center gap-1 text-xs ${status.open ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              <Clock className="h-3 w-3" />
              <span>{status.text}</span>
            </div>
          )}
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 text-primary" />
            <span>{phone}</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="default">
            <Link to={`/store/${id}`}>
              {t('store.products')}
            </Link>
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
              window.open(url, '_blank');
            }}
          >
            <Navigation2 className="mr-2 h-4 w-4" />
            Direction
          </Button>
        </div>
      </div>
    </Card>
  );
};
