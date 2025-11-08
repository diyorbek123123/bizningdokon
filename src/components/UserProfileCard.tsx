import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { User, Star } from 'lucide-react';

interface UserProfileCardProps {
  userId: string;
  showClickable?: boolean;
}

export const UserProfileCard = ({ userId, showClickable = true }: UserProfileCardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, bio')
        .eq('id', userId)
        .single();

      const { count } = await supabase
        .from('store_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setProfile(profileData);
      setReviewCount(count || 0);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  if (!profile) return null;

  const handleClick = () => {
    if (showClickable) {
      navigate(`/profile?user=${userId}`);
    }
  };

  return (
    <Card 
      className={`p-4 ${showClickable ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
          <AvatarFallback>
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{profile.full_name || 'Anonymous User'}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              {reviewCount} reviews
            </Badge>
          </div>
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {profile.bio}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
