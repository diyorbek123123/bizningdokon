import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, Settings, HelpCircle, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Heart, path: '/favorites', label: 'Favorites' },
    { icon: ShoppingCart, path: '/orders', label: 'Orders' },
    { icon: User, path: '/auth', label: 'Account' },
    { icon: Settings, path: '/settings', label: 'Settings' },
    { icon: HelpCircle, path: '/about', label: 'Help' },
  ];
  
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-card border-r border-border flex flex-col items-center py-6 gap-6 z-50">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
            isActive(item.path)
              ? 'bg-primary text-primary-foreground shadow-lg scale-110'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105'
          )}
          title={item.label}
        >
          <item.icon className="h-5 w-5" />
        </Link>
      ))}
    </aside>
  );
};