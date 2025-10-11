import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from './LanguageSelector';
import { Store, MapPin, Plus } from 'lucide-react';

export const Navigation = () => {
  const { t } = useTranslation();
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
              variant={isActive('/add-store') ? 'default' : 'ghost'}
              size="sm"
            >
              <Link to="/add-store" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.addStore')}</span>
              </Link>
            </Button>

            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
};
