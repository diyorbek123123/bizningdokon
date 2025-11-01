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
    <Card className="group overflow-hidden transition-smooth hover:shadow-float hover:-translate-y-1 relative rounded-2xl border-2 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card via-card to-muted/20">
      <button
        onClick={toggleFavorite}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full glass-card glass-card-dark shadow-md hover:shadow-lg hover:scale-110 transition-smooth"
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
      </button>

      <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/5 via-primary-glow/5 to-accent/5 relative">
        {photo_url ? (
          <img
            src={photo_url}
            alt={name}
            className="h-full w-full object-cover transition-smooth group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary-glow/10 to-accent/10">
            <span className="text-7xl font-bold text-primary/20 group-hover:text-primary/30 transition-smooth">
              {name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
      </div>

      <div className="p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold line-clamp-1 flex-1 text-foreground group-hover:text-primary transition-smooth">{name}</h3>
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-semibold bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">{rating.toFixed(1)}</span>
              {review_count !== undefined && review_count > 0 && (
                <span className="text-amber-600/70 dark:text-amber-500/70">({review_count})</span>
              )}
            </div>
          )}
        </div>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
        )}

        {category && (
          <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-smooth">
            {category}
          </Badge>
        )}

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground group/item hover:text-foreground transition-smooth">
            <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="line-clamp-1 flex-1">{address}</span>
            {distance !== null && distance !== undefined && (
              <span className="font-semibold text-primary whitespace-nowrap bg-primary/10 px-2 py-0.5 rounded-full text-xs">{distance.toFixed(1)} km</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-muted-foreground group/item hover:text-foreground transition-smooth">
            <Phone className="h-4 w-4 flex-shrink-0 text-primary" />
            <a href={`tel:${phone}`} className="hover:text-primary transition-smooth font-medium">
              {phone}
            </a>
          </div>

          {(open_time || close_time) && (
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className={`font-medium ${status.open ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {status.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 pt-3">
          <Button
            onClick={openDirections}
            variant="outline"
            size="sm"
            className="flex-1 gap-2 border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-smooth font-semibold"
          >
            <Navigation2 className="h-4 w-4" />
            Yo'nalish
          </Button>
          <Button
            asChild
            className="flex-1 gradient-warm shadow-warm-accent hover:shadow-lg hover:scale-105 transition-smooth font-semibold"
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
