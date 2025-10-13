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

  const openDirections = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl relative rounded-2xl">
      <button
        onClick={toggleFavorite}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background transition-colors"
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
      </button>

      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {photo_url ? (
          <img
            src={photo_url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary-glow/10">
            <span className="text-6xl font-bold text-muted-foreground opacity-20">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold line-clamp-1 flex-1">{name}</h3>
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)}</span>
              {review_count !== undefined && review_count > 0 && (
                <span className="text-muted-foreground">({review_count})</span>
              )}
            </div>
          )}
        </div>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        {category && (
          <Badge variant="secondary" className="rounded-full">
            {category}
          </Badge>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1 flex-1">{address}</span>
            {distance !== null && distance !== undefined && (
              <span className="font-medium whitespace-nowrap">{distance.toFixed(1)} km</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <a href={`tel:${phone}`} className="hover:text-primary transition-colors">
              {phone}
            </a>
          </div>

          {(open_time || close_time) && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className={status.open ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                {status.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={openDirections}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Navigation2 className="h-4 w-4" />
            Yo'nalish
          </Button>
          <Button
            asChild
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            size="sm"
          >
            <Link to={`/store/${id}`}>
              Ko'rish
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};
