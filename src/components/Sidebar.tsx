import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, MessageCircle, Map, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'uz', flag: '🇺🇿' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];
  
  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Map, path: '/map', label: 'Map' },
    { icon: MessageCircle, path: '/messages', label: 'Messages' },
    { icon: Heart, path: '/favorites', label: 'Favorites' },
    { icon: User, path: '/auth', label: 'Account' },
  ];
  
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-card border-r border-border flex flex-col items-center py-6 z-50">
      <div className="flex-1 flex flex-col gap-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        ))}
      </div>
      
      {/* Language Selector at Bottom */}
      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 hover:bg-accent hover:scale-105"
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
                className="gap-2 cursor-pointer text-lg"
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