import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, MessageCircle, Map, User, Search, Store, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const languages = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'uz', flag: '🇺🇿' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { role, loading } = useUserRole();
  
  const isActive = (path: string) => location.pathname === path;
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];
  
  // Base nav items for all users
  const baseNavItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Search, path: '/search', label: 'Search' },
    { icon: Map, path: '/map', label: 'Map' },
    { icon: MessageCircle, path: '/messages', label: 'Messages' },
    { icon: Heart, path: '/favorites', label: 'Favorites' },
  ];

  // Role-specific items
  const ownerItems = [
    { icon: Store, path: '/dashboard', label: 'Dashboard' },
  ];

  const adminItems = [
    { icon: Shield, path: '/admin', label: 'Admin Panel' },
    { icon: Store, path: '/owner-admin', label: 'Owners' },
  ];

  // Combine items based on role
  const navItems = [
    ...baseNavItems,
    ...(role === 'store_owner' ? ownerItems : []),
    ...(role === 'admin' ? adminItems : []),
    { icon: User, path: '/profile', label: 'Profile' },
  ];
  
  if (loading) {
    return (
      <aside className="fixed left-0 top-0 h-screen w-16 bg-card border-r border-border flex flex-col items-center py-6 z-50">
        <div className="flex-1 flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-10 h-10 rounded-xl" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-16 bg-card border-r border-border flex flex-col items-center py-4 md:py-6 z-50 overflow-y-auto">
      <div className="flex-1 flex flex-col gap-3 md:gap-4 w-full items-center">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'w-10 h-10 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            title={item.label}
          >
            <item.icon className="h-5 w-5 md:h-5 md:w-5" />
          </Link>
        ))}
      </div>
      
      {/* Language Selector at Bottom */}
      <div className="mt-auto pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-10 h-10 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-xl md:text-2xl transition-all duration-300 hover:bg-accent hover:scale-105"
              title="Change Language"
            >
              {currentLang.flag}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="gap-2 cursor-pointer text-base md:text-lg"
              >
                <span>{lang.flag}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};