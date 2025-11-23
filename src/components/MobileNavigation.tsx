import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Heart, MessageCircle, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AIAssistant } from '@/components/AIAssistant';

export const MobileNavigation = () => {
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/favorites', icon: Heart, label: 'Favorites' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: user ? '/profile' : '/auth', icon: User, label: user ? 'Profile' : 'Login' },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${active ? 'fill-primary' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="lg:hidden">
        <AIAssistant />
      </div>
    </>
  );
};
