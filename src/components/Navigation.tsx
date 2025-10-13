import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { Store, MapPin, Plus, LogIn, LogOut, Search, Info, Edit, Heart, LayoutDashboard, UserCog, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-foreground">
              BizningDo'kon
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              asChild
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/" className="gap-2">
                <Store className="h-4 w-4" />
                {t('nav.home')}
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/map') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/map" className="gap-2">
                <MapPin className="h-4 w-4" />
                {t('nav.map')}
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/search') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/search" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive('/about') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/about" className="gap-2">
                <Info className="h-4 w-4" />
                About
              </Link>
            </Button>

            {user && (
              <Button asChild variant={isActive('/favorites') ? 'default' : 'ghost'} size="sm">
                <Link to="/favorites" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Favorites
                </Link>
              </Button>
            )}

            {userRole === 'store_owner' && (
              <Button asChild variant={isActive('/dashboard') ? 'default' : 'ghost'} size="sm">
                <Link to="/dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            )}

            {userRole === 'admin' && (
              <>
                <Button asChild variant={isActive('/add-store') ? 'default' : 'ghost'} size="sm">
                  <Link to="/add-store" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('nav.addStore')}
                  </Link>
                </Button>
                
                <Button asChild variant={isActive('/admin') ? 'default' : 'ghost'} size="sm">
                  <Link to="/admin" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Add Changes
                  </Link>
                </Button>
                
                <Button asChild variant={isActive('/owner-admin') ? 'default' : 'ghost'} size="sm">
                  <Link to="/owner-admin" className="gap-2">
                    <UserCog className="h-4 w-4" />
                    Owners
                  </Link>
                </Button>
              </>
            )}

            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Chiqish
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/auth" className="gap-2">
                  Kirish
                </Link>
              </Button>
            )}

            <ThemeToggle />
            <LanguageSelector />
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
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
