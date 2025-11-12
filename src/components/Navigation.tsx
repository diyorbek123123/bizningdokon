import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { Store, MapPin, Plus, LogIn, LogOut, Search, Info, Edit, Heart, LayoutDashboard, UserCog, Menu, X, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import shoxaLogo from '@/assets/shoxa-logo.png';

export const Navigation = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    setUserRole(data?.role || null);
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
    <nav className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-background via-background to-background/80 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo Section - More Prominent */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={shoxaLogo} 
                alt="SHOXA" 
                className="h-12 w-auto transition-transform duration-300 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent hidden sm:block">
              SHOXA
            </span>
          </Link>

          {/* Desktop Navigation - Clean and Minimal */}
          <div className="hidden lg:flex items-center gap-2">
          </div>

          {/* Mobile Navigation - Simplified */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col gap-4 mt-8">
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant={isActive('/') ? 'default' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Link to="/" className="gap-2">
                        <Store className="h-4 w-4" />
                        {t('nav.home')}
                      </Link>
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      asChild
                      variant={isActive('/map') ? 'default' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Link to="/map" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        {t('nav.map')}
                      </Link>
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      asChild
                      variant={isActive('/search') ? 'default' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Link to="/search" className="gap-2">
                        <Search className="h-4 w-4" />
                        Search
                      </Link>
                    </Button>
                  </SheetClose>

                  {user && (
                    <SheetClose asChild>
                      <Button
                        asChild
                        variant={isActive('/messages') ? 'default' : 'ghost'}
                        className="w-full justify-start"
                      >
                        <Link to="/messages" className="gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {t('messages.title')}
                        </Link>
                      </Button>
                    </SheetClose>
                  )}

                  <SheetClose asChild>
                    <Button
                      asChild
                      variant={isActive('/about') ? 'default' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Link to="/about" className="gap-2">
                        <Info className="h-4 w-4" />
                        About
                      </Link>
                    </Button>
                  </SheetClose>

                  {user && (
                    <SheetClose asChild>
                      <Button 
                        asChild 
                        variant={isActive('/favorites') ? 'default' : 'ghost'}
                        className="w-full justify-start"
                      >
                        <Link to="/favorites" className="gap-2">
                          <Heart className="h-4 w-4" />
                          Favorites
                        </Link>
                      </Button>
                    </SheetClose>
                  )}

                  {userRole === 'store_owner' && (
                    <SheetClose asChild>
                      <Button 
                        asChild 
                        variant={isActive('/dashboard') ? 'default' : 'ghost'}
                        className="w-full justify-start"
                      >
                        <Link to="/dashboard" className="gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </Button>
                    </SheetClose>
                  )}

                  {userRole === 'admin' && (
                    <>
                      <SheetClose asChild>
                        <Button 
                          asChild 
                          variant={isActive('/add-store') ? 'default' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <Link to="/add-store" className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('nav.addStore')}
                          </Link>
                        </Button>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Button 
                          asChild 
                          variant={isActive('/admin') ? 'default' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <Link to="/admin" className="gap-2">
                            <Edit className="h-4 w-4" />
                            Add Changes
                          </Link>
                        </Button>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Button 
                          asChild 
                          variant={isActive('/owner-admin') ? 'default' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <Link to="/owner-admin" className="gap-2">
                            <UserCog className="h-4 w-4" />
                            Owners
                          </Link>
                        </Button>
                      </SheetClose>
                    </>
                  )}

                  <div className="border-t pt-4 mt-2">
                    {user ? (
                      <SheetClose asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start" 
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Button 
                          asChild 
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Link to="/auth" className="gap-2">
                            <LogIn className="h-4 w-4" />
                            Login
                          </Link>
                        </Button>
                      </SheetClose>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
