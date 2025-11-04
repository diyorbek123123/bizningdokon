import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const openDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  };

  const handleRowClick = () => {
    navigate(`/store/${id}`);
  };

  return (
    <Card className="group overflow-hidden transition-smooth hover:shadow-float relative rounded-xl border border-border/50 hover:border-primary/30 bg-card/80 backdrop-blur-sm cursor-pointer" onClick={handleRowClick}>
      <div className="flex items-center gap-4 p-4">
        {/* Image/Icon */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <button
            onClick={toggleFavorite}
            className="absolute top-1 right-1 z-10 p-1.5 rounded-full glass-card glass-card-dark shadow-md hover:shadow-lg hover:scale-110 transition-smooth"
          >
            <Heart className={`h-3 w-3 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
          </button>

          {photo_url ? (
            <img
              src={photo_url}
              alt={name}
              className="h-full w-full object-cover transition-smooth group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary-glow/10 to-accent/10">
              <span className="text-2xl font-bold text-primary/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Store Name & Category */}
        <div className="flex-1 min-w-[180px] max-w-[220px]">
          <h3 className="text-base font-bold line-clamp-1 text-foreground group-hover:text-primary transition-smooth mb-1">
            {name}
          </h3>
          {category && (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
              {category}
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="flex-shrink-0 w-24 text-center">
          {rating !== undefined && rating > 0 ? (
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">{rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">N/A</span>
          )}
        </div>

        {/* Distance */}
        <div className="flex-shrink-0 w-20 text-center">
          {distance !== null && distance !== undefined ? (
            <span className="inline-block font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-sm">
              {distance.toFixed(1)} km
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* Address */}
        <div className="hidden lg:flex items-center gap-2 flex-1 min-w-[200px] max-w-[280px]">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground line-clamp-1">{address}</span>
        </div>

        {/* Phone */}
        <div className="hidden xl:flex items-center gap-2 flex-shrink-0 w-36">
          <Phone className="h-4 w-4 text-primary" />
          <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-primary transition-smooth font-medium line-clamp-1">
            {phone}
          </a>
        </div>

        {/* Opening Hours */}
        <div className="hidden xl:flex items-center gap-2 flex-shrink-0 w-40">
          <Clock className="h-4 w-4 text-primary" />
          {(open_time || close_time) ? (
            <span className={`text-sm font-medium ${status.open ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {status.text}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={openDirections}
            variant="outline"
            size="sm"
            className="gap-1.5 border hover:border-primary hover:bg-primary/5 hover:text-primary transition-smooth px-3"
          >
            <Navigation2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Yo'nalish</span>
          </Button>
          <Button
            onClick={() => navigate(`/store/${id}`)}
            className="gradient-warm shadow-warm-accent hover:shadow-lg hover:scale-105 transition-smooth px-3"
            size="sm"
          >
            Ko'rish
          </Button>
        </div>
      </div>
    </Card>
  );
};
