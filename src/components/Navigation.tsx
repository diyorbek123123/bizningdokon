import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { Store, MapPin, Plus, LogIn, LogOut, Search, Info, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export const Navigation = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t('auth.logout'),
      description: 'Logged out successfully',
    });
    navigate('/');
  };
  
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Store className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ShopFinder
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/" className="gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.home')}</span>
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/map') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/map" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.map')}</span>
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/search') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/search" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/about') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/about" className="gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
              </Link>
            </Button>

            {isAdmin && (
              <>
                <Button
                  asChild
                  variant={isActive('/add-store') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Link to="/add-store" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('nav.addStore')}</span>
                  </Link>
                </Button>
                
                <Button
                  asChild
                  variant={isActive('/admin') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Link to="/admin" className="gap-2">
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                </Button>
                
                <Button
                  asChild
                  variant={isActive('/edit-about') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Link to="/edit-about" className="gap-2">
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit About</span>
                  </Link>
                </Button>
              </>
            )}

            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
            )}

            <ThemeToggle />
            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
};
